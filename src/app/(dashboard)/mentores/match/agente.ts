// GRUPO MENTORES — agente de match proyecto–mentor.
// Lee el proyecto, los perfiles de mentores y los matches anteriores, y propone hasta 3 mentores.
// No asigna nada: devuelve sugerencias que el coordinador acepta o rechaza.
import { generateText, jsonSchema, Output } from "ai";
import type { createClient } from "@/lib/supabase/server";

export const MAX_SUGERENCIAS = 3;

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type Sugerencia = { mentor_id: string; afinidad: number; motivo: string };
export type Resultado = { sugerencias: Sugerencia[]; aviso: string | null };

const schema = jsonSchema<{ sugerencias: Sugerencia[]; aviso: string }>({
  type: "object",
  properties: {
    sugerencias: {
      type: "array",
      maxItems: MAX_SUGERENCIAS,
      items: {
        type: "object",
        properties: {
          mentor_id: { type: "string", description: "id exacto de la lista de mentores" },
          afinidad: { type: "integer", minimum: 0, maximum: 100 },
          motivo: { type: "string", description: "1 o 2 oraciones: qué de su trayectoria o experiencia se parece al proyecto" },
        },
        required: ["mentor_id", "afinidad", "motivo"],
        additionalProperties: false,
      },
    },
    aviso: {
      type: "string",
      description: "Vacío si está todo bien. Si no hay un buen match o los datos son raros o insuficientes, explicalo para el coordinador.",
    },
  },
  required: ["sugerencias", "aviso"],
  additionalProperties: false,
});

const instrucciones = `Sos el asistente de match proyecto–mentor del concurso de Emprendimientos de la Universidad Austral.
Tu trabajo es SUGERIR mentores para un proyecto; la decisión final la toma el coordinador.
Cómo comparar:
- Lo central es la similitud entre lo que hace el proyecto y A LO QUE SE DEDICÓ el mentor: su bio (trayectoria y formación),
  su industria, empresa y cargo. "En qué puede ayudar" y los años de experiencia ayudan a confirmar, pero pesan menos.
- La afinidad (0 a 100) mide esa similitud: alta si su trayectoria está en el mismo campo que el proyecto,
  baja si solo podría ayudar en algo general (por ejemplo, finanzas para cualquier startup).
- En el "motivo" nombrá concretamente qué de su trayectoria se parece al proyecto.
Reglas:
- Sugerí como máximo ${MAX_SUGERENCIAS} mentores, ordenados de mejor a peor match. Menos está bien si no hay buenos candidatos.
- Usá solo los mentores de la lista y su id exacto. No inventes datos que no estén en los perfiles.
- El "aviso" lo lee el coordinador: escribilo en lenguaje simple, sin nombres de campos ni datos técnicos.
- Tené en cuenta los matches anteriores: si el coordinador ya rechazó a un mentor para este proyecto, no lo vuelvas a sugerir salvo que sea claramente el mejor.
- Si un mentor no tiene perfil publicado, sabés muy poco de él: sugerilo solo si no hay nada mejor y avisalo.
- Si a un mentor ya lo quitaron de otros proyectos, tenelo en cuenta y mencionalo en el motivo si lo sugerís.
- Si ningún mentor encaja bien, si el proyecto casi no tiene descripción o si ves datos raros, explicalo en "aviso". Respondé en español.`;

export async function sugerirMentores(supabase: Supabase, proyectoId: string): Promise<Resultado> {
  const [proyecto, mentores, perfiles, historial] = await Promise.all([
    supabase.from("proyectos").select("nombre, descripcion, estado").eq("id", proyectoId).single(),
    supabase.from("personas").select("id, nombre").eq("rol", "mentor"),
    // El perfil es el que carga cada mentor con el agente de carga de perfil (mentores_perfil).
    supabase.from("mentores_perfil").select("persona_id, empresa, cargo, industria, anios_experiencia, bio, areas_ayuda, estado"),
    supabase.from("mentores_sugerencias").select("proyecto_id, mentor_id, estado"),
  ]);
  for (const r of [proyecto, mentores, perfiles, historial]) if (r.error) throw r.error;

  // Ya asignados, quitados de este proyecto o esperando decisión: pedir de nuevo trae otras opciones.
  const excluidos = new Set(
    historial.data!.filter((s) => s.proyecto_id === proyectoId && s.estado !== "rechazada").map((s) => s.mentor_id),
  );

  const candidatos = mentores.data!
    .filter((m) => !excluidos.has(m.id))
    .map((m) => {
      const perfil = perfiles.data!.find((p) => p.persona_id === m.id);
      return {
        id: m.id,
        nombre: m.nombre,
        perfil_publicado: perfil?.estado === "publicado",
        empresa: perfil?.empresa || "(sin completar)",
        cargo: perfil?.cargo || "(sin completar)",
        industria: perfil?.industria || "(sin completar)",
        anios_experiencia: perfil?.anios_experiencia ?? "(sin completar)",
        bio: perfil?.bio || "(sin completar)",
        en_que_puede_ayudar: perfil?.areas_ayuda || "(sin completar)",
        proyectos_que_ya_acompania: historial.data!.filter((s) => s.mentor_id === m.id && s.estado === "aceptada").length,
        rechazado_antes_para_este_proyecto: historial.data!.some(
          (s) => s.proyecto_id === proyectoId && s.mentor_id === m.id && s.estado === "rechazada",
        ),
        veces_que_lo_quitaron_de_otros_proyectos: historial.data!.filter(
          (s) => s.mentor_id === m.id && s.estado === "quitada",
        ).length,
      };
    });

  if (candidatos.length === 0) {
    return { sugerencias: [], aviso: "No quedan mentores para sugerir: los que hay ya están asignados, sugeridos o descartados para este proyecto." };
  }

  const { output } = await generateText({
    model: "anthropic/claude-sonnet-5.5",
    instructions: instrucciones,
    output: Output.object({ schema }),
    prompt: JSON.stringify({ proyecto: proyecto.data, mentores: candidatos }, null, 2),
  });

  // Nunca confiar ciegamente en la IA: solo ids válidos, sin repetir y como máximo 3.
  const validos = new Set(candidatos.map((c) => c.id));
  const vistos = new Set<string>();
  const sugerencias = output.sugerencias
    .filter((s) => validos.has(s.mentor_id) && !vistos.has(s.mentor_id) && vistos.add(s.mentor_id))
    .slice(0, MAX_SUGERENCIAS)
    .map((s) => ({ ...s, afinidad: Math.max(0, Math.min(100, Math.round(s.afinidad))) }));

  // Si no quedó ninguna sugerencia, siempre es una alerta para el coordinador.
  const aviso = output.aviso.trim() || (sugerencias.length === 0 ? "El agente no encontró ningún mentor que encaje con este proyecto." : null);
  return { sugerencias, aviso };
}
