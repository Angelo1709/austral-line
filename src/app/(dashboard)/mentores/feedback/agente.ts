// GRUPO MENTORES — agente de coordinación + feedback post reunión (opción B del relevamiento).
// Cuando termina una reunión le pide al mentor y a cada alumno del equipo un feedback corto, recuerda una sola vez
// a quien no contesta y, si siguen sin contestar, avisa al coordinador. Si una respuesta trae algo grave, se lo
// escala al coordinador en el momento. Con las respuestas arma un resumen anónimo que ve solo el coordinador.
// Lo único que escribe son encuestas y resúmenes de feedback (y la marca de "feedback pedido" de la reunión).
// Corre con la sesión de quien está en la app, así que respeta sus permisos.
import { generateText, jsonSchema, Output } from "ai";
import type { createClient } from "@/lib/supabase/server";
import { enviarCorreo, modoPrueba } from "../_resend";
import { hayIA } from "../reuniones/agente";
import { mailPedido, mailUrgente } from "./mail";
import { DURACION, puntajes, RECORDATORIO, SIN_RESPUESTA, VENTANA } from "./reglas";
import { conMail } from "@/lib/supabase/tipos";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const MAX_POR_VUELTA = 3;
const MODELO = "anthropic/claude-sonnet-5.5";

const estadoMail = (r: { ok: boolean }) => (!r.ok ? "error" : modoPrueba() ? "simulado" : "enviado");

// Pide el feedback de las reuniones que ya terminaron. Corre cuando un mentor o el coordinador entra a Mentores.
export async function pedirFeedback(supabase: Supabase, url: string) {
  const ahora = Date.now();
  const { data, error } = await supabase
    .from("mentores_reuniones")
    .select("id, inicio, proyecto_id, proyectos(nombre), mentor:personas_contacto!mentores_reuniones_mentor_id_fkey(id, nombre, email)")
    .eq("cancelada", false)
    .is("feedback_pedido_at", null)
    .lte("inicio", new Date(ahora - DURACION).toISOString())
    .gte("inicio", new Date(ahora - DURACION - VENTANA).toISOString())
    .order("inicio")
    .limit(MAX_POR_VUELTA);
  if (error) throw error;

  let pedidas = 0;
  for (const r of data) {
    // Primero se marca la reunión: si otra pestaña ya la tomó, no devuelve nada y no se pide dos veces.
    const { data: tomada, error: errorMarca } = await supabase
      .from("mentores_reuniones")
      .update({ feedback_pedido_at: new Date().toISOString() })
      .eq("id", r.id)
      .is("feedback_pedido_at", null)
      .select("id");
    if (errorMarca) throw errorMarca;
    if (!tomada.length) continue;

    const { data: integrantes, error: errorIntegrantes } = await supabase
      .from("proyecto_integrantes")
      .select("personas:personas_contacto(id, nombre, email, rol)")
      .eq("proyecto_id", r.proyecto_id);
    if (errorIntegrantes) throw errorIntegrantes;
    const alumnos = integrantes.map((i) => i.personas).filter((p) => p.rol === "alumno");

    const destinatarios = [
      { ...r.mentor, papel: "mentor" as const, con_quien: "el equipo" },
      ...alumnos.map((a) => ({ ...a, papel: "alumno" as const, con_quien: r.mentor.nombre })),
    ].filter(conMail);
    for (const d of destinatarios) {
      const encuesta = {
        id: crypto.randomUUID(),
        reunion_id: r.id,
        persona_id: d.id,
        papel: d.papel,
        proyecto_nombre: r.proyectos.nombre,
        reunion_inicio: r.inicio,
        con_quien: d.con_quien,
      };
      // El mail sale antes de guardar porque el mentor no puede volver a leer las encuestas de los alumnos.
      const envio = await enviarCorreo({ para: d.email, ...mailPedido({ ...encuesta, nombre: d.nombre }, url) });
      const { error: errorEncuesta } = await supabase.from("mentores_encuestas").insert({
        ...encuesta,
        mail_estado: estadoMail(envio),
        mail_error: envio.ok ? null : envio.error,
      });
      if (errorEncuesta && errorEncuesta.code !== "23505") throw errorEncuesta; // 23505 = ya la tenía
      pedidas++;
    }
  }
  return pedidas;
}

