// GRUPO MENTORES — reglas compartidas del agente de carga de perfil.
import type { Tables } from "@/lib/database.types";

export type PerfilMentor = Tables<"mentores_perfil">;

// Campos que organiza el agente, en el orden en que se muestran y se confirman. `largo: true`
// son los que no entran en una grilla corta (se muestran en bloque, de ancho completo).
export const camposPerfil = [
  { campo: "empresa", label: "Empresa", largo: false },
  { campo: "cargo", label: "Cargo", largo: false },
  { campo: "industria", label: "Industria", largo: false },
  { campo: "anios_experiencia", label: "Años de experiencia", largo: false },
  { campo: "bio", label: "Sobre vos", largo: true },
  { campo: "areas_ayuda", label: "En qué podés ayudar a los alumnos", largo: true },
  { campo: "linkedin_url", label: "LinkedIn", largo: false },
] as const satisfies { campo: keyof PerfilMentor; label: string; largo: boolean }[];

// Sin estos datos el perfil no dice nada útil a un alumno: hace falta completarlos para publicar.
export const camposObligatorios = ["bio", "areas_ayuda"] as const satisfies (keyof PerfilMentor)[];

export const esLinkedin = (link: string | null) => !!link && /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\//i.test(link);

// Mensaje fijo que tira organizar() si falta AI_GATEWAY_API_KEY: el cliente lo compara para
// mostrar el cartel de "cargá a mano" en vez de un error genérico. Vive acá (no en _acciones.ts)
// porque un archivo "use server" solo puede exportar funciones async.
export const SIN_CLAVE_IA = "SIN_CLAVE_IA";

export function erroresParaPublicar(perfil: Pick<PerfilMentor, (typeof camposObligatorios)[number]>) {
  return camposObligatorios.filter((campo) => !perfil[campo]?.trim());
}
