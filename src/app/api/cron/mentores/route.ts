import { createAdminClient } from "@/lib/supabase/admin";
import { ponerAlDia, urlBase } from "@/app/(dashboard)/mentores/reuniones/agente";

// Cron diario de Vercel (vercel.json): arma los resúmenes pre-reunión que falten (#27).
// Sin sesión, así que usa el cliente admin; solo entra Vercel con CRON_SECRET.
// ponytail: ponerAlDia arma hasta 3 por vuelta; si un día faltan más, se ponen al día en los siguientes.
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("No autorizado", { status: 401 });
  }
  await ponerAlDia(createAdminClient(), await urlBase());
  return Response.json({ ok: true });
}
