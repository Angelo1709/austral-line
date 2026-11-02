"use server";

// GRUPO ALUMNOS — guardado automático de las estrellas del perfil (una por vez, al tocarla).
// Corre con los permisos del alumno (RLS: cada uno gestiona solo sus intereses).
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const MINIMO_CALIFICADOS = 4;

export async function guardarEstrella(interesId: number, estrellas: number) {
  const persona = await requireRol("alumno");
  if (!Number.isInteger(interesId) || !Number.isInteger(estrellas) || estrellas < 0 || estrellas > 5) {
    return { error: "Valor inválido." };
  }
  const supabase = await createClient();

  if (estrellas === 0) {
    // Quitar: con el perfil ya armado, no se puede bajar del mínimo de temas calificados.
    const [{ data: actuales, error }, { data: perfil }] = await Promise.all([
      supabase.from("alumnos_intereses").select("interes_id").eq("persona_id", persona.id),
      supabase.from("alumnos_perfiles").select("persona_id").eq("persona_id", persona.id).maybeSingle(),
    ]);
    if (error) return { error: "No se pudo guardar. Probá de nuevo." };
    const loTiene = actuales.some((a) => a.interes_id === interesId);
    if (perfil && loTiene && actuales.length <= MINIMO_CALIFICADOS) {
      return { error: `Necesitás al menos ${MINIMO_CALIFICADOS} temas calificados: calificá otro antes de quitar este.` };
    }
    const { error: errorBorrar } = await supabase
      .from("alumnos_intereses")
      .delete()
      .eq("persona_id", persona.id)
      .eq("interes_id", interesId);
    if (errorBorrar) return { error: "No se pudo guardar. Probá de nuevo." };
    return { ok: true };
  }

  const { error } = await supabase
    .from("alumnos_intereses")
    .upsert({ persona_id: persona.id, interes_id: interesId, estrellas, updated_at: new Date().toISOString() });
  if (error) return { error: "No se pudo guardar. Probá de nuevo." };
  return { ok: true };
}
