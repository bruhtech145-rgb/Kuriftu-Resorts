INSERT INTO public.members (
  email,
  full_name,
  loyalty_tier,
  points_balance,
  average_spend,
  onboarding_completed,
  avatar_url,
  category,
  last_stay_at,
  date
)
VALUES
  ('abinet@example.com', 'Abinet Tesfaye', 'Trekker', 1200, 450.00, true, NULL, NULL, NOW() - INTERVAL '15 days', (NOW() - INTERVAL '15 days')::DATE),
  ('blen@example.com', 'Blen Kebede', 'Pinnacle', 5500, 1200.00, true, NULL, NULL, NOW() - INTERVAL '2 days', (NOW() - INTERVAL '2 days')::DATE),
  ('dawit@example.com', 'Dawit Girma', 'Explorer', 400, 250.00, true, NULL, NULL, NOW() - INTERVAL '45 days', (NOW() - INTERVAL '45 days')::DATE),
  ('eleni@example.com', 'Eleni Tadesse', 'Summit', 3000, 800.00, true, NULL, NULL, NOW() - INTERVAL '10 days', (NOW() - INTERVAL '10 days')::DATE),
  ('fasil@example.com', 'Fasil Alemu', 'Explorer', 50, 50.00, true, NULL, NULL, NOW() - INTERVAL '120 days', (NOW() - INTERVAL '120 days')::DATE),
  ('genet@example.com', 'Genet Wolde', 'Pinnacle', 10000, 1500.00, true, NULL, NULL, NOW() - INTERVAL '5 days', (NOW() - INTERVAL '5 days')::DATE),
  ('habtam@example.com', 'Habtam Moges', 'Trekker', 800, 350.00, true, NULL, NULL, NOW() - INTERVAL '60 days', (NOW() - INTERVAL '60 days')::DATE),
  ('ismael@example.com', 'Ismael Idris', 'Summit', 2000, 600.00, true, NULL, NULL, NOW() - INTERVAL '20 days', (NOW() - INTERVAL '20 days')::DATE),
  ('jemal@example.com', 'Jemal Ahmed', 'Explorer', 200, 100.00, true, NULL, NULL, NOW() - INTERVAL '180 days', (NOW() - INTERVAL '180 days')::DATE),
  ('kalkidan@example.com', 'Kalkidan Bekele', 'Pinnacle', 4500, 950.00, true, NULL, NULL, NOW() - INTERVAL '8 days', (NOW() - INTERVAL '8 days')::DATE)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  loyalty_tier = EXCLUDED.loyalty_tier,
  points_balance = EXCLUDED.points_balance,
  average_spend = EXCLUDED.average_spend,
  onboarding_completed = EXCLUDED.onboarding_completed,
  avatar_url = EXCLUDED.avatar_url,
  category = EXCLUDED.category,
  last_stay_at = EXCLUDED.last_stay_at,
  date = EXCLUDED.date;
