# Ignite Lab — Security, RBAC & Education Audit

**Date:** 2026-10-04 · **Scope:** full code base (React + Vite SPA), Supabase schema & RLS
(migrations 0001–0018), authentication/authorization flows, grading & learning activities.
**Fixes:** migration `0019_security_hardening.sql` + matching client updates.

---

## 1. System & data-structure review

**How access control works today**

| Layer | Mechanism | Status |
|---|---|---|
| Browser | `ProtectedRoute` (auth + role + pending/rejected screens) | ✅ existed, client-only |
| Database | Row Level Security policies per table | ⚠️ had critical gaps → fixed in 0019 |
| Server logic | SECURITY DEFINER triggers & RPCs | ✅ added in 0019 (grading, points, checkout, leaderboard) |

**Roles (locked down):**

| Role | Can do | Cannot do |
|---|---|---|
| `student` (pending) | Read public content only — every write path (submissions, enrollment, projects, class attendance) now requires `status = 'approved'` | Everything else |
| `student` (approved) | Learn: courses, tasks, submit once per task, projects, join classes, own profile/points/certificates, demo checkout | Touch other users' rows, mint points/roles/plans, read others' emails |
| `teacher` | Everything student can + manage tasks, grade submissions, award/revoke points, create live classes, view rosters/submissions/projects | Change roles/status, manage courses/site settings/payments |
| `admin` | Everything teacher can + manage courses/modules, site settings, partners, pricing, certificates (incl. **revoke**), view payments/analytics | Change user roles/status (super admin only), read audit log |
| `super_admin` | All of the above + approvals, role/status changes, user management, audit log | — (DB trigger enforces this is the only role that can change roles/status) |

**Data structures upgraded by 0019:**

- `live_classes.host_name` — display name stored per class (students no longer need profile reads → no teacher email leak).
- `profile_public` **view** — id + full_name of approved users only (for class rosters); no emails, no pending users, `anon` revoked.
- New SECURITY DEFINER functions: `my_role()`, `is_staff()`, `is_admin()`, `is_super_admin()`, `is_approved_user()` (RLS-recursion-safe role checks), `get_leaderboard(limit)`, `activate_demo_subscription(plan, method)`, triggers `guard_profile_privileges`, `grade_submission`, `award_submission_points`, `guard_subscription_update`.

---

## 2. Cyber-security findings & fixes

### Critical (all fixed in 0019)

| # | Finding | Impact | Fix |
|---|---|---|---|
| F1 | `profiles` UPDATE policy let any user update **their own row with any column** — including `role` and `status` | **Full privilege escalation**: any student could set `role='super_admin', status='approved'` via a single API call | `guard_profile_privileges` trigger: role/status changes require super admin; insert policy pinned to `student`/`pending` |
| F2 | `points_ledger` INSERT allowed **any authenticated user** to insert arbitrary rows (any `user_id`, any `points`) | Leaderboard/points fraud, data corruption | INSERT restricted to staff; points are now awarded only by the server trigger `award_submission_points` |
| F3 | `submissions` INSERT let the **client supply `passed` and `points_awarded`**; the certificate trigger trusts `passed` | Self-awarded grades **and** self-minted certificates | `grade_submission` BEFORE INSERT trigger recomputes grade from the task's expected output; points awarded server-side |
| F4 | `payments` & `user_subscriptions` INSERT allowed any authenticated user to write rows **for anyone** | Free lifetime "paid" subscriptions for self (defeats paywall + lab paid mode) for self or others | Direct inserts → admin only; checkout moved to `activate_demo_subscription()` RPC which validates plan, price, and approvales server-side; `guard_subscription_update` trigger blocks column tampering on own subscription |
| F5 | `certificates` INSERT `WITH CHECK (true)` — anyone could mint a certificate; **no DELETE policy** so admin "Revoke" silently failed | Fake credentials; broken admin control | INSERT admin-only; UPDATE/DELETE admin-only (revoke now works); minting stays in the SECURITY DEFINER completion trigger |

### High (fixed)

| # | Finding | Fix |
|---|---|---|
| F6 | `profiles` readable by **every authenticated user** (emails + roles of everyone) — used by leaderboard | Readable by own row + staff only; leaderboard now uses `get_leaderboard()` RPC (names only, no emails); roster names via `profile_public` |
| F7 | Anonymous (`anon` key) could read `tasks`, `levels`, `courses`, `live_classes` (old `USING (true)` policies never dropped) — including Google Meet links of scheduled classes | All dropped; content requires authentication; landing page keeps public `site_settings` / partners / pricing only |
| F8 | Pending/rejected users could still write to the platform (submissions, enrollments, projects, classes) | `is_approved_user()` added to all self-service INSERT policies |
| F9 | Admin "reset password" called `supabase.auth.admin.*` from the browser — **always fails** (needs service role key) | Replaced with secure password-reset email flow (works with anon key, user sets own password) |

