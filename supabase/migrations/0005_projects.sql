-- Projects — multi-file code projects for students
-- Each project has files stored as rows in project_files

create table projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  name         text not null,
  stack        text not null default 'html',  -- 'html', 'react', 'python', 'node', 'java', 'c', 'cpp'
  description  text default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table projects enable row level security;

-- RLS: users can CRUD their own projects
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Teachers/admins can view all projects
CREATE POLICY "Teachers can view all projects" ON projects
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'super_admin'))
  );

-- project_files — individual files within a project
create table project_files (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  path         text not null,         -- e.g. 'src/App.jsx', 'index.html', 'styles.css'
  content      text default '',
  is_binary    boolean default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (project_id, path)
);

alter table project_files enable row level security;

-- RLS: users can manage files in their own projects
CREATE POLICY "Users can view own project files" ON project_files
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can create project files" ON project_files
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can update own project files" ON project_files
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can delete own project files" ON project_files
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid())
  );

-- Index for fast lookups
create index project_files_project_id_idx on project_files(project_id);
create index projects_user_id_idx on projects(user_id);
