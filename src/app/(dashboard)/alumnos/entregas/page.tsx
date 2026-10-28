// GRUPO ALUMNOS — "Entregas": repositorio del grupo, por hito del cuatrimestre, con versiones y devoluciones.
// La entrega grupal la ven el grupo, sus mentores y los profesores. La individual (si el hito la pide),
// solo el alumno y los profesores.
import { Suspense } from "react";
import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, UserRound, UsersRound, type LucideIcon } from "lucide-react";
import { guardarTipoHito } from "./_acciones";
import { SubirEntrega } from "./_components/subir-entrega";
import { Versiones, type Version } from "./_components/versiones";

const TIPOS = { grupal: "Grupal", individual: "Individual", ambas: "Grupal e individual" } as const;
type Tipo = keyof typeof TIPOS;
const SELECT_ENTREGA =
  "*, subidor:personas!alumnos_entregas_subida_por_fkey(nombre), alumnos_entregas_devoluciones(id, texto, created_at, respuesta_a, autor_id, autor:personas!alumnos_entregas_devoluciones_autor_id_fkey(nombre, rol))";

const ZONA = "America/Argentina/Buenos_Aires";
const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", timeZone: ZONA });

async function Aviso({ searchParams }: Pick<PageProps<"/alumnos/entregas">, "searchParams">) {
  const { error } = await searchParams;
  return error ? <p className="mb-6 border bg-card px-4 py-3 text-sm text-destructive">{String(error)}</p> : null;
}

// Caja de una entrega (del grupo o individual): ícono, título, quién la ve y estado a la derecha.
function Bloque(props: { icono: LucideIcon; titulo: string; detalle: string; versiones: number; children: React.ReactNode }) {
  const Icono = props.icono;
  return (
    <section className="grid gap-4 border bg-background p-5">
      <header className="flex flex-wrap items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center border bg-card">
          <Icono className="size-4" aria-hidden />
        </span>
        <span className="grid">
          <span className="font-serif text-base">{props.titulo}</span>
          <span className="text-xs text-[#666]">{props.detalle}</span>
        </span>
        <Badge variant={props.versiones ? "default" : "outline"} className="ml-auto">
          {props.versiones ? `Entregada · versión ${props.versiones}` : "Pendiente"}
        </Badge>
      </header>
      {props.children}
    </section>
  );
}

