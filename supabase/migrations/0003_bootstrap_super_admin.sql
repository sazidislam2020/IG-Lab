-- Ignite Lab — Bootstrap super admin
-- Build Week 1, Day 3
--
-- After you sign up with your email, run this in the SQL editor
-- to make yourself the super admin.
--
-- STEP 1: Sign up through the app with your email
-- STEP 2: Confirm your email (check Supabase for the confirmation email)
-- STEP 3: Run the query below, replacing YOUR_EMAIL with your actual email

-- Option A: Promote by email (run this after you've signed up)
UPDATE profiles
SET role = 'super_admin', status = 'approved'
WHERE email = 'YOUR_EMAIL_HERE';

-- Option B: If you already know your user ID
-- UPDATE profiles
-- SET role = 'super_admin', status = 'approved'
-- WHERE id = 'YOUR_USER_ID_HERE';

-- Verify it worked:
SELECT id, email, full_name, role, status FROM profiles;
