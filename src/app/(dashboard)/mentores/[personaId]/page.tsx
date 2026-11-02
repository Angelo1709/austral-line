// GRUPO MENTORES — vista de un perfil puntual. La usa el admin para auditar lo que cargó un
// mentor (desde la tabla de /mentores); un mentor que entra a su propio id ve lo mismo que en
// /mentores/perfil-publico, pero sin poder editar. El acceso a perfiles ajenos lo filtra directo la RLS.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { VistaPreviaPerfil } from "../perfil-publico/_components/vista-previa";

const estadoLabel: Record<string, string> = { borrador: "Borrador — todavía no lo ven los alumnos", publicado: "Publicado" };

export default async function PerfilDeMentor({ params }: PageProps<"/mentores/[personaId]">) {
  const { personaId } = await params;
  const viewer = await requireRol("mentor");
  if (viewer.rol !== "admin" && viewer.id !== personaId) notFound();

  const supabase = await createClient();
  const { data: persona, error: errorPersona } = await supabase
    .from("personas").select("id, nombre, rol").eq("id", personaId).maybeSingle();
  if (errorPersona?.code === "22P02") notFound(); // id con formato inválido
  if (errorPersona) throw errorPersona;
  if (!persona || persona.rol !== "mentor") notFound();

  const { data: perfil, error: errorPerfil } = await supabase
    .from("mentores_perfil").select("*").eq("persona_id", personaId).maybeSingle();
  if (errorPerfil) throw errorPerfil;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/mentores" className="text-sm text-[#666] hover:text-primary">← Mentores</Link>

      <div className="mt-6 mb-8 flex items-center justify-between gap-4">
        <h1 className="font-serif text-2xl">{persona.nombre}</h1>
        {perfil && <Badge variant={perfil.estado === "publicado" ? "default" : "outline"}>{estadoLabel[perfil.estado]}</Badge>}
      </div>

      {perfil ? (
        <VistaPreviaPerfil perfil={perfil} nombre={persona.nombre} />
      ) : (
        <p className="border p-10 text-center text-sm text-[#666]">Todavía no empezó a cargar su perfil.</p>
      )}
    </div>
  );
}
