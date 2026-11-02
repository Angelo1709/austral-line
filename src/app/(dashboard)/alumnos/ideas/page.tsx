// GRUPO ALUMNOS — "Banco de ideas": problemáticas e ideas de proyecto cargadas por alumnos y profesores.
// Un alumno sin idea propia marca "Me interesa" y ve quiénes más se interesaron.
// El sistema no asigna ideas: solo el autor o los profesores la marcan como tomada.
import { Suspense } from "react";
import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cambiarEstado, cambiarInteres, proponerIdea } from "./_acciones";

async function Aviso({ searchParams }: Pick<PageProps<"/alumnos/ideas">, "searchParams">) {
  const { error, ok } = await searchParams;
  if (error) return <p className="mb-6 border bg-card px-4 py-3 text-sm text-destructive">{error}</p>;
  if (ok === "propuesta") return <p className="mb-6 border bg-card px-4 py-3 text-sm">Tu idea ya está en el banco.</p>;
  if (ok === "borrada") return <p className="mb-6 border bg-card px-4 py-3 text-sm">La idea se borró del banco.</p>;
  return null;
}

export default async function BancoDeIdeas({ searchParams }: PageProps<"/alumnos/ideas">) {
  const persona = await requireRol("alumno");
  const esAlumno = persona.rol === "alumno";
  const supabase = await createClient();

  const [ideas, interesados, temas, misEstrellas, carreras] = await Promise.all([
    supabase
      .from("alumnos_ideas")
      .select("id, titulo, descripcion, estado, created_at, autor_id, interes_id, autor:personas!alumnos_ideas_autor_id_fkey(nombre, rol), alumnos_intereses_maestro(nombre)")
      .order("created_at", { ascending: false }),
    supabase.from("alumnos_ideas_interesados").select("idea_id, persona_id, personas:personas_contacto(nombre, email)"),
    supabase.from("alumnos_intereses_maestro").select("id, nombre").eq("activo", true).order("orden").order("nombre"),
    supabase.from("alumnos_intereses").select("interes_id, estrellas").eq("persona_id", persona.id),
    supabase.from("alumnos_carreras").select("persona_id, alumnos_carreras_maestro(nombre)"),
  ]);
  for (const r of [ideas, interesados, temas, misEstrellas, carreras]) if (r.error) throw r.error;

  const estrellasDe = new Map(misEstrellas.data!.map((e) => [e.interes_id, e.estrellas]));
  const carreraDe = new Map(carreras.data!.map((c) => [c.persona_id, c.alumnos_carreras_maestro.nombre]));
  const interesadosDe = new Map<string, { persona_id: string; nombre: string; email: string | null }[]>();
  for (const i of interesados.data!) {
    interesadosDe.set(i.idea_id, [...(interesadosDe.get(i.idea_id) ?? []), { persona_id: i.persona_id, ...i.personas }]);
  }

  // Disponibles primero; entre ellas, las de los temas que más te interesan.
  const afinidad = (interesId: number | null) => (interesId ? (estrellasDe.get(interesId) ?? 0) : 0);
  const disponibles = ideas.data!
    .filter((i) => i.estado === "disponible")
    .sort((a, b) => afinidad(b.interes_id) - afinidad(a.interes_id));
  const tomadas = ideas.data!.filter((i) => i.estado === "tomada");

  const tarjeta = (idea: NonNullable<typeof ideas.data>[number]) => {
    const lista = interesadosDe.get(idea.id) ?? [];
    const meInteresa = lista.some((i) => i.persona_id === persona.id);
    const puedoCambiarEstado = idea.autor_id === persona.id || persona.rol === "admin";
    const autor = !idea.autor ? "autor desconocido" : idea.autor.rol === "admin" ? "los profesores" : idea.autor.nombre;
    const tomada = idea.estado === "tomada";
    return (
      <li key={idea.id} className="flex flex-col gap-4 border bg-background p-6">
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2">
            {idea.alumnos_intereses_maestro && <Badge variant="outline">{idea.alumnos_intereses_maestro.nombre}</Badge>}
            {tomada && <Badge variant="secondary">Tomada</Badge>}
            {!tomada && esAlumno && afinidad(idea.interes_id) >= 4 && <Badge>Afín a tus intereses</Badge>}
          </div>
          <Link href={`/alumnos/ideas/${idea.id}`} className="font-serif text-xl hover:underline hover:underline-offset-4">{idea.titulo}</Link>
          <p className="text-sm text-[#666]">Propuesta por {autor}</p>
        </div>

        <p className="text-sm whitespace-pre-line">{idea.descripcion}</p>

        <div className="grid gap-2 text-sm">
          <p className="text-[#666]">
            {lista.length === 0 ? "Todavía nadie marcó interés." : `${lista.length} ${lista.length === 1 ? "interesado" : "interesados"}:`}
          </p>
          {lista.length > 0 && (
            <ul className="grid gap-1">
              {lista.map((i) => (
                <li key={i.persona_id}>
                  {i.nombre}
                  {carreraDe.has(i.persona_id) && <span className="text-[#666]"> · {carreraDe.get(i.persona_id)}</span>}
                  {i.email && <>{" · "}<a href={`mailto:${i.email}`} className="underline underline-offset-4 hover:text-[#666]">{i.email}</a></>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2">
          <Link href={`/alumnos/ideas/${idea.id}`} className="mr-2 text-sm underline underline-offset-4 hover:text-[#666]">
            Ver idea y preguntas
          </Link>
          {esAlumno && !tomada && (
            <form action={cambiarInteres}>
              <input type="hidden" name="idea_id" value={idea.id} />
              <input type="hidden" name="accion" value={meInteresa ? "quitar" : "sumar"} />
              <Button type="submit" variant={meInteresa ? "outline" : "default"} size="sm">
                {meInteresa ? "Ya no me interesa" : "Me interesa"}
              </Button>
            </form>
          )}
          {puedoCambiarEstado && (
            <form action={cambiarEstado}>
              <input type="hidden" name="idea_id" value={idea.id} />
              <input type="hidden" name="estado" value={tomada ? "disponible" : "tomada"} />
              <Button type="submit" variant="outline" size="sm">
                {tomada ? "Volver a disponible" : "Marcar como tomada"}
              </Button>
            </form>
          )}
        </div>
      </li>
    );
  };

  return (
    <>
      <h1 className="mb-2 font-serif text-2xl">Banco de ideas</h1>
      <p className="mb-6 max-w-2xl text-sm text-[#666]">
        Problemáticas e ideas de proyecto propuestas por alumnos y profesores. Si todavía no tenés idea propia, marcá
        las que te interesen y escribile a quienes también se interesaron. Primero aparecen las de los temas que más te gustan.
      </p>

      <Suspense><Aviso searchParams={searchParams} /></Suspense>

      {disponibles.length === 0 ? (
        <div className="mb-10 border bg-card p-8 text-sm text-[#666]">Todavía no hay ideas disponibles. ¡Proponé la primera!</div>
      ) : (
        <ul className="mb-10 grid gap-4 lg:grid-cols-2">{disponibles.map(tarjeta)}</ul>
      )}

      <section className="mb-10 grid max-w-3xl gap-4 border bg-card p-6">
        <div>
          <h2 className="font-serif text-lg">Proponer una idea</h2>
          <p className="text-sm text-[#666]">Contá el problema que ves y para quién. No hace falta tener la solución.</p>
        </div>
        <form action={proponerIdea} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" name="titulo" required minLength={3} maxLength={120} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <textarea
              id="descripcion"
              name="descripcion"
              required
              minLength={10}
              maxLength={1500}
              rows={4}
              className="border bg-background px-2.5 py-2 text-sm outline-none focus-visible:border-ring"
            />
          </div>
          <div className="grid max-w-sm gap-2">
            <Label htmlFor="interes_id">Tema</Label>
            <select id="interes_id" name="interes_id" required defaultValue="" className="h-8 border bg-background px-2 text-sm">
              <option value="" disabled>Elegí un tema</option>
              {temas.data!.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>
          <div>
            <Button type="submit">Proponer idea</Button>
          </div>
        </form>
      </section>

      {tomadas.length > 0 && (
        <section>
          <h2 className="mb-2 font-serif text-lg">Ideas tomadas</h2>
          <p className="mb-4 text-sm text-[#666]">Ya hay un grupo trabajando en estas. Quedan a la vista como referencia.</p>
          <ul className="grid gap-4 opacity-80 lg:grid-cols-2">{tomadas.map(tarjeta)}</ul>
        </section>
      )}
    </>
  );
}
