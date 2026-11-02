// GRUPO ALUMNOS — "Tu grupo": si el grupo del alumno es interdisciplinario (2 o más carreras),
// qué falta si no lo es, y compañeros de otras carreras que buscan equipo para sumar.
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { calcularAfinidad } from "../_lib/afinidad";
import { CircleAlert, CircleCheck, CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";
import { evaluarGrupo, MINIMO_CARRERAS } from "../_lib/interdisciplina";
import { InteresesGrupo } from "./intereses-grupo";

const SUGERENCIAS = 3;

// Cómo se ve cada estado de la interdisciplinariedad: lleno si cumple, en rojo si no, punteado si falta información.
const ESTILO = {
  Interdisciplinario: { icono: CircleCheck, titulo: "Cumple la interdisciplinariedad", clase: "border-primary bg-primary text-primary-foreground" },
  "Una sola carrera": { icono: CircleAlert, titulo: "No cumple la interdisciplinariedad", clase: "border-destructive bg-background text-destructive" },
  "Faltan perfiles": { icono: CircleHelp, titulo: "Todavía no se puede saber", clase: "border-dashed border-primary bg-background" },
} as const;

// guardadoEn: proyecto cuyos intereses de grupo se acaban de guardar (para mostrar "Guardado").
export async function MiGrupo({ personaId, guardadoEn }: { personaId: string; guardadoEn?: string }) {
  const supabase = await createClient();

  const [integrantes, carreras, perfiles, respuestas, maestro] = await Promise.all([
    supabase.from("proyecto_integrantes").select("proyecto_id, persona_id, proyectos(nombre), personas(nombre)"),
    // RLS: la mía, la de mis compañeros de proyecto y la de quienes buscan equipo.
    supabase.from("alumnos_carreras").select("persona_id, alumnos_carreras_maestro(nombre)"),
    supabase.from("alumnos_perfiles").select("persona_id, busca_equipo, personas(nombre, email)"),
    supabase.from("alumnos_intereses").select("persona_id, interes_id, estrellas"),
    supabase.from("alumnos_intereses_maestro").select("id, nombre"),
  ]);
  for (const r of [integrantes, carreras, perfiles, respuestas, maestro]) if (r.error) throw r.error;

  const misProyectos = [...new Set(integrantes.data!.filter((i) => i.persona_id === personaId).map((i) => i.proyecto_id))];

  if (misProyectos.length === 0) {
    return (
      <section className="mb-10 flex flex-col items-start gap-3 border bg-card p-6">
        <h2 className="font-serif text-lg">Tu grupo</h2>
        <p className="text-sm text-[#666]">
          Todavía no estás en un grupo. Buscá compañeros de otras carreras: el grupo tiene que ser interdisciplinario
          (al menos {MINIMO_CARRERAS} carreras distintas).
        </p>
        <Link href="/alumnos/afines" className={buttonVariants({ size: "sm" })}>Ver compañeros afines</Link>
      </section>
    );
  }

  const carreraDe = new Map(carreras.data!.map((c) => [c.persona_id, c.alumnos_carreras_maestro.nombre]));
  const enAlgunProyecto = new Set(integrantes.data!.map((i) => i.persona_id));
  const nombreTema = new Map(maestro.data!.map((m) => [m.id, m.nombre]));
  const estrellasDe = (id: string) =>
    new Map(respuestas.data!.filter((r) => r.persona_id === id).map((r) => [r.interes_id, r.estrellas]));
  const yo = { carrera: carreraDe.get(personaId) ?? "", estrellas: estrellasDe(personaId) };

  return (
    <section className="mb-10 grid gap-4">
      <h2 className="font-serif text-lg">{misProyectos.length > 1 ? "Tus grupos" : "Tu grupo"}</h2>
      {misProyectos.map((proyectoId) => {
        const miembros = integrantes.data!.filter((i) => i.proyecto_id === proyectoId);
        const { estado, distintas } = evaluarGrupo(miembros.map((m) => carreraDe.get(m.persona_id)));
        const sinCarrera = miembros.filter((m) => !carreraDe.has(m.persona_id));
        const ids = new Set(miembros.map((m) => m.persona_id));

        // Sugeridos: buscan equipo, no están en ningún proyecto y son de una carrera que el grupo no tiene.
        const sugeridos =
          estado === "Una sola carrera"
            ? perfiles.data!
                .filter((p) => p.busca_equipo && !ids.has(p.persona_id) && !enAlgunProyecto.has(p.persona_id))
                .filter((p) => carreraDe.has(p.persona_id) && !distintas.includes(carreraDe.get(p.persona_id)!))
                .map((p) => ({
                  ...p,
                  afinidad: calcularAfinidad(
                    yo,
                    { carrera: carreraDe.get(p.persona_id)!, estrellas: estrellasDe(p.persona_id) },
                    (id) => nombreTema.get(id) ?? "?",
                  ),
                }))
                .sort((a, b) => b.afinidad.puntaje - a.afinidad.puntaje)
                .slice(0, SUGERENCIAS)
            : [];

        return (
          <article key={proyectoId} className="grid gap-4 border bg-card p-6">
            <p className="font-serif text-xl">{miembros[0].proyectos.nombre}</p>

            {(() => {
              const { icono: Icono, titulo, clase } = ESTILO[estado];
              const detalle =
                estado === "Interdisciplinario"
                  ? `Tiene integrantes de ${distintas.length} carreras: ${distintas.join(", ")}.`
                  : estado === "Una sola carrera"
                    ? `Todos son de ${distintas[0]}. Necesitan al menos ${MINIMO_CARRERAS} carreras distintas.`
                    : sinCarrera.length === 1 && sinCarrera[0].persona_id === personaId
                      ? "Te falta elegir tu carrera en Mi perfil."
                      : "Falta que algunos integrantes elijan su carrera en Mi perfil.";
              return (
                <div role="status" className={cn("flex items-center gap-4 border-2 px-5 py-4", clase)}>
                  <Icono className="size-8 shrink-0" aria-hidden />
                  <div className="grid gap-0.5">
                    <p className="font-serif text-lg leading-tight">{titulo}</p>
                    <p className={cn("text-sm", estado === "Interdisciplinario" ? "opacity-80" : "text-[#666]")}>{detalle}</p>
                  </div>
                </div>
              );
            })()}

            <ul className="grid gap-1 text-sm">
              {miembros.map((m) => (
                <li key={m.persona_id}>
                  {m.personas.nombre}
                  {m.persona_id === personaId && <span className="text-[#666]"> (vos)</span>}
                  <span className="text-[#666]"> · {carreraDe.get(m.persona_id) ?? "todavía no eligió su carrera"}</span>
                </li>
              ))}
            </ul>

            {estado === "Faltan perfiles" && (
              <p className="text-sm">
                {sinCarrera.some((m) => m.persona_id !== personaId) && (
                  <>
                    {sinCarrera.filter((m) => m.persona_id !== personaId).length === 1 ? "Le falta elegirla a " : "Les falta elegirla a "}
                    {sinCarrera.filter((m) => m.persona_id !== personaId).map((m) => m.personas.nombre).join(", ")}
                    {sinCarrera.some((m) => m.persona_id === personaId) ? " y a vos. " : ". "}
                  </>
                )}
                {sinCarrera.some((m) => m.persona_id === personaId) && (
                  <Link href="/alumnos/perfil" className="underline underline-offset-4">Elegir mi carrera</Link>
                )}
              </p>
            )}

            {estado === "Una sola carrera" && (
              <div className="grid gap-3">
                <p className="text-sm">Para cumplir, sumen al menos a alguien de otra carrera.</p>
                {sugeridos.length === 0 ? (
                  <p className="text-sm text-[#666]">
                    Por ahora no hay alumnos de otras carreras buscando equipo. Volvé a mirar en unos días o consultá con
                    los profesores.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-[#666]">Alumnos de otras carreras que buscan equipo, ordenados por afinidad con vos:</p>
                    <ul className="grid gap-2">
                      {sugeridos.map((s) => (
                        <li key={s.persona_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border bg-background px-4 py-3 text-sm">
                          <span className="font-medium">{s.personas.nombre}</span>
                          <span className="text-[#666]">{carreraDe.get(s.persona_id)}</span>
                          <Badge variant={s.afinidad.nivel === "Muy afín" ? "default" : "outline"}>{s.afinidad.nivel}</Badge>
                          <a href={`mailto:${s.personas.email}`} className="ml-auto underline underline-offset-4 hover:text-[#666]">
                            {s.personas.email}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            <InteresesGrupo
              proyectoId={proyectoId}
              miembros={miembros.map((m) => ({ id: m.persona_id, nombre: m.personas.nombre }))}
              guardado={guardadoEn === proyectoId}
            />
          </article>
        );
      })}
    </section>
  );
}
