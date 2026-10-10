# Ignite Lab — Functional Audit (teacher / admin / student)

**Date:** 2026-10-10 · **Scope:** all 33 client routes, 28 pages, every Supabase call in
`src/`, cross-checked against all SQL migrations (`supabase/migrations/0001–0020`).

**Verification legend**
- **[code]** — verified by static review of source + migrations (mechanism proven on paper)
- **[browser]** — verified in the running dev server (HTTP 200, DOM/computed-style checks)
- **[blocked]** — requires a live authenticated account; Supabase free-tier email rate limit
  (`over_email_send_rate_limit`) prevented test-account creation during this audit run

---

## 1. Route & guard map

| Route | Guard | Page | Verdict |
|---|---|---|---|
| `/`, `/login`, `/signup`, `/reset-password` | public | Landing, Login, SignUp, ResetPassword | ✅ |
| `/dashboard` | auth + approved | Dashboard | ✅ |
| `/courses`, `/courses/:id` | auth + approved | CoursesPage, CourseDetailPage | ✅ |
| `/tasks/:taskId` | auth + approved | TaskPage | ✅ |
| `/sandbox` | auth + approved | CodeSandbox | ✅ |
| `/leaderboard`, `/profile` | auth + approved | Leaderboard, StudentProfile | ✅ |
| `/projects`, `/projects/:id` | auth + approved | ProjectsPage, ProjectEditor | ⚠️ page loads, file layer broken (F1) |
| `/classes` | auth + approved | LiveClassesPage | ✅ |
| **`/classes/create`** | **auth only — no `requiredRole`** | CreateClass | ❌ **F3** |
| `/classes/:classId` | auth + approved | LiveClassRoom | ⚠️ host-only status updates, errors ignored (F7) |
| `/payment` | auth + approved | PaymentPage | ✅ |
| `/simulation` | auth + approved + LabGate | Simulation | ✅ (LabGate defaults to `free` mode) |
| `/teacher`, `/teacher/students`, `/teacher/review` | `requiredRole="teacher"` | TeacherDashboard, SubmissionReview | ✅ admin/super_admin allowed through |
| `/admin` | `requiredRole="admin"` | Dashboard | ✅ super_admin allowed through |
| `/admin/courses`, `/admin/analytics`, `/admin/site-settings` | `requiredRole="admin"` | AdminCourses, AdminAnalytics, SiteSettings | ⚠️ analytics broken (F2) |
| `/admin/users` | `requiredRole="super_admin"` | AdminUserManagement | ✅ |
| `/admin/approvals`, `/admin/audit-log` | `requiredRole="super_admin"` | AdminApprovals, AuditLog | ✅ |
| `*` (catch-all) | — | Landing | ⚠️ no 404 page (F13) |

**Guard mechanics [code]:** `ProtectedRoute` blocks unauthenticated → `/login`; `status=pending`
/`status=rejected` → dedicated screens with sign-out; role ladder allows
`super_admin→admin` and `admin|super_admin→teacher`, everyone else redirected to `/dashboard`.
Pending/rejected screens verified in DOM structure.

**Guard edge case:** if `profile` fails to load (non-`PGRST116` error), `profile` stays `null` —
role-less routes still render (no `requiredRole` → `children` returned). Pages that read
`profile.id` (e.g. CreateClass `host_id`) would then throw. Rare, but unguarded (F11).

---

## 2. Data-layer inventory

- **RPCs used by the client (3):** `activate_demo_subscription`, `get_leaderboard`,
  `register_sandbox_run` — **all defined in migrations** ✅ (0019/0020), `register_sandbox_run`
  is `security definer`, revoked from `anon`, fail-closed daily limit (3/day UTC, staff & paid
  unlimited) ✅ **[code]**
- **Dead table reference:** `subscriptions` (F2) — only `user_subscriptions` and `payments`
  exist.
