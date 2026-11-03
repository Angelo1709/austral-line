// GRUPO MENTORES — feedback post reunión, pantalla del coordinador (solo admin).
// Respuestas de mentores y alumnos, el resumen anónimo de cada reunión, los avisos del asistente y las métricas.
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { modoPrueba } from "../_resend";
import { Encabezado } from "../_components/accion";
import { hayIA, urlBase } from "../reuniones/agente";
import { BotonGuardar } from "../reuniones/boton-guardar";
import { fechaCorta, fechaHora } from "../reuniones/fechas";
import { marcarResumen, rehacerResumen } from "./acciones";
import { pedirFeedback, ponerAlDia } from "./agente";
import { metricas, puntajes, tiempo } from "./reglas";

const nombresEstado: Record<string, string> = {
  pendiente: "Pendiente",
  respondida: "Contestada",
  sin_respuesta: "Sin respuesta",
};

export default async function Feedback({ searchParams }: PageProps<"/mentores/feedback">) {
  await requireRol(); // solo admin
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const url = await urlBase();
  await pedirFeedback(supabase, url);
  await ponerAlDia(supabase, url);

  const { data: reuniones, error: errorReuniones } = await supabase
    .from("mentores_reuniones")
    .select(`id, inicio, proyectos(nombre), mentor:personas!mentores_reuniones_mentor_id_fkey(nombre),
      mentores_encuestas(id, papel, estado, puntaje, sirvio, mejorar, urgente, grave_motivo, escalada_at, created_at, respondida_at, recordatorio_at, mail_estado, personas(nombre)),
      mentores_feedback_resumenes(id, resumen, respuestas, pedidas, con_ia, aviso, util, created_at)`)
    .not("feedback_pedido_at", "is", null)
    .order("inicio", { ascending: false });
  if (errorReuniones) throw errorReuniones;

  const encuestas = reuniones.flatMap((r) => r.mentores_encuestas);
  const ultimo = (r: (typeof reuniones)[number]) => r.mentores_feedback_resumenes; // uno por reunión
  const m = metricas(encuestas, reuniones.map(ultimo).filter((r) => r !== null));

  // Lo que el coordinador tiene que mirar: algo grave, gente que no contestó y avisos de los resúmenes.
  const avisos = reuniones.flatMap((r) => {
    const titulo = `${r.proyectos.nombre} · ${r.mentor.nombre} · ${fechaCorta(r.inicio)}`;
    const resumen = ultimo(r);
    return [
      ...r.mentores_encuestas.filter((e) => e.escalada_at).map((e) => ({
        clave: `g-${e.id}`, titulo, urgente: true,
        texto: `${e.personas.nombre} (${e.papel}): ${e.grave_motivo ?? "pidió que te enteres"}${e.urgente ? ` — “${e.urgente}”` : ""}`,
      })),
      ...r.mentores_encuestas.filter((e) => e.estado === "sin_respuesta").map((e) => ({
        clave: `s-${e.id}`, titulo, urgente: false,
        texto: `${e.personas.nombre} (${e.papel}) no contestó, ni después del recordatorio.`,
      })),
      ...(resumen?.aviso ? [{ clave: `r-${resumen.id}`, titulo, urgente: false, texto: resumen.aviso }] : []),
    ];
  }).sort((a, b) => Number(b.urgente) - Number(a.urgente));

  return (
    <div className="mx-auto max-w-5xl">
      <Encabezado
        titulo="Cómo les fue en las reuniones"
        bajada="Cuando termina cada reunión, el asistente les pregunta al mentor y a los alumnos cómo les fue, y te arma un resumen sin nombres. Solo vos ves las respuestas. No tenés que hacer nada para que funcione: entrá para leer."
        volver={{ href: "/mentores", texto: "Volver al inicio de Mentores" }}
      />

      {(modoPrueba() || !hayIA()) && (
        <div className="mb-6 grid gap-1 border-l-2 border-primary pl-4 text-sm text-[#666]">
          {modoPrueba() && <p>Modo prueba: falta la clave de Resend (<code>RESEND_API_KEY</code>), así que los mails se registran como &quot;simulado&quot; y no sale ninguno.</p>}
          {!hayIA() && <p>Falta la clave de IA (<code>AI_GATEWAY_API_KEY</code>): los resúmenes salen solo con los números y solo se escala lo que la persona pide explícitamente.</p>}
        </div>
      )}
      {typeof ok === "string" && <p role="status" className="mb-6 border-l-4 border-primary bg-card p-4 text-base">✓ {ok}</p>}
      {typeof error === "string" && <p role="alert" className="mb-6 border-l-4 border-destructive bg-destructive/5 p-4 text-base text-destructive">{error}</p>}

      {avisos.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-1 font-serif text-xl">⚠ Para atender ({avisos.length})</h2>
          <p className="mb-4 text-base text-[#555]">El asistente cree que conviene que hables con estas personas.</p>
          <div className="grid gap-3">
            {avisos.map((a) => (
              <div key={a.clave} className={`border p-4 text-base ${a.urgente ? "border-l-4 border-l-destructive" : ""}`}>
                <p className="text-[#666]">{a.urgente && <Badge variant="destructive" className="mr-2">Urgente</Badge>}{a.titulo}</p>
                <p className="mt-2">{a.texto}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 font-serif text-xl">Reunión por reunión</h2>
        {reuniones.length === 0 ? (
          <p className="border p-6 text-center text-sm text-[#666]">
            Todavía no terminó ninguna reunión. El asistente pide el feedback 1 h después de que empieza cada una.
          </p>
        ) : (
          <div className="grid gap-6">
            {reuniones.map((r) => {
              const resumen = ultimo(r);
              const contestaron = r.mentores_encuestas.filter((e) => e.estado === "respondida").length;
              return (
                <article key={r.id} className="border">
                  <header className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
                    <div>
                      <h3 className="font-serif text-lg">{r.proyectos.nombre}</h3>
                      <p className="text-base text-[#555]">Con {r.mentor.nombre} · {fechaHora(r.inicio)}</p>
                    </div>
                    <Badge variant="outline">{contestaron} de {r.mentores_encuestas.length} contestaron</Badge>
                  </header>

                  <div className="p-5">
                    {resumen ? (
                      <>
                        <p className="mb-1 text-sm font-medium text-[#555]">Resumen{resumen.con_ia ? "" : " (solo con los números)"}</p>
                        <p className="text-base leading-relaxed whitespace-pre-line">{resumen.resumen}</p>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <form action={marcarResumen} className="flex items-center gap-2">
                            <input type="hidden" name="resumen_id" value={resumen.id} />
                            <span className="mr-1 text-base text-[#555]">¿Te sirvió este resumen?</span>
                            <Button type="submit" name="util" value="si" className="h-10 px-4 text-base" variant={resumen.util === true ? "default" : "outline"}>Sí</Button>
                            <Button type="submit" name="util" value="no" className="h-10 px-4 text-base" variant={resumen.util === false ? "default" : "outline"}>No</Button>
                          </form>
                          {resumen.respuestas < contestaron && (
                            <form action={rehacerResumen}>
                              <input type="hidden" name="reunion_id" value={r.id} />
                              <BotonGuardar variant="outline" pendiente="Armando…">Llegaron respuestas nuevas: actualizar resumen</BotonGuardar>
                            </form>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-base text-[#555]">
                        Todavía no hay resumen: se arma solo cuando contestan todos, o a los 5 días.
                      </p>
                    )}
                  </div>

                  <details className="border-t">
                    <summary className="flex min-h-12 cursor-pointer items-center p-5 text-base font-medium hover:text-primary">▸ Ver qué contestó cada uno</summary>
                    <div className="grid gap-px bg-border">
                      {r.mentores_encuestas.map((e) => (
                        <div key={e.id} className="grid gap-2 bg-background p-5 text-base">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{e.personas.nombre}</span>
                            <span className="text-[#666]">{e.papel}</span>
                            <Badge variant={e.estado === "respondida" ? "default" : e.estado === "sin_respuesta" ? "destructive" : "outline"}>{nombresEstado[e.estado]}</Badge>
                            {e.mail_estado === "error" && <Badge variant="destructive">No salió el mail</Badge>}
                            {e.recordatorio_at && e.estado !== "respondida" && <span className="text-xs text-[#666]">recordatorio el {fechaCorta(e.recordatorio_at)}</span>}
                          </div>
                          {e.estado === "respondida" && (
                            <>
                              <p><span className="text-[#666]">Utilidad:</span> {e.puntaje} de 5 · {puntajes[e.puntaje!]}</p>
                              {e.sirvio && <p><span className="text-[#666]">Le sirvió:</span> {e.sirvio}</p>}
                              {e.mejorar && <p><span className="text-[#666]">Mejoraría:</span> {e.mejorar}</p>}
                              {e.urgente && <p><span className="text-[#666]">Para el coordinador:</span> {e.urgente}</p>}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <h2 className="mt-12 mb-1 font-serif text-xl">Cómo viene funcionando el asistente</h2>
      <p className="mb-4 text-base text-[#555]">Números para la cátedra. No hace falta hacer nada acá.</p>
      <section className="grid gap-px border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {[
          { titulo: "Responden", valor: m.porcentaje == null ? "—" : `${m.porcentaje}%`, detalle: `${m.respondidas} de ${m.pedidas} encuestas` },
          { titulo: "Tardan en responder", valor: tiempo(m.medianaHoras), detalle: "la mitad contesta antes de eso" },
          { titulo: "Utilidad de las reuniones", valor: m.puntaje == null ? "—" : `${m.puntaje.toFixed(1)}`, detalle: "promedio de 1 a 5" },
          { titulo: "Resúmenes que sirvieron", valor: `${m.utiles} de ${m.marcados}`, detalle: `marcados, de ${m.resumenes} armados` },
        ].map((t) => (
          <div key={t.titulo} className="bg-background p-6">
            <p className="text-sm text-[#666]">{t.titulo}</p>
            <p className="mt-2 font-serif text-3xl">{t.valor}</p>
            <p className="mt-1 text-xs text-[#666]">{t.detalle}</p>
          </div>
        ))}
      </section>

    </div>
  );
}
