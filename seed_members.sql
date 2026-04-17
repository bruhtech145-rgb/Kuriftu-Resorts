INSERT INTO public.members (
  email,
  full_name,
  loyalty_tier,
  points_balance,
  average_spend,
  onboarding_completed,
  avatar_url,
  category
)
VALUES
  ('abinet@example.com', 'Abinet Tesfaye', 'Trekker', 1200, 450.00, true, NULL, NULL),
  ('blen@example.com', 'Blen Kebede', 'Pinnacle', 5500, 1200.00, true, NULL, NULL),
  ('dawit@example.com', 'Dawit Girma', 'Explorer', 400, 250.00, true, NULL, NULL),
  ('eleni@example.com', 'Eleni Tadesse', 'Summit', 3000, 800.00, true, NULL, NULL),
  ('fasil@example.com', 'Fasil Alemu', 'Explorer', 50, 50.00, true, NULL, NULL),
  ('genet@example.com', 'Genet Wolde', 'Pinnacle', 10000, 1500.00, true, NULL, NULL),
  ('habtam@example.com', 'Habtam Moges', 'Trekker', 800, 350.00, true, NULL, NULL),
  ('ismael@example.com', 'Ismael Idris', 'Summit', 2000, 600.00, true, NULL, NULL),
  ('jemal@example.com', 'Jemal Ahmed', 'Explorer', 200, 100.00, true, NULL, NULL),
  ('kalkidan@example.com', 'Kalkidan Bekele', 'Pinnacle', 4500, 950.00, true, NULL, NULL)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  loyalty_tier = EXCLUDED.loyalty_tier,
  points_balance = EXCLUDED.points_balance,
  average_spend = EXCLUDED.average_spend,
  onboarding_completed = EXCLUDED.onboarding_completed,
  avatar_url = EXCLUDED.avatar_url,
  category = EXCLUDED.category;
