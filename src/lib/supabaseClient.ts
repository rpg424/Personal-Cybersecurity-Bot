import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://ckndiwmurwoexaqygtbl.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrbmRpd211cndvZXhhcXlndGJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NzkyNDIsImV4cCI6MjEwNzA1NTI0Mn0.fYTbs1xxOyAwtrqhC4d7aNYriEOdzyy2HZGxSeSyeco';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  DEFAULT_SUPABASE_URL;

const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


