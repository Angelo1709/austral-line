import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Salta RLS y administra usuarios. Solo en el servidor y después de requireRol("admin"),
// o en src/app/api/cron/ después de validar CRON_SECRET.
export const createAdminClient = () =>
  createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
