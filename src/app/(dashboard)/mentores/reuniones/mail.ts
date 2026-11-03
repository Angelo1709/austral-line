// GRUPO MENTORES — mail del resumen pre-reunión. Los mails no entienden las clases de la app: van con estilos en línea.
import { fechaCorta, fechaHora } from "./fechas";

export type DatosResumen = {
  reunion: { id: string; inicio: string; lugar: string | null };
  mentor: { nombre: string; email: string };
  // Perfil publicado del mentor. null = todavía no lo publicó (los borradores no se usan).
  perfilMentor: {
    empresa: string | null;
    cargo: string | null;
    industria: string | null;
    anios_experiencia: number | null;
    bio: string | null;
    areas_ayuda: string | null;
  } | null;
  proyecto: { nombre: string; descripcion: string | null; estado: string };
  integrantes: string[];
  // Reuniones anteriores de este mentor con este proyecto, de la más reciente a la más vieja.
  anteriores: { inicio: string; notas: string | null; proximos_pasos: string | null }[];
  proximoEvento: { nombre: string; inicio: string; lugar: string | null } | null;
  faltantes: string[];
};

// Lo que agrega la IA. null = no hubo IA (sin clave o falló): el mail sale solo con los datos.
export type Sintesis = { sintesis: string; temas: string[] } | null;

export const esc = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export const multilinea = (texto: string) => esc(texto).replace(/\n/g, "<br>");

export const titulo = (t: string) => `<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;font-weight:normal">${esc(t)}</h1>`;
export const subtitulo = (t: string) => `<h2 style="margin:28px 0 8px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:#666">${esc(t)}</h2>`;
export const parrafo = (html: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.5">${html}</p>`;
export const nota = (html: string) => `<p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#666">${html}</p>`;
export const boton = (texto: string, url: string) =>
  `<p style="margin:24px 0"><a href="${esc(url)}" style="display:inline-block;padding:12px 20px;background:#121212;color:#ffffff;text-decoration:none;font-size:14px">${esc(texto)}</a></p>`;
export const lista = (items: string[]) =>
  `<ul style="margin:0 0 12px;padding-left:20px;font-size:15px;line-height:1.6">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;

export const marco = (contenido: string) => `<!doctype html><html><body style="margin:0;padding:24px 0;background:#f4f4f4;font-family:Helvetica,Arial,sans-serif;color:#121212">
<div style="max-width:560px;margin:0 auto;padding:32px 28px;background:#ffffff;border:1px solid #e6e6e6">
${contenido}
<p style="margin:32px 0 0;padding-top:16px;border-top:1px solid #e6e6e6;font-size:12px;color:#666">Emprendimientos · Universidad Austral</p>
</div></body></html>`;

export const estadosProyecto: Record<string, string> = {
  borrador: "Borrador",
  publicado: "Publicado",
  finalista: "Finalista",
  ganador: "Ganador",
};

export function mailResumen(d: DatosResumen, ia: Sintesis, url: string) {
  const { reunion, mentor, perfilMentor, proyecto, integrantes, anteriores, proximoEvento, faltantes } = d;
  const trayectoria = perfilMentor && [
    [perfilMentor.cargo, perfilMentor.empresa].filter(Boolean).join(" en "),
    perfilMentor.industria,
    perfilMentor.anios_experiencia === null ? null : `${perfilMentor.anios_experiencia} años de experiencia`,
  ].filter(Boolean).join(" · ");
  const asunto = `Resumen para tu reunión con ${proyecto.nombre} · ${fechaCorta(reunion.inicio)}`;
  const html = marco([
    titulo(`Tu reunión con ${proyecto.nombre}`),
    parrafo(`Hola ${esc(mentor.nombre)}, este es el resumen para preparar la reunión.`),
    lista([
      `<strong>Cuándo:</strong> ${esc(fechaHora(reunion.inicio))}`,
      `<strong>Dónde:</strong> ${reunion.lugar ? esc(reunion.lugar) : "sin lugar ni link cargado"}`,
      `<strong>Equipo:</strong> ${integrantes.length ? esc(integrantes.join(", ")) : "sin integrantes cargados"}`,
    ]),

    ...(ia ? [
      subtitulo("En pocas palabras"),
      parrafo(multilinea(ia.sintesis)),
      ...(ia.temas.length ? [subtitulo("Temas para charlar"), lista(ia.temas.map(esc))] : []),
    ] : []),

    ...(perfilMentor && (trayectoria || perfilMentor.areas_ayuda) ? [
      subtitulo("Tu perfil de mentor"),
      ...(trayectoria ? [parrafo(esc(trayectoria))] : []),
      ...(perfilMentor.areas_ayuda ? [parrafo(`<strong>En qué podés ayudar:</strong> ${multilinea(perfilMentor.areas_ayuda)}`)] : []),
    ] : []),

    subtitulo("El proyecto"),
    parrafo(`<strong>${esc(estadosProyecto[proyecto.estado] ?? proyecto.estado)}.</strong> ${proyecto.descripcion ? multilinea(proyecto.descripcion) : "Sin descripción cargada."}`),

    subtitulo("Reuniones anteriores"),
    ...(anteriores.length
      ? anteriores.map((r) => parrafo([
          `<strong>${esc(fechaHora(r.inicio))}</strong>`,
          r.notas ? multilinea(r.notas) : `<span style="color:#666">Sin notas cargadas.</span>`,
          ...(r.proximos_pasos ? [`<strong>Próximos pasos:</strong> ${multilinea(r.proximos_pasos)}`] : []),
        ].join("<br>")))
      : [parrafo("Es la primera reunión cargada con este equipo.")]),

    ...(proximoEvento ? [
      subtitulo("Próximo evento del concurso"),
      parrafo(`${esc(proximoEvento.nombre)} · ${esc(fechaHora(proximoEvento.inicio))}${proximoEvento.lugar ? ` · ${esc(proximoEvento.lugar)}` : ""}`),
    ] : []),

    ...(faltantes.length ? [
      subtitulo("Falta información"),
      lista(faltantes.map(esc)),
      nota("El resumen no completa lo que falta: usa solo lo que está cargado en la app."),
    ] : []),

    boton("Ver la reunión y cargar notas", `${url}/mentores/reuniones/${reunion.id}`),
    nota(`Lo armó el asistente de Mentores con lo cargado en la app${ia ? "" : " (esta vez sin la síntesis de IA)"}. `
      + "Después de la reunión, contanos en la app si te sirvió."),
  ].join("\n"));
  return { asunto, html };
}

// Mail al coordinador cuando el asistente encuentra algo para mirar antes de la reunión.
export function mailAviso(d: DatosResumen, aviso: string, url: string) {
  const asunto = `Aviso del asistente de Mentores: ${d.proyecto.nombre}`;
  const html = marco([
    titulo(`Aviso sobre ${d.proyecto.nombre}`),
    parrafo("Preparando el resumen pre-reunión, el asistente encontró algo que conviene que mires:"),
    parrafo(`<strong>${multilinea(aviso)}</strong>`),
    lista([
      `<strong>Reunión:</strong> ${esc(fechaHora(d.reunion.inicio))}`,
      `<strong>Mentor:</strong> ${esc(d.mentor.nombre)}`,
      `<strong>Equipo:</strong> ${d.integrantes.length ? esc(d.integrantes.join(", ")) : "sin integrantes cargados"}`,
    ]),
    boton("Ver la reunión", `${url}/mentores/reuniones/${d.reunion.id}`),
    nota("En la sección Reuniones podés marcar si el aviso te sirvió: así medimos si el asistente escala bien los problemas."),
  ].join("\n"));
  return { asunto, html };
}