// Lo que hace el agente cuando entra el coordinador: un único recordatorio, cierra lo que quedó sin respuesta
// y arma los resúmenes de las reuniones que ya tienen todas sus encuestas cerradas.
export async function ponerAlDia(supabase: Supabase, url: string) {
  const ahora = Date.now();
  const { data: pendientes, error } = await supabase
    .from("mentores_encuestas")
    .select("id, created_at, recordatorio_at, con_quien, proyecto_nombre, reunion_inicio, personas:personas_contacto(nombre, email)")
    .eq("estado", "pendiente")
    .lte("created_at", new Date(ahora - RECORDATORIO).toISOString())
    .limit(20);
  if (error) throw error;

  for (const e of pendientes) {
    // Se deja de esperar a los 5 días, pero nunca sin haber mandado el recordatorio y darle 48 h más para contestar.
    const vencida = !!e.recordatorio_at
      && new Date(e.created_at).getTime() + SIN_RESPUESTA <= ahora
      && new Date(e.recordatorio_at).getTime() + RECORDATORIO <= ahora;
    if (vencida) {
      // No se insiste más: queda como "sin respuesta" y el coordinador lo ve en sus avisos.
      const { error: errorCierre } = await supabase.from("mentores_encuestas").update({ estado: "sin_respuesta" }).eq("id", e.id);
      if (errorCierre) throw errorCierre;
    } else if (!e.recordatorio_at) {
      // Primero se marca: si otra pestaña ya lo mandó, no devuelve nada y no sale dos veces.
      const { data: marcada, error: errorRecordatorio } = await supabase
        .from("mentores_encuestas")
        .update({ recordatorio_at: new Date().toISOString() })
        .eq("id", e.id)
        .is("recordatorio_at", null)
        .select("id");
      if (errorRecordatorio) throw errorRecordatorio;
      if (!marcada.length || !e.personas.email) continue;
      const envio = await enviarCorreo({ para: e.personas.email, ...mailPedido({ ...e, nombre: e.personas.nombre }, url, { recordatorio: true }) });
      if (!envio.ok) {
        const { error: errorMail } = await supabase.from("mentores_encuestas").update({ mail_error: envio.error }).eq("id", e.id);
        if (errorMail) throw errorMail;
      }
    }
  }

  const [encuestas, resumenes] = await Promise.all([
    supabase.from("mentores_encuestas").select("reunion_id, estado"),
    supabase.from("mentores_feedback_resumenes").select("reunion_id"),
  ]);
  if (encuestas.error) throw encuestas.error;
  if (resumenes.error) throw resumenes.error;
  const conResumen = new Set(resumenes.data.map((r) => r.reunion_id));
  const porReunion = Map.groupBy(encuestas.data, (e) => e.reunion_id);
  const listas = [...porReunion]
    .filter(([id, es]) => !conResumen.has(id) && es.every((e) => e.estado !== "pendiente"))
    .slice(0, MAX_POR_VUELTA);
  for (const [id] of listas) await armarResumen(supabase, id);
}

const schemaResumen = jsonSchema<{ resumen: string; aviso: string }>({
  type: "object",
  properties: {
    resumen: {
      type: "string",
      description: "3 a 6 oraciones: cómo vivieron la reunión el mentor y el equipo, qué funcionó y qué conviene mejorar.",
    },
    aviso: {
      type: "string",
      description: "Vacío si está todo bien. Si el coordinador tiene que hacer algo, explicalo en 1 o 2 oraciones.",
    },
  },
  required: ["resumen", "aviso"],
  additionalProperties: false,
});

