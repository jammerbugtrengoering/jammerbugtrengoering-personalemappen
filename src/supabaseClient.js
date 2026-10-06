import { createClient } from "@supabase/supabase-js";

// Samme projekt og samme login som Worklist. detectSessionInUrl er slået fra som dér: koden fra et nulstillingslink behandles i appen selv.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { detectSessionInUrl: false } }
);
