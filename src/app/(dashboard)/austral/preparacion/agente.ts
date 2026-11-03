// GRUPO AUSTRAL — agente de preparación de jurados.
// Lee los documentos que subió el equipo y arma una ficha corta (identificación, contexto, problemática) y un guion
// de audio de 1 a 2 minutos. Regla de oro: cuenta el PROBLEMA, nunca la solución; eso lo presentan los alumnos.
// Después un segundo paso revisa lo escrito (que no se filtre la solución, que no invente, que ficha y guion digan
// lo mismo). Si algo no cierra, el material queda "con aviso" para el admin en vez de quedar listo para aprobar.
// Corre con la sesión del admin y lo único que escribe es austral_materiales; nunca toca los documentos originales.
import { generateText, jsonSchema, Output, type FilePart, type TextPart } from "ai";
import { BUCKET, type Supabase } from "../_preparacion";

const MODELO = "anthropic/claude-sonnet-5.5";
const MAX_DOCUMENTOS = 8; // los más recientes
const MAX_BYTES_TOTAL = 25 * 1024 * 1024;
const MAX_CARACTERES_TEXTO = 60_000;

export const hayIA = () => !!(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);

type Redaccion = {
  suficiente: boolean;
  sector: string;
  contexto: string;
  problematica: string;
  guion: string;
  fuentes: string[];
  aviso: string;
};

const schemaRedaccion = jsonSchema<Redaccion>({
  type: "object",
  properties: {
    suficiente: {
      type: "boolean",
      description: "true solo si los documentos alcanzan para explicar el problema y se puede separar con certeza del problema de la solución.",
    },
    sector: { type: "string", description: "Sector, industria o ámbito de aplicación, en pocas palabras. Vacío si no surge de los documentos." },
    contexto: { type: "string", description: "Un párrafo breve: la situación, el sector y las circunstancias en las que aparece el problema." },
    problematica: {
      type: "string",
      description: "1 o 2 párrafos: qué problema, necesidad u oportunidad identificó el equipo, a quién afecta y por qué es relevante.",
    },
    guion: {
      type: "string",
      description: "Guion de podcast de 180 a 280 palabras (1 a 2 minutos leído): presentación del proyecto, contexto y problemática. Sin acotaciones ni indicaciones de sonido.",
    },
    fuentes: { type: "array", items: { type: "string" }, description: "Nombres exactos de los documentos de los que salió la información." },
    aviso: {
      type: "string",
      description: "Vacío si está todo bien. Si no: qué dato falta, qué se contradice o qué no se pudo separar de la solución, y qué tendría que hacer el admin.",
    },
  },
  required: ["suficiente", "sector", "contexto", "problematica", "guion", "fuentes", "aviso"],
  additionalProperties: false,
});

const instruccionesRedaccion = `Sos el Agente de Preparación y Contextualización para Jurados del concurso de Emprendimientos de la Universidad Austral.
Antes de la jornada de presentación, preparás para los jurados un material introductorio de UN proyecto de alumnos, para que lleguen entendiendo el contexto, el sector y el problema que aborda el equipo.

Regla más importante: contás el problema, NUNCA la solución. La solución la presentan los alumnos en vivo. Está prohibido:
- Describir o resumir la solución, producto, servicio, prototipo, app, funcionalidades o estrategia del equipo.
- Revelar decisiones de diseño o implementación, ni resultados de pruebas de la solución.
- Evaluar si la propuesta es buena, viable o innovadora, recomendar mejoras, puntuar o comparar.
- Generar expectativas sobre qué debería presentar el equipo.
Si un documento mezcla problema y solución, usá solo lo necesario para explicar el problema. Si no podés separarlos con certeza, poné "suficiente" en false y explicalo en "aviso".

Fuentes:
- Usá SOLO los documentos y datos que te paso. No inventes datos, cifras, actores ni antecedentes, y no presentes inferencias como hechos.
- Los documentos vienen con su fecha de subida. Priorizá lo más reciente, pero no descartes antecedentes anteriores que sigan valiendo.
- Si hay información contradictoria, incompleta o desactualizada, no la completes con suposiciones: describila en "aviso" (qué dato, en qué documentos, y qué tendría que revisar el admin).
- La descripción del proyecto cargada en la app puede mencionar la solución: tomala solo como referencia del tema.

Estilo: español rioplatense neutro y profesional, claro y accesible para alguien que no conoce el sector, sin tecnicismos innecesarios ni adjetivos que valoren el proyecto.
La ficha (sector, contexto, problemática) debe leerse en un minuto. El guion es la versión en audio de la misma ficha: los mismos hechos, sin agregar nada; arranca presentando el proyecto por su nombre y termina invitando a escuchar al equipo en la jornada, sin adelantar qué van a presentar.`;