const instruccionesResumen = `Sos el asistente de Mentores del concurso de Emprendimientos de la Universidad Austral.
Después de cada reunión de mentoría, el mentor y los alumnos del equipo contestan un feedback corto. Con esas respuestas
le armás al coordinador de la materia un resumen.
Reglas:
- Usá SOLO las respuestas que te paso. No supongas lo que no dicen.
- Es anónimo: no nombres a nadie. Hablá de "el mentor" y "el equipo" (o "un alumno"), nunca de quién dijo qué en particular.
- Contá cómo lo vivió cada lado, qué funcionó y qué se podría mejorar. Si los dos lados no coinciden, decilo.
- Completá "aviso" solo si el coordinador tiene que hacer algo: un conflicto, una reunión que no sirvió para nada,
  un pedido explícito de ayuda, o una diferencia muy grande entre lo que dicen el mentor y el equipo. Si no, dejalo vacío.
Respondé en español rioplatense, claro y sin exagerar.`;

type Respuesta = { papel: string; puntaje: number | null; sirvio: string | null; mejorar: string | null; urgente: string | null };

const promedio = (rs: Respuesta[]) => {
  const ps = rs.map((r) => r.puntaje).filter((p) => p != null);
  return ps.length ? (ps.reduce((s, p) => s + p, 0) / ps.length).toFixed(1) : null;
};

// Sin IA: el resumen sale solo con los números, para que el coordinador igual tenga algo.
function resumenPorDatos(rs: Respuesta[], pedidas: number) {
  const mentor = rs.filter((r) => r.papel === "mentor");
  const equipo = rs.filter((r) => r.papel === "alumno");
  return [
    `Contestaron ${rs.length} de ${pedidas}.`,
    mentor.length ? `El mentor la calificó con ${promedio(mentor) ?? "—"} de 5.` : "El mentor no contestó.",
    equipo.length ? `El equipo, con ${promedio(equipo) ?? "—"} de 5 en promedio (${equipo.length} ${equipo.length === 1 ? "respuesta" : "respuestas"}).` : "Ningún alumno contestó.",
  ].join(" ");
}

// Uno por reunión. `rehacer` lo reemplaza (por ejemplo, si alguien contestó tarde); si no, el que ya existe queda.
export async function armarResumen(supabase: Supabase, reunionId: string, { rehacer = false } = {}) {
  const { data, error } = await supabase
    .from("mentores_encuestas")
    .select("papel, estado, puntaje, sirvio, mejorar, urgente, proyecto_nombre")
    .eq("reunion_id", reunionId);
  if (error) throw error;
  const respuestas = data.filter((e) => e.estado === "respondida");

  let resumen = respuestas.length ? resumenPorDatos(respuestas, data.length) : "Nadie contestó el feedback de esta reunión.";
  let aviso: string | null = respuestas.length ? null : "Nadie contestó el feedback: conviene preguntarles directamente cómo les fue.";
  let conIA = false;
  if (respuestas.length && hayIA()) {
    try {
      const { output } = await generateText({
        model: MODELO,
        instructions: instruccionesResumen,
        output: Output.object({ schema: schemaResumen }),
        prompt: JSON.stringify({
          proyecto: data[0].proyecto_nombre,
          encuestas_pedidas: data.length,
          // Sin nombres: solo el papel de cada uno en la reunión.
          respuestas: respuestas.map((r) => ({
            quien: r.papel === "mentor" ? "el mentor" : "un alumno del equipo",
            utilidad: r.puntaje ? `${r.puntaje} de 5 (${puntajes[r.puntaje]})` : null,
            que_le_sirvio: r.sirvio,
            que_mejoraria: r.mejorar,
            para_el_coordinador: r.urgente,
          })),
        }, null, 2),
      });
      if (output.resumen.trim()) {
        resumen = output.resumen.trim();
        conIA = true;
      }
      aviso = output.aviso.trim() || null;
    } catch {
      // Si la IA falla, queda el resumen con los números.
    }
  }

  const { error: errorResumen } = await supabase.from("mentores_feedback_resumenes").upsert({
    reunion_id: reunionId,
    resumen,
    respuestas: respuestas.length,
    pedidas: data.length,
    con_ia: conIA,
    aviso,
    util: null, // es un resumen nuevo: el coordinador lo vuelve a calificar
    created_at: new Date().toISOString(),
  }, { onConflict: "reunion_id", ignoreDuplicates: !rehacer });
  if (errorResumen) throw errorResumen;
}

