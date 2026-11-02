// GRUPO ALUMNOS — página de una idea del banco (vista de exploración pedida por la cátedra).
// El alumno lee la problemática a fondo, pregunta y conversa antes de comprometerse con un grupo.
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { borrarIdea, cambiarEstado, cambiarInteres, editarIdea, publicarMensaje, reportar } from "../_acciones";

const CONTEXTO = [
  { campo: "a_quien_le_pasa", titulo: "¿A quién le pasa?" },
  { campo: "que_se_intento", titulo: "¿Qué se intentó hasta ahora?" },
  { campo: "como_seria_resuelto", titulo: "¿Cómo nos daríamos cuenta de que está resuelto?" },
] as const;

const campoTexto = "border bg-background px-2.5 py-2 text-sm outline-none focus-visible:border-ring";

// "Reportar": queda visible y les llega a los profesores en su panel, que deciden si se borra.
function Reportar(props: { ideaId: string; mensajeId?: string; volver: string; yaReportado: boolean; que: string }) {
  if (props.yaReportado) return <p className="text-xs text-[#666]">Reportaste {props.que}. Los profesores lo van a revisar.</p>;
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-[#666] hover:text-primary">Reportar {props.que}</summary>
      <form action={reportar} className="mt-2 grid max-w-md gap-2">
        <input type="hidden" name="idea_id" value={props.ideaId} />
        {props.mensajeId && <input type="hidden" name="mensaje_id" value={props.mensajeId} />}
        <input type="hidden" name="volver" value={props.volver} />
        <Label htmlFor={`motivo_${props.mensajeId ?? props.ideaId}`}>¿Por qué te parece inapropiado?</Label>
        <textarea id={`motivo_${props.mensajeId ?? props.ideaId}`} name="motivo" required minLength={3} maxLength={500} rows={2} className={campoTexto} />
        <p className="text-[#666]">Va a seguir visible hasta que los profesores lo revisen. Quien lo escribió no sabe que lo reportaste.</p>
        <div><Button type="submit" size="sm" variant="outline">Enviar reporte</Button></div>
      </form>
    </details>
  );
}

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", timeZone: "America/Argentina/Buenos_Aires" });

async function Aviso({ searchParams }: Pick<PageProps<"/alumnos/ideas/[ideaId]">, "searchParams">) {
  const { error, ok } = await searchParams;
  if (error) return <p className="mb-6 border bg-card px-4 py-3 text-sm text-destructive">{error}</p>;
  if (ok === "editada") return <p className="mb-6 border bg-card px-4 py-3 text-sm">Cambios guardados.</p>;
  if (ok === "reportado") return <p className="mb-6 border bg-card px-4 py-3 text-sm">Gracias, el reporte les llegó a los profesores.</p>;
  return null;
}

