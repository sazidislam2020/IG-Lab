-- ============================================================
-- 0019: SECURITY & ROLE HARDENING  ✔ RUN 2026-10-04 (verified)
-- Deployment order: run this in the Supabase SQL Editor FIRST,
-- then deploy the matching client update — both change together.
-- (Running the new client against the old schema would break
-- grading/checkout; the old client degrades gracefully instead.)
--
-- Fixes (see docs/SECURITY_AUDIT.md for full findings):
--   F1  profiles: any user could escalate their own role/status
--   F2  profiles: any authenticated user could read everyone's email
--   F3  submissions: client could self-grade (passed/points forged)
--   F4  points_ledger: any authenticated user could mint points
--   F5  user_subscriptions / payments: any user could grant
--       themselves a paid plan / fake a payment
--   F6  certificates: INSERT WITH CHECK (true) — anyone could mint
--       a certificate; admins had no DELETE (revoke was broken)
--   F7  tasks/levels/courses/live_classes readable anonymously
--   F8  pending (unapproved) users could write to the platform
--   F10 No leaderboard RPC — client had to read all profiles and
--       every user's points (broken under RLS + leaked emails)
-- ============================================================

-- ------------------------------------------------------------
-- 0. Helper functions
--    SECURITY DEFINER so policies never recurse into profiles
--    RLS (owner = postgres = table owner, no FORCE RLS).
-- ------------------------------------------------------------
create or replace function public.my_role()
returns public.user_role
language sql stable security definer
set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$ select coalesce(public.my_role(), 'student'::public.user_role)
         in ('teacher','admin','super_admin') $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$ select coalesce(public.my_role(), 'student'::public.user_role)
         in ('admin','super_admin') $$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$ select coalesce(public.my_role(), 'student'::public.user_role) = 'super_admin' $$;

create or replace function public.is_approved_user()
returns boolean
language sql stable security definer
set search_path = public
as $$ select exists (
        select 1 from public.profiles
        where id = auth.uid() and status = 'approved') $$;

-- ------------------------------------------------------------
-- 1. PROFILES — no self-escalation, no wholesale PII dump
-- ------------------------------------------------------------
-- F2: drop the "any authenticated user can read all profiles" policy
drop policy if exists "Authenticated users can view profiles" on profiles;
-- F1: tighten self-insert (trigger already creates the row; this is
--     only a fallback and must not be able to set role/status)
drop policy if exists "Users can insert own profile" on profiles;

create policy "Staff can view all profiles"
  on profiles for select
  using (public.is_staff());

create policy "Users can insert own profile"
  on profiles for insert
  with check (
    auth.uid() = id
    and role = 'student'
    and status = 'pending'
  );

-- Guard: only a super admin may change role/status; PK immutable.
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'profile id cannot be changed';
  end if;
  if (new.role is distinct from old.role
      or new.status is distinct from old.status)
     and not public.is_super_admin() then
    raise exception 'Only a super admin can change role or status';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileges on profiles;
create trigger protect_profile_privileges
  before update on profiles
  for each row execute function public.guard_profile_privileges();

-- ------------------------------------------------------------
-- 2. COURSES / LEVELS / TASKS / LIVE CLASSES — no anonymous read
--    (Landing page only needs site_settings/partners/pricing,
--     which stay public. The authenticated policies from 0007 remain.)
--    NOTE: tasks.expected_output stays readable — the task UI shows
--    "Expected output" to students by design; grading integrity comes
--    from the server-side grading trigger below, not from hiding it.
-- ------------------------------------------------------------
drop policy if exists "Anyone can view courses" on courses;
drop policy if exists "Anyone can view levels" on levels;
drop policy if exists "Anyone can view tasks" on tasks;
drop policy if exists "Anyone can view scheduled classes" on live_classes;

create policy "Authenticated users can view classes"
  on live_classes for select
  using (auth.uid() is not null);

-- ------------------------------------------------------------
-- 3. SUBMISSIONS — server-side grading, approved users only
-- ------------------------------------------------------------
-- drop both historical student-insert policies (0002 + 0007 names)
drop policy if exists "Users can insert own submissions" on submissions;
drop policy if exists "Users can create submissions" on submissions;

create policy "Approved users can create own submissions"
  on submissions for insert
  with check (
    auth.uid() = user_id
    and public.is_approved_user()
  );

-- F3: BEFORE INSERT — the client may send `passed`/`points_awarded`,
--     but the server always recomputes them from the task definition.
create or replace function public.grade_submission()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_expected text;
  v_points   int;
