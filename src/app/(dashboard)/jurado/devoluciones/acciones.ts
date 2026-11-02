"use server";
// GRUPO JURADO — acciones de las devoluciones. Todas son solo para el admin/organizador.
// Las reglas importantes (notas que no se escriben, publicación todo-o-nada, cierre al publicar) están también en la base.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { enviarCorreos, modoPrueba } from "../_resend";
import { urlBase } from "../comunicaciones/datos";
import { textosSinNombre } from "./datos";
import { mailDevolucion } from "./plantilla";
import { conMail } from "@/lib/supabase/tipos";

type Supabase = Awaited<ReturnType<typeof createClient>>;

function volver(ruta: string, tipo: "ok" | "error", mensaje: string): never {
  revalidatePath("/jurado", "layout");
  redirect(`${ruta}${ruta.includes("?") ? "&" : "?"}${tipo}=${encodeURIComponent(mensaje)}`);
}

async function preparar(formData: FormData) {
  await requireRol(); // solo admin
  const eventoId = String(formData.get("evento_id"));
  const proyectoId = String(formData.get("proyecto_id") ?? "");
  return {
    eventoId,
    proyectoId,
    supabase: await createClient(),
    lista: `/jurado/devoluciones?evento=${eventoId}`,
    ficha: `/jurado/devoluciones/${proyectoId}?evento=${eventoId}`,
  };
}

const textos = (formData: FormData, campo: string) => formData.getAll(campo).map((t) => String(t).replace(/\r\n/g, "\n").trim());

// Guardar = revisar: la base recalcula las notas y toma la "foto" de las evaluaciones en ese momento.
export async function guardarDevolucion(formData: FormData) {
  const { eventoId, proyectoId, supabase, ficha } = await preparar(formData);
  const motivo = String(formData.get("motivo") ?? "").trim();
  const comentarios = textos(formData, "comentario");
  const propuestas = textos(formData, "propuesta");

  // Los originales que el admin tenía en pantalla tienen que seguir siendo los vigentes: si un jurado cambió algo
  // mientras revisaba, se frena para que no se publique un texto que nadie miró.
  const { data: evaluaciones, error: errorEvaluaciones } = await supabase
    .from("jurado_evaluaciones").select("comentarios, propuesta_valor").eq("evento_id", eventoId).eq("proyecto_id", proyectoId);
  if (errorEvaluaciones) throw errorEvaluaciones;
  const comentariosVistos = textosSinNombre(evaluaciones.map((e) => e.comentarios));
  const propuestasVistas = textosSinNombre(evaluaciones.map((e) => e.propuesta_valor));
  const mismos = (a: string[], b: string[]) => a.length === b.length && a.every((t, i) => t === b[i]);
  if (!mismos(textos(formData, "comentario_original"), comentariosVistos) || !mismos(textos(formData, "propuesta_original"), propuestasVistas)
    || comentarios.length !== comentariosVistos.length || propuestas.length !== propuestasVistas.length) {
    volver(ficha, "error", "Los jurados cambiaron sus textos mientras revisabas. No se guardó nada: revisá de nuevo lo que se muestra ahora.");
  }

  // Si ya había una revisión, los textos nuevos o modificados por un jurado hay que confirmarlos a mano.
  const [previa, vistosPrevios] = await Promise.all([
    supabase.from("jurado_devoluciones").select("proyecto_id").eq("evento_id", eventoId).eq("proyecto_id", proyectoId).maybeSingle(),
    supabase.from("jurado_devoluciones_vistos").select("comentarios, propuestas").eq("evento_id", eventoId).eq("proyecto_id", proyectoId).maybeSingle(),
  ]);
  if (previa.error) throw previa.error;
  if (vistosPrevios.error) throw vistosPrevios.error;
  const hayNuevos = !!previa.data && (comentariosVistos.some((t) => !(vistosPrevios.data?.comentarios ?? []).includes(t))
    || propuestasVistas.some((t) => !(vistosPrevios.data?.propuestas ?? []).includes(t)));
  if (hayNuevos && formData.get("confirmo_nuevos") !== "on") {
    volver(ficha, "error", "Hay textos nuevos o modificados por un jurado. Confirmá que los revisaste para guardar.");
  }

  const datos = { comentarios, propuestas, motivo_correccion: motivo || null };
  // Insertar o actualizar por separado: después de publicar no se pueden crear devoluciones nuevas, solo corregir.
  const { error } = previa.data
    ? await supabase.from("jurado_devoluciones").update(datos).eq("evento_id", eventoId).eq("proyecto_id", proyectoId)
    : await supabase.from("jurado_devoluciones").insert({ ...datos, evento_id: eventoId, proyecto_id: proyectoId });
  if (error?.message.includes("motivo")) volver(ficha, "error", "Para corregir una devolución ya publicada, escribí el motivo.");
  if (error?.code === "42501") volver(ficha, "error", "No se guardó: el equipo está marcado como \"No se presentó\" o el evento ya se publicó sin su devolución.");
  if (error) throw error;
  // Después de guardar, se anota qué textos originales vio el admin. Si esto fallara, la próxima revisión marca todo como nuevo (no se filtra nada).
  const { error: errorVistos } = await supabase.from("jurado_devoluciones_vistos")
    .upsert({ evento_id: eventoId, proyecto_id: proyectoId, comentarios: comentariosVistos, propuestas: propuestasVistas });
  if (errorVistos) throw errorVistos;
  volver(ficha, "ok", motivo ? "Corrección guardada. El equipo ve la fecha de actualización." : "Devolución revisada.");
}

