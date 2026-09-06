-- Ignite Lab — Site Settings
-- Allows Super Admin and Admin to customize the landing page
-- Run this in Supabase SQL Editor

-- ---------------------------------------------------------------------
-- site_settings — key-value store for landing page content
-- Each row is a setting with a category, key, value, and type
-- ---------------------------------------------------------------------
create table site_settings (
  id           uuid primary key default gen_random_uuid(),
  category     text not null,          -- 'hero', 'features', 'pricing', 'footer', 'general'
  setting_key  text not null unique,   -- 'hero_title', 'hero_subtitle', etc.
  setting_value text,                   -- the actual value (text, JSON, etc.)
  setting_type  text not null default 'text', -- 'text', 'textarea', 'color', 'json', 'image_url'
  label        text not null,          -- human-readable label for admin UI
  description  text,                   -- help text for admin
  sort_order   int not null default 0, -- for ordering in admin UI
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table site_settings enable row level security;

-- Anyone can read site_settings (public content)
create policy "Public can read site settings"
  on site_settings for select
  using (true);

-- Only admins and super_admins can update
create policy "Admins can update site settings"
  on site_settings for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
      and profiles.status = 'approved'
    )
  );

-- Only admins can insert
create policy "Admins can insert site settings"
  on site_settings for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
      and profiles.status = 'approved'
    )
  );

-- ---------------------------------------------------------------------
-- Seed default values
-- ---------------------------------------------------------------------
insert into site_settings (category, setting_key, setting_value, setting_type, label, description, sort_order) values
-- General
('general', 'site_name', 'IGNITE LAB', 'text', 'Site Name', 'The name displayed in the navbar and footer', 1),
('general', 'site_tagline', 'Robotics Education Platform', 'text', 'Site Tagline', 'Short tagline shown in the hero badge', 2),

-- Hero
('hero', 'hero_badge', 'Free robotics education platform', 'text', 'Hero Badge Text', 'The pill badge above the headline', 10),
('hero', 'hero_title_line1', 'Code. Build.', 'text', 'Hero Title Line 1', 'First line of the hero headline', 11),
('hero', 'hero_title_accent', 'Ship robots.', 'text', 'Hero Accent Line', 'The highlighted/accent line of the headline', 12),
('hero', 'hero_subtitle', 'The hands-on platform where students write real code, control 3D robots, and master programming through gamified courses.', 'textarea', 'Hero Subtitle', 'Description text below the headline', 13),
('hero', 'hero_cta_text', 'Start Building Free', 'text', 'Hero CTA Text', 'Primary button text', 14),
('hero', 'hero_cta_link', '/signup', 'text', 'Hero CTA Link', 'Where the primary button goes', 15),
('hero', 'hero_stat1_num', '500+', 'text', 'Stat 1 Number', 'First stat number', 16),
('hero', 'hero_stat1_label', 'Students', 'text', 'Stat 1 Label', 'First stat label', 17),
('hero', 'hero_stat2_num', '7', 'text', 'Stat 2 Number', 'Second stat number', 18),
('hero', 'hero_stat2_label', 'Languages', 'text', 'Stat 2 Label', 'Second stat label', 19),
('hero', 'hero_stat3_num', '100%', 'text', 'Stat 3 Number', 'Third stat number', 20),
('hero', 'hero_stat3_label', 'Free Core', 'text', 'Stat 3 Label', 'Third stat label', 21),

