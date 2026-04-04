-- 1. Create a public profiles table to store user information (auth-linked)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  is_admin BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Create a members table for guest/customer loyalty data
CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  loyalty_tier TEXT DEFAULT 'Explorer' NOT NULL,
  points_balance INTEGER DEFAULT 0 NOT NULL,
  average_spend NUMERIC DEFAULT 0 NOT NULL,
  ai_segment TEXT,
  onboarding_completed BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.members FOR SELECT USING (true);
CREATE POLICY "Enable admin write access for members" ON public.members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true) OR auth.jwt()->>'email' IN ('admin@kuriftu.com', 'bruhtech145@gmail.com')
  );

-- Create a trigger to automatically create a profile when a guest registers
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger to the auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert any existing users into the profiles table (backfill)
INSERT INTO public.profiles (id, email, full_name, phone)
SELECT 
  id, 
  email, 
  raw_user_meta_data->>'full_name', 
  raw_user_meta_data->>'phone'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Seed guest data for Marketing Segmentation AI testing
INSERT INTO public.members (full_name, email, phone, loyalty_tier, points_balance, average_spend)
VALUES 
  ('Alexander Premium', 'premium@guest.com', '+251 911 000001', 'Pinnacle', 8500, 450.50),
  ('Sarah Standard', 'standard1@guest.com', '+251 911 000002', 'Summit', 3200, 220.00),
  ('Michael Midtier', 'standard2@guest.com', '+251 911 000003', 'Trekker', 2800, 185.75),
  ('Billy Budget', 'budget1@guest.com', '+251 911 000004', 'Explorer', 450, 85.00),
  ('Bella Basic', 'budget2@guest.com', '+251 911 000005', 'Explorer', 120, 45.30),
  ('Larry Loyal', 'loyal@guest.com', '+251 911 000006', 'Pinnacle', 12500, 310.00),
  ('Diana Deluxe', 'diana@guest.com', '+251 911 000007', 'Summit', 5400, 380.00),
  ('Grant Guest', 'grant@guest.com', '+251 911 000008', 'Trekker', 1500, 140.00),
  ('Fiona Frequent', 'fiona@guest.com', '+251 911 000009', 'Explorer', 900, 115.00),
  ('Victor VIP', 'victor@guest.com', '+251 911 000010', 'Pinnacle', 15000, 550.00)
ON CONFLICT (email) DO UPDATE SET 
  average_spend = EXCLUDED.average_spend,
  points_balance = EXCLUDED.points_balance;

-- 2. Create tables for Dashboard Metrics

-- Pricing Approvals
CREATE TABLE IF NOT EXISTS public.pricing_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type TEXT NOT NULL,
  target_date TEXT NOT NULL,
  current_price NUMERIC NOT NULL,
  suggested_price NUMERIC NOT NULL,
  change_percent TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending'
);

-- AI Recommendations
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  current_price NUMERIC NOT NULL,
  suggested_price NUMERIC NOT NULL,
  change_percent TEXT NOT NULL,
  confidence TEXT NOT NULL
);

-- Resort Approvals
CREATE TABLE IF NOT EXISTS public.resort_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_name TEXT NOT NULL,
  occupancy TEXT NOT NULL,
  current_rate TEXT NOT NULL,
  suggested_rate TEXT NOT NULL,
  change_percent TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending'
);

-- Price Trends
CREATE TABLE IF NOT EXISTS public.price_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_name TEXT NOT NULL,
  current_price NUMERIC NOT NULL,
  suggested_price NUMERIC NOT NULL,
  order_idx INTEGER NOT NULL
);

-- Enable RLS & Add Policies for the new tables
ALTER TABLE public.pricing_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resort_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all" ON public.pricing_approvals FOR SELECT USING (true);
CREATE POLICY "Enable admin write access for pricing_approvals" ON public.pricing_approvals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true) OR auth.jwt()->>'email' IN ('admin@kuriftu.com', 'bruhtech145@gmail.com')
  );

CREATE POLICY "Enable read access for all" ON public.ai_recommendations FOR SELECT USING (true);
CREATE POLICY "Enable admin write access for ai_recommendations" ON public.ai_recommendations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true) OR auth.jwt()->>'email' IN ('admin@kuriftu.com', 'bruhtech145@gmail.com')
  );

