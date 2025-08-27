import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/supabase';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(url, serviceKey);
export const db = drizzle(supabase);
