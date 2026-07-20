import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("usage_tracking")
    .select("id")
    .limit(1);

  if (error) {
    console.error("Supabase query failed:", error.message);
    console.error(
      "If the table is missing, run supabase/schema.sql in the Supabase SQL Editor.",
    );
    process.exit(1);
  }

  console.log("Supabase connection OK. usage_tracking rows sample:", data);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