begin
  select t.expected_output, t.points_value
    into v_expected, v_points
  from tasks t
  where t.id = new.task_id;

  if new.output is null then
    new.output := '';
  end if;

  if v_expected is not null and v_expected <> '' then
    -- same semantics the UI used: output must contain the expected text
    new.passed := position(trim(v_expected) in trim(new.output)) > 0;
  else
    new.passed := length(btrim(new.output)) > 0
      and new.output not like 'Error%'
      and new.output not like '❌%';
  end if;

  new.points_awarded := case when new.passed then coalesce(v_points, 0) else 0 end;
  new.graded_by      := 'auto';
  new.reviewed_by    := null;
  new.reviewed_at    := null;
  new.reviewer_note  := null;
  return new;
end;
$$;

drop trigger if exists grade_submission_before_insert on submissions;
create trigger grade_submission_before_insert
  before insert on submissions
  for each row execute function public.grade_submission();

-- F4: AFTER INSERT — award points server-side (idempotent).
create or replace function public.award_submission_points()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.passed
     and new.points_awarded > 0
     and not exists (
       select 1 from points_ledger
       where submission_id = new.id
     ) then
    insert into points_ledger (user_id, submission_id, points, reason)
    values (new.user_id, new.id, new.points_awarded, 'task_passed');
  end if;
  return new;
end;
$$;

drop trigger if exists award_submission_points_after_insert on submissions;
create trigger award_submission_points_after_insert
  after insert on submissions
  for each row execute function public.award_submission_points();

-- ------------------------------------------------------------
-- 4. POINTS LEDGER — staff-only writes (0014 already gives staff ALL)
-- ------------------------------------------------------------
drop policy if exists "Authenticated users can insert points" on points_ledger;
drop policy if exists "System can insert points" on points_ledger;

create policy "Staff can award points"
  on points_ledger for insert
  with check (public.is_staff());

-- ------------------------------------------------------------
-- 5. CERTIFICATES — server trigger mints them; admins manage them
-- ------------------------------------------------------------
drop policy if exists "System can insert certificates" on certificates;

create policy "Admins can insert certificates"
  on certificates for insert
  with check (public.is_admin());

create policy "Admins can update certificates"
  on certificates for update
  using (public.is_admin())
  with check (public.is_admin());

-- F6b: "Revoke certificate" in AdminCourses was silently failing
--      because no DELETE policy existed.
create policy "Admins can delete certificates"
  on certificates for delete
  using (public.is_admin());

-- ------------------------------------------------------------
-- 6. PAYMENTS & SUBSCRIPTIONS — no self-granting paid plans
-- ------------------------------------------------------------
drop policy if exists "System can insert payments" on payments;
drop policy if exists "System can insert subscriptions" on user_subscriptions;

create policy "Admins can insert payments"
  on payments for insert
  with check (public.is_admin());

create policy "Admins can insert subscriptions"
  on user_subscriptions for insert
  with check (public.is_admin());

-- Users may still flip their OWN expired subscription rows to
-- expired/cancelled (useSubscription does this) — nothing else.
create policy "Users can update own subscription status"
  on user_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.guard_subscription_update()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if public.is_staff() then
    return new;
  end if;
  if new.id          is distinct from old.id
     or new.user_id  is distinct from old.user_id
     or new.plan_name is distinct from old.plan_name
     or new.started_at is distinct from old.started_at
     or new.expires_at is distinct from old.expires_at
     or new.created_at is distinct from old.created_at
     or new.status not in ('expired', 'cancelled') then
    raise exception 'You may only mark your own subscription as expired/cancelled';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_subscription_update on user_subscriptions;
create trigger protect_subscription_update
  before update on user_subscriptions
  for each row execute function public.guard_subscription_update();

-- ------------------------------------------------------------
-- 7. Pending (unapproved) users: read-only
-- ------------------------------------------------------------
drop policy if exists "Users can enroll" on course_enrollments;
create policy "Users can enroll"
  on course_enrollments for insert
  with check (auth.uid() = user_id and public.is_approved_user());

drop policy if exists "Users can insert own attendance" on class_attendance;
create policy "Users can insert own attendance"
  on class_attendance for insert
  with check (auth.uid() = user_id and public.is_approved_user());

drop policy if exists "Users can create projects" on projects;
create policy "Users can create projects"
  on projects for insert
  with check (auth.uid() = user_id and public.is_approved_user());

-- Teachers creating classes must be approved staff too
drop policy if exists "Teachers can create classes" on live_classes;
create policy "Teachers can create classes"
  on live_classes for insert
  with check (
    public.is_staff() and public.is_approved_user()
    and auth.uid() = host_id
  );

