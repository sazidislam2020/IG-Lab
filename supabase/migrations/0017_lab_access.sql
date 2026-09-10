-- Ignite Lab — Robot Lab Access Control
-- Run this in Supabase SQL Editor
--
-- Lets Admin / Super Admin control who can use the 3D Robot Lab:
--   free       → every approved user can use the lab
--   paid       → only users with an active paid subscription can use it
--   restricted → only teachers & admins can use it (students see a message)
-- Admins & Super Admins ALWAYS have full access, whatever the mode.

alter table site_settings add column if not exists setting_options text;

insert into site_settings (category, setting_key, setting_value, setting_type, setting_options, label, description, sort_order) values
('lab', 'lab_access_mode', 'free', 'select', 'free|paid|restricted', 'Robot Lab Access', 'Who can use the 3D Robot Lab. Free = everyone, Paid = active subscription required, Restricted = teachers & admins only. Admins always have full access.', 95)
on conflict (setting_key) do update
  set setting_value = excluded.setting_value,
      setting_type  = excluded.setting_type,
      setting_options = excluded.setting_options,
      label         = excluded.label,
      description   = excluded.description,
      category      = excluded.category,
      sort_order    = excluded.sort_order;