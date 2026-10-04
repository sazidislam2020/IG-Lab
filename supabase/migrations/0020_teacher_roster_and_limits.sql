-- ============================================================
-- 0020: TEACHER ROSTERS + SANDBOX RUN LIMITS
-- Run this in the Supabase SQL Editor, then deploy the client.
--
-- 1. course_teachers — admin assigns teachers to courses.
-- 2. Roster-based RLS: a teacher can only see the submissions,
--    points, profiles, enrollments, projects and attendance of
--    students in the courses THEY teach (admins keep full view).
-- 3. sandbox_runs — server-enforced free-plan limit of 3 sandbox
--    runs/day (paid plans & staff: unlimited), per the pricing page.
-- ============================================================

-- ------------------------------------------------------------
-- 1. course_teachers — which teacher teaches which course
-- ------------------------------------------------------------
create table if not exists course_teachers (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references courses(id) on delete cascade,
  teacher_id  uuid not null references profiles(id) on delete cascade,
  assigned_by uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (course_id, teacher_id)
);

alter table course_teachers enable row level security;
create index if not exists course_teachers_course_idx on course_teachers(course_id);
create index if not exists course_teachers_teacher_idx on course_teachers(teacher_id);

-- Admins assign/remove; teachers see their own assignments
drop policy if exists "Admins manage course teachers" on course_teachers;
create policy "Admins manage course teachers"
  on course_teachers for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Teachers view own assignments" on course_teachers;
create policy "Teachers view own assignments"
  on course_teachers for select
  using (auth.uid() = teacher_id);

-- ------------------------------------------------------------
-- 2. Roster helper: is this student "mine" (taught by caller)?
--    Enrolled in one of my courses, OR has submitted work on a
--    task belonging to one of my courses.
-- ------------------------------------------------------------
create or replace function public.is_roster_student(p_student uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from course_teachers ct
    where ct.teacher_id = auth.uid()
      and (
        exists (
          select 1 from course_enrollments e
          where e.course_id = ct.course_id and e.user_id = p_student
        )
        or exists (
          select 1
          from submissions s
          join tasks tk on tk.id = s.task_id
          join levels  l on l.id  = tk.level_id
          where s.user_id = p_student and l.course_id = ct.course_id
        )
      )
  );
$$;

-- ------------------------------------------------------------
-- 3. PROFILES — teachers only see roster students (admins: all)
-- ------------------------------------------------------------
drop policy if exists "Staff can view all profiles" on profiles;

create policy "Admins can view all profiles"
  on profiles for select
  using (public.is_admin());

create policy "Teachers can view roster profiles"
  on profiles for select
  using (
    public.my_role() = 'teacher'
    and public.is_roster_student(id)
  );
-- ("Users can view own profile" from 0002 still covers self-read)

-- ------------------------------------------------------------
-- 4. SUBMISSIONS — replace broad teacher access with roster scope
-- ------------------------------------------------------------
drop policy if exists "Teachers can view all submissions" on submissions;
drop policy if exists "Teachers can grade submissions" on submissions;
drop policy if exists "Staff can grade submissions" on submissions;

create policy "Staff can view submissions"
  on submissions for select
  using (
    public.is_admin()
    or auth.uid() = user_id
    or (public.my_role() = 'teacher' and public.is_roster_student(user_id))
  );

create policy "Staff can grade submissions"
  on submissions for update
  using (
    public.is_admin()
    or (public.my_role() = 'teacher' and public.is_roster_student(user_id))
  )
  with check (
    public.is_admin()
    or (public.my_role() = 'teacher' and public.is_roster_student(user_id))
  );

-- ------------------------------------------------------------
-- 5. ENROLLMENTS — teachers see rosters of their courses only
-- ------------------------------------------------------------
drop policy if exists "Staff can view all enrollments" on course_enrollments;

create policy "Staff can view enrollments"
  on course_enrollments for select
  using (
    auth.uid() = user_id
    or public.is_admin()
    or (
      public.my_role() = 'teacher'
      and exists (
        select 1 from course_teachers ct
        where ct.teacher_id = auth.uid()
          and ct.course_id = course_enrollments.course_id
      )
    )
  );

-- ------------------------------------------------------------
-- 6. POINTS LEDGER — teachers may only touch roster points
-- ------------------------------------------------------------
drop policy if exists "Staff can manage points ledger" on points_ledger;

create policy "Staff can manage points ledger"
  on points_ledger for all
  using (
    public.is_admin()
    or (public.my_role() = 'teacher' and public.is_roster_student(user_id))
  )
  with check (
    public.is_admin()
    or (public.my_role() = 'teacher' and public.is_roster_student(user_id))
  );

-- ------------------------------------------------------------
-- 7. PROJECTS — teachers view roster projects only
-- ------------------------------------------------------------
drop policy if exists "Teachers can view all projects" on projects;

create policy "Staff can view projects"
  on projects for select
  using (
    public.is_admin()
    or (public.my_role() = 'teacher' and public.is_roster_student(user_id))
  );

-- ------------------------------------------------------------
-- 8. CLASS ATTENDANCE — teachers may view roster attendance too
--    (own rows / class hosts keep their existing access)
-- ------------------------------------------------------------
drop policy if exists "Users can view attendance for own classes" on class_attendance;

create policy "Users can view attendance for own classes"
  on class_attendance for select
  using (
    auth.uid() = user_id
    or exists (select 1 from live_classes where id = class_id and host_id = auth.uid())
    or (public.my_role() = 'teacher' and public.is_roster_student(user_id))
  );

-- ------------------------------------------------------------
-- 9. SANDBOX RUN LIMITS — 3 runs/day on the free Explorer plan
--    (pricing page promise). Paid plans & staff: unlimited.
--    The RPC is the single gate: it counts today's runs and only
--    then allows the client to execute code.
-- ------------------------------------------------------------
create table if not exists sandbox_runs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table sandbox_runs enable row level security;
create index if not exists sandbox_runs_user_day_idx on sandbox_runs(user_id, created_at);

-- Users can read their own usage; ONLY the SECURITY DEFINER RPC inserts
drop policy if exists "Users can view own sandbox runs" on sandbox_runs;
create policy "Users can view own sandbox runs"
  on sandbox_runs for select
  using (auth.uid() = user_id);

create or replace function public.register_sandbox_run()
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_limit   int  := 3;
  v_used    int  := 0;
  v_unlimited boolean;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Staff and active paid subscribers are unlimited
  select (
    public.is_staff()
    or exists (
      select 1 from user_subscriptions us
      where us.user_id = v_uid
        and us.status = 'active'
        and us.plan_name <> 'Explorer'
        and (us.expires_at is null or us.expires_at > now())
    )
  ) into v_unlimited;

  select count(*) into v_used
  from sandbox_runs
  where user_id = v_uid
    and created_at >= date_trunc('day', now());

  if not v_unlimited and v_used >= v_limit then
    return jsonb_build_object(
      'allowed', false, 'unlimited', false,
      'used', v_used, 'limit', v_limit, 'remaining', 0
    );
  end if;

  insert into sandbox_runs (user_id) values (v_uid);

  if v_unlimited then
    return jsonb_build_object(
      'allowed', true, 'unlimited', true,
      'used', 0, 'limit', -1, 'remaining', -1
    );
  end if;

  return jsonb_build_object(
    'allowed', true, 'unlimited', false,
    'used', v_used + 1, 'limit', v_limit,
    'remaining', greatest(0, v_limit - v_used - 1)
  );
end;
$$;

revoke execute on function public.register_sandbox_run() from public, anon;
grant execute on function public.register_sandbox_run() to authenticated;
