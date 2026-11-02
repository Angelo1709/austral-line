// GRUPO MENTORES — agente de resumen pre-reunión.
// Antes de cada reunión junta lo cargado en la app (proyecto, equipo, reuniones anteriores de ESE mentor con
// ESE equipo y el próximo evento), arma un resumen y se lo programa al mentor por mail 24 h antes.
// Reglas del relevamiento: solo datos de las personas de esa reunión, no inventa lo que falta, avisa al
// coordinador si falta info importante o ve un proyecto trabado o un conflicto, y lo único que escribe son
// resúmenes (mentores_resumenes). Corre con la sesión de quien guarda, así que respeta sus permisos.
import { headers } from "next/headers";
import { generateText, jsonSchema, Output } from "ai";
import type { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { cancelarCorreo, enviarCorreo, modoPrueba } from "../_resend";
import { ANTICIPACION, enEspera, LIMITE_RESEND, vigente, yaSalio } from "./estado";
import { fechaCorta, fechaHora } from "./fechas";
import { estadosProyecto, mailAviso, mailResumen, type DatosResumen, type Sintesis } from "./mail";
import { conMail } from "@/lib/supabase/tipos";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Resumen = Pick<Database["public"]["Tables"]["mentores_resumenes"]["Row"], "id" | "estado" | "programado_para" | "resend_id" | "created_at">;

const MAX_ANTERIORES = 3;
const MAX_TEMAS = 4;

export const hayIA = () => !!(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);

// Dirección de la app para el link del mail: en Vercel la de producción, en local la del navegador.
export async function urlBase() {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

// Saca de circulación un resumen viejo: si todavía no salió, cancela el mail en Resend.
async function retirar(supabase: Supabase, resumen: Resumen, estado: "reemplazado" | "cancelado") {
  const pendiente = !!resumen.resend_id && !!resumen.programado_para && new Date(resumen.programado_para).getTime() > Date.now();
  const problema = pendiente ? await cancelarCorreo(resumen.resend_id!) : null;
  const { error } = await supabase.from("mentores_resumenes").update({ estado, ...(problema && { error: problema }) }).eq("id", resumen.id);
  if (error) throw error;
  return problema;
}

const schema = jsonSchema<{ sintesis: string; temas: string[]; aviso: string }>({
  type: "object",
  properties: {
    sintesis: {
      type: "string",
      description: "2 a 4 oraciones: en qué está el proyecto y qué conviene abordar en esta reunión, según los datos.",
    },
    temas: {
      type: "array",
      maxItems: MAX_TEMAS,
      items: { type: "string" },
      description: "Temas concretos para charlar, por ejemplo retomar un próximo paso pendiente. Puede quedar vacío.",
    },
    aviso: {
      type: "string",
      description: "Vacío si está todo bien. Si el coordinador tiene que mirar algo, explicalo en 1 o 2 oraciones.",
    },
  },
  required: ["sintesis", "temas", "aviso"],
  additionalProperties: false,
});

const instrucciones = `Sos el asistente de Mentores del concurso de Emprendimientos de la Universidad Austral.
Antes de cada reunión entre un mentor y un equipo, le preparás al mentor un resumen corto para que llegue preparado.
Reglas:
- Usá SOLO los datos que te paso. Si algo no está, no lo completes ni lo supongas: lo que falta ya se le muestra al mentor aparte.
- Hablá solo del proyecto y de las personas de esta reunión. Si las notas mencionan a otras personas o proyectos, no las incluyas.
- En "sintesis", si es la primera reunión, decilo y basate en la descripción del proyecto.
- Completá "aviso" solo si hay algo que el coordinador tiene que mirar: falta información importante para la reunión,
  el proyecto parece trabado (los mismos pendientes reunión tras reunión, sin avances) o las notas muestran un conflicto
  (dentro del equipo o con el mentor). Si está todo bien, dejalo vacío.
- Datos menores que faltan (el lugar o link, las notas de una reunión) no son motivo de aviso: el mentor ya los ve en
  "falta_informacion" y los resuelve él.
Respondé en español rioplatense, claro y sin exagerar.`;

async function sintetizar(d: DatosResumen): Promise<{ ia: Sintesis; aviso: string | null; error: string | null }> {
  if (!hayIA()) return { ia: null, aviso: null, error: null };
  try {
    const { output } = await generateText({
      model: "anthropic/claude-sonnet-5.5",
      instructions: instrucciones,
      output: Output.object({ schema }),
      prompt: JSON.stringify({
        reunion: { cuando: fechaHora(d.reunion.inicio), lugar: d.reunion.lugar },
        mentor: d.mentor.nombre,
        equipo: d.integrantes,
        proyecto: { nombre: d.proyecto.nombre, estado: estadosProyecto[d.proyecto.estado] ?? d.proyecto.estado, descripcion: d.proyecto.descripcion },
        reuniones_anteriores: d.anteriores.map((r) => ({ cuando: fechaHora(r.inicio), notas: r.notas, proximos_pasos: r.proximos_pasos })),
        proximo_evento_del_concurso: d.proximoEvento && { ...d.proximoEvento, inicio: fechaHora(d.proximoEvento.inicio) },
        falta_informacion: d.faltantes,
      }, null, 2),
    });
    const sintesis = output.sintesis.trim();
    return {
      ia: sintesis ? { sintesis, temas: output.temas.map((t) => t.trim()).filter(Boolean).slice(0, MAX_TEMAS) } : null,
      aviso: output.aviso.trim() || null,
      error: null,
    };
  } catch (e) {
    return { ia: null, aviso: null, error: `La IA no respondió (${e instanceof Error ? e.message : "error desconocido"}): el resumen salió solo con los datos.` };
  }
}

// Avisos que no dependen de la IA: sin esto no hay resumen que valga.
function avisoPorDatos(d: DatosResumen) {
  if (d.integrantes.length === 0) return "El proyecto no tiene integrantes cargados: no sabemos con quién es la reunión.";
  if (!d.proyecto.descripcion && !d.anteriores.some((r) => r.notas)) {
    return "Casi no hay información del proyecto (ni descripción ni notas de reuniones anteriores): el resumen sale prácticamente vacío.";
  }
  return null;
}

// "Avisar humano": el aviso le llega por mail en el momento a los coordinadores (admins), no solo queda en la app.
async function avisarCoordinador(supabase: Supabase, datos: DatosResumen, aviso: string, url: string) {
  const { data: coordinadores, error } = await supabase.from("personas_contacto").select("email").eq("rol", "admin");
  if (error) throw error;
  if (coordinadores.length === 0) return { ok: false, problema: "no hay coordinadores cargados en Miembros" };
  const { asunto, html } = mailAviso(datos, aviso, url);
  for (const { email } of coordinadores.filter(conMail)) {
    const r = await enviarCorreo({ para: email, asunto, html });
    if (!r.ok) return { ok: false, problema: r.error };
  }
  return { ok: true, problema: null };
}

export type Resultado = { ok: boolean; mensaje: string };

// Arma (o rehace) el resumen de una reunión y lo programa 24 h antes. Si ya salió, no hace nada,
// salvo que la reunión haya cambiado de fecha (`nuevaFecha`): ese resumen era para otro día.
export async function prepararResumen(
  supabase: Supabase, reunionId: string, url: string, { nuevaFecha = false } = {},
): Promise<Resultado> {
  const ahora = Date.now();
  const [reunion, resumenes] = await Promise.all([
    supabase
      .from("mentores_reuniones")
      .select("id, inicio, lugar, cancelada, proyecto_id, mentor_id, proyectos(nombre, descripcion, estado), mentor:personas_contacto!mentores_reuniones_mentor_id_fkey(nombre, email)")
      .eq("id", reunionId)
      .single(),
    supabase.from("mentores_resumenes").select("id, estado, programado_para, resend_id, created_at, aviso_mail_at").eq("reunion_id", reunionId),
  ]);
  if (reunion.error) throw reunion.error;
  if (resumenes.error) throw resumenes.error;
  const r = reunion.data;
  const mailMentor = r.mentor.email;
  if (!mailMentor) return { ok: false, mensaje: "No tenés permiso para ver el mail de este mentor." };
  const actual = vigente(resumenes.data);

  const salio = !!actual && yaSalio(actual, ahora);
  if (salio && !nuevaFecha) return { ok: true, mensaje: "El resumen ya le llegó al mentor, así que no se vuelve a mandar." };
  if (r.cancelada || new Date(r.inicio).getTime() <= ahora || enEspera(r.inicio, ahora)) {
    const retirado = !!actual && !salio;
    const problema = retirado ? await retirar(supabase, actual, "cancelado") : null;
    const motivo = r.cancelada ? "la reunión está cancelada" : enEspera(r.inicio, ahora) ? "falta más de un mes, se programa más adelante" : "la reunión ya pasó";
    if (problema) return { ok: false, mensaje: `No se pudo cancelar el resumen que estaba programado: ${problema}` };
    return { ok: true, mensaje: retirado ? `Se canceló el resumen que estaba programado (${motivo}).` : `No se programa resumen: ${motivo}.` };
  }

  const ahoraIso = new Date(ahora).toISOString();
  const [integrantes, anteriores, evento] = await Promise.all([
    supabase.from("proyecto_integrantes").select("personas(nombre)").eq("proyecto_id", r.proyecto_id),
    // Solo reuniones que ya pasaron, de este mentor con este equipo: nada de otros mentores ni proyectos.
    supabase
      .from("mentores_reuniones")
      .select("inicio, notas, proximos_pasos")
      .eq("proyecto_id", r.proyecto_id)
      .eq("mentor_id", r.mentor_id)
      .eq("cancelada", false)
      .lt("inicio", ahoraIso)
      .order("inicio", { ascending: false })
      .limit(MAX_ANTERIORES),
    supabase.from("eventos").select("nombre, inicio, lugar").gte("inicio", ahoraIso).order("inicio").limit(1).maybeSingle(),
  ]);
  for (const q of [integrantes, anteriores, evento]) if (q.error) throw q.error;

  const datos: DatosResumen = {
    reunion: { id: r.id, inicio: r.inicio, lugar: r.lugar },
    mentor: { nombre: r.mentor.nombre, email: mailMentor },
    proyecto: r.proyectos,
    integrantes: integrantes.data!.map((i) => i.personas.nombre),
    anteriores: anteriores.data!,
    proximoEvento: evento.data,
    faltantes: [],
  };
  datos.faltantes = [
    ...(!datos.reunion.lugar ? ["Lugar o link de la reunión"] : []),
    ...(!datos.proyecto.descripcion ? ["Descripción del proyecto"] : []),
    ...(datos.integrantes.length === 0 ? ["Integrantes del proyecto"] : []),
    ...datos.anteriores.filter((a) => !a.notas).map((a) => `Notas de la reunión del ${fechaCorta(a.inicio)}`),
  ];

  const { ia, aviso: avisoIA, error: errorIA } = await sintetizar(datos);
  const aviso = [avisoPorDatos(datos), avisoIA].filter(Boolean).join(" ") || null;
  const { asunto, html } = mailResumen(datos, ia, url);

  const envio = new Date(r.inicio).getTime() - ANTICIPACION;
  const programadoPara = envio > ahora + 60_000 ? new Date(envio).toISOString() : undefined; // si falta menos de 24 h, sale ya
  const resultado = await enviarCorreo({ para: datos.mentor.email, asunto, html, programadoPara });

  // El aviso se escala por mail una sola vez: si el resumen anterior ya se lo había mandado al coordinador, no se repite.
  const avisoPrevio = actual?.aviso_mail_at ?? null;
  const escalado = aviso && !avisoPrevio && resultado.ok ? await avisarCoordinador(supabase, datos, aviso, url) : null;
  const avisoMailAt = aviso ? avisoPrevio ?? (escalado?.ok ? new Date().toISOString() : null) : null;

  const { error } = await supabase.from("mentores_resumenes").insert({
    reunion_id: r.id,
    email: datos.mentor.email,
    asunto,
    html,
    con_ia: !!ia,
    aviso,
    aviso_mail_at: avisoMailAt,
    programado_para: programadoPara ?? null,
    estado: !resultado.ok ? "error" : modoPrueba() ? "simulado" : programadoPara ? "programado" : "enviado",
    resend_id: resultado.ok ? resultado.id : null,
    error: [resultado.ok ? null : resultado.error, errorIA, escalado?.ok === false ? `Aviso al coordinador: ${escalado.problema}` : null]
      .filter(Boolean).join(" ") || null,
  });
  if (error) throw error;
  // Si el nuevo no se pudo mandar, el anterior (si había) sigue en pie.
  if (!resultado.ok) return { ok: false, mensaje: `No se pudo programar el resumen. ${resultado.error}` };
  const problema = actual ? await retirar(supabase, actual, "reemplazado") : null;

  const partes = [
    programadoPara
      ? `Resumen ${actual ? "actualizado" : "listo"}: le llega al mentor el ${fechaHora(programadoPara)}.`
      : "Resumen enviado al mentor (falta menos de 24 h para la reunión).",
    ...(!ia ? [hayIA() ? "Salió sin la síntesis de IA porque la IA no respondió." : "Salió sin la síntesis de IA porque falta la clave AI_GATEWAY_API_KEY."] : []),
    ...(!aviso ? [] : escalado?.ok
      ? ["El asistente le mandó un aviso por mail al coordinador."]
      : avisoPrevio
        ? ["El aviso para el coordinador sigue en pie (ya se le había mandado por mail)."]
        : [`El asistente dejó un aviso para el coordinador, pero no se lo pudo mandar por mail (${escalado?.problema}).`]),
    ...(problema ? [`Ojo: no se pudo cancelar el resumen anterior (${problema}).`] : []),
  ];
  const mensaje = partes.join(" ");
  return { ok: true, mensaje: modoPrueba() ? `Simulado (falta la clave de Resend, no salió ningún mail): ${mensaje}` : mensaje };
}

// Cuando se cargan notas, las próximas reuniones de ese mentor con ese equipo tienen info nueva: se rehacen.
export async function rehacerSiguientes(supabase: Supabase, proyectoId: string, mentorId: string, url: string) {
  const { data, error } = await supabase
    .from("mentores_reuniones")
    .select("id")
    .eq("proyecto_id", proyectoId)
    .eq("mentor_id", mentorId)
    .eq("cancelada", false)
    .gt("inicio", new Date().toISOString())
    .order("inicio")
    .limit(5);
  if (error) throw error;
  for (const { id } of data) await prepararResumen(supabase, id, url);
}

// Arma los resúmenes que falten en el próximo mes: reuniones que estaban a más de 30 días, que cargó otro agente
// o cuyo envío falló. Corre después de cada cambio en Reuniones, con un tope para no demorar la pantalla.
export async function ponerAlDia(supabase: Supabase, url: string, excluir: string[] = []) {
  const ahora = Date.now();
  const { data, error } = await supabase
    .from("mentores_reuniones")
    .select("id, mentores_resumenes(estado, created_at)")
    .eq("cancelada", false)
    .gt("inicio", new Date(ahora).toISOString())
    .lte("inicio", new Date(ahora + ANTICIPACION + LIMITE_RESEND).toISOString())
    .order("inicio")
    .limit(50);
  if (error) throw error;
  const faltan = data.filter((r) => !excluir.includes(r.id) && !vigente(r.mentores_resumenes)).slice(0, 3);
  for (const { id } of faltan) await prepararResumen(supabase, id, url);
}
