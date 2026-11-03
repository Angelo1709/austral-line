// GRUPO MENTORES — carga del propio perfil. Protegido por mentores/layout.tsx (requireRol("mentor")).
import { redirect } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FormularioPerfil } from "./_components/formulario";
import { Encabezado } from "../_components/accion";

export default async function CargarPerfil() {
  const persona = await requireRol("mentor");
  // El layout deja pasar al admin (ve todo), pero cargar un perfil es solo de cada mentor.
  if (persona.rol !== "mentor") redirect("/mentores");
  const supabase = await createClient();

  const { data: perfil, error } = await supabase
    .from("mentores_perfil").select("*").eq("persona_id", persona.id).maybeSingle();
  if (error) throw error;

  return (
    <div className="mx-auto max-w-2xl">
      <Encabezado
        titulo="Tu perfil de mentor"
        bajada="Así te van a ver los alumnos y el coordinador cuando busquen un mentor para un proyecto."
        volver={{ href: "/mentores", texto: "Volver al inicio de Mentores" }}
      />
      <FormularioPerfil perfil={perfil} nombre={persona.nombre} />
    </div>
  );
}
