import { supabase } from './src/lib/supabase';

async function check() {
  const { data, error } = await supabase.from('members').select('*');
  if (error) {
    console.error('Error fetching members:', error);
  } else {
    console.log('Total members found:', data.length);
    console.log('Sample member:', data[0]);
  }
}
check();
