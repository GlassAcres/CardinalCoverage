import { createClient } from "@supabase/supabase-js";

export const supabaseAnon = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const supabaseService = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
// Use service client on the server for privileged ops (assignments, ingestion). Supabase recommends supabase-js for serverless/Node. :contentReference[oaicite:4]{index=4}