- **Triggers:** `handle_new_user` (profile bootstrap — partial, F4), `handle_new_user_subscription`
  (free plan on signup ✅), `grade_submission` (BEFORE INSERT, `security definer`, recomputes
  pass/fail so a client cannot self-grade ✅), `award_submission_points` (AFTER INSERT,
  `security definer`, idempotent ✅), `guard_profile_privileges`, `guard_subscription_update`
  (privilege-leak guards ✅).
- **Storage:** none used anywhere in `src/` — nothing to audit.
- **Client-only dead calls:** none besides F2.

---

## 3. Findings

### P0 — broken or exploitable

**F1 — `project_files` has RLS enabled and ZERO policies → the Projects feature cannot work.**
- `0005_projects.sql:44` enables RLS; no `CREATE POLICY … ON project_files` exists in any
  migration → PostgREST denies **every** select/insert/update/delete for `authenticated`.
- Blast radius: `ProjectsPage.jsx:67` creates files from template (error only `console.error`ed,
  then navigates anyway → **project created with no files**); `ProjectEditor.jsx:43/98/115/131`
  load/save/rename/delete file operations all denied.
- **[code]** proven. **[blocked]** live confirmation — a policy added manually in the Supabase
  dashboard would override the migrations; run one signed-in save in ProjectEditor to confirm.
- **Fix:** add owner-scoped policies:
  `for all using (exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid())) with check (same)`.

**F2 — AdminAnalytics revenue is silently always 0.**
- `AdminAnalytics.jsx:67` queries `.from("subscriptions")` — table does not exist. Supabase
  returns an error which is ignored; the revenue tile renders 0 forever.
- **Fix:** query `payments` (revenue) and/or `user_subscriptions` (active paid count); surface
  the error instead of swallowing it.

**F3 — `/classes/create` has no `requiredRole` and no in-page role block.**
- `App.jsx` wraps it in plain `<ProtectedRoute>` (any approved user). `CreateClass.jsx` only
  *hides the mode tabs* for students (`canCreateWebinar`/`canCreateCourseClass`, lines 124/132);
  the course-class form renders and submits.
- RLS **holds**: `0019:304` insert policy requires `is_staff()`. A student's submit therefore
  fails and the page shows `alert("Failed to create class: <raw DB error>")` (line 100) —
  a teacher-looking form that errors with database text is still a broken experience and an
  authorization-layer gap.
- **Fix:** `<ProtectedRoute requiredRole="teacher">` on the route (defense in depth) + friendly
  in-page guard.

### P1 — wrong data, silent failures, quota gaps

**F4 — signup `full_name` is lost whenever email confirmation is enabled.**
- `0001_init_schema.sql:145` — `handle_new_user` inserts only `(id, email)`; it never reads
  `new.raw_user_meta_data->>'full_name'`.
- `AuthContext.signUp` then runs `profiles.update({full_name})` as the *client* — with
  confirm-email flows there is **no session yet**, so RLS (`auth.uid() = user_id`) denies it and
  the error is only `console.error`d. Result: profile shows email / `"there"` in the greeting
  (Dashboard:230) indefinitely.
- **Fix (migration):** copy metadata in the trigger —
  `insert into public.profiles (id, email, full_name) values (new.id, new.email, new.raw_user_meta_data->>'full_name');`

**F5 — `SubmissionReview.grade()` ignores every error.**
- The submissions `update`, the points `insert`, and the points `delete` are all awaited without
  checking `{ error }`. If any fails the teacher still sees the row flip optimistically
  (`setBusyId(null); loadSubs()`), believing the grade saved.
- Aggravating: points writes are policy-scoped in `0020` to
  `is_admin() OR (teacher AND is_roster_student(user_id))` — a teacher grading a student **not
  on their roster** (e.g. cross-course review) gets a *silent points loss*.
- **Fix:** destructure and surface errors; before grading, verify roster membership or widen the
  policy to "teacher who owns the course of this task".

**F6 — Task page bypasses the free-tier run limit (business-intent question).**
- The daily gate `register_sandbox_run` is only called from `CodeSandbox.jsx:57`.
  `TaskPage.jsx` calls `executeCode()` (line 104 run, 152 submit) with **no gate** → free users
  get unlimited Judge0 executions through tasks while the sandbox caps at 3/day.
