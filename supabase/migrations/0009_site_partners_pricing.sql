-- Ignite Lab — Site Partners & Pricing Tables
-- Allows Admin to manage partner logos and pricing plans
-- Run this in Supabase SQL Editor

-- ---------------------------------------------------------------------
-- site_partners — partner/logo entries
-- ---------------------------------------------------------------------
create table site_partners (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  image_url    text not null,            -- Google Drive link or any URL
  sort_order   int not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table site_partners enable row level security;

-- Anyone can read partners (public content)
create policy "Public can read partners"
  on site_partners for select
  using (true);

-- Only admins can manage partners
create policy "Admins can insert partners"
  on site_partners for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
      and profiles.status = 'approved'
    )
  );

create policy "Admins can update partners"
  on site_partners for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
      and profiles.status = 'approved'
    )
  );

create policy "Admins can delete partners"
  on site_partners for delete
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
      and profiles.status = 'approved'
    )
  );

-- Seed some default partners
insert into site_partners (name, image_url, sort_order) values
('DRILL', 'https://drive.google.com/file/d/1PLACEHOLDER_DRILL/view', 1),
('Supabase', 'https://drive.google.com/file/d/1PLACEHOLDER_SUPABASE/view', 2),
('Vercel', 'https://drive.google.com/file/d/1PLACEHOLDER_VERCEL/view', 3),
('Three.js', 'https://drive.google.com/file/d/1PLACEHOLDER_THREEJS/view', 4),
('Monaco', 'https://drive.google.com/file/d/1PLACEHOLDER_MONACO/view', 5),
('Jitsi', 'https://drive.google.com/file/d/1PLACEHOLDER_JITSI/view', 6),
('Judge0', 'https://drive.google.com/file/d/1PLACEHOLDER_JUDGE0/view', 7),
('GitHub', 'https://drive.google.com/file/d/1PLACEHOLDER_GITHUB/view', 8);

-- ---------------------------------------------------------------------
-- site_pricing_plans — pricing package entries
-- ---------------------------------------------------------------------
create table site_pricing_plans (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  price           text not null,           -- e.g. '৳500', 'Free', 'Custom'
  discount_price  text,                     -- e.g. '৳400' (shows crossed-out original)
  period          text not null default '/month', -- e.g. '/month', 'forever', 'per student/yr'
  features        jsonb not null default '[]', -- JSON array of feature strings
  accent_color    text not null default '#A1A1AA', -- badge/accent color for this plan
  is_popular      boolean not null default false,
  sort_order      int not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

alter table site_pricing_plans enable row level security;

-- Anyone can read pricing (public content)
create policy "Public can read pricing plans"
  on site_pricing_plans for select
  using (true);

-- Only admins can manage pricing
create policy "Admins can insert pricing plans"
  on site_pricing_plans for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
      and profiles.status = 'approved'
    )
  );

create policy "Admins can update pricing plans"
  on site_pricing_plans for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
      and profiles.status = 'approved'
    )
  );

create policy "Admins can delete pricing plans"
  on site_pricing_plans for delete
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
      and profiles.status = 'approved'
    )
  );

-- Seed default pricing plans
insert into site_pricing_plans (name, price, discount_price, period, features, accent_color, is_popular, sort_order) values
('Explorer', 'Free', null, 'forever',
 '["Level 0 access", "Community forums", "3 sandbox runs/day", "Basic simulation"]'::jsonb,
 '#A1A1AA', false, 1),

('Builder', '৳500', null, '/month',
 '["All course content", "Unlimited sandbox", "AI coding hints", "Certificate on completion", "Priority support"]'::jsonb,
 '#FF6B2B', true, 2),

('Engineer', '৳1,200', null, '/month',
 '["Full simulation lab", "3D robot access", "Boss exams & leaderboards", "Export projects as ZIP", "Live class hosting"]'::jsonb,
 '#22D3EE', false, 3),

('Institution', 'Custom', null, 'per student/yr',
 '["Admin dashboard", "Bulk user management", "Custom curriculum", "API access", "SLA guarantee"]'::jsonb,
 '#FACC15', false, 4);