export default async function Entregas({ searchParams }: PageProps<"/alumnos/entregas">) {
  const persona = await requireRol("alumno", "mentor");
  const supabase = await createClient();

  // Grupos que puede ver cada uno: el alumno los suyos, el mentor los que acompaña, los profesores todos.
  let proyectos: { id: string; nombre: string }[] = [];
  if (persona.rol === "alumno") {
    const { data, error } = await supabase.from("proyecto_integrantes").select("proyectos(id, nombre)").eq("persona_id", persona.id);
    if (error) throw error;
    proyectos = data.map((d) => d.proyectos);
  } else if (persona.rol === "mentor") {
    const { data, error } = await supabase.from("mentores_reuniones").select("proyectos(id, nombre)").eq("mentor_id", persona.id);
    if (error) throw error;
    proyectos = data.map((d) => d.proyectos);
  } else {
    const { data, error } = await supabase.from("proyectos").select("id, nombre").order("nombre");
    if (error) throw error;
    proyectos = data;
  }
  proyectos = [...new Map(proyectos.map((p) => [p.id, p])).values()].sort((a, b) => a.nombre.localeCompare(b.nombre));

  const titulo = <h1 className="mb-2 font-serif text-2xl">Entregas</h1>;
  if (proyectos.length === 0) {
    return (
      <div className="max-w-xl border bg-card p-8">
        {titulo}
        <p className="text-sm text-[#666]">
          {persona.rol === "mentor"
            ? "Todavía no tenés reuniones con ningún grupo. Cuando tengas, vas a ver acá sus entregas."
            : "Todavía no estás en un grupo. Cuando los profesores te sumen a un proyecto, vas a poder subir las entregas acá."}
        </p>
      </div>
    );
  }

  const { proyecto: elegido, hito: hitoElegido } = await searchParams;
  const proyecto = proyectos.find((p) => p.id === elegido) ?? proyectos[0];
  const esAlumno = persona.rol === "alumno";
  const esProfesor = persona.rol === "admin";

  const [eventos, tipos, grupales, integrantes] = await Promise.all([
    supabase.from("eventos").select("id, nombre, inicio").order("inicio"),
    supabase.from("alumnos_hitos_tipo").select("evento_id, tipo"),
    supabase.from("alumnos_entregas").select(SELECT_ENTREGA).eq("proyecto_id", proyecto.id).order("version", { ascending: false }),
    supabase.from("proyecto_integrantes").select("persona_id, personas(nombre)").eq("proyecto_id", proyecto.id),
  ]);
  for (const r of [eventos, tipos, grupales, integrantes]) if (r.error) throw r.error;

  // Individuales: el alumno ve las suyas; los profesores, las de cada integrante del grupo elegido.
  const idsIndividuales = esAlumno ? [persona.id] : esProfesor ? integrantes.data!.map((i) => i.persona_id) : [];
  const individuales = idsIndividuales.length
    ? await supabase.from("alumnos_entregas").select(SELECT_ENTREGA).in("persona_id", idsIndividuales).order("version", { ascending: false })
    : { data: [], error: null };
  if (individuales.error) throw individuales.error;

  const todas = [...grupales.data!, ...individuales.data] as (Version & { evento_id: string; persona_id: string | null })[];
  const tipoDe = new Map(tipos.data!.map((t) => [t.evento_id, t.tipo as Tipo]));

  // Links de descarga válidos por una hora.
  const paths = todas.map((e) => e.archivo_path);
  const firmadas = paths.length ? await supabase.storage.from("alumnos-entregas").createSignedUrls(paths, 3600) : { data: [] };
  const linkDe = new Map((firmadas.data ?? []).flatMap((f) => (f.path && f.signedUrl ? [[f.path, f.signedUrl] as const] : [])));

  // Hito abierto al entrar: el elegido (al volver de una acción) o el próximo que todavía no pasó.
  const hoy = new Date(new Date().toLocaleDateString("en-CA", { timeZone: ZONA })).getTime();
  const proximo = eventos.data!.find((ev) => new Date(ev.inicio).getTime() >= hoy) ?? eventos.data!.at(-1);
  const abierto = eventos.data!.some((ev) => ev.id === hitoElegido) ? hitoElegido : proximo?.id;

  return (
    <>
      {titulo}
      <p className="mb-6 max-w-2xl text-sm text-[#666]">
        Las entregas para cada hito del cuatrimestre. Cada vez que se sube un archivo queda como una versión nueva, sin
        borrar las anteriores, y profesores y mentores dejan su devolución sobre cada una. Algunos hitos piden además una
        entrega individual, que ven solo vos y los profesores. Tocá un hito para abrirlo o cerrarlo.
      </p>

      {proyectos.length > 1 && (
        <nav className="mb-6 flex flex-wrap gap-2" aria-label="Grupo">
          {proyectos.map((p) => (
            <Link
              key={p.id}
              href={`/alumnos/entregas?proyecto=${p.id}`}
              className={cn("border px-3 py-1 text-sm", p.id === proyecto.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-card")}
            >
              {p.nombre}
            </Link>
          ))}
        </nav>
      )}

      <Suspense><Aviso searchParams={searchParams} /></Suspense>

      <h2 className="mb-4 font-serif text-xl">{proyecto.nombre}</h2>
      {eventos.data!.length === 0 && <p className="text-sm text-[#666]">Todavía no hay hitos cargados en el cuatrimestre.</p>}

      <ol className="grid max-w-3xl gap-3">
        {eventos.data!.map((ev) => {
          const tipo: Tipo = tipoDe.get(ev.id) ?? "grupal";
          const pideGrupal = tipo !== "individual";
          const pideIndividual = tipo !== "grupal";
          const delGrupo = todas.filter((e) => e.evento_id === ev.id && !e.persona_id);
          const individualDe = (id: string) => todas.filter((e) => e.evento_id === ev.id && e.persona_id === id);
          const versionesVisibles = (pideGrupal ? delGrupo.length : 0) + (pideIndividual ? idsIndividuales.flatMap(individualDe).length : 0);
          const comun = { linkDe, persona, proyectoId: proyecto.id, eventoId: ev.id };
          return (
            <li key={ev.id}>
              <details open={ev.id === abierto} className="group border bg-card">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-6 py-4 [&::-webkit-details-marker]:hidden">
                  <ChevronDown className="size-4 shrink-0 -rotate-90 text-[#666] transition-transform group-open:rotate-0" aria-hidden />
                  <span className="font-serif text-lg">{ev.nombre}</span>
                  {ev.id === proximo?.id && <Badge variant="outline">Próximo</Badge>}
                  <span className="ml-auto flex items-center gap-3 text-sm text-[#666]">
                    <span>{TIPOS[tipo]}</span>
                    <span>·</span>
                    <span>{versionesVisibles === 0 ? "Sin entregar" : versionesVisibles === 1 ? "1 versión" : `${versionesVisibles} versiones`}</span>
                    <span>·</span>
                    <span>{fecha(ev.inicio)}</span>
                  </span>
                </summary>

                <div className="grid gap-4 border-t px-6 py-5">
                  {esProfesor && (
                    <form action={guardarTipoHito} className="flex flex-wrap items-center gap-2 text-sm">
                      <input type="hidden" name="evento_id" value={ev.id} />
                      <input type="hidden" name="proyecto_id" value={proyecto.id} />
                      <label htmlFor={`tipo-${ev.id}`} className="text-[#666]">Este hito pide entrega:</label>
                      <select id={`tipo-${ev.id}`} name="tipo" defaultValue={tipo} className="h-8 border bg-background px-2 text-sm">
                        {(Object.keys(TIPOS) as Tipo[]).map((t) => <option key={t} value={t}>{TIPOS[t]}</option>)}
                      </select>
                      <Button type="submit" size="sm" variant="outline">Guardar</Button>
                    </form>
                  )}

                  {pideGrupal && (
                    <Bloque
                      icono={UsersRound}
                      titulo="Entrega del grupo"
                      detalle="La ven el grupo, su mentor y los profesores."
                      versiones={delGrupo.length}
                    >
                      <Versiones {...comun} versiones={delGrupo} vacio="Todavía no hay nada entregado por el grupo para este hito." />
                      {esAlumno && <SubirEntrega proyectoId={proyecto.id} eventoId={ev.id} hayVersiones={delGrupo.length > 0} />}
                    </Bloque>
                  )}

                  {pideIndividual && esAlumno && (
                    <Bloque
                      icono={UserRound}
                      titulo="Tu entrega individual"
                      detalle="La ven solo vos y los profesores."
                      versiones={individualDe(persona.id).length}
                    >
                      <Versiones {...comun} versiones={individualDe(persona.id)} vacio="Todavía no subiste tu entrega individual." />
                      <SubirEntrega proyectoId={null} eventoId={ev.id} hayVersiones={individualDe(persona.id).length > 0} />
                    </Bloque>
                  )}

                  {pideIndividual && esProfesor && (
                    <>
                      {integrantes.data!.length === 0 && <p className="text-sm text-[#666]">El grupo todavía no tiene integrantes.</p>}
                      {integrantes.data!.map((i) => (
                        <Bloque
                          key={i.persona_id}
                          icono={UserRound}
                          titulo={`Individual · ${i.personas.nombre}`}
                          detalle="La ven solo el alumno y los profesores."
                          versiones={individualDe(i.persona_id).length}
                        >
                          <Versiones {...comun} versiones={individualDe(i.persona_id)} vacio="Todavía no entregó." />
                        </Bloque>
                      ))}
                    </>
                  )}

                  {!pideGrupal && persona.rol === "mentor" && (
                    <p className="text-sm text-[#666]">Este hito es individual: las entregas las ven solo cada alumno y los profesores.</p>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </>
  );
}
