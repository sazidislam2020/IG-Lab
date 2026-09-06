import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase env vars. Copy .env.example to .env.local and fill in your project values."
  );
}

let supabase;
try {
  supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");
} catch (err) {
  console.error("Failed to create Supabase client:", err);
  // Create a stub client so the app doesn't crash on import
  supabase = {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signUp: async () => { throw new Error("Supabase not configured"); },
      signInWithPassword: async () => { throw new Error("Supabase not configured"); },
      signOut: async () => {},
    },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
  };
}

export { supabase };
