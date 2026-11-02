"use server";

import { generateText } from "ai";
import { revalidatePath } from "next/cache";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type FormState = { success: boolean; message: string };

const categorias = ["comida", "formacion", "economico", "otro"] as const;

export async function registrarParticipacion(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireRol();
  const personaId = String(formData.get("persona_id") ?? "");
  const eventoId = String(formData.get("evento_id") ?? "");
  const fecha = String(formData.get("fecha") ?? "");
  const actividad = String(formData.get("actividad") ?? "").trim();

  if (!/^[0-9a-f-]{36}$/i.test(personaId) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
      actividad.length < 3 || actividad.length > 500 ||
      (eventoId && !/^[0-9a-f-]{36}$/i.test(eventoId))) {
    return { success: false, message: "Revisá los datos de la participación." };
  }
  const fechaLeida = new Date(`${fecha}T00:00:00Z`);
  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });
  if (Number.isNaN(fechaLeida.valueOf()) || fechaLeida.toISOString().slice(0, 10) !== fecha || fecha > hoy) {
    return { success: false, message: "La participación debe tener una fecha válida y no futura." };
  }

  const supabase = await createClient();
  const { data: persona } = await supabase.from("personas")
    .select("id").eq("id", personaId).in("rol", ["mentor", "jurado"]).maybeSingle();
  if (!persona) return { success: false, message: "Elegí un mentor o jurado válido." };

  const { error } = await supabase.from("austral_participaciones").insert({
    persona_id: personaId,
    evento_id: eventoId || null,
    fecha,
    actividad,
    creado_por: admin.id,
  });
  if (error) return { success: false, message: "No se pudo guardar la participación." };

  revalidatePath("/austral/incentivos");
  return { success: true, message: "Participación registrada." };
}

export async function generarPropuesta(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireRol();
  const personaId = String(formData.get("persona_id") ?? "");
  const categoria = String(formData.get("categoria") ?? "");
  const alternativa = String(formData.get("alternativa") ?? "").trim();

  if (!/^[0-9a-f-]{36}$/i.test(personaId) ||
      !categorias.includes(categoria as typeof categorias[number]) ||
      alternativa.length < 3 || alternativa.length > 200) {
    return { success: false, message: "Revisá la alternativa propuesta." };
  }

  const supabase = await createClient();
  const { data: persona } = await supabase.from("personas")
    .select("id, nombre, rol").eq("id", personaId).in("rol", ["mentor", "jurado"]).maybeSingle();
  if (!persona) return { success: false, message: "Elegí un mentor o jurado válido." };

  const { data: participaciones, error: participacionesError } = await supabase
    .from("austral_participaciones")
    .select("fecha, actividad")
    .eq("persona_id", personaId)
    .order("fecha", { ascending: false })
    .limit(5);
  if (participacionesError) return { success: false, message: "No se pudieron leer las participaciones." };
  if (!participaciones?.length) {
    return { success: false, message: "Registrá una participación antes de generar una propuesta." };
  }

  const resumen = participaciones.map((p) => `${p.fecha}: ${p.actividad.slice(0, 150)}`).join("\n");
  let fundamento = participaciones.length === 1
    ? `Se consideró la participación más reciente de ${persona.nombre}. `
    : `Se consideraron las ${participaciones.length} participaciones más recientes de ${persona.nombre}. `;
  fundamento += `La alternativa "${alternativa}" se presenta para estudio a partir de ` +
    `${participaciones.length === 1 ? "esta actividad" : "estas actividades"}: ${resumen}.`;

  if (process.env.AI_GATEWAY_API_KEY) {
    try {
      const resultado = await generateText({
        model: "anthropic/claude-sonnet-5.5",
        prompt: `Redactá en español un fundamento breve para una propuesta conceptual de incentivo.\n` +
          `Persona: ${persona.nombre} (${persona.rol}).\n` +
          `Categoría: ${categoria}. Alternativa a evaluar: ${alternativa}.\n` +
          `Participaciones registradas:\n${resumen}\n` +
          `Usá solo esos hechos. No afirmes que el beneficio está disponible, aprobado o asignado. ` +
          `No prometas pagos ni compromisos institucionales. Indicá que requiere revisión humana.`,
      });
      if (resultado.text.trim()) fundamento = resultado.text.trim();
    } catch {
      // El borrador sigue disponible si el gateway no responde.
    }
  }

  fundamento = `${fundamento.slice(0, 1800)}\n\nPropuesta conceptual: disponibilidad, presupuesto y aprobación institucional pendientes de validación.`;

  const { error } = await supabase.from("austral_propuestas_incentivos").insert({
    persona_id: personaId,
    categoria,
    alternativa,
    fundamento,
    participaciones_consideradas: participaciones.length,
    creado_por: admin.id,
  });
  if (error) return { success: false, message: "No se pudo guardar el borrador." };

  revalidatePath("/austral/incentivos");
  return { success: true, message: "Borrador creado para revisión." };
}

export async function cambiarEstado(formData: FormData) {
  await requireRol();
  const id = String(formData.get("id") ?? "");
  const estado = String(formData.get("estado") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["en_estudio", "descartada"].includes(estado)) return;

  const supabase = await createClient();
  const { error } = await supabase.from("austral_propuestas_incentivos")
    .update({ estado }).eq("id", id);
  if (error) throw error;
  revalidatePath("/austral/incentivos");
}