### Medium (fixed)

- **Client-only route guards**: admin/super-admin routes were enforced only in React. Now the DB rejects the mutations too (defense in depth).
- **Leaderboard was broken**: under RLS students saw `0` points for everyone else, plus N+1 queries (1 request per student). Now one RPC call.
- **Admin task editor bug**: "Edit" opened the `module_tasks` row instead of the nested task → empty form and silently failing saves. Fixed (this was breaking curriculum maintenance).
- **Security headers** added in `vercel.json`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`.
- **Teacher emails exposed to students** on live-class cards → replaced by `host_name`.
- **`.env.local` verified gitignored**; no secrets or PATs found in git history (`service_role`/`ghp_` scans clean).

### Accepted risks / recommendations (not blocking)

1. **Git PAT embedded in the remote URL** (`https://<token>@github.com/...` in local `.git/config`). It is *not* in the repository history, but it sits in plaintext on this machine and could leak via copied configs or logs. **Recommendation:** rotate that GitHub token, then re-add the remote with a credential helper (`git remote set-url origin https://github.com/sazidislam2020/IG-Lab.git`).
2. **Reported program output is client-supplied.** The server now re-grades it, but a determined student can *claim* any output without running code, and tasks display their expected output by design. True anti-cheat needs **server-side execution** (e.g. a Supabase Edge Function calling Judge0 and returning the grade). Single-attempt is DB-enforced (`submissions_user_task_unique`).
3. **Paywall/lab gating is UX-level.** Approved students can read course content of paid modules through the API; only the UI hides it. Real enforcement would need per-module RLS — noted as future work.
4. **Duplicate migration version** `0004_fix_rls_policies.sql` + `0004_seed_sample_data.sql` — harmless while running SQL manually, but will confuse `supabase db push` later. Rename the seed to `0004b_*` before using the CLI.
5. **Judge0 public CE** is called directly from the browser (no keys leaked, fine), but student code is sent to a third party — mention in the privacy note.
6. **ESLint has no config file** (`npm run lint` fails) — pre-existing; recommend adding `.eslintrc`.
7. Service worker (`sw.js`) is network-first for same-origin GETs — low staleness risk; skip caching rules look correct (Supabase/Judge0 excluded).

---

## 3. Education-section audit

| Area | Status | Notes |
|---|---|---|
| Login / signup / logout for all 3 roles | ✅ | Pending-approval screen blocks unapproved accounts client-side; DB now blocks their writes too |
| One attempt per task | ✅ | DB unique constraint `(task_id, user_id)` + UI lock |
| Auto-grading | ✅ hardened | Grade + points computed in a DB trigger; client values ignored |
| Manual review by teachers | ✅ | `graded_by='manual'`, reviewer id/note recorded; award/revoke ledger actions staff-only |
| Points ledger | ✅ append-only for students | Students: read own only; writes staff/server only |
| Certificates | ✅ | Admin toggle + per-student block + working revoke; minting only via completion trigger |
| Module free/paid toggles & lab access gate | ⚠️ UX-level | Enforced in UI only (see accepted risk 3) |
| Live classes | ✅ | Host-only status updates, attendance self-only, meet links no longer public to anon |
| Code sandbox / project editor | ✅ | Runs in-browser or via Judge0 (no server eval, no keys in repo) |
| Audit log | ✅ | Append-only (no UPDATE/DELETE policies), super-admin read |

---

## 4. Deployment steps (important — these change together)

1. **Vercel env vars** (still required from the earlier "Failed to fetch" fix): add
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel → Settings → Environment
   Variables → Redeploy.
2. Run `supabase/migrations/0019_security_hardening.sql` in the **Supabase SQL Editor**.
3. Deploy the client (push → Vercel auto-deploys) **immediately after** step 2.
   - Running 0019 first: old client keeps working (grades/points now server-side); payments
     and leaderboard recover as soon as the new client deploys (~1 min degraded window).
4. Verify: student login → submit a task → points appear; teacher grading; admin certificate
   revoke; super-admin role change; leaderboard shows real ranks; checkout activates a plan.

**Rollback:** all changes are additive except dropped policies; re-run the equivalent
`CREATE POLICY` statements from 0002/0007/0010/0016 if ever needed (not expected).
