import type { SupabaseClient } from "@supabase/supabase-js";

let supabaseAdmin: SupabaseClient | null = null;

export async function getSupabaseAdmin(): Promise<SupabaseClient> {
  if (supabaseAdmin) {
    return supabaseAdmin;
  }

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use Supabase storage",
    );
  }

  const { createClient } = await import("@supabase/supabase-js");

  supabaseAdmin = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseAdmin;
}
