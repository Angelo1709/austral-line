// GRUPO MENTORES — reuniones de mentoría. 24 h antes de cada una, el asistente le manda al mentor un resumen.
import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Encabezado } from "../_components/accion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { modoPrueba } from "../_resend";
import { crearReunion, marcarAviso } from "./acciones";
import { hayIA, urlBase } from "./agente";
import { BotonGuardar } from "./boton-guardar";
import { estadoResumen, metricas, vigente, type Tono } from "./estado";
import { fechaCorta, fechaHora } from "./fechas";
import { pedirFeedback } from "../feedback/agente";

const variantes: Record<Tono, "default" | "outline" | "destructive" | "secondary"> = {
  ok: "default",
  pendiente: "outline",
  error: "destructive",
  neutro: "secondary",
};

export default async function Reuniones({ searchParams }: PageProps<"/mentores/reuniones">) {
  const persona = await requireRol("mentor");
  const esAdmin = persona.rol === "admin";
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  await pedirFeedback(supabase, await urlBase()); // las reuniones que ya terminaron piden su feedback

  // Cada mentor ve solo sus reuniones (lo asegura la base); el coordinador ve todas.
  const [reuniones, proyectos, mentores] = await Promise.all([
    supabase
      .from("mentores_reuniones")
      .select("id, inicio, lugar, notas, cancelada, proyectos(nombre), mentor:personas!mentores_reuniones_mentor_id_fkey(nombre), mentores_resumenes(id, estado, programado_para, created_at, leido_at, aviso, aviso_util, aviso_mail_at, le_sirvio, minutos_ahorrados)")
      .order("inicio"),
    supabase.from("proyectos").select("id, nombre").order("nombre"),
    supabase.from("personas").select("id, nombre").eq("rol", "mentor").order("nombre"),
  ]);
  for (const r of [reuniones, proyectos, mentores]) if (r.error) throw r.error;

  const ahora = new Date().getTime(); // Server Component: se calcula una vez por pedido
  const lista = reuniones.data!;
  const proximas = lista.filter((r) => new Date(r.inicio).getTime() > ahora);
  const anteriores = lista.filter((r) => new Date(r.inicio).getTime() <= ahora).reverse();
  const m = metricas(lista, ahora);
  const avisos = lista
    .map((r) => ({ reunion: r, resumen: vigente(r.mentores_resumenes) }))
    .filter(({ resumen }) => !!resumen?.aviso)
    .sort((a, b) => b.resumen!.created_at.localeCompare(a.resumen!.created_at));

  const filas = (rs: typeof lista, conNotas: boolean) =>
    rs.map((r) => {
      const estado = estadoResumen(r, r.mentores_resumenes, ahora);
      return (
        <TableRow key={r.id} className={r.cancelada ? "text-[#666]" : undefined}>
          <TableCell className="whitespace-nowrap">{fechaCorta(r.inicio)}</TableCell>
          <TableCell>{r.proyectos.nombre}</TableCell>
          {esAdmin && <TableCell className="text-[#666]">{r.mentor.nombre}</TableCell>}
          <TableCell><Badge variant={variantes[estado.tono]}>{estado.texto}</Badge></TableCell>
          {conNotas && <TableCell className={r.cancelada || r.notas ? "text-[#555]" : "font-medium text-destructive"}>{r.cancelada ? "—" : r.notas ? "Cargadas" : "Faltan cargar"}</TableCell>}
          <TableCell className="text-right">
            <Link href={`/mentores/reuniones/${r.id}`} className={buttonVariants({ variant: "outline", className: "h-10 px-4 text-base" })}>{conNotas && !r.cancelada && !r.notas ? "Cargar notas" : "Abrir"}</Link>
          </TableCell>
        </TableRow>
      );
    });

  const encabezado = (conNotas: boolean) => (
    <TableHeader>
      <TableRow>
        <TableHead>Cuándo</TableHead>
        <TableHead>Proyecto</TableHead>
        {esAdmin && <TableHead>Mentor</TableHead>}
        <TableHead>Resumen</TableHead>
        {conNotas && <TableHead>Notas</TableHead>}
        <TableHead />
      </TableRow>
    </TableHeader>
  );

  return (
    <div className="mx-auto max-w-5xl">
      <Encabezado
        titulo={esAdmin ? "Reuniones" : "Mis reuniones"}
        bajada={esAdmin
          ? "Cargá cada reunión entre un mentor y un equipo. El día antes, el asistente le manda al mentor un resumen para prepararla."
          : "El día antes de cada reunión te llega por mail un resumen para prepararte. Cuando termine, apretá “Cargar notas” y anotá qué se habló: sirve para la próxima."}
        volver={{ href: "/mentores", texto: "Volver al inicio de Mentores" }}
      />

      {esAdmin && (modoPrueba() || !hayIA()) && (
        <div className="mb-6 grid gap-1 border-l-2 border-primary pl-4 text-sm text-[#666]">
          {modoPrueba() && <p>Modo prueba: falta la clave de Resend (<code>RESEND_API_KEY</code>), así que los resúmenes se registran como &quot;simulado&quot; y no sale ningún mail.</p>}
          {!hayIA() && <p>Falta la clave de IA (<code>AI_GATEWAY_API_KEY</code>): los resúmenes salen solo con los datos cargados, sin la síntesis ni los avisos de la IA.</p>}
        </div>
      )}
      {typeof ok === "string" && <p role="status" className="mb-6 border-l-4 border-primary bg-card p-4 text-base">✓ {ok}</p>}
      {typeof error === "string" && <p role="alert" className="mb-6 border-l-4 border-destructive bg-destructive/5 p-4 text-base text-destructive">{error}</p>}

      {esAdmin && (
        <section className="mb-12">
          <div className="grid gap-px border bg-border sm:grid-cols-2 lg:grid-cols-5">
            {[
              { titulo: "Resumen a tiempo", valor: `${m.aTiempo} de ${m.debian}`, detalle: "reuniones que ya debían tenerlo" },
              { titulo: "Leídos", valor: `${m.leidos} de ${m.aTiempo}`, detalle: "el mentor lo abrió en la app" },
              { titulo: "Les sirvió", valor: `${m.lesSirvio} de ${m.opinaron}`, detalle: "mentores que opinaron" },
              {
                titulo: "Tiempo ahorrado",
                valor: `${m.minutosAhorrados} min`,
                detalle: m.conMinutos ? `promedio ${Math.round(m.minutosAhorrados / m.conMinutos)} min por reunión` : "ningún mentor lo cargó todavía",
              },
              { titulo: "Avisos al coordinador", valor: String(m.avisos), detalle: `${m.avisosPorMail} por mail · sirvieron ${m.avisosUtiles} de ${m.avisosMarcados}` },
            ].map((t) => (
              <div key={t.titulo} className="bg-background p-6">
                <p className="text-sm text-[#666]">{t.titulo}</p>
                <p className="mt-2 font-serif text-3xl">{t.valor}</p>
                <p className="mt-1 text-xs text-[#666]">{t.detalle}</p>
              </div>
            ))}
          </div>

          {avisos.length > 0 && (
            <div id="avisos" className="mt-8">
              <h2 className="mb-4 font-serif text-xl">Avisos del asistente</h2>
              <div className="grid gap-3">
                {avisos.map(({ reunion, resumen }) => (
                  <div key={resumen!.id} className="border p-4 text-sm">
                    <p className="text-[#666]">
                      <Link href={`/mentores/reuniones/${reunion.id}`} className="text-primary underline underline-offset-4">{reunion.proyectos.nombre}</Link>
                      {" · "}{reunion.mentor.nombre} · {fechaHora(reunion.inicio)}
                    </p>
                    <p className="mt-2">{resumen!.aviso}</p>
                    <form action={marcarAviso} className="mt-3 flex items-center gap-2">
                      <input type="hidden" name="resumen_id" value={resumen!.id} />
                      <span className="mr-1 text-[#666]">¿Te sirvió?</span>
                      <Button type="submit" name="util" value="si" size="sm" variant={resumen!.aviso_util === true ? "default" : "outline"}>Sí</Button>
                      <Button type="submit" name="util" value="no" size="sm" variant={resumen!.aviso_util === false ? "default" : "outline"}>No</Button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="mb-12">
        <h2 className="mb-4 font-serif text-xl">Próximas reuniones</h2>
        {proximas.length === 0 ? (
          <p className="border p-6 text-center text-sm text-[#666]">No tenés reuniones próximas. Podés agendar una abajo.</p>
        ) : (
          <Table>{encabezado(false)}<TableBody>{filas(proximas, false)}</TableBody></Table>
        )}
      </section>

      <section className="mb-12">
        <h2 className="mb-1 font-serif text-xl">Agendar una reunión nueva</h2>
        <p className="mb-4 text-base text-[#555]">Completá los datos y apretá “Guardar reunión”.</p>
        <form action={crearReunion} className="grid gap-4 border p-6 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="proyecto_id">Proyecto</Label>
            <select id="proyecto_id" name="proyecto_id" required defaultValue="" className="h-11 border bg-background px-3 text-base">
              <option value="" disabled>Elegí un proyecto</option>
              {proyectos.data!.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          {esAdmin && (
            <div className="grid gap-2">
              <Label htmlFor="mentor_id">Mentor</Label>
              <select id="mentor_id" name="mentor_id" required defaultValue="" className="h-11 border bg-background px-3 text-base">
                <option value="" disabled>Elegí un mentor</option>
                {mentores.data!.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="inicio">Fecha y hora</Label>
            <Input id="inicio" name="inicio" type="datetime-local" required className="h-11 text-base" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lugar">Lugar o link (opcional)</Label>
            <Input id="lugar" name="lugar" placeholder="Ej: Sala 3, o el link de Meet" className="h-11 text-base" />
          </div>
          <div className="md:col-span-2">
            <BotonGuardar pendiente="Guardando y armando el resumen…">Guardar reunión</BotonGuardar>
          </div>
        </form>
      </section>

      <section>
        <h2 className="mb-4 font-serif text-xl">Reuniones que ya pasaron</h2>
        {anteriores.length === 0 ? (
          <p className="border p-6 text-center text-sm text-[#666]">Todavía no hubo reuniones.</p>
        ) : (
          <Table>{encabezado(true)}<TableBody>{filas(anteriores, true)}</TableBody></Table>
        )}
      </section>
    </div>
  );
}
