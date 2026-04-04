import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function checkSchema() {
  const { data, error } = await supabase.from('bookings').select('*').limit(1);
  if (error) {
    console.error('Error fetching bookings:', error);
  } else {
    console.log('Bookings columns:', Object.keys(data[0] || {}));
  }
}

checkSchema();