const schemaGrave = jsonSchema<{ grave: boolean; motivo: string }>({
  type: "object",
  properties: {
    grave: { type: "boolean", description: "true si el coordinador tiene que enterarse ya, sin esperar al resumen." },
    motivo: { type: "string", description: "Si es grave, por qué, en 1 oración. Si no, vacío." },
  },
  required: ["grave", "motivo"],
  additionalProperties: false,
});

const instruccionesGrave = `Sos el asistente de Mentores del concurso de Emprendimientos de la Universidad Austral.
Leés el feedback que dejó una persona después de una reunión de mentoría y decidís si el coordinador tiene que
enterarse YA. Es grave: maltrato, acoso, discriminación, una falta de respeto, un conflicto serio en el equipo o con el
mentor, alguien que quiere dejar el proyecto o la materia, o un pedido de ayuda urgente.
No es grave: una reunión floja, que no se hayan entendido o sugerencias para mejorar. Eso va en el resumen de siempre.`;

// Después de que alguien contesta: si trae algo grave (o pidió que el coordinador se entere), se escala en el momento.
export async function revisarRespuesta(supabase: Supabase, encuestaId: string, url: string) {
  const { data: e, error } = await supabase
    .from("mentores_encuestas")
    .select("id, papel, puntaje, sirvio, mejorar, urgente, proyecto_nombre, reunion_inicio, personas(nombre)")
    .eq("id", encuestaId)
    .single();
  if (error) throw error;

  let grave = false;
  let motivo: string | null = null;
  if (hayIA()) {
    try {
      const { output } = await generateText({
        model: MODELO,
        instructions: instruccionesGrave,
        output: Output.object({ schema: schemaGrave }),
        prompt: JSON.stringify({
          quien: e.papel === "mentor" ? "el mentor" : "un alumno",
          utilidad: e.puntaje,
          que_le_sirvio: e.sirvio,
          que_mejoraria: e.mejorar,
          para_el_coordinador: e.urgente,
        }, null, 2),
      });
      grave = output.grave;
      motivo = output.motivo.trim() || null;
    } catch {
      // Sin respuesta de la IA, cuenta solo lo que la persona pidió explícitamente.
    }
  }
  const escalar = grave || !!e.urgente;
  if (!escalar) {
    const { error: errorMarca } = await supabase.from("mentores_encuestas").update({ grave: false }).eq("id", e.id);
    if (errorMarca) throw errorMarca;
    return false;
  }

  const { data: admins, error: errorAdmins } = await supabase.from("personas_contacto").select("email").eq("rol", "admin");
  if (errorAdmins) throw errorAdmins;
  const { asunto, html } = mailUrgente({
    ...e,
    nombre: e.personas.nombre,
    motivo: motivo ?? (e.urgente ? "Pidió que el coordinador se entere." : null),
    comentarios: [e.sirvio, e.mejorar].filter((c) => c !== null),
  }, url);
  for (const a of admins.filter(conMail)) await enviarCorreo({ para: a.email, asunto, html });

  const { error: errorEscalada } = await supabase
    .from("mentores_encuestas")
    .update({ grave, grave_motivo: motivo, escalada_at: new Date().toISOString() })
    .eq("id", e.id);
  if (errorEscalada) throw errorEscalada;
  return true;
}
