"use server";
// GRUPO MENTORES — acciones del agente de carga de perfil. Todo pasa por el cliente con sesión
// del mentor (nunca el admin client), así que las políticas RLS son las que realmente impiden
// leer o escribir el perfil de otro mentor: esto solo agrega la lógica de negocio arriba.
import { revalidatePath } from "next/cache";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { camposPerfil, erroresParaPublicar, SIN_CLAVE_IA } from "../_lib";
import { organizarPerfilConIA, type PropuestaPerfil, type ResultadoOrganizar } from "./_ia";

type Evento = Database["public"]["Tables"]["mentores_perfil_eventos"]["Insert"];

async function clienteYPersona() {
  const persona = await requireRol("mentor");
  if (persona.rol !== "mentor") throw new Error("Solo un mentor carga su propio perfil.");
  const supabase = await createClient();
  return { supabase, persona };
}

async function registrarEvento(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventos: Omit<Evento, "persona_id">[],
  personaId: string,
) {
  const { error } = await supabase.from("mentores_perfil_eventos").insert(eventos.map((e) => ({ ...e, persona_id: personaId })));
  if (error) throw error;
}

// Crea el borrador la primera vez que el mentor hace algo (no con solo visitar la página), para
// que "tiempo en cargar el perfil" arranque cuando arranca de verdad, y para no ensuciar la base
// con borradores vacíos de alguien que solo pasó a mirar.
async function asegurarBorrador(supabase: Awaited<ReturnType<typeof createClient>>, personaId: string) {
  const { data: existente, error: errorLectura } = await supabase
    .from("mentores_perfil").select("persona_id").eq("persona_id", personaId).maybeSingle();
  if (errorLectura) throw errorLectura;
  if (existente) return;

  const { error } = await supabase.from("mentores_perfil").insert({ persona_id: personaId });
  if (error) throw error;
  await registrarEvento(supabase, [{ tipo: "inicio" }], personaId);
}

export async function organizar(textoOriginal: string): Promise<ResultadoOrganizar> {
  if (!process.env.AI_GATEWAY_API_KEY) throw new Error(SIN_CLAVE_IA);

  const { supabase, persona } = await clienteYPersona();
  const texto = textoOriginal.trim();
  if (!texto) throw new Error("Escribí algo sobre vos primero.");

  await asegurarBorrador(supabase, persona.id);
  const resultado = await organizarPerfilConIA(texto);

  const eventos: Omit<Evento, "persona_id">[] = [
    { tipo: "organizado_ia", detalle: { propuesta: resultado.propuesta } },
    ...resultado.correcciones.map((c) => ({ tipo: "correccion_ia" as const, detalle: { ...c } })),
  ];
  if (resultado.advertenciaSpam) eventos.push({ tipo: "marcado_spam", detalle: { motivo: resultado.motivoSpam } });
  await registrarEvento(supabase, eventos, persona.id);

  const { error } = await supabase.from("mentores_perfil")
    .update({ texto_original: texto, updated_at: new Date().toISOString() })
    .eq("persona_id", persona.id);
  if (error) throw error;

  revalidatePath("/mentores/perfil-publico");
  return resultado;
}

// El mentor eligió, campo por campo, qué valores aceptar (de la propuesta de la IA, o escritos a
// mano en el modo sin IA); lo que no aceptó mantiene el valor que ya tenía (nunca se pisa sin que
// él elija reemplazarlo). Crea el borrador si hace falta: el modo manual no pasa por organizar().
export async function guardarCambios(camposAceptados: Partial<PropuestaPerfil>) {
  const { supabase, persona } = await clienteYPersona();

  const { data: actual, error: errorActual } = await supabase
    .from("mentores_perfil").select("estado, ediciones_post_publicacion").eq("persona_id", persona.id).maybeSingle();
  if (errorActual) throw errorActual;

  if (!actual) {
    const { error } = await supabase.from("mentores_perfil").insert({ persona_id: persona.id, ...camposAceptados });
    if (error) throw error;
    await registrarEvento(supabase, [{ tipo: "inicio" }], persona.id);
  } else {
    const yaEstabaPublicado = actual.estado === "publicado";
    const { error } = await supabase.from("mentores_perfil").update({
      ...camposAceptados,
      updated_at: new Date().toISOString(),
      ...(yaEstabaPublicado ? { ediciones_post_publicacion: actual.ediciones_post_publicacion + 1 } : {}),
    }).eq("persona_id", persona.id);
    if (error) throw error;
  }

  await registrarEvento(supabase, [{ tipo: "guardado_borrador", detalle: { campos: Object.keys(camposAceptados) } }], persona.id);
  revalidatePath("/mentores/perfil-publico");
  revalidatePath("/mentores");
}

export async function publicar() {
  const { supabase, persona } = await clienteYPersona();

  const { data: perfil, error: errorPerfil } = await supabase
    .from("mentores_perfil").select("*").eq("persona_id", persona.id).maybeSingle();
  if (errorPerfil) throw errorPerfil;
  if (!perfil) throw new Error("Todavía no empezaste a cargar tu perfil.");

  const { data: spamSinRevisar, error: errorSpam } = await supabase
    .from("mentores_perfil_eventos").select("id")
    .eq("persona_id", persona.id).eq("tipo", "marcado_spam").eq("revisado", false).limit(1);
  if (errorSpam) throw errorSpam;
  if (spamSinRevisar.length > 0) {
    return { errores: ["Tu carga quedó marcada para revisión del administrador antes de poder publicarse."] };
  }

  const faltantes = erroresParaPublicar(perfil);
  if (faltantes.length > 0) {
    const labels = camposPerfil.filter((c) => (faltantes as string[]).includes(c.campo)).map((c) => c.label);
    return { errores: labels.map((l) => `Falta completar "${l}".`) };
  }

  const { error } = await supabase.from("mentores_perfil").update({
    estado: "publicado",
    publicado_at: perfil.publicado_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("persona_id", persona.id);
  if (error) throw error;

  await registrarEvento(supabase, [{ tipo: "publicado" }], persona.id);
  revalidatePath("/mentores/perfil-publico");
  revalidatePath("/mentores");
  return { errores: [] };
}
