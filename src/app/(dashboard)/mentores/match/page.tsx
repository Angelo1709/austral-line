// GRUPO MENTORES — match proyecto–mentor. El agente sugiere; el coordinador decide.
import { Suspense } from "react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { BotonEnviar } from "../_components/boton-enviar";
import { Encabezado } from "../_components/accion";
import { Estrellas } from "../_components/estrellas";
import { sugerirMentores } from "./agente";

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
// Cuánto tardaba el coordinador en encontrar un mentor a mano (dato del grupo).
const MINUTOS_A_MANO = 60;
const duracion = (min: number) =>
  min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}`;
const conError = (mensaje: string) => redirect(`/mentores/match?error=${encodeURIComponent(mensaje)}`);

async function pedirSugerencias(formData: FormData) {
  "use server";
  const coordinador = await requireRol();
  const proyectoId = String(formData.get("proyecto_id"));
  if (!process.env.AI_GATEWAY_API_KEY) conError("Falta la clave de IA (AI_GATEWAY_API_KEY) en .env.local. Pedísela al profe.");

  const supabase = await createClient();
  let resultado;
  try {
    resultado = await sugerirMentores(supabase, proyectoId);
  } catch (e) {
    console.error(e);
    conError("El agente no pudo armar sugerencias. Probá de nuevo en un rato.");
  }

  const { data: pedido, error } = await supabase
    .from("mentores_match_pedidos")
    .insert({ proyecto_id: proyectoId, pedido_por: coordinador.id, aviso: resultado!.aviso })
    .select("id")
    .single();
  if (error) throw error;
  if (resultado!.sugerencias.length) {
    const { error } = await supabase.from("mentores_sugerencias").insert(
      resultado!.sugerencias.map((s) => ({ ...s, pedido_id: pedido.id, proyecto_id: proyectoId })),
    );
    if (error) throw error;
  }
  revalidatePath("/mentores/match");
  redirect("/mentores/match");
}

async function decidir(formData: FormData) {
  "use server";
  const coordinador = await requireRol();
  const estado = String(formData.get("estado"));
  if (estado !== "aceptada" && estado !== "rechazada") conError("Decisión inválida");

  const supabase = await createClient();
  const id = String(formData.get("id"));
  const ahora = new Date();
  // Tiempo ahorrado: buscarlo a mano (60 min) menos lo que tardó desde que pidió sugerencias hasta aceptar.
  let minutos_ahorrados: number | null = null;
  if (estado === "aceptada") {
    const { data } = await supabase.from("mentores_sugerencias").select("pedido_id").eq("id", id).single();
    const { data: pedido } = await supabase.from("mentores_match_pedidos").select("created_at").eq("id", data?.pedido_id ?? "").single();
    const tardo = pedido ? (ahora.getTime() - Date.parse(pedido.created_at)) / 6e4 : MINUTOS_A_MANO;
    minutos_ahorrados = Math.max(0, Math.round(MINUTOS_A_MANO - tardo));
  }
  const { error } = await supabase
    .from("mentores_sugerencias")
    .update({ estado, decidido_por: coordinador.id, decidido_at: ahora.toISOString(), minutos_ahorrados })
    .eq("id", id)
    .eq("estado", "pendiente");
  if (error) throw error;
  revalidatePath("/mentores/match");
  revalidatePath("/mentores");
  redirect(minutos_ahorrados === null ? "/mentores/match" : `/mentores/match?ok=${encodeURIComponent(`Mentor asignado. Se ahorraron ${duracion(minutos_ahorrados)} frente a buscarlo a mano.`)}`);
}

async function calificar(formData: FormData) {
  "use server";
  const coordinador = await requireRol();
  const estrellas = Number(formData.get("satisfaccion"));
  if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) conError("Elegí de 1 a 5 estrellas para calificar el match.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("mentores_sugerencias")
    .update({
      satisfaccion: estrellas,
      opinion: String(formData.get("opinion") ?? "").trim() || null,
      calificado_por: coordinador.id,
      calificado_at: new Date().toISOString(),
    })
    .eq("id", String(formData.get("id")))
    .in("estado", ["aceptada", "quitada"]);
  if (error) throw error;
  revalidatePath("/mentores/match");
  redirect("/mentores/match");
}

async function quitar(formData: FormData) {
  "use server";
  const coordinador = await requireRol();
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (motivo.length < 5) conError("Para quitar un mentor hace falta contar el motivo.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("mentores_sugerencias")
    .update({ estado: "quitada", quitado_por: coordinador.id, quitado_at: new Date().toISOString(), motivo_quitado: motivo })
    .eq("id", String(formData.get("id")))
    .eq("estado", "aceptada");
  if (error) throw error;
  revalidatePath("/mentores/match");
  revalidatePath("/mentores");
  redirect("/mentores/match");
}

async function marcarRevisada(formData: FormData) {
  "use server";
  const coordinador = await requireRol();
  const supabase = await createClient();
  const { error } = await supabase
    .from("mentores_match_pedidos")
    .update({ alerta_revisada_at: new Date().toISOString(), alerta_revisada_por: coordinador.id })
    .eq("id", String(formData.get("id")));
  if (error) throw error;
  revalidatePath("/mentores/match");
  revalidatePath("/mentores");
  redirect("/mentores/match");
}

async function MensajeError({ searchParams }: Pick<PageProps<"/mentores/match">, "searchParams">) {
  const { error, ok } = await searchParams;
  if (error) return <p role="alert" className="mb-6 border-l-4 border-destructive bg-destructive/5 p-4 text-base text-destructive">{error}</p>;
  if (ok) return <p role="status" className="mb-6 border-l-4 border-primary bg-card p-4 text-base">✓ {ok}</p>;
}

export default async function Match({ searchParams }: PageProps<"/mentores/match">) {
  await requireRol();
  const sinClaveIA = !process.env.AI_GATEWAY_API_KEY;
  const supabase = await createClient();
  const [proyectos, mentores, sugerencias, pedidos] = await Promise.all([
    supabase.from("proyectos").select("id, nombre, descripcion, estado").order("nombre"),
    supabase.from("personas").select("id, nombre").eq("rol", "mentor"),
    supabase.from("mentores_sugerencias").select("*").order("afinidad", { ascending: false }),
    supabase.from("mentores_match_pedidos").select("id, proyecto_id, aviso, alerta_revisada_at, created_at").order("created_at", { ascending: false }),
  ]);
  for (const r of [proyectos, mentores, sugerencias, pedidos]) if (r.error) throw r.error;

  const nombreProyecto = (id: string) => proyectos.data!.find((p) => p.id === id)?.nombre ?? "Proyecto";
  const alertas = pedidos.data!.filter((x) => x.aviso && !x.alerta_revisada_at);
  const nombre = (id: string) => mentores.data!.find((m) => m.id === id)?.nombre ?? "Mentor dado de baja";
  const pct = (parte: number, total: number) => (total ? `${Math.round((parte / total) * 100)}%` : "—");
  const decididas = sugerencias.data!.filter((s) => s.estado !== "pendiente");
  // Una quitada también fue aceptada en su momento.
  const aceptadas = decididas.filter((s) => s.estado === "aceptada" || s.estado === "quitada");
  const quitadas = decididas.filter((s) => s.estado === "quitada");
  const calificadas = aceptadas.filter((s) => s.satisfaccion !== null);
  const conMentor = new Set(decididas.filter((s) => s.estado === "aceptada").map((s) => s.proyecto_id));
  const metricas = [
    ["Sugerencias aceptadas", pct(aceptadas.length, decididas.length)],
    ["Hubo que cambiar mentor", pct(quitadas.length, aceptadas.length)],
    ["Tiempo ahorrado", duracion(aceptadas.reduce((total, s) => total + (s.minutos_ahorrados ?? 0), 0))],
    ["Satisfacción", calificadas.length ? `★ ${(calificadas.reduce((t, s) => t + s.satisfaccion!, 0) / calificadas.length).toFixed(1)}` : "—"],
    ["Pedidos al agente", pedidos.data!.length],
    ["Proyectos con mentor", `${conMentor.size} de ${proyectos.data!.length}`],
  ];

  return (
    <>
      <Encabezado
        titulo="Asignar mentores a proyectos"
        bajada="El asistente compara cada proyecto y su equipo con los perfiles de los mentores, y te sugiere hasta 3. Nadie queda asignado hasta que vos lo elegís."
        volver={{ href: "/mentores", texto: "Volver al inicio de Mentores" }}
      />
      <ol className="mb-8 grid gap-3 sm:grid-cols-3">
        {[
          ["1", "Apretá “Pedir sugerencias” en el proyecto."],
          ["2", "Leé por qué el asistente sugiere a cada mentor."],
          ["3", "Apretá “Asignar” en el que te guste."],
        ].map(([n, t]) => (
          <li key={n} className="flex items-center gap-3 border bg-background p-4 text-base">
            <span className="flex size-8 shrink-0 items-center justify-center bg-primary font-medium text-primary-foreground">{n}</span>
            {t}
          </li>
        ))}
      </ol>
      <Suspense><MensajeError searchParams={searchParams} /></Suspense>

      {sinClaveIA && (
        <p className="mb-8 max-w-2xl border-l-4 border-primary bg-card p-4 text-base">
          El agente no está disponible porque falta la clave de IA (AI_GATEWAY_API_KEY). Igual podés ver las
          métricas, los mentores asignados, quitarlos y calificar los matches; solo no se pueden pedir sugerencias nuevas.
        </p>
      )}

      {alertas.length > 0 && (
        <section id="alertas" className="mb-10 border border-primary p-6">
          <h2 className="mb-1 font-serif text-xl">⚠ El asistente te dejó {alertas.length} {alertas.length === 1 ? "aviso" : "avisos"}</h2>
          <p className="mb-4 text-base text-[#555]">Leelos y, cuando ya lo tengas en cuenta, apretá “Ya lo leí”.</p>
          <ul className="divide-y">
            {alertas.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-4 py-3">
                <div className="max-w-2xl text-base">
                  <p className="font-medium">{nombreProyecto(a.proyecto_id)} · <span className="font-normal text-[#666]">{fechaCorta(a.created_at)}</span></p>
                  <p className="text-[#666]">{a.aviso}</p>
                </div>
                <form action={marcarRevisada}>
                  <input type="hidden" name="id" value={a.id} />
                  <BotonEnviar variant="outline" className="h-11 px-4 text-base" enviando="Guardando…">Ya lo leí</BotonEnviar>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {proyectos.data!.length === 0 && <p className="text-[#666]">Todavía no hay proyectos cargados.</p>}

      <div className="grid gap-6">
        {proyectos.data!.map((p) => {
          const deEste = sugerencias.data!.filter((s) => s.proyecto_id === p.id);
          const asignados = deEste.filter((s) => s.estado === "aceptada");
          const anteriores = deEste.filter((s) => s.estado === "quitada");
          const pendientes = deEste.filter((s) => s.estado === "pendiente");
          const aviso = pedidos.data!.find((x) => x.proyecto_id === p.id)?.aviso;
          return (
            <section key={p.id} className="border bg-card p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-3">
                    <h2 className="font-serif text-xl">{p.nombre}</h2>
                    <Badge variant="outline">{p.estado}</Badge>
                  </div>
                  <p className="mt-1 text-base text-[#555]">{p.descripcion || "Sin descripción"}</p>
                </div>
                <form action={pedirSugerencias}>
                  <input type="hidden" name="proyecto_id" value={p.id} />
                  <BotonEnviar enviando="Pensando, puede tardar unos segundos…" disabled={sinClaveIA} className="h-12 px-5 text-base">
                    {deEste.length ? "Pedir otras sugerencias" : "Pedir sugerencias"}
                  </BotonEnviar>
                </form>
              </div>

              <div className="mb-4 text-base">
                <span className="text-[#555]">Mentor asignado: </span>
                {asignados.length === 0 && <span className="font-medium text-destructive">todavía ninguno</span>}
                <ul className="mt-2 grid gap-2">
                  {asignados.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-start gap-3">
                      <span className="font-medium">{nombre(s.mentor_id)}</span>
                      {s.minutos_ahorrados !== null && (
                        <span className="text-xs text-[#666]">⏱ se ahorraron {duracion(s.minutos_ahorrados)}</span>
                      )}
                      <details className="text-[#666]">
                        <summary className={buttonVariants({ variant: "outline", className: "h-10 cursor-pointer px-3 text-base" })}>
                          {s.satisfaccion ? <span className="text-primary">{"★".repeat(s.satisfaccion)}{"☆".repeat(5 - s.satisfaccion)}</span> : "★ Calificar cómo funcionó"}
                        </summary>
                        <form action={calificar} className="mt-2 grid w-80 gap-2">
                          <input type="hidden" name="id" value={s.id} />
                          <p className="text-xs">¿Cómo funcionó este match?</p>
                          <Estrellas name="satisfaccion" inicial={s.satisfaccion} />
                          <textarea name="opinion" rows={3} defaultValue={s.opinion ?? ""} placeholder="Tu opinión (opcional)"
                            className="border bg-background px-3 py-2 text-sm text-primary outline-none focus-visible:border-ring" />
                          <BotonEnviar size="sm" enviando="Guardando…">{s.satisfaccion ? "Guardar cambios" : "Guardar calificación"}</BotonEnviar>
                        </form>
                      </details>
                      <details className="text-[#666]">
                        <summary className={buttonVariants({ variant: "outline", className: "h-10 cursor-pointer px-3 text-base" })}>Quitar mentor</summary>
                        <form action={quitar} className="mt-2 grid w-80 gap-2">
                          <input type="hidden" name="id" value={s.id} />
                          <textarea name="motivo" required minLength={5} rows={2} placeholder="¿Por qué se quita? (obligatorio)"
                            className="border bg-background px-3 py-2 text-sm text-primary outline-none focus-visible:border-ring" />
                          <BotonEnviar size="sm" variant="destructive" enviando="Quitando…">Confirmar: quitar mentor</BotonEnviar>
                        </form>
                      </details>
                      {s.opinion && <p className="w-full text-xs text-[#666]">“{s.opinion}”</p>}
                    </li>
                  ))}
                </ul>
                {anteriores.length > 0 && (
                  <p className="mt-3 text-xs text-[#666]">
                    Mentores anteriores: {anteriores.map((s) => `${nombre(s.mentor_id)} (${s.motivo_quitado})`).join(" · ")}
                  </p>
                )}
              </div>

              {aviso && <p className="mb-4 border-l-4 border-primary bg-background p-3 text-base">⚠ {aviso}</p>}

              {pendientes.length > 0 && (
                <>
                <p className="border-t pt-4 text-lg font-medium">Sugerencias del asistente</p>
                <p className="text-base text-[#555]">El porcentaje dice qué tanto encaja el mentor con este proyecto. Elegí uno con “Asignar”.</p>
                <ul className="divide-y">
                  {pendientes.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center gap-4 py-4">
                      <span className="w-20 font-serif text-2xl">{s.afinidad}%</span>
                      <div className="min-w-60 flex-1">
                        <p className="font-medium">{nombre(s.mentor_id)}</p>
                        <p className="text-base text-[#555]">{s.motivo}</p>
                      </div>
                      <form action={decidir} className="flex gap-2">
                        <input type="hidden" name="id" value={s.id} />
                        <BotonEnviar name="estado" value="aceptada" className="h-11 px-4 text-base" enviando="Asignando…">Asignar a {nombre(s.mentor_id).split(" ")[0]}</BotonEnviar>
                        <BotonEnviar name="estado" value="rechazada" variant="outline" className="h-11 px-4 text-base" enviando="Guardando…">No, descartar</BotonEnviar>
                      </form>
                    </li>
                  ))}
                </ul>
                </>
              )}
            </section>
          );
        })}
      </div>
      <h2 className="mt-12 mb-1 font-serif text-xl">Cómo viene funcionando el asistente</h2>
      <p className="mb-4 text-base text-[#555]">Números para la cátedra. No hace falta hacer nada acá.</p>
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {metricas.map(([label, valor]) => (
          <Card key={label}>
            <CardHeader><CardTitle className="text-sm font-normal text-[#666]">{label}</CardTitle></CardHeader>
            <CardContent className="font-serif text-3xl">{valor}</CardContent>
          </Card>
        ))}
      </div>

    </>
  );
}