- If tasks are meant to be unlimited learning core, document it; otherwise gate `runCode()` on
  TaskPage the same way.

**F7 — class start/end updates are host-only and errors are ignored.**
- RLS: `0006:29` `FOR UPDATE USING (auth.uid() = host_id)`. `LiveClassesPage.jsx:187` and
  `LiveClassRoom.jsx:98/122` update `status` with **no error handling** — an admin or co-teacher
  ending someone else's class silently no-ops; the class stays `live`/`scheduled` forever.
- **Fix:** either allow `is_staff()` to update status, or surface "only the host can end this
  class".

**F8 — Dashboard Top Performers discards names it already has.**
- `Dashboard.jsx:138` maps the `get_leaderboard` RPC down to `{id, total}` only, then renders
  `Student ${rank}` (line 407). The **same RPC** returns `display_name` and the Leaderboard page
  uses it (`Leaderboard.jsx:53`) → two screens show the same board with names vs "Student 2".
- **Fix:** carry `display_name` through the map (2-line change).

**F9 — AdminUserManagement mutations swallow errors.**
- `AdminUserManagement.jsx:31/39/48`: role change, status change, soft-delete all
  `await …update(…)` with no error check. A failed promotion renders as success.
- **Fix:** check `{ error }` and show the failure (the password-reset path at line 58–62 does
  this correctly — copy that pattern).

### P2 — polish / robustness

- **F10** — Dashboard greeting renders `"Good afternoon, there 👋"` before the profile resolves
  (`Dashboard.jsx:230` fallback fires while `full_name` is still loading). Show a neutral
  skeleton/greeting until the name is known.
- **F11** — `profile === null` after a fetch failure passes role-less `ProtectedRoute`s (see §1).
  Render the error/loading branch instead of `children`.
- **F12** — `window.prompt` for the certificate-block reason (`AdminCourses.jsx:183`) — browser
  modal, blocks autofill/i18n, poor mobile UX (error handling itself is fine: `alert` + upsert).
- **F13** — catch-all `*` renders Landing: no 404 for typos/dead links.
- **F14** — First super admin can only be bootstrapped via SQL (`update profiles set role='super_admin'…`);
  no UI path. Documented, not a bug — but there is also no audit-log entry for a manual
  promotion done in the dashboard (audit log only records app-side actions).
- **F15** — LabGate defaults to `free` mode if `site_settings.lab_access_mode` is missing —
  safe default, but confirm the key is seeded in production or the paid/restricted modes never
  apply.

### Verified solid (no action)

- **Submission integrity [code]:** no student UPDATE/DELETE path on `submissions`; BEFORE-INSERT
  `security definer` trigger recomputes pass/fail (client-passed `passed` is overwritten);
  AFTER-INSERT trigger awards points idempotently; `submissions_user_task_unique` (0014)
  enforces one attempt at the DB level; TaskPage surfaces the lock before submit and after
  failure (`TaskPage.jsx:126/185/284–303`).
- **Points integrity:** `points_ledger` INSERT = staff-only (`0019:212`); students can only
  SELECT their own rows. Students cannot self-award. ✅
- **Code runner:** Edge Function → Judge0 fallback with explicit unsupported-language error;
  sandbox gate fail-closed + `revoke … from anon` ✅.
- **Payments:** `activate_demo_subscription` requires `auth.uid()`, approved profile, active
  priced plan; Explorer (free) blocked from purchase; amount parsed from display text with a
  guarded regex ✅.
- **Approvals / enrollment / attendance / class join:** own-row `with check` policies
  (`0019:290/293/297/300`), approval flow UI ↔ `status` transitions consistent ✅.
- **RLS double-check (false positives cleared):** `live_classes` DOES have host UPDATE/DELETE
  policies (`0006:29/33`, multi-line `CREATE POLICY` text — an earlier single-line grep missed
  them); `project_files` genuinely has none.