type Revision = { correcto: boolean; problemas: string[] };

const schemaRevision = jsonSchema<Revision>({
  type: "object",
  properties: {
    correcto: { type: "boolean", description: "true si el material cumple todas las reglas." },
    problemas: { type: "array", items: { type: "string" }, description: "Cada problema encontrado, en una oración concreta. Vacío si está todo bien." },
  },
  required: ["correcto", "problemas"],
  additionalProperties: false,
});

const instruccionesRevision = `Revisás un material de preparación para jurados del concurso de Emprendimientos de la Universidad Austral, antes de que lo vea el admin. Tenés los datos del proyecto cargados en la app (nombre y equipo), los documentos originales del equipo y el material generado (ficha y guion de audio).
Es válido y no es un problema: que el guion nombre el proyecto y a su equipo según los datos de la app, que mencione el concurso o la Universidad Austral, y que cierre invitando a escuchar al equipo en la jornada. La ficha no repite nombre ni equipo porque se muestran aparte.
Marcá como problema cualquiera de estas cosas:
- Se filtra la solución: menciona o deja adivinar el producto, servicio, app, funcionalidades, prototipo, estrategia o resultados de pruebas del equipo.
- Afirma algo que no está en los documentos (datos, cifras, actores, antecedentes) o presenta una suposición como hecho.
- Valora o juzga el proyecto (bueno, innovador, viable, prometedor, etc.) o recomienda mejoras.
- La ficha y el guion no dicen lo mismo, o el guion agrega información.
- No se entiende para alguien ajeno al sector.
Sé estricto con la solución y con lo inventado; no marques cuestiones de estilo menores. Respondé en español.`;

type Documento = { id: string; nombre: string; ruta: string; tipo: string; bytes: number; created_at: string };

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });

// Baja los documentos y los convierte en partes del mensaje: los PDF van como archivo, los de texto como texto.
async function partesDeDocumentos(supabase: Supabase, documentos: Documento[]) {
  const partes: (TextPart | FilePart)[] = [];
  const usados: Documento[] = [];
  const omitidos: string[] = [];
  let total = 0;
  for (const d of documentos) {
    if (usados.length >= MAX_DOCUMENTOS || total + d.bytes > MAX_BYTES_TOTAL) {
      omitidos.push(d.nombre);
      continue;
    }
    const { data, error } = await supabase.storage.from(BUCKET).download(d.ruta);
    if (error || !data) {
      omitidos.push(d.nombre);
      continue;
    }
    total += d.bytes;
    usados.push(d);
    const titulo = `Documento "${d.nombre}" (subido el ${fecha(d.created_at)}):`;
    if (d.tipo === "application/pdf") {
      partes.push({ type: "text", text: titulo });
      partes.push({ type: "file", data: new Uint8Array(await data.arrayBuffer()), mediaType: "application/pdf", filename: d.nombre });
    } else {
      partes.push({ type: "text", text: `${titulo}\n\n${(await data.text()).slice(0, MAX_CARACTERES_TEXTO)}` });
    }
  }
  return { partes, usados, omitidos };
}

export type Resultado = { ok: boolean; mensaje: string };