-- Features
('features', 'features_title', 'Everything you need. Nothing you don''t.', 'textarea', 'Features Title', 'Section heading', 30),
('features', 'features_subtitle', 'From code execution to 3D simulation to live classes — a complete platform.', 'textarea', 'Features Subtitle', 'Section description', 31),
('features', 'feature_1_title', '3D Robot Simulation', 'text', 'Feature 1 Title', '', 32),
('features', 'feature_1_desc', 'Control physically accurate robot arms and joints in real-time. Write code, see it move.', 'textarea', 'Feature 1 Description', '', 33),
('features', 'feature_1_color', '#FF6B2B', 'color', 'Feature 1 Color', '', 34),
('features', 'feature_2_title', 'Multi-Language Sandbox', 'text', 'Feature 2 Title', '', 35),
('features', 'feature_2_desc', 'Python, Java, C, C++, JavaScript. Instant execution with syntax highlighting.', 'textarea', 'Feature 2 Description', '', 36),
('features', 'feature_2_color', '#22D3EE', 'color', 'Feature 2 Color', '', 37),
('features', 'feature_3_title', 'Gamified Learning', 'text', 'Feature 3 Title', '', 38),
('features', 'feature_3_desc', 'Earn points, unlock levels, face boss exams, and climb the leaderboard.', 'textarea', 'Feature 3 Description', '', 39),
('features', 'feature_3_color', '#4ADE80', 'color', 'Feature 3 Color', '', 40),
('features', 'feature_4_title', 'Teacher Dashboard', 'text', 'Feature 4 Title', '', 41),
('features', 'feature_4_desc', 'Assign tasks, track progress, run live evaluations, manage your classroom.', 'textarea', 'Feature 4 Description', '', 42),
('features', 'feature_4_color', '#FACC15', 'color', 'Feature 4 Color', '', 43),
('features', 'feature_5_title', 'Project Editor', 'text', 'Feature 5 Title', '', 44),
('features', 'feature_5_desc', 'VS Code-like editor with file trees, tabs, and one-click ZIP download.', 'textarea', 'Feature 5 Description', '', 45),
('features', 'feature_5_color', '#F87171', 'color', 'Feature 5 Color', '', 46),
('features', 'feature_6_title', 'Live Video Classes', 'text', 'Feature 6 Title', '', 47),
('features', 'feature_6_desc', 'Free Jitsi Meet video calls. Schedule, join, track attendance. Up to 100 participants.', 'textarea', 'Feature 6 Description', '', 48),
('features', 'feature_6_color', '#22D3EE', 'color', 'Feature 6 Color', '', 49),

-- How It Works
('how', 'how_title', 'From zero to builder in three steps', 'textarea', 'How It Works Title', '', 50),
('how', 'how_step1_title', 'Sign Up Free', 'text', 'Step 1 Title', '', 51),
('how', 'how_step1_desc', 'Create your account in 30 seconds. No credit card needed.', 'textarea', 'Step 1 Description', '', 52),
('how', 'how_step2_title', 'Pick a Course', 'text', 'Step 2 Title', '', 53),
('how', 'how_step2_desc', 'Python, Web Dev, and more. Each has live sessions, classwork, and boss exams.', 'textarea', 'Step 2 Description', '', 54),
('how', 'how_step3_title', 'Build & Ship', 'text', 'Step 3 Title', '', 55),
('how', 'how_step3_desc', 'Write code, control 3D robots, build projects, submit for evaluation.', 'textarea', 'Step 3 Description', '', 56),

-- Pricing
('pricing', 'pricing_title', 'Built for students in Bangladesh', 'textarea', 'Pricing Title', '', 60),
('pricing', 'pricing_subtitle', 'Start free. Upgrade when you''re ready.', 'textarea', 'Pricing Subtitle', '', 61),

-- CTA
('cta', 'cta_title', 'Ready to start building?', 'textarea', 'CTA Title', '', 70),
('cta', 'cta_subtitle', 'Join 500+ students already learning robotics and programming.', 'textarea', 'CTA Subtitle', '', 71),
('cta', 'cta_button_text', 'Create Free Account', 'text', 'CTA Button Text', '', 72),

-- Footer
('footer', 'footer_description', 'Robotics and programming education. Built for students in Bangladesh.', 'textarea', 'Footer Description', '', 80),
('footer', 'footer_copyright', '© 2025 Ignite Lab by DRILL', 'text', 'Footer Copyright', '', 81),
('footer', 'footer_made_in', 'Made in Bangladesh', 'text', 'Footer Made In', '', 82),

-- Colors (admin can change the accent color)
('theme', 'accent_color', '#FF6B2B', 'color', 'Accent Color', 'Primary brand color used throughout the site', 90),
('theme', 'accent_color_dark', '#E85D1A', 'color', 'Accent Color (Dark)', 'Darker shade for gradients', 91);
