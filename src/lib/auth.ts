import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { puedeVer, type Rol } from "@/lib/secciones";

// Usuario logueado + su persona (rol). persona = null si nadie lo sumó en Miembros.
export const getUsuario = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims.email;
  if (!email) redirect("/login");
  // El mail ya no se lee directo de personas (#29): mi_persona_id() lo resuelve en la base.
  const { data: id } = await supabase.rpc("mi_persona_id");
  const { data: persona } = id
    ? await supabase.from("personas").select("id, nombre, rol").eq("id", id).maybeSingle()
    : { data: null };
  return { email, persona };
});

// Usalo arriba de cada sección: `await requireRol("jurado")`. El admin siempre pasa.
export async function requireRol(...permitidos: Rol[]) {
  const { persona } = await getUsuario();
  if (!persona || !puedeVer(persona.rol, permitidos)) redirect("/");
  return persona;
}
