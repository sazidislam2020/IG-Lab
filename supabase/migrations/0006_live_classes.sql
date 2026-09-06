-- Live Classes — free video classes using Jitsi Meet
-- Teachers create classes, students join via room link

create table live_classes (
  id           uuid primary key default gen_random_uuid(),
  host_id      uuid not null references profiles(id) on delete cascade,
  title        text not null,
  description  text default '',
  subject      text default '',
  scheduled_at timestamptz not null,
  duration_min int not null default 60,
  room_id      text not null default gen_random_uuid()::text,  -- Jitsi room name
  status       text not null default 'scheduled',  -- 'scheduled', 'live', 'ended'
  max_students int default 0,  -- 0 = unlimited
  created_at   timestamptz not null default now()
);

alter table live_classes enable row level security;

-- RLS policies
CREATE POLICY "Anyone can view scheduled classes" ON live_classes
  FOR SELECT USING (true);

CREATE POLICY "Teachers can create classes" ON live_classes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'super_admin'))
  );

CREATE POLICY "Host can update own classes" ON live_classes
  FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Host can delete own classes" ON live_classes
  FOR DELETE USING (auth.uid() = host_id);

-- class_attendance — tracks who joined which class
create table class_attendance (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references live_classes(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  joined_at    timestamptz not null default now(),
  left_at      timestamptz,
  duration_sec int default 0,
  unique (class_id, user_id)
);

alter table class_attendance enable row level security;

CREATE POLICY "Users can view attendance for own classes" ON class_attendance
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM live_classes WHERE id = class_id AND host_id = auth.uid())
  );

CREATE POLICY "Users can insert own attendance" ON class_attendance
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attendance" ON class_attendance
  FOR UPDATE USING (auth.uid() = user_id);

create index live_classes_host_id_idx on live_classes(host_id);
create index live_classes_scheduled_at_idx on live_classes(scheduled_at);
create index class_attendance_class_id_idx on class_attendance(class_id);