export async function marcarAusente(formData: FormData) {
  const { eventoId, proyectoId, supabase, lista } = await preparar(formData);
  // Sin devolución para un equipo que no se presentó.
  const { error: errorBaja } = await supabase.from("jurado_devoluciones").delete().eq("evento_id", eventoId).eq("proyecto_id", proyectoId);
  if (errorBaja) throw errorBaja;
  const { error } = await supabase.from("jurado_ausencias").insert({ evento_id: eventoId, proyecto_id: proyectoId });
  if (error?.code === "42501") volver(lista, "error", "Las devoluciones de este evento ya están publicadas.");
  if (error && error.code !== "23505") throw error;
  volver(lista, "ok", "Equipo marcado como \"No se presentó\". No recibe devolución ni mail.");
}

export async function quitarAusente(formData: FormData) {
  const { eventoId, proyectoId, supabase, lista } = await preparar(formData);
  const { error } = await supabase.from("jurado_ausencias").delete().eq("evento_id", eventoId).eq("proyecto_id", proyectoId);
  if (error) throw error;
  volver(lista, "ok", "Se quitó la marca de \"No se presentó\".");
}

// Publica todo el evento en un solo paso (la base verifica y frena si falta algo). Después avisa por mail.
export async function publicar(formData: FormData) {
  const { eventoId, supabase, lista } = await preparar(formData);
  const { data: equipos, error } = await supabase.rpc("jurado_publicar_evento", { p_evento: eventoId });
  if (error?.code === "P0001") volver(lista, "error", error.message);
  if (error) throw error;

  // Ya está publicado: pase lo que pase con los mails, los equipos ya ven su devolución.
  const resultado = await avisarPorMail(supabase, eventoId, null);
  volver(lista, "ok", `Se publicaron las devoluciones de ${equipos} ${equipos === 1 ? "equipo" : "equipos"}. ${resultado}`);
}

export async function reintentarMails(formData: FormData) {
  const { eventoId, supabase, lista } = await preparar(formData);
  const { data: fallidos, error } = await supabase
    .from("jurado_devolucion_envios").select("email, proyecto_id").eq("evento_id", eventoId).eq("estado", "error");
  if (error) throw error;
  const { data: exitosos, error: errorExitosos } = await supabase
    .from("jurado_devolucion_envios").select("email, proyecto_id").eq("evento_id", eventoId).neq("estado", "error");
  if (errorExitosos) throw errorExitosos;
  const yaLlegaron = new Set(exitosos.map((e) => `${e.proyecto_id}:${e.email}`));
  const pendientes = new Set(fallidos.map((e) => `${e.proyecto_id}:${e.email}`).filter((c) => !yaLlegaron.has(c)));
  if (pendientes.size === 0) volver(lista, "ok", "No hay mails pendientes de reintentar.");
  volver(lista, "ok", await avisarPorMail(supabase, eventoId, pendientes));
}

// Un mail por integrante de cada equipo publicado. Los ausentes no tienen devolución, así que no reciben nada.
// `solo`: reintentar únicamente esos "proyecto:email".
async function avisarPorMail(supabase: Supabase, eventoId: string, solo: Set<string> | null) {
  const { data: devoluciones, error } = await supabase
    .from("jurado_devoluciones")
    .select("proyecto_id, eventos(nombre), proyectos(nombre, proyecto_integrantes(personas:personas_contacto(id, nombre, email)))")
    .eq("evento_id", eventoId);
  if (error) throw error;

  const url = `${await urlBase()}/jurado/mi-devolucion`;
  const destinos = devoluciones.flatMap((d) =>
    d.proyectos.proyecto_integrantes
      .map((i) => i.personas)
      .filter(conMail)
      .filter((p) => !solo || solo.has(`${d.proyecto_id}:${p.email}`))
      .map((p) => ({ proyectoId: d.proyecto_id, persona: p, correo: mailDevolucion({ nombre: p.nombre, equipo: d.proyectos.nombre, evento: d.eventos.nombre, url }) })),
  );
  if (destinos.length === 0) return "No hay integrantes con mail para avisar.";

  let falla: string | null = null;
  let ids: (string | null)[] = [];
  try {
    const r = await enviarCorreos(destinos.map((d) => ({ ...d.correo, para: d.persona.email })));
    if (r.ok) ids = r.ids;
    else falla = r.error;
  } catch (e) {
    falla = e instanceof Error ? e.message : "No se pudo conectar con el servicio de mails.";
  }

  const { error: errorRegistro } = await supabase.from("jurado_devolucion_envios").insert(destinos.map((d, i) => ({
    evento_id: eventoId,
    proyecto_id: d.proyectoId,
    persona_id: d.persona.id,
    email: d.persona.email,
    estado: falla ? "error" : modoPrueba() ? "simulado" : "enviado",
    resend_id: falla ? null : ids[i],
    error: falla,
  })));
  if (errorRegistro) console.error("No se pudo registrar el envío de devoluciones", errorRegistro);

  if (falla) return `Los mails de aviso fallaron (${falla}). Los equipos igual pueden ver su devolución; podés reintentar los mails.`;
  if (modoPrueba()) return `Mails simulados (falta la clave de Resend): ${destinos.length}.`;
  return `Se mandaron ${destinos.length} mails de aviso.`;
}
