"use server";

import { revalidatePath } from "next/cache";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type EstadoFormulario = { message: string; success: boolean };

const ruta = "/austral/contacto-mentores";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function guardarContacto(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const mentor = await requireRol("mentor");
  if (mentor.rol !== "mentor") return { success: false, message: "Solo el mentor puede autorizar su contacto." };

  const industria = String(formData.get("industria") ?? "").trim();
  const especialidades = String(formData.get("especialidades") ?? "")
    .split(",").map((tag) => tag.trim()).filter(Boolean);
  const modalidad = String(formData.get("modalidad") ?? "");
  const email_contacto = String(formData.get("email_contacto") ?? "").trim();
  const telefono_contacto = String(formData.get("telefono_contacto") ?? "").trim();
  const acepta_consultas_otros = formData.get("acepta_consultas_otros") === "on";
  const publicado = formData.get("publicado") === "on";

  if (industria.length > 100 || especialidades.length > 10 ||
      especialidades.some((tag) => tag.length > 50) ||
      !["principal", "consulta", "ambas"].includes(modalidad) ||
      email_contacto.length > 180 || telefono_contacto.length > 50 ||
      (email_contacto && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email_contacto))) {
    return { success: false, message: "Revisá los datos del perfil." };
  }
  if (publicado && (!industria || !especialidades.length || (!email_contacto && !telefono_contacto))) {
    return { success: false, message: "Para publicar, completá industria, especialidades y al menos un medio de contacto." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("austral_contactos_mentores").upsert({
    mentor_id: mentor.id,
    industria,
    especialidades: [...new Set(especialidades)],
    modalidad,
    email_contacto,
    telefono_contacto,
    acepta_consultas_otros,
    publicado,
    actualizado_at: new Date().toISOString(),
  }, { onConflict: "mentor_id" });
  if (error) return { success: false, message: "No se pudo guardar el perfil." };

  revalidatePath(ruta);
  return { success: true, message: publicado ? "Contacto publicado." : "Borrador guardado. El contacto no es visible para alumnos." };
}

export async function registrarVinculo(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const admin = await requireRol();
  const mentorId = String(formData.get("mentor_id") ?? "");
  const proyectoId = String(formData.get("proyecto_id") ?? "");
  if (!uuid.test(mentorId) || !uuid.test(proyectoId) || formData.get("confirmado") !== "on") {
    return { success: false, message: "Elegí mentor y proyecto, y confirmá que el vínculo ya fue aprobado." };
  }

  const supabase = await createClient();
  const [mentor, proyecto] = await Promise.all([
    supabase.from("personas").select("id").eq("id", mentorId).eq("rol", "mentor").maybeSingle(),
    supabase.from("proyectos").select("id").eq("id", proyectoId).maybeSingle(),
  ]);
  if (!mentor.data || !proyecto.data) return { success: false, message: "Mentor o proyecto inválido." };

  const { error } = await supabase.from("austral_vinculos_mentor_proyecto").insert({
    mentor_id: mentorId, proyecto_id: proyectoId, registrado_por: admin.id,
  });
  if (error) return { success: false, message: error.code === "23505" ? "Ese vínculo ya está registrado." : "No se pudo registrar el vínculo." };
  revalidatePath(ruta);
  return { success: true, message: "Vínculo formal registrado." };
}

export async function quitarVinculo(formData: FormData) {
  await requireRol();
  const mentorId = String(formData.get("mentor_id") ?? "");
  const proyectoId = String(formData.get("proyecto_id") ?? "");
  if (!uuid.test(mentorId) || !uuid.test(proyectoId)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("austral_vinculos_mentor_proyecto")
    .delete().eq("mentor_id", mentorId).eq("proyecto_id", proyectoId);
  if (error) throw error;
  revalidatePath(ruta);
}

export async function solicitarContacto(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const alumno = await requireRol("alumno");
  if (alumno.rol !== "alumno") return { success: false, message: "Solo un alumno puede solicitar contacto." };
  const mentorId = String(formData.get("mentor_id") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!uuid.test(mentorId) || motivo.length < 10 || motivo.length > 500) {
    return { success: false, message: "Elegí un mentor y contá brevemente para qué necesitás contactarlo." };
  }
  const supabase = await createClient();
  const { data: mentor } = await supabase.from("personas")
    .select("id").eq("id", mentorId).eq("rol", "mentor").maybeSingle();
  if (!mentor) return { success: false, message: "Elegí un mentor válido." };
  const { data: visible, error: visibleError } = await supabase.from("austral_contactos_mentores")
    .select("mentor_id").eq("mentor_id", mentorId).eq("publicado", true).maybeSingle();
  if (visibleError) return { success: false, message: "No se pudo verificar el contacto." };
  if (visible) return { success: false, message: "Ese contacto ya está disponible en el directorio." };
  const { data: existente } = await supabase.from("austral_solicitudes_contacto")
    .select("id").eq("alumno_id", alumno.id).eq("mentor_id", mentorId).eq("estado", "pendiente").limit(1);
  if (existente?.length) return { success: false, message: "Ya tenés una solicitud pendiente para este mentor." };
  const { error } = await supabase.from("austral_solicitudes_contacto")
    .insert({ alumno_id: alumno.id, mentor_id: mentorId, motivo });
  if (error) return { success: false, message: "No se pudo enviar la solicitud." };
  revalidatePath(ruta);
  return { success: true, message: "Solicitud enviada al equipo administrador. No se compartirá el contacto sin autorización." };
}

export async function atenderSolicitud(formData: FormData) {
  await requireRol();
  const id = String(formData.get("id") ?? "");
  if (!uuid.test(id)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("austral_solicitudes_contacto")
    .update({ estado: "atendida" }).eq("id", id).eq("estado", "pendiente");
  if (error) throw error;
  revalidatePath(ruta);
}
