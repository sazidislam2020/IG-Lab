-- Ignite Lab — Learning Engine Access Control
-- Run this in Supabase SQL Editor
--
-- Lets Admin / Super Admin decide whether the Learning Engine (reader,
-- SQL / Excel / Python / Power BI labs) is free or paid:
--   free → every approved user can open it (default)
--   paid → only users with an active paid subscription can open it
-- Admins & Super Admins ALWAYS have full access, whatever the mode.
-- The engine stays visible to every role in both modes — paid mode only
-- changes what happens when a free user opens it.

alter table site_settings add column if not exists setting_options text;

insert into site_settings (category, setting_key, setting_value, setting_type, setting_options, label, description, sort_order) values
('learn', 'learn_access_mode', 'free', 'select', 'free|paid', 'Learning Engine Access', 'Who can open the Learning Engine. Free = every approved user, Paid = active subscription required. Admins always have full access, and everyone still sees the Learn entry points in the nav.', 96)
on conflict (setting_key) do update
  set setting_value  = excluded.setting_value,
      setting_type   = excluded.setting_type,
      setting_options = excluded.setting_options,
      category       = excluded.category,
      label          = excluded.label,
      description    = excluded.description,
      sort_order     = excluded.sort_order;