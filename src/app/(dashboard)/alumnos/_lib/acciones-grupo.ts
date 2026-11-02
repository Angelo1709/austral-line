"use server";

// GRUPO ALUMNOS — acciones de los intereses del grupo. Corren con los permisos del usuario (RLS);
// el cálculo desde los integrantes lo hace una función de la base que verifica que seas del grupo.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const volverCon = (error: string) => redirect(`/alumnos?error=${encodeURIComponent(error)}`);

// Calcula (o recalcula) los intereses del grupo como el promedio de las estrellas de sus integrantes.
export async function calcularInteresesGrupo(formData: FormData) {
  await requireRol("alumno");
  const proyectoId = String(formData.get("proyecto_id"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("alumnos_calcular_intereses_grupo", { p_proyecto: proyectoId });
  if (error) volverCon(`No se pudieron calcular los intereses del grupo: ${error.message}`);
  revalidatePath("/alumnos");
}

// Guarda los ajustes del grupo: solo escribe los temas que cambiaron (así el historial queda limpio).
export async function guardarInteresesGrupo(formData: FormData) {
  const persona = await requireRol("alumno");
  const proyectoId = String(formData.get("proyecto_id"));
  const supabase = await createClient();
  const [maestro, actuales] = await Promise.all([
    supabase.from("alumnos_intereses_maestro").select("id").eq("activo", true),
    supabase.from("alumnos_grupo_intereses").select("interes_id, estrellas").eq("proyecto_id", proyectoId),
  ]);
  if (maestro.error || actuales.error) volverCon("No se pudieron leer los intereses del grupo.");
  const antes = new Map(actuales.data!.map((a) => [a.interes_id, a.estrellas]));

  const cambiados = [];
  const quitados = [];
  for (const { id } of maestro.data!) {
    const valor = Number(formData.get(`grupo_${id}`) ?? 0);
    if (!Number.isInteger(valor) || valor < 0 || valor > 5) continue;
    if (valor === 0 && antes.has(id)) quitados.push(id);
    if (valor >= 1 && antes.get(id) !== valor) {
      cambiados.push({ proyecto_id: proyectoId, interes_id: id, estrellas: valor, updated_by: persona.id, updated_at: new Date().toISOString() });
    }
  }

  if (cambiados.length) {
    const { error } = await supabase.from("alumnos_grupo_intereses").upsert(cambiados);
    if (error) volverCon(`No se pudieron guardar los intereses: ${error.message}`);
  }
  if (quitados.length) {
    const { error } = await supabase.from("alumnos_grupo_intereses").delete().eq("proyecto_id", proyectoId).in("interes_id", quitados);
    if (error) volverCon(`No se pudieron guardar los intereses: ${error.message}`);
  }
  revalidatePath("/alumnos");
  redirect(`/alumnos?ok=intereses&proyecto=${proyectoId}`);
}
