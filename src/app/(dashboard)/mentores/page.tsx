// GRUPO MENTORES — esta carpeta es de ustedes.
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { ArrowRight, BadgeCheck, CalendarDays, Clock, Hourglass, MessageSquareText, Sparkles, TriangleAlert, UserRound, UsersRound } from "lucide-react";
import { getUsuario, requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { urlBase } from "./reuniones/agente";
import { pedirFeedback } from "./feedback/agente";
import { Accion, Encabezado } from "./_components/accion";

async function marcarRevisado(formData: FormData) {
  "use server";
  const { persona } = await getUsuario();
  if (persona?.rol !== "admin") throw new Error("Solo el administrador revisa estas cargas.");
  const supabase = await createClient();
  const { error } = await supabase.from("mentores_perfil_eventos").update({ revisado: true }).eq("id", String(formData.get("evento_id")));
  if (error) throw error;
  revalidatePath("/mentores");
}

// Aislado porque la fecha actual es un dato impuro (regla react-hooks/purity).
const ahoraIso = () => new Date().toISOString();

export default async function Mentores() {
  // Propio, no solo del layout: la sección Mentores deja entrar alumnos para otra pantalla
  // (PR #18), así que esta página tiene que seguir bloqueando a quien no sea mentor o admin.
  const persona = await requireRol("mentor");
  const supabase = await createClient();
  // Al entrar, el asistente pide el feedback de las reuniones que ya terminaron.
  await pedirFeedback(supabase, await urlBase());

  if (persona.rol === "admin") return <PanelAdmin />;

  const [{ data: personas, error }, { data: miPerfil }, encuestas, reuniones] = await Promise.all([
    supabase.from("personas_contacto").select("id, nombre, email").eq("rol", "mentor").order("nombre"),
    supabase.from("mentores_perfil").select("estado").eq("persona_id", persona.id).maybeSingle(),
    supabase.from("mentores_encuestas").select("id", { count: "exact", head: true }).eq("persona_id", persona.id).eq("estado", "pendiente"),
    supabase.from("mentores_reuniones").select("id", { count: "exact", head: true })
      .eq("mentor_id", persona.id).eq("cancelada", false).gt("inicio", ahoraIso()),
  ]);
  if (error) throw error;
  if (encuestas.error) throw encuestas.error;
  if (reuniones.error) throw reuniones.error;
  const publicado = miPerfil?.estado === "publicado";

  return (
    <>
      <Encabezado
        titulo={`Hola, ${persona.nombre.split(" ")[0]}`}
        bajada="Elegí qué querés hacer. Si algo tiene un número, es porque te está esperando."
      />

      <div className="mb-12 grid gap-4 md:grid-cols-3">
        <Accion
          href="/mentores/mi-feedback"
          icono={MessageSquareText}
          titulo="Contar cómo te fue"
          descripcion="Después de cada reunión con un equipo te hacemos 3 preguntas cortas. Lo lee solo el coordinador."
          boton={encuestas.count ? "Contestar ahora" : "Ver mis respuestas"}
          pendientes={encuestas.count ?? 0}
          textoPendientes="para contestar"
        />
        <Accion
          href="/mentores/reuniones"
          icono={CalendarDays}
          titulo="Mis reuniones"
          descripcion="Ver tus próximas reuniones, el resumen para prepararte y anotar qué se habló."
          boton="Ver reuniones"
          pendientes={reuniones.count ?? 0}
          textoPendientes={reuniones.count === 1 ? "próxima" : "próximas"}
        />
        <Accion
          href="/mentores/perfil-publico"
          icono={UserRound}
          titulo="Mi perfil"
          descripcion={publicado
            ? "Tu perfil ya lo ven los alumnos. Entrá si querés cambiar algo."
            : "Contanos a qué te dedicás para que los alumnos te conozcan. Tarda 5 minutos."}
          boton={publicado ? "Editar mi perfil" : miPerfil ? "Terminar mi perfil" : "Cargar mi perfil"}
          pendientes={publicado ? 0 : 1}
          textoPendientes="sin terminar"
        />
      </div>

      <h2 className="mb-3 font-serif text-xl">Otros mentores de la materia</h2>
      <Table>
        <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Email</TableHead></TableRow></TableHeader>
        <TableBody>
          {personas.map((p) => (
            <TableRow key={p.id}><TableCell>{p.nombre}</TableCell><TableCell>{p.email}</TableCell></TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

// Aislado en una función aparte porque la fecha actual es un dato impuro: no se puede llamar
// directo en el cuerpo de un componente (regla react-hooks/purity).
function haceMasDeUnaSemana(fechaIso: string) {
  return Date.now() - new Date(fechaIso).getTime() > 7 * 24 * 60 * 60 * 1000;
}

// El admin no carga perfiles (es de cada mentor): ve el estado de todos y lo que el agente
// marcó para revisar. Las métricas son las que pide la cátedra para este agente.
async function PanelAdmin() {
  const supabase = await createClient();

  const [{ data: mentores, error: errorMentores }, { data: eventosSpam, error: errorEventos }] = await Promise.all([
    supabase.from("personas_contacto").select("id, nombre, email, mentores_perfil(*)").eq("rol", "mentor").order("nombre"),
    supabase.from("mentores_perfil_eventos").select("id, persona_id, detalle, created_at").eq("tipo", "marcado_spam").eq("revisado", false).order("created_at"),
  ]);
  if (errorMentores) throw errorMentores;
  if (errorEventos) throw errorEventos;

  // Match proyecto–mentor: cuántos proyectos acompaña cada uno y alertas del agente sin revisar.
  const [asignaciones, alertasMatch] = await Promise.all([
    supabase.from("mentores_sugerencias").select("mentor_id").eq("estado", "aceptada"),
    supabase.from("mentores_match_pedidos").select("id", { count: "exact", head: true })
      .not("aviso", "is", null).is("alerta_revisada_at", null),
  ]);
  if (asignaciones.error) throw asignaciones.error;
  if (alertasMatch.error) throw alertasMatch.error;

  const { count: autocorrecciones, error: errorAutocorrecciones } = await supabase
    .from("mentores_perfil_eventos").select("id", { count: "exact", head: true }).eq("tipo", "correccion_ia");
  if (errorAutocorrecciones) throw errorAutocorrecciones;

  const perfiles = mentores.flatMap((m) => (m.mentores_perfil ? [m.mentores_perfil] : []));
  const publicados = perfiles.filter((p) => p.estado === "publicado");
  const sinCorreccionPosterior = publicados.filter((p) => p.ediciones_post_publicacion === 0);
  const horasPromedioCarga = publicados.length
    ? publicados.reduce((acc, p) => acc + (new Date(p.publicado_at!).getTime() - new Date(p.iniciado_at).getTime()), 0) /
      publicados.length / 1000 / 60 / 60
    : null;
  const abandonados = perfiles.filter((p) => p.estado === "borrador" && haceMasDeUnaSemana(p.updated_at));

  const nombrePorPersona = new Map(mentores.map((m) => [m.id, m.nombre]));

  return (
    <>
      <Encabezado
        titulo="Mentores"
        bajada="Elegí qué querés hacer. Los números te muestran lo que el asistente dejó para que revises."
      />

      <div className="mb-12 grid gap-4 md:grid-cols-3">
        <Accion
          href={alertasMatch.count ? "/mentores/match#alertas" : "/mentores/match"}
          icono={UsersRound}
          titulo="Asignar mentores a proyectos"
          descripcion="El asistente te sugiere hasta 3 mentores por proyecto. Vos elegís cuál queda."
          boton="Ir a asignar"
          pendientes={alertasMatch.count ?? 0}
          textoPendientes={alertasMatch.count === 1 ? "alerta" : "alertas"}
        />
        <Accion
          href="/mentores/reuniones"
          icono={CalendarDays}
          titulo="Reuniones"
          descripcion="Cargar una reunión entre un mentor y un equipo. El asistente le manda al mentor un resumen el día antes."
          boton="Ver reuniones"
        />
        <Accion
          href="/mentores/feedback"
          icono={MessageSquareText}
          titulo="Cómo les fue en las reuniones"
          descripcion="Lo que contestaron mentores y alumnos después de cada reunión, resumido y sin nombres."
          boton="Ver el feedback"
        />
      </div>

      <h2 className="mb-1 font-serif text-xl">Perfiles de los mentores</h2>
      <p className="mb-4 text-base text-[#555]">Cómo viene la carga de perfiles que hace cada mentor.</p>
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Perfiles publicados",
            valor: `${publicados.length} / ${mentores.length}`,
            texto: mentores.length
              ? `${publicados.length} de ${mentores.length} mentores ya tienen perfil visible para los alumnos.`
              : "Todavía no hay mentores cargados.",
            icono: BadgeCheck,
          },
          {
            label: "Quedan bien sin corregir",
            valor: publicados.length ? `${Math.round((sinCorreccionPosterior.length / publicados.length) * 100)}%` : "—",
            texto: publicados.length
              ? "De los perfiles publicados, el resto tuvo que corregir algo después."
              : "Se calcula una vez que haya perfiles publicados.",
            icono: Sparkles,
          },
          {
            label: "Tiempo prom. de carga",
            valor: horasPromedioCarga != null ? `${horasPromedioCarga.toFixed(1)} hs` : "—",
            texto: "Desde que el mentor empieza a escribir hasta que publica.",
            icono: Clock,
          },
          {
            label: "Borradores abandonados",
            valor: `${abandonados.length} / ${perfiles.length}`,
            texto: abandonados.length
              ? abandonados.length > 1
                ? `${abandonados.length} mentores empezaron hace más de una semana y no terminaron.`
                : "1 mentor empezó hace más de una semana y no terminó."
              : "Nadie quedó a mitad de camino hace más de una semana.",
            icono: Hourglass,
            atencion: abandonados.length > 0,
          },
        ].map(({ label, valor, texto, icono: Icono, atencion }) => (
          <Card key={label}>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <span className={cn("flex size-7 shrink-0 items-center justify-center", atencion ? "bg-destructive/10 text-destructive" : "bg-muted text-[#666]")}>
                <Icono className="size-4" />
              </span>
              <CardTitle className="text-sm font-normal text-[#666]">{label}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-1">
              <p className="font-serif text-2xl">{valor}</p>
              <p className="text-xs text-[#666]">{texto}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {eventosSpam.length > 0 && (
        <div className="mb-10 border border-destructive/40 bg-destructive/5 p-5">
          <h2 className="mb-4 flex items-center gap-2 font-serif text-lg">
            <TriangleAlert className="size-5 text-destructive" /> Cargas para revisar
          </h2>
          <ul className="grid gap-3">
            {eventosSpam.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 text-sm">
                <span>
                  <strong>{nombrePorPersona.get(e.persona_id) ?? "Mentor"}</strong>
                  {": "}
                  {(e.detalle as { motivo?: string } | null)?.motivo ?? "El agente marcó esta carga como posible spam."}
                </span>
                <form action={marcarRevisado}>
                  <input type="hidden" name="evento_id" value={e.id} />
                  <button type="submit" className={buttonVariants({ variant: "outline", size: "lg" })}>Ya lo revisé</button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow><TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Perfil</TableHead><TableHead>Proyectos</TableHead><TableHead /></TableRow>
        </TableHeader>
        <TableBody>
          {mentores.map((m) => (
            <TableRow key={m.id}>
              <TableCell>
                <Link href={`/mentores/${m.id}`} className="hover:text-primary hover:underline">{m.nombre}</Link>
              </TableCell>
              <TableCell>{m.email}</TableCell>
              <TableCell>
                <Badge variant={m.mentores_perfil?.estado === "publicado" ? "default" : "outline"}>
                  {m.mentores_perfil?.estado === "publicado" ? "Publicado" : m.mentores_perfil ? "Borrador" : "Sin empezar"}
                </Badge>
              </TableCell>
              <TableCell>{asignaciones.data.filter((a) => a.mentor_id === m.id).length}</TableCell>
              <TableCell>
                <Link href={`/mentores/${m.id}`} className="inline-flex items-center gap-1 text-[#666] hover:text-primary">
                  Ver perfil <ArrowRight className="size-3.5" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="mt-6 flex items-center gap-1.5 text-sm text-[#666]">
        <Sparkles className="size-4" /> El agente hizo {autocorrecciones ?? 0} autocorrecciones hasta ahora (datos que no inventó o links que completó solo).
      </p>
    </>
  );
}