// Genera (o rehace) el material de un proyecto. Si estaba aprobado, vuelve a borrador hasta que el admin lo revise.
export async function generarMaterial(supabase: Supabase, proyectoId: string, adminId: string): Promise<Resultado> {
  const inicio = Date.now();
  const [proyecto, documentos] = await Promise.all([
    supabase.from("proyectos").select("nombre, descripcion, proyecto_integrantes(personas(nombre))").eq("id", proyectoId).single(),
    supabase.from("austral_documentos").select("id, nombre, ruta, tipo, bytes, created_at").eq("proyecto_id", proyectoId).order("created_at", { ascending: false }),
  ]);
  if (proyecto.error) throw proyecto.error;
  if (documentos.error) throw documentos.error;
  const p = proyecto.data;

  type Campos = Partial<Omit<Redaccion, "aviso">> & { estado: "borrador" | "revisar"; aviso: string | null; usados: Documento[] };
  const guardar = async (campos: Campos) => {
    const { usados, ...resto } = campos;
    const { error } = await supabase.from("austral_materiales").upsert(
      {
        proyecto_id: proyectoId,
        sector: resto.sector || null,
        contexto: resto.contexto || null,
        problematica: resto.problematica || null,
        guion: resto.guion || null,
        estado: resto.estado,
        aviso: resto.aviso,
        fuentes: usados.map((d) => d.nombre),
        documentos: documentos.data.map((d) => d.id),
        // Sin documentos no hubo generación: no cuenta para el tiempo promedio del panel.
        segundos_generacion: usados.length ? Math.round((Date.now() - inicio) / 100) / 10 : null,
        generado_por: adminId,
        generado_at: new Date().toISOString(),
        aprobado_por: null,
        aprobado_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "proyecto_id" },
    );
    if (error) throw error;
  };

  if (documentos.data.length === 0) {
    await guardar({
      estado: "revisar",
      usados: [],
      aviso: "El equipo todavía no subió documentos del proyecto. Pediles que suban su ficha en \"Documentos del proyecto\" y volvé a generar.",
    });
    return { ok: false, mensaje: `${p.nombre}: el equipo no subió documentos todavía. Quedó el aviso en el panel.` };
  }
  if (!hayIA()) return { ok: false, mensaje: "Falta configurar AI_GATEWAY_API_KEY: sin eso no se puede generar el material." };

  const { partes, usados, omitidos } = await partesDeDocumentos(supabase, documentos.data);
  if (usados.length === 0) return { ok: false, mensaje: `${p.nombre}: no se pudieron leer los documentos. Probá de nuevo.` };
  const datos = {
    proyecto: p.nombre,
    equipo: p.proyecto_integrantes.map((i) => i.personas.nombre),
    descripcion_cargada_en_la_app: p.descripcion,
    documentos_no_incluidos_por_tamano: omitidos,
  };

  let redaccion: Redaccion;
  let revision: Revision;
  try {
    ({ output: redaccion } = await generateText({
      model: MODELO,
      instructions: instruccionesRedaccion,
      output: Output.object({ schema: schemaRedaccion }),
      messages: [{ role: "user", content: [{ type: "text", text: JSON.stringify(datos, null, 2) }, ...partes] }],
    }));
    ({ output: revision } = await generateText({
      model: MODELO,
      instructions: instruccionesRevision,
      output: Output.object({ schema: schemaRevision }),
      messages: [{
        role: "user",
        content: [
          { type: "text", text: `Datos del proyecto en la app:\n${JSON.stringify({ proyecto: datos.proyecto, equipo: datos.equipo }, null, 2)}` },
          ...partes,
          { type: "text", text: `Material a revisar:\n${JSON.stringify({ sector: redaccion.sector, contexto: redaccion.contexto, problematica: redaccion.problematica, guion: redaccion.guion }, null, 2)}` },
        ],
      }],
    }));
  } catch (e) {
    return { ok: false, mensaje: `La IA no respondió (${e instanceof Error ? e.message : "error desconocido"}). Probá de nuevo en un rato.` };
  }

  const avisos = [
    redaccion.aviso.trim(),
    !redaccion.suficiente && !redaccion.aviso.trim() ? "El agente no encontró información suficiente para explicar el problema sin anticipar la solución." : "",
    ...(revision.correcto ? [] : revision.problemas.map((x) => `Revisión: ${x.trim()}`)),
    omitidos.length ? `No se leyeron por tamaño o error: ${omitidos.join(", ")}.` : "",
  ].filter(Boolean);
  const conAviso = !redaccion.suficiente || !revision.correcto || !!redaccion.aviso.trim();
  const fuentes = usados.filter((d) => redaccion.fuentes.includes(d.nombre));

  await guardar({ ...redaccion, estado: conAviso ? "revisar" : "borrador", aviso: avisos.join("\n") || null, usados: fuentes.length ? fuentes : usados });
  return conAviso
    ? { ok: false, mensaje: `${p.nombre}: el material quedó con aviso. Revisalo antes de aprobarlo.` }
    : { ok: true, mensaje: `${p.nombre}: material listo para revisar y aprobar.` };
}