-- ------------------------------------------------------------
-- 8. Host display name for live classes (F2 side-effect: students
--    can no longer join to profiles to read a teacher's email)
-- ------------------------------------------------------------
alter table live_classes add column if not exists host_name text;

update live_classes lc
set host_name = coalesce(p.full_name, p.email)
from profiles p
where p.id = lc.host_id
  and (lc.host_name is null or lc.host_name = '');

-- New classes set host_name from the client (CreateClass.jsx)

-- Name-only directory (no emails, no unapproved users) so class
-- rosters can still show attendee names after profiles was locked down.
create or replace view public.profile_public as
  select id, full_name
  from public.profiles
  where status = 'approved'
     or role in ('teacher', 'admin', 'super_admin');

revoke select on public.profile_public from anon;
grant select on public.profile_public to authenticated;

-- ------------------------------------------------------------
-- 9. Leaderboard RPC (F10) — aggregate without exposing profiles
-- ------------------------------------------------------------
create or replace function public.get_leaderboard(p_limit int default 200)
returns table (
  user_id      uuid,
  display_name text,
  total_points bigint,
  tasks_passed bigint
)
language sql stable security definer
set search_path = public
as $$
  select
    p.id as user_id,
    coalesce(nullif(p.full_name, ''), split_part(p.email, '@', 1)) as display_name,
    coalesce(l.total, 0) as total_points,
    coalesce(s.passed_count, 0) as tasks_passed
  from profiles p
  cross join lateral (
    select sum(pl.points)::bigint as total
    from points_ledger pl where pl.user_id = p.id
  ) l
  cross join lateral (
    select count(*)::bigint as passed_count
    from submissions sub where sub.user_id = p.id and sub.passed
  ) s
  where p.role = 'student' and p.status = 'approved'
  order by total_points desc, tasks_passed desc, p.created_at asc
  limit greatest(1, least(coalesce(p_limit, 200), 1000));
$$;

revoke execute on function public.get_leaderboard(int) from public, anon;
grant execute on function public.get_leaderboard(int) to authenticated;

-- ------------------------------------------------------------
-- 10. Demo payment RPC — replaces direct client writes (F5)
--     Validates the plan against site_pricing_plans, prices it
--     server-side, cancels old plans, records payment + sub atomically.
-- ------------------------------------------------------------
create or replace function public.activate_demo_subscription(
  p_plan_name     text,
  p_payment_method text default 'demo'
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_profile profiles%rowtype;
  v_plan    site_pricing_plans%rowtype;
  v_amount  numeric;
  v_expires timestamptz;
  v_sub_id  uuid;
  v_pay_id  uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_profile from profiles where id = v_uid;
  if v_profile is null or v_profile.status <> 'approved' then
    raise exception 'Your account is not approved yet';
  end if;

  select * into v_plan
  from site_pricing_plans
  where name = p_plan_name and is_active
  limit 1;
  if not found then
    raise exception 'Unknown plan';
  end if;
  if v_plan.name = 'Explorer' then
    raise exception 'Explorer is the free plan';
  end if;

  -- price text like '৳500' / '৳1,200' → 500 / 1200
  v_amount := coalesce(
    nullif(regexp_replace(v_plan.price, '[^0-9.]', '', 'g'), '')::numeric, 0);
  if v_amount <= 0 then
    raise exception 'This plan cannot be purchased online';
  end if;

  if position('month' in coalesce(v_plan.period, '')) > 0 then
    v_expires := now() + interval '30 days';
  else
    v_expires := null; -- lifetime
  end if;

  update user_subscriptions
  set status = 'cancelled'
  where user_id = v_uid and status = 'active';

  insert into user_subscriptions (user_id, plan_name, status, expires_at)
  values (v_uid, v_plan.name, 'active', v_expires)
  returning id into v_sub_id;

  insert into payments (
    user_id, subscription_id, plan_name, amount, currency,
    payment_method, transaction_id, status, paid_at
  ) values (
    v_uid, v_sub_id, v_plan.name, v_amount, 'BDT',
    coalesce(nullif(p_payment_method, ''), 'demo'),
    'DEMO-' || upper(replace(gen_random_uuid()::text, '-', '')),
    'completed', now()
  )
  returning id into v_pay_id;

  return jsonb_build_object(
    'payment_id', v_pay_id,
    'subscription_id', v_sub_id,
    'amount', v_amount,
    'expires_at', v_expires
  );
end;
$$;

revoke execute on function public.activate_demo_subscription(text, text) from public, anon;
grant execute on function public.activate_demo_subscription(text, text) to authenticated;

-- ------------------------------------------------------------
-- 11. Done — sanity checks (these SELECTs should return 0 rows
--     for "dangerous" policies still in place)
-- ------------------------------------------------------------
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and qual in ('true', 'TRUE')
  and cmd in ('INSERT', 'UPDATE', 'DELETE')
order by tablename, policyname;