export default async function PaginaDeIdea({ params, searchParams }: PageProps<"/alumnos/ideas/[ideaId]">) {
  const { ideaId } = await params;
  const persona = await requireRol("alumno");
  const esAlumno = persona.rol === "alumno";
  const supabase = await createClient();

  const { data: idea, error } = await supabase
    .from("alumnos_ideas")
    .select("*, autor:personas!alumnos_ideas_autor_id_fkey(nombre, rol), alumnos_intereses_maestro(nombre)")
    .eq("id", ideaId)
    .maybeSingle();
  if (error?.code === "22P02") notFound(); // id con formato inválido
  if (error) throw error;
  if (!idea) notFound();

  const [interesados, mensajes, parecidas, carreras, temas, misReportes] = await Promise.all([
    supabase.from("alumnos_ideas_interesados").select("persona_id, personas:personas_contacto(nombre, email)").eq("idea_id", idea.id),
    supabase
      .from("alumnos_ideas_mensajes")
      .select("id, texto, created_at, respuesta_a, autor_id, autor:personas!alumnos_ideas_mensajes_autor_id_fkey(nombre, rol)")
      .eq("idea_id", idea.id)
      .order("created_at"),
    idea.interes_id
      ? supabase
          .from("alumnos_ideas")
          .select("id, titulo, estado")
          .eq("interes_id", idea.interes_id)
          .neq("id", idea.id)
          .order("created_at", { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("alumnos_carreras").select("persona_id, alumnos_carreras_maestro(nombre)"),
    supabase.from("alumnos_intereses_maestro").select("id, nombre").eq("activo", true).order("orden").order("nombre"),
    // Solo los reportes propios (RLS); a los profesores no les hace falta reportar.
    esAlumno
      ? supabase.from("alumnos_ideas_reportes").select("mensaje_id").eq("idea_id", idea.id).eq("persona_id", persona.id)
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const r of [interesados, mensajes, parecidas, carreras, temas, misReportes]) if (r.error) throw r.error;

  const volver = `/alumnos/ideas/${idea.id}`;
  const tomada = idea.estado === "tomada";
  const puedoEditar = idea.autor_id === persona.id || persona.rol === "admin";
  const meInteresa = interesados.data!.some((i) => i.persona_id === persona.id);
  const carreraDe = new Map(carreras.data!.map((c) => [c.persona_id, c.alumnos_carreras_maestro.nombre]));
  const autorIdea = !idea.autor ? "autor desconocido" : idea.autor.rol === "admin" ? "los profesores" : idea.autor.nombre;
  const contextoCargado = CONTEXTO.filter(({ campo }) => idea[campo]);
  const esAutor = idea.autor_id === persona.id;
  const reportado = new Set(misReportes.data!.map((r) => r.mensaje_id ?? "idea"));
  // El autor borra solo si nadie marcó "Me interesa"; los profesores siempre (para moderar).
  const puedoBorrar = persona.rol === "admin" || interesados.data!.length === 0;

  const preguntas = mensajes.data!.filter((m) => !m.respuesta_a);
  const respuestasDe = (id: string) => mensajes.data!.filter((m) => m.respuesta_a === id);
  const firma = (m: (typeof preguntas)[number]) => (
    <p className="flex flex-wrap items-center gap-2 text-xs text-[#666]">
      <span className="font-medium text-primary">{m.autor?.rol === "admin" ? "Profesores" : (m.autor?.nombre ?? "Alguien")}</span>
      {m.autor_id && m.autor_id === idea.autor_id && <Badge variant="outline">Autor de la idea</Badge>}
      <span>{fecha(m.created_at)}</span>
    </p>
  );
  const reportarMensaje = (m: (typeof preguntas)[number]) =>
    esAlumno && m.autor_id !== persona.id && (
      <Reportar ideaId={idea.id} mensajeId={m.id} volver={volver} yaReportado={reportado.has(m.id)} que="este mensaje" />
  );

  return (
    <article className="max-w-3xl">
      <Link href="/alumnos/ideas" className="text-sm text-[#666] underline-offset-4 hover:text-primary hover:underline">
        ← Banco de ideas
      </Link>

      <header className="mt-6 mb-8 grid gap-3">
        <div className="flex flex-wrap gap-2">
          {idea.alumnos_intereses_maestro && <Badge variant="outline">{idea.alumnos_intereses_maestro.nombre}</Badge>}
          {tomada && <Badge variant="secondary">Tomada</Badge>}
        </div>
        <h1 className="font-serif text-3xl">{idea.titulo}</h1>
        <p className="text-sm text-[#666]">Propuesta por {autorIdea} · {fecha(idea.created_at)}</p>
        <p className="mt-2 whitespace-pre-line">{idea.descripcion}</p>
        {puedoEditar && (
          <details className="mt-2 border bg-card p-6">
            <summary className="cursor-pointer text-sm font-medium">Editar idea</summary>
            <form action={editarIdea} className="mt-4 grid gap-4">
              <input type="hidden" name="idea_id" value={idea.id} />
              <input type="hidden" name="volver" value={volver} />
              <div className="grid gap-2">
                <Label htmlFor="titulo">Título</Label>
                <input id="titulo" name="titulo" required minLength={3} maxLength={120} defaultValue={idea.titulo} className={`h-8 ${campoTexto} py-0`} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <textarea id="descripcion" name="descripcion" required minLength={10} maxLength={1500} rows={3} defaultValue={idea.descripcion} className={campoTexto} />
              </div>
              <div className="grid max-w-sm gap-2">
                <Label htmlFor="interes_id">Tema</Label>
                <select id="interes_id" name="interes_id" required defaultValue={idea.interes_id ?? ""} className="h-8 border bg-background px-2 text-sm">
                  <option value="" disabled>Elegí un tema</option>
                  {temas.data!.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              {CONTEXTO.map(({ campo, titulo }) => (
                <div key={campo} className="grid gap-2">
                  <Label htmlFor={campo}>{titulo} <span className="font-normal text-[#666]">(opcional)</span></Label>
                  <textarea id={campo} name={campo} rows={2} maxLength={1000} defaultValue={idea[campo] ?? ""} className={campoTexto} />
                </div>
              ))}
              <div><Button type="submit" size="sm">Guardar cambios</Button></div>
            </form>
          </details>
        )}
        {esAlumno && !esAutor && (
          <Reportar ideaId={idea.id} volver={volver} yaReportado={reportado.has("idea")} que="esta idea" />
        )}
      </header>

      <Suspense><Aviso searchParams={searchParams} /></Suspense>

      {/* Contexto ampliado */}
      <section className="mb-10 grid gap-6 border-t pt-8">
        <h2 className="font-serif text-xl">Contexto</h2>
        {contextoCargado.length === 0 && !puedoEditar && (
          <p className="text-sm text-[#666]">Quien propuso la idea todavía no sumó más contexto. Podés preguntarle abajo.</p>
        )}
        {contextoCargado.map(({ campo, titulo }) => (
          <div key={campo} className="grid gap-1">
            <h3 className="text-sm font-medium">{titulo}</h3>
            <p className="text-sm whitespace-pre-line text-[#666]">{idea[campo]}</p>
          </div>
        ))}
        {contextoCargado.length === 0 && puedoEditar && (
          <p className="text-sm text-[#666]">Todavía no hay contexto. Sumalo desde “Editar idea”, arriba.</p>
        )}
      </section>

      {/* Interesados */}
      <section className="mb-10 grid gap-4 border-t pt-8">
        <h2 className="font-serif text-xl">
          Interesados <span className="text-base text-[#666]">({interesados.data!.length})</span>
        </h2>
        {interesados.data!.length === 0 ? (
          <p className="text-sm text-[#666]">Todavía nadie marcó interés.</p>
        ) : (
          <ul className="grid gap-1 text-sm">
            {interesados.data!.map((i) => (
              <li key={i.persona_id}>
                {i.personas.nombre}
                {carreraDe.has(i.persona_id) && <span className="text-[#666]"> · {carreraDe.get(i.persona_id)}</span>}
                {" · "}
                <a href={`mailto:${i.personas.email}`} className="underline underline-offset-4 hover:text-[#666]">{i.personas.email}</a>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          {esAlumno && !tomada && (
            <form action={cambiarInteres}>
              <input type="hidden" name="idea_id" value={idea.id} />
              <input type="hidden" name="volver" value={volver} />
              <input type="hidden" name="accion" value={meInteresa ? "quitar" : "sumar"} />
              <Button type="submit" size="sm" variant={meInteresa ? "outline" : "default"}>
                {meInteresa ? "Ya no me interesa" : "Me interesa"}
              </Button>
            </form>
          )}
          {puedoEditar && (
            <form action={cambiarEstado}>
              <input type="hidden" name="idea_id" value={idea.id} />
              <input type="hidden" name="volver" value={volver} />
              <input type="hidden" name="estado" value={tomada ? "disponible" : "tomada"} />
              <Button type="submit" size="sm" variant="outline">{tomada ? "Volver a disponible" : "Marcar como tomada"}</Button>
            </form>
          )}
        </div>
        {puedoEditar && !puedoBorrar && (
          <p className="text-xs text-[#666]">
            Como ya hay interesados, la idea no se puede borrar: podés editarla o marcarla como tomada.
          </p>
        )}
        {puedoEditar && puedoBorrar && (
          <details className="text-sm">
            <summary className="cursor-pointer text-[#666] hover:text-destructive">Borrar idea</summary>
            <form action={borrarIdea} className="mt-3 grid gap-2 border bg-card p-4">
              <input type="hidden" name="idea_id" value={idea.id} />
              <input type="hidden" name="volver" value={volver} />
              <p>
                Se borran la idea{interesados.data!.length > 0 && ", sus interesados"}
                {mensajes.data!.length > 0 && " y sus preguntas y respuestas"}. No se puede deshacer.
              </p>
              <div><Button type="submit" size="sm" variant="destructive">Sí, borrar la idea</Button></div>
            </form>
          </details>
        )}
      </section>

      {/* Preguntas y respuestas */}
      <section className="mb-10 grid gap-6 border-t pt-8">
        <div>
          <h2 className="font-serif text-xl">Preguntas y respuestas</h2>
          <p className="text-sm text-[#666]">Alumnos y profesores pueden preguntar o responder. Así se conoce mejor el problema antes de sumarse.</p>
        </div>

        {preguntas.length === 0 && <p className="text-sm text-[#666]">Todavía no hay preguntas. ¡Hacé la primera!</p>}

        <ol className="grid gap-4">
          {preguntas.map((p) => (
            <li key={p.id} className="grid gap-3 border bg-background p-5">
              {firma(p)}
              <p className="text-sm whitespace-pre-line">{p.texto}</p>
              {reportarMensaje(p)}
              {respuestasDe(p.id).length > 0 && (
                <ol className="grid gap-3 border-l-2 pl-4">
                  {respuestasDe(p.id).map((r) => (
                    <li key={r.id} className="grid gap-1">
                      {firma(r)}
                      <p className="text-sm whitespace-pre-line">{r.texto}</p>
                      {reportarMensaje(r)}
                    </li>
                  ))}
                </ol>
              )}
              {(
                <details>
                  <summary className="cursor-pointer text-sm text-[#666] hover:text-primary">Responder</summary>
                  <form action={publicarMensaje} className="mt-3 grid gap-2">
                    <input type="hidden" name="idea_id" value={idea.id} />
                    <input type="hidden" name="volver" value={volver} />
                    <input type="hidden" name="respuesta_a" value={p.id} />
                    <textarea
                      name="texto"
                      required
                      minLength={2}
                      maxLength={1000}
                      rows={2}
                      aria-label="Tu respuesta"
                      className="border bg-background px-2.5 py-2 text-sm outline-none focus-visible:border-ring"
                    />
                    <div><Button type="submit" size="sm" variant="outline">Responder</Button></div>
                  </form>
                </details>
              )}
            </li>
          ))}
        </ol>

        {(
          <form action={publicarMensaje} className="grid gap-2 border bg-card p-5">
            <input type="hidden" name="idea_id" value={idea.id} />
            <input type="hidden" name="volver" value={volver} />
            <Label htmlFor="nueva_pregunta">Hacé una pregunta</Label>
            <textarea
              id="nueva_pregunta"
              name="texto"
              required
              minLength={2}
              maxLength={1000}
              rows={3}
              className="border bg-background px-2.5 py-2 text-sm outline-none focus-visible:border-ring"
            />
            <div><Button type="submit" size="sm">Publicar pregunta</Button></div>
          </form>
        )}
      </section>

      {/* Ideas parecidas */}
      {parecidas.data!.length > 0 && (
        <section className="grid gap-3 border-t pt-8">
          <h2 className="font-serif text-xl">Ideas parecidas</h2>
          <p className="text-sm text-[#666]">Del mismo tema, para comparar y no repetir.</p>
          <ul className="grid gap-2">
            {parecidas.data!.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <Link href={`/alumnos/ideas/${p.id}`} className="underline underline-offset-4 hover:text-[#666]">{p.titulo}</Link>
                {p.estado === "tomada" && <Badge variant="secondary">Tomada</Badge>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
