// GRUPO ALUMNOS — esta carpeta es de ustedes.
import { redirect } from "next/navigation";
import { getUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MiGrupo } from "./_components/mi-grupo";

export default async function Alumnos({ searchParams }: PageProps<"/alumnos">) {
  const { persona } = await getUsuario();
  if (persona?.rol === "mentor") redirect("/alumnos/entregas"); // el mentor solo usa Entregas
  const { ok, proyecto, error: aviso } = await searchParams;
  const supabase = await createClient();
  const { data: proyectos, error } = await supabase
    .from("proyectos")
    .select("id, nombre, estado, proyecto_integrantes(personas(nombre))")
    .order("created_at");
  if (error) throw error;

  return (
    <>
      <h1 className="mb-6 font-serif text-2xl">Proyectos</h1>
      {aviso && <p className="mb-6 border bg-card px-4 py-3 text-sm text-destructive">{String(aviso)}</p>}
      {persona?.rol === "alumno" && (
        <MiGrupo personaId={persona.id} guardadoEn={ok === "intereses" ? String(proyecto ?? "") : undefined} />
      )}
      <Table>
        <TableHeader>
          <TableRow><TableHead>Proyecto</TableHead><TableHead>Integrantes</TableHead><TableHead>Estado</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {proyectos.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.nombre}</TableCell>
              <TableCell>{p.proyecto_integrantes.map((i) => i.personas.nombre).join(", ")}</TableCell>
              <TableCell><Badge variant="outline">{p.estado}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