---

## 4. Role-by-role flow review (code-level)

### Student
| Flow | Mechanism | Status |
|---|---|---|
| Sign up → pending → approved | trigger + `ProtectedRoute` pending screen | ✅ except name loss (F4) |
| Dashboard: points/subs/courses/rank/classes | 5 reads, enrollment-scoped course list | ✅ (greeting race F10, names F8) |
| Courses: list → detail → enroll | own-row enrollment policies | ✅ |
| Task: read prompt → Run → Submit | trigger grading, one-attempt DB lock | ✅ (run ungated, F6) |
| Sandbox: language → Run | `register_sandbox_run` fail-closed gate | ✅ |
| Projects: create → edit files → save | `projects` policies OK, **`project_files` broken** | ❌ F1 |
| Leaderboard | `get_leaderboard` RPC | ✅ names shown |
| Live classes: list → join → attendance | `auth.uid() = user_id` insert | ✅ |
| Profile: submissions, cert display | reads | ✅ |
| Payment: plan → demo subscription RPC | approved-only RPC | ✅ |
| Subscription limits (runs, lab) | server-side (`0020`) | ✅ except F6 |

### Teacher
| Flow | Mechanism | Status |
|---|---|---|
| Dashboard stats + rosters | RLS roster scope (`0020: is_roster_student`) | ✅ [code]; empty-state copy good |
| Review queue → Pass/Fail + note | submissions update + ledger dedupe/revoke | ⚠️ errors ignored (F5) |
| Create class (course-linked) | form → insert, RLS `is_staff()` | ⚠️ route unguarded (F3) |
| Start/end class | status update | ⚠️ host-only, errors ignored (F7) |
| Assignment to courses | done by admin (`course_teachers`) | ✅ |

### Admin / Super admin
| Flow | Mechanism | Status |
|---|---|---|
| Approve/reject users | `profiles.status` + audit log | ✅ |
| Course CRUD, teacher assign, module/task mgmt | `is_admin()` policies | ✅ (window.prompt, F12) |
| Block certificate (reason) | `certificate_blocks` upsert, error surfaced | ⚠️ F12 only |
| Users: role/status change, soft delete | super_admin route | ⚠️ errors swallowed (F9) |
| Analytics tiles | 7 queries | ❌ revenue tile dead (F2) |
| Site settings (incl. lab mode) | `site_settings` | ✅ (seed check F15) |
| Audit log | `audit_log` reads, day grouping pending (UI audit §2.9) | ✅ |
| Payments/subscriptions admin | `user_subscriptions`, `payments` | ✅ |

---

## 5. Live verification status — [blocked]

Test-account creation in the owner's Supabase failed repeatedly with
`429 over_email_send_rate_limit` (free-tier hourly cap; disposable inbox via mail.tm was
working — the constraint is Supabase's send rate, not the inbox). Therefore the following
could **not** be executed live and remain code-verified only:

1. Real signup → confirm email → profile row contents (would prove F4 end-to-end).
2. `project_files` actual live behavior (F1) — migrations vs. any dashboard-added policy.
3. Teacher/admin/super-admin screens in-browser (roster scoping, approvals, analytics).
4. Two-account data isolation (student vs teacher reads).
5. Role promotion to `super_admin` (needs SQL access anyway — F14).

**When the rate limit resets, the plan is:** create 1 student + 1 teacher account, run the
flow table in §4 live, then promote one account via SQL editor and sweep admin screens.

---

## 6. Recommended fix order

1. **F1** project_files policies (feature is dead without them)
2. **F3** `requiredRole="teacher"` on `/classes/create` (one line) + friendly guard
3. **F2** AdminAnalytics revenue query → `payments` / `user_subscriptions`
4. **F4** `handle_new_user` copies `full_name` (one migration)
5. **F5/F9/F7** surface mutation errors (grading, user management, class status)
6. **F8** carry `display_name` into Top Performers (2 lines)
7. **F6** decide task-page quota policy; **F10–F15** polish batch
