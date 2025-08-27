import { drizzle } from "drizzle-orm/node-postgres";
import { createClient } from "@supabase/supabase-js";
import pkg from "pg";

export const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
export const pool = new pkg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
export const db = drizzle(pool);
