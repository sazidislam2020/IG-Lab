-- Ignite Lab — initial schema
-- Build Week 1, Day 2
--
-- Run this in the Supabase SQL editor (or via `supabase db push` once the
-- CLI is linked to your project) after your Supabase project exists.
--
-- IMPORTANT: Row Level Security is enabled on every table below with NO
-- policies attached yet on purpose — that means every table is fully
-- locked down (nobody can read or write) until real policies are added.
-- That happens in Build Week 3 ("Build RBAC route guards"). Shipping with
-- RLS on and no policies is the safe default; shipping with RLS off is not.

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type user_role as enum ('super_admin', 'admin', 'teacher', 'student');
create type user_status as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------
-- profiles — one row per auth.users row, this is where role/status live.
-- Supabase Auth already gives us auth.users (email, password, etc.) —
-- we never duplicate that here, we just extend it.
-- ---------------------------------------------------------------------
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  full_name    text,
  role         user_role not null default 'student',
  status       user_status not null default 'pending',
  created_at   timestamptz not null default now()
);

alter table profiles enable row level security;

-- ---------------------------------------------------------------------
-- courses — top-level containers (e.g. "Robotics Track", "Web Dev Track")
-- ---------------------------------------------------------------------
create table courses (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  created_at   timestamptz not null default now()
);

alter table courses enable row level security;

-- ---------------------------------------------------------------------
-- levels — belong to a course, ordered, with an optional prerequisite
-- (the level that must be passed before this one unlocks) and a flag
-- for boss-exam levels, which carry a higher points_value.
-- ---------------------------------------------------------------------
create table levels (
  id                  uuid primary key default gen_random_uuid(),
  course_id           uuid not null references courses(id) on delete cascade,
  level_number         int not null,
  title               text not null,
  unlock_after_level_id uuid references levels(id),
  is_boss             boolean not null default false,
  points_value        int not null default 100,
  created_at          timestamptz not null default now(),
  unique (course_id, level_number)
);

alter table levels enable row level security;

-- ---------------------------------------------------------------------
-- tasks — the actual exercises inside a level.
-- expected_output is used by the auto-grader (Build Week 7).
-- ---------------------------------------------------------------------
create table tasks (
  id               uuid primary key default gen_random_uuid(),
  level_id         uuid not null references levels(id) on delete cascade,
  title            text not null,
  prompt           text not null,
  language         text not null,          -- 'python' | 'java' | 'javascript' | 'c' | 'csharp' | 'cpp' | 'html'
  starter_code     text default '',
  expected_output  text,
  points_value     int not null default 10,
  created_at       timestamptz not null default now()
);

alter table tasks enable row level security;

-- ---------------------------------------------------------------------
-- submissions — every code run a student submits for grading.
-- passed/points_awarded get filled in by the grading logic (Build Week 7).
-- ---------------------------------------------------------------------
create table submissions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  task_id          uuid not null references tasks(id) on delete cascade,
  code             text not null,
  language         text not null,
  output           text,
  passed           boolean,
  points_awarded   int not null default 0,
  tab_switch_flagged boolean not null default false,  -- used by boss-exam proctoring, Build Week 9
  created_at       timestamptz not null default now()
);

alter table submissions enable row level security;
create index submissions_user_id_idx on submissions(user_id);
create index submissions_task_id_idx on submissions(task_id);

-- ---------------------------------------------------------------------
-- points_ledger — append-only record of every point award. Keeping this
-- separate from a single mutable "total_points" column means we always
-- have a full history and can recompute totals if something's ever wrong.
-- ---------------------------------------------------------------------
create table points_ledger (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  submission_id uuid references submissions(id) on delete set null,
  points       int not null,
  reason       text not null,   -- e.g. 'task_passed', 'boss_exam_passed'
  created_at   timestamptz not null default now()
);

alter table points_ledger enable row level security;
create index points_ledger_user_id_idx on points_ledger(user_id);

-- ---------------------------------------------------------------------
-- audit_log — records every Super Admin / Admin action (approvals, role
-- changes). Referenced in Build Week 3, created now since it's foundational.
-- ---------------------------------------------------------------------
create table audit_log (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references profiles(id),
  action        text not null,      -- e.g. 'approve_user', 'reject_user', 'assign_role'
  target_user_id uuid references profiles(id),
  details       jsonb,
  created_at    timestamptz not null default now()
);

alter table audit_log enable row level security;

-- ---------------------------------------------------------------------
-- Keep profiles in sync with auth.users automatically on signup.
-- Every new Supabase Auth user gets a matching profiles row with
-- role='student' and status='pending' by default.
-- ---------------------------------------------------------------------
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