CREATE POLICY "Enable read access for all" ON public.resort_approvals FOR SELECT USING (true);
CREATE POLICY "Enable admin write access for resort_approvals" ON public.resort_approvals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true) OR auth.jwt()->>'email' IN ('admin@kuriftu.com', 'bruhtech145@gmail.com')
  );

CREATE POLICY "Enable read access for all" ON public.price_trends FOR SELECT USING (true);
CREATE POLICY "Enable admin write access for price_trends" ON public.price_trends
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true) OR auth.jwt()->>'email' IN ('admin@kuriftu.com', 'bruhtech145@gmail.com')
  );

-- 3. Insert Seed Data to replace the hardcoded values

INSERT INTO public.pricing_approvals (room_type, target_date, current_price, suggested_price, change_percent, status) VALUES
('Deluxe King Suite', 'Apr 5, 2026', 280, 320, '+14.3%', 'Pending'),
('Standard Double Room', 'Apr 5, 2026', 180, 210, '+16.7%', 'Pending'),
('Ocean View Suite', 'Apr 6, 2026', 450, 420, '-6.7%', 'Pending');

INSERT INTO public.ai_recommendations (room_type, reason, current_price, suggested_price, change_percent, confidence) VALUES
('Deluxe King Suite', 'High weekend demand detected', 280, 320, '+14.3%', '95%'),
('Standard Double Room', 'Conference event nearby', 180, 210, '+16.7%', '88%'),
('Ocean View Suite', 'Competitor pricing lower', 450, 420, '-6.7%', '82%'),
('Junior Suite', 'Low inventory remaining', 220, 245, '+11.4%', '90%');

INSERT INTO public.resort_approvals (resort_name, occupancy, current_rate, suggested_rate, change_percent, reason, status) VALUES
('Kuriftu Bishoftu', '92%', '$280', '$325', '+16%', 'High Occupancy detected', 'Pending'),
('Kuriftu Entoto', '45%', '$180', '$155', '-14%', 'Low weekday demand', 'Pending'),
('Kuriftu Lake Tana', '78%', '$220', '$245', '+11%', 'Local festival upcoming', 'Pending'),
('Kuriftu Awash', '85%', '$195', '$225', '+15%', 'Weekend peak forecast', 'Pending');

INSERT INTO public.price_trends (date_name, current_price, suggested_price, order_idx) VALUES
('Mar 28', 240, 260, 1),
('Mar 29', 240, 275, 2),
('Mar 30', 250, 280, 3),
('Mar 31', 250, 290, 4),
('Apr 1', 260, 300, 5),
('Apr 2', 265, 310, 6),
('Apr 3', 270, 315, 7),
('Apr 4', 275, 320, 8);

-- 4. Seed Admin User
-- Insert into auth.users (This sets up the login credentials)
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

-- Ensure they are marked as an admin in the public.profiles table
UPDATE public.profiles 
SET is_admin = true 
WHERE email IN ('admin@kuriftu.com', 'bruhtech145@gmail.com');

-- 5. Create Rooms Table for CRUD
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  price NUMERIC NOT NULL,
  suggested_price NUMERIC,
  capacity INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'Available',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS & Add Policies for the new table
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Enable insert access for admins" ON public.rooms FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true) OR auth.jwt()->>'email' IN ('admin@kuriftu.com', 'bruhtech145@gmail.com')
);
CREATE POLICY "Enable update access for admins" ON public.rooms FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true) OR auth.jwt()->>'email' IN ('admin@kuriftu.com', 'bruhtech145@gmail.com')
);
CREATE POLICY "Enable delete access for admins" ON public.rooms FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true) OR auth.jwt()->>'email' IN ('admin@kuriftu.com', 'bruhtech145@gmail.com')
);

-- Insert Seed Data for Rooms
INSERT INTO public.rooms (name, type, price, capacity, status, description) VALUES
('Ocean View Suite 101', 'Ocean View Suite', 450, 2, 'Available', 'Luxurious suite with a beautiful ocean view.'),
('Deluxe King 202', 'Deluxe King Suite', 320, 2, 'Booked', 'Spacious king suite perfect for couples.'),
('Standard Double 303', 'Standard Double Room', 180, 4, 'Available', 'Comfortable double room for families.');