import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Service role client - bypasses RLS, use for admin operations
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// Anon client - for auth operations
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// Per-request client that forwards the user's access token.
// Use this for RLS-protected queries: auth.uid() will = the logged-in user.
export const getUserClient = (req) => {
  const authHeader = req.headers.authorization || '';
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
};
