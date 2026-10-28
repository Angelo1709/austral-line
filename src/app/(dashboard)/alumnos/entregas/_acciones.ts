"use server";

// GRUPO ALUMNOS — acciones del repositorio del grupo. Corren con los permisos del usuario (RLS).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "alumnos-entregas";
const LIMITE_MB = 50;

// Nombre de archivo apto para la ruta (sin tildes ni símbolos raros); el original se guarda aparte.
const nombreSeguro = (nombre: string) =>
  nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_").slice(-120) || "archivo";

// De quién es la entrega: del grupo (proyectoId) o individual del alumno logueado (proyectoId = null).
// Paso 1: calcula la próxima versión y devuelve una URL firmada para subir el archivo directo al almacenamiento.
export async function prepararSubida(proyectoId: string | null, eventoId: string, nombre: string, tamano: number) {
  const persona = await requireRol("alumno");
  if (tamano > LIMITE_MB * 1024 * 1024) return { error: `El archivo supera los ${LIMITE_MB} MB.` };
  const supabase = await createClient();
  const deQuien = supabase.from("alumnos_entregas").select("version").eq("evento_id", eventoId);
  const { data: ultima, error } = await (proyectoId
    ? deQuien.eq("proyecto_id", proyectoId)
    : deQuien.is("proyecto_id", null).eq("persona_id", persona.id))
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { error: `No se pudo preparar la subida: ${error.message}` };
  const version = (ultima?.version ?? 0) + 1;
  const carpeta = proyectoId ? proyectoId : `individual/${persona.id}`;
  const path = `${carpeta}/${eventoId}/v${version}-${nombreSeguro(nombre)}`;
  const { data, error: errorUrl } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (errorUrl) return { error: `No tenés permiso para subir esta entrega (${errorUrl.message}).` };
  return { signedUrl: data.signedUrl, path, version };
}

// Paso 2: con el archivo ya subido, registra la versión a nombre de quien la subió.
export async function registrarEntrega(datos: {
  proyectoId: string | null;
  eventoId: string;
  version: number;
  path: string;
  nombre: string;
  tamano: number;
  nota: string;
}) {
  const persona = await requireRol("alumno");
  const supabase = await createClient();
  const { error } = await supabase.from("alumnos_entregas").insert({
    proyecto_id: datos.proyectoId,
    persona_id: datos.proyectoId ? null : persona.id,
    evento_id: datos.eventoId,
    version: datos.version,
    archivo_path: datos.path,
    nombre_archivo: datos.nombre.slice(0, 200),
    tamano_bytes: datos.tamano,
    nota: datos.nota.trim().slice(0, 500) || null,
    subida_por: persona.id,
  });
  if (error?.code === "23505") return { error: "Se subió otra versión al mismo tiempo. Probá de nuevo." };
  if (error?.code === "42501") return { error: "Este hito no pide este tipo de entrega." };
  if (error) return { error: `No se pudo registrar la entrega: ${error.message}` };
  revalidatePath("/alumnos/entregas");
  return { ok: true };
}

// Vuelve a Entregas con el grupo elegido y el hito abierto.
const volverA = (formData: FormData) => {
  const proyecto = encodeURIComponent(String(formData.get("proyecto_id") ?? ""));
  const hito = encodeURIComponent(String(formData.get("evento_id") ?? ""));
  return `/alumnos/entregas?proyecto=${proyecto}&hito=${hito}`;
};

// Devolución de un profesor o mentor sobre una versión, o respuesta en la conversación de una devolución.
// La base decide quién puede qué: el grupo solo contesta; un mentor contesta solo sus devoluciones.
export async function publicarDevolucion(formData: FormData) {
  const persona = await requireRol("alumno", "mentor"); // el admin (profesores) también pasa
  const entregaId = String(formData.get("entrega_id"));
  const respuestaA = String(formData.get("respuesta_a") ?? "") || null;
  const texto = String(formData.get("texto") ?? "").trim();
  const volver = volverA(formData);
  if (texto.length < 2) redirect(`${volver}&error=${encodeURIComponent("Escribí tu mensaje.")}`);
  if (!respuestaA && persona.rol === "alumno") {
    redirect(`${volver}&error=${encodeURIComponent("Las devoluciones las dejan profesores y mentores.")}`);
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("alumnos_entregas_devoluciones")
    .insert({ entrega_id: entregaId, respuesta_a: respuestaA, autor_id: persona.id, texto });
  if (error) redirect(`${volver}&error=${encodeURIComponent(`No se pudo publicar: ${error.message}`)}`);
  revalidatePath("/alumnos/entregas");
  redirect(volver);
}

// Los profesores eligen si un hito pide entrega grupal, individual o ambas.
export async function guardarTipoHito(formData: FormData) {
  await requireRol(); // sin roles = solo admin (profesores)
  const eventoId = String(formData.get("evento_id"));
  const tipo = String(formData.get("tipo"));
  const volver = volverA(formData);
  if (!["grupal", "individual", "ambas"].includes(tipo)) redirect(`${volver}&error=${encodeURIComponent("Tipo de entrega inválido.")}`);
  const supabase = await createClient();
  const { error } = await supabase
    .from("alumnos_hitos_tipo")
    .upsert({ evento_id: eventoId, tipo, updated_at: new Date().toISOString() });
  if (error) redirect(`${volver}&error=${encodeURIComponent(`No se pudo guardar: ${error.message}`)}`);
  revalidatePath("/alumnos/entregas");
  redirect(volver);
}
