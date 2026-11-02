// GRUPO ALUMNOS — "Entregas": repositorio del grupo, por hito del cuatrimestre, con versiones y devoluciones.
// Lo ven el grupo, sus mentores (los que tienen reuniones con el proyecto) y los profesores.
import { Suspense } from "react";
import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { publicarDevolucion } from "./_acciones";
import { SubirEntrega } from "./_components/subir-entrega";

const ZONA = "America/Argentina/Buenos_Aires";
const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", timeZone: ZONA });
const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: ZONA });
const tamano = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

async function Aviso({ searchParams }: Pick<PageProps<"/alumnos/entregas">, "searchParams">) {
  const { error } = await searchParams;
  return error ? <p className="mb-6 border bg-card px-4 py-3 text-sm text-destructive">{String(error)}</p> : null;
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
    // Solo los grupos que el coordinador le asignó (match aceptado en Mentores): es lo mismo que decide la
    // base para dejarle ver las entregas. Tener una reunión con un grupo no alcanza.
    const { data, error } = await supabase.from("proyectos").select("id, nombre");
    if (error) throw error;
    const asignado = await Promise.all(
      data.map(async (p) => {
        const r = await supabase.rpc("alumnos_soy_mentor", { p_proyecto: p.id });
        if (r.error) throw r.error;
        return r.data;
      }),
    );
    proyectos = data.filter((_, i) => asignado[i]);
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
            ? "Todavía no te asignaron ningún grupo. Cuando el coordinador te asigne uno, vas a ver acá sus entregas."
            : "Todavía no estás en un grupo. Cuando los profesores te sumen a un proyecto, vas a poder subir las entregas acá."}
        </p>
      </div>
    );
  }

  const { proyecto: elegido, hito: hitoElegido } = await searchParams;
  const proyecto = proyectos.find((p) => p.id === elegido) ?? proyectos[0];
  const puedeSubir = persona.rol === "alumno";
  const puedeDevolver = persona.rol !== "alumno";
  const fueYo = (autorId: string | null) => autorId === persona.id;

  const [eventos, entregas] = await Promise.all([
    supabase.from("eventos").select("id, nombre, inicio").order("inicio"),
    supabase
      .from("alumnos_entregas")
      .select(
        "*, subidor:personas!alumnos_entregas_subida_por_fkey(nombre), alumnos_entregas_devoluciones(id, texto, created_at, respuesta_a, autor_id, autor:personas!alumnos_entregas_devoluciones_autor_id_fkey(nombre, rol))",
      )
      .eq("proyecto_id", proyecto.id)
      .order("version", { ascending: false }),
  ]);
  if (eventos.error) throw eventos.error;
  if (entregas.error) throw entregas.error;

  // Links de descarga válidos por una hora.
  const paths = entregas.data.map((e) => e.archivo_path);
  const firmadas = paths.length ? await supabase.storage.from("alumnos-entregas").createSignedUrls(paths, 3600) : { data: [] };
  const linkDe = new Map((firmadas.data ?? []).map((f) => [f.path, f.signedUrl]));

  // Hito abierto al entrar: el elegido (al volver de una acción) o el próximo que todavía no pasó.
  const hoy = new Date(new Date().toLocaleDateString("en-CA", { timeZone: ZONA })).getTime();
  const proximo = eventos.data.find((ev) => new Date(ev.inicio).getTime() >= hoy) ?? eventos.data.at(-1);
  const abierto = eventos.data.some((ev) => ev.id === hitoElegido) ? hitoElegido : proximo?.id;

  const autorDevolucion = (a: { nombre: string; rol: string } | null) =>
    !a ? "Alguien" : a.rol === "admin" ? "Profesores" : a.rol === "mentor" ? `${a.nombre} (mentor)` : a.nombre;

  return (
    <>
      {titulo}
      <p className="mb-6 max-w-2xl text-sm text-[#666]">
        Las entregas del grupo para cada hito del cuatrimestre. Cada vez que suben un archivo queda como una versión
        nueva, sin borrar las anteriores, y profesores y mentores dejan su devolución sobre cada una. Tocá un hito para
        abrirlo o cerrarlo.
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
      {eventos.data.length === 0 && <p className="text-sm text-[#666]">Todavía no hay hitos cargados en el cuatrimestre.</p>}

      <ol className="grid max-w-3xl gap-3">
        {eventos.data.map((ev) => {
          const versiones = entregas.data.filter((e) => e.evento_id === ev.id);
          const ocultos = (
            <>
              <input type="hidden" name="proyecto_id" value={proyecto.id} />
              <input type="hidden" name="evento_id" value={ev.id} />
            </>
          );
          return (
            <li key={ev.id}>
              <details open={ev.id === abierto} className="group border bg-card">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-6 py-4 [&::-webkit-details-marker]:hidden">
                  <ChevronDown className="size-4 shrink-0 -rotate-90 text-[#666] transition-transform group-open:rotate-0" aria-hidden />
                  <span className="font-serif text-lg">{ev.nombre}</span>
                  {ev.id === proximo?.id && <Badge variant="outline">Próximo</Badge>}
                  <span className="ml-auto flex items-center gap-3 text-sm text-[#666]">
                    <span>{versiones.length === 0 ? "Sin entregar" : versiones.length === 1 ? "1 versión" : `${versiones.length} versiones`}</span>
                    <span>{fecha(ev.inicio)}</span>
                  </span>
                </summary>

                <div className="grid gap-4 border-t px-6 py-5">
                  {versiones.length === 0 ? (
                    <p className="text-sm text-[#666]">Todavía no hay nada entregado para este hito.</p>
                  ) : (
                    <ul className="grid gap-3">
                      {versiones.map((v, i) => {
                        const devoluciones = [...v.alumnos_entregas_devoluciones].sort((a, b) => a.created_at.localeCompare(b.created_at));
                        const raices = devoluciones.filter((d) => !d.respuesta_a);
                        return (
                          <li key={v.id} className={cn("grid gap-2 border bg-background p-4", i > 0 && "opacity-80")}>
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <Badge variant={i === 0 ? "default" : "outline"}>{i === 0 ? `Versión ${v.version} · la última` : `Versión ${v.version}`}</Badge>
                              {linkDe.get(v.archivo_path) ? (
                                <a href={linkDe.get(v.archivo_path)!} className="underline underline-offset-4 hover:text-[#666]">
                                  {v.nombre_archivo}
                                </a>
                              ) : (
                                <span>{v.nombre_archivo}</span>
                              )}
                              <span className="text-[#666]">
                                {tamano(v.tamano_bytes)} · {v.subidor?.nombre ?? "alguien del grupo"} · {fechaHora(v.created_at)}
                              </span>
                            </div>
                            {v.nota && <p className="border-l-2 pl-3 text-sm">{v.nota}</p>}

                            {raices.length > 0 && (
                              <ul className="grid gap-4 border-t pt-3">
                                {raices.map((d) => {
                                  const respuestas = devoluciones.filter((r) => r.respuesta_a === d.id);
                                  // Contestan el grupo, quien dejó la devolución y los profesores.
                                  const puedoContestar = persona.rol !== "mentor" || fueYo(d.autor_id);
                                  return (
                                    <li key={d.id} className="grid gap-2 text-sm">
                                      <div className="grid gap-1">
                                        <span className="text-xs text-[#666]">
                                          <span className="font-medium text-primary">Devolución de {autorDevolucion(d.autor)}</span> · {fecha(d.created_at)}
                                        </span>
                                        <p className="whitespace-pre-line">{d.texto}</p>
                                      </div>
                                      {respuestas.length > 0 && (
                                        <ul className="grid gap-2 border-l-2 pl-4">
                                          {respuestas.map((r) => (
                                            <li key={r.id} className="grid gap-0.5">
                                              <span className="text-xs text-[#666]">
                                                <span className="font-medium text-primary">{autorDevolucion(r.autor)}</span> · {fechaHora(r.created_at)}
                                              </span>
                                              <p className="whitespace-pre-line">{r.texto}</p>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                      {puedoContestar && (
                                        <details className="pl-4">
                                          <summary className="cursor-pointer text-[#666] hover:text-primary">Contestar</summary>
                                          <form action={publicarDevolucion} className="mt-2 grid gap-2">
                                            <input type="hidden" name="entrega_id" value={v.id} />
                                            <input type="hidden" name="respuesta_a" value={d.id} />
                                            {ocultos}
                                            <textarea
                                              name="texto"
                                              required
                                              minLength={2}
                                              maxLength={2000}
                                              rows={2}
                                              aria-label="Tu respuesta"
                                              className="border bg-background px-2.5 py-2 text-sm outline-none focus-visible:border-ring"
                                            />
                                            <div><Button type="submit" size="sm" variant="outline">Enviar respuesta</Button></div>
                                          </form>
                                        </details>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            )}

                            {puedeDevolver && (
                              <details className="text-sm">
                                <summary className="cursor-pointer text-[#666] hover:text-primary">Dejar una devolución</summary>
                                <form action={publicarDevolucion} className="mt-2 grid gap-2">
                                  <input type="hidden" name="entrega_id" value={v.id} />
                                  {ocultos}
                                  <textarea
                                    name="texto"
                                    required
                                    minLength={2}
                                    maxLength={2000}
                                    rows={3}
                                    aria-label="Devolución"
                                    className="border bg-background px-2.5 py-2 text-sm outline-none focus-visible:border-ring"
                                  />
                                  <div><Button type="submit" size="sm">Enviar devolución</Button></div>
                                </form>
                              </details>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {puedeSubir && <SubirEntrega proyectoId={proyecto.id} eventoId={ev.id} hayVersiones={versiones.length > 0} />}
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </>
  );
}
