-- Create an Admin user in Supabase
-- WARNING: This is for testing only. Replace the password hash in production!
-- 1. Insert into auth.users (This sets up the login credentials)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) 
SELECT 
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@kuriftu.com',
    crypt('admin123', gen_salt('bf')), -- Hash the password 'admin123'
    NOW(),
    NULL,
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "System Admin"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@kuriftu.com'
);

-- 2. Ensure they are marked as an admin in the public.profiles table
-- The trigger from our previous setup might have already created their profile, 
-- so we just need to update it to make sure is_admin is true.
UPDATE public.profiles 
SET is_admin = true 
WHERE email = 'admin@kuriftu.com';