import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const members = [
  { full_name: 'Abinet Tesfaye', email: 'abinet@example.com', phone: '+251 911 111111', loyalty_tier: 'Trekker', points_balance: 1200, average_spend: 450.00, onboarding_completed: true },
  { full_name: 'Blen Kebede', email: 'blen@example.com', phone: '+251 911 222222', loyalty_tier: 'Pinnacle', points_balance: 5500, average_spend: 1200.00, onboarding_completed: true },
  { full_name: 'Dawit Girma', email: 'dawit@example.com', phone: '+251 911 333333', loyalty_tier: 'Explorer', points_balance: 400, average_spend: 250.00, onboarding_completed: true },
  { full_name: 'Eleni Tadesse', email: 'eleni@example.com', phone: '+251 911 444444', loyalty_tier: 'Summit', points_balance: 3000, average_spend: 800.00, onboarding_completed: true },
  { full_name: 'Fasil Alemu', email: 'fasil@example.com', phone: '+251 911 555555', loyalty_tier: 'Explorer', points_balance: 50, average_spend: 50.00, onboarding_completed: true },
  { full_name: 'Genet Wolde', email: 'genet@example.com', phone: '+251 911 666666', loyalty_tier: 'Pinnacle', points_balance: 10000, average_spend: 1500.00, onboarding_completed: true },
  { full_name: 'Habtam Moges', email: 'habtam@example.com', phone: '+251 911 777777', loyalty_tier: 'Trekker', points_balance: 800, average_spend: 350.00, onboarding_completed: true },
  { full_name: 'Ismael Idris', email: 'ismael@example.com', phone: '+251 911 888888', loyalty_tier: 'Summit', points_balance: 2000, average_spend: 600.00, onboarding_completed: true },
  { full_name: 'Jemal Ahmed', email: 'jemal@example.com', phone: '+251 911 999999', loyalty_tier: 'Explorer', points_balance: 200, average_spend: 100.00, onboarding_completed: true },
  { full_name: 'Kalkidan Bekele', email: 'kalkidan@example.com', phone: '+251 911 000000', loyalty_tier: 'Pinnacle', points_balance: 4500, average_spend: 950.00, onboarding_completed: true }
];

async function registerMembers() {
  console.log('Registering 10 new members...');
  
  for (const member of members) {
    const { data, error } = await supabase
      .from('members')
      .upsert(member, { onConflict: 'email' });
      
    if (error) {
      console.error(`Failed to register ${member.full_name}:`, error.message);
    } else {
      console.log(`Successfully registered ${member.full_name}`);
    }
  }
  
  console.log('Finished registration.');
}

registerMembers().catch(console.error);
