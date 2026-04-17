-- Seed 10 additional members for customer segmentation testing
INSERT INTO public.members (full_name, email, phone, loyalty_tier, points_balance, average_spend, onboarding_completed)
VALUES 
  ('Abinet Tesfaye', 'abinet@example.com', '+251 911 111111', 'Trekker', 1200, 450.00, true),
  ('Blen Kebede', 'blen@example.com', '+251 911 222222', 'Pinnacle', 5500, 1200.00, true),
  ('Dawit Girma', 'dawit@example.com', '+251 911 333333', 'Explorer', 400, 250.00, true),
  ('Eleni Tadesse', 'eleni@example.com', '+251 911 444444', 'Summit', 3000, 800.00, true),
  ('Fasil Alemu', 'fasil@example.com', '+251 911 555555', 'Explorer', 50, 50.00, true),
  ('Genet Wolde', 'genet@example.com', '+251 911 666666', 'Pinnacle', 10000, 1500.00, true),
  ('Habtam Moges', 'habtam@example.com', '+251 911 777777', 'Trekker', 800, 350.00, true),
  ('Ismael Idris', 'ismael@example.com', '+251 911 888888', 'Summit', 2000, 600.00, true),
  ('Jemal Ahmed', 'jemal@example.com', '+251 911 999999', 'Explorer', 200, 100.00, true),
  ('Kalkidan Bekele', 'kalkidan@example.com', '+251 911 000000', 'Pinnacle', 4500, 950.00, true)
ON CONFLICT (email) DO UPDATE SET 
  average_spend = EXCLUDED.average_spend,
  points_balance = EXCLUDED.points_balance,
  onboarding_completed = EXCLUDED.onboarding_completed;
