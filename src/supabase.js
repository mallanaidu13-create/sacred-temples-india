import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Graceful mock when env vars are absent (e.g. local dev without .env)
const noopClient = {
  from: () => ({
    select: () => Promise.resolve({ data: [], error: null }),
    update: () => ({ eq: () => Promise.resolve({ error: null }) }),
  }),
};

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : noopClient;
