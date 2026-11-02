// GRUPO MENTORES — esta carpeta es de ustedes.
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { ArrowRight, BadgeCheck, Clock, Hourglass, Sparkles, TriangleAlert } from "lucide-react";
import { getUsuario, requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { urlBase } from "./reuniones/agente";
import { pedirFeedback } from "./feedback/agente";

async function marcarRevisado(formData: FormData) {
  "use server";
  const { persona } = await getUsuario();
  if (persona?.rol !== "admin") throw new Error("Solo el administrador revisa estas cargas.");
  const supabase = await createClient();
  const { error } = await supabase.from("mentores_perfil_eventos").update({ revisado: true }).eq("id", String(formData.get("evento_id")));
  if (error) throw error;
  revalidatePath("/mentores");
}

const enlace = "text-sm text-[#666] underline underline-offset-4 hover:text-primary";

function EnlacesReuniones({ esAdmin }: { esAdmin: boolean }) {
  return (
    <div className="flex flex-wrap gap-6">
      <Link href="/mentores/reuniones" className={enlace}>Reuniones y resúmenes pre-reunión</Link>
      {esAdmin
        ? <Link href="/mentores/feedback" className={enlace}>Feedback de reuniones</Link>
        : <Link href="/mentores/mi-feedback" className={enlace}>Mi feedback</Link>}
    </div>
  );
}

export default async function Mentores() {
  // Propio, no solo del layout: la sección Mentores deja entrar alumnos para otra pantalla
  // (PR #18), así que esta página tiene que seguir bloqueando a quien no sea mentor o admin.
  const persona = await requireRol("mentor");
  const supabase = await createClient();
  // Al entrar, el asistente pide el feedback de las reuniones que ya terminaron.
  await pedirFeedback(supabase, await urlBase());

  if (persona.rol === "admin") return <PanelAdmin />;

  const [{ data: personas, error }, { data: miPerfil }] = await Promise.all([
    supabase.from("personas").select("id, nombre, email").eq("rol", "mentor").order("nombre"),
    supabase.from("mentores_perfil").select("estado").eq("persona_id", persona.id).maybeSingle(),
  ]);
  if (error) throw error;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-2xl">Mentores</h1>
        <EnlacesReuniones esAdmin={false} />
      </div>

      <Card className="mb-8 flex-row flex-wrap items-center justify-between gap-4 px-5">
        <div className="grid gap-1.5">
          <p className="text-sm text-[#666]">Tu perfil</p>
          <Badge variant={miPerfil?.estado === "publicado" ? "default" : "outline"} className="w-fit">
            {miPerfil?.estado === "publicado" ? "Publicado" : "Todavía no lo completaste"}
          </Badge>
        </div>
        <Link href="/mentores/perfil-publico" className={buttonVariants({ size: "lg" })}>
          {miPerfil ? "Editar perfil" : "Cargar perfil"}
        </Link>
      </Card>

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
    supabase.from("personas").select("id, nombre, email, mentores_perfil(*)").eq("rol", "mentor").order("nombre"),
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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-2xl">Mentores</h1>
        <div className="flex flex-wrap items-center gap-6">
          <EnlacesReuniones esAdmin />
          <Link href="/mentores/match" className={buttonVariants()}>Match de proyectos</Link>
        </div>
      </div>

      {!!alertasMatch.count && (
        <Link href="/mentores/match#alertas" className="mb-6 flex items-center gap-2 border border-primary p-4 text-sm hover:bg-card">
          <TriangleAlert className="size-4" />
          Tenés {alertasMatch.count} {alertasMatch.count === 1 ? "alerta" : "alertas"} del Match sin revisar
          <span className="underline underline-offset-4">Ver alertas</span>
        </Link>
      )}

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
                  <button type="submit" className="shrink-0 text-[#666] hover:text-primary">Marcar revisado</button>
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
