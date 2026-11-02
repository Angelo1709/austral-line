// GRUPO ALUMNOS — "Compañeros afines": alumnos que buscan equipo, ordenados por afinidad.
import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { calcularAfinidad } from "../_lib/afinidad";
import { IdeasParaVos } from "../_components/ideas-para-vos";

export default async function CompanerosAfines() {
  const persona = await requireRol("alumno");
  if (persona.rol !== "alumno") {
    return (
      <div className="max-w-xl border bg-card p-8">
        <h1 className="mb-2 font-serif text-2xl">Compañeros afines</h1>
        <p className="text-sm text-[#666]">Las sugerencias se calculan para cada alumno a partir de su perfil.</p>
      </div>
    );
  }
  const supabase = await createClient();

  const [perfiles, maestro, respuestas, integrantes, carreras] = await Promise.all([
    supabase.from("alumnos_perfiles").select("persona_id, sobre_mi, busca_equipo, personas:personas_contacto(nombre, email)"),
    supabase.from("alumnos_intereses_maestro").select("id, nombre"),
    supabase.from("alumnos_intereses").select("persona_id, interes_id, estrellas"),
    supabase.from("proyecto_integrantes").select("persona_id, proyectos(nombre)"),
    supabase.from("alumnos_carreras").select("persona_id, alumnos_carreras_maestro(nombre)"),
  ]);
  for (const r of [perfiles, maestro, respuestas, integrantes, carreras]) if (r.error) throw r.error;

  // RLS ya limita lo que llega: mi perfil y los de quienes buscan equipo.
  const miPerfil = perfiles.data!.find((p) => p.persona_id === persona.id);
  const otros = perfiles.data!.filter((p) => p.persona_id !== persona.id && p.busca_equipo);
  const nombreTema = new Map(maestro.data!.map((m) => [m.id, m.nombre]));
  const carreraDe = new Map(carreras.data!.map((c) => [c.persona_id, c.alumnos_carreras_maestro.nombre]));
  const estrellasDe = (id: string) =>
    new Map(respuestas.data!.filter((r) => r.persona_id === id).map((r) => [r.interes_id, r.estrellas]));

  if (!miPerfil) {
    return (
      <div className="flex max-w-xl flex-col items-start gap-4 border bg-card p-8">
        <h1 className="font-serif text-2xl">Primero, contanos de vos</h1>
        <p className="text-sm text-[#666]">
          Para sugerirte compañeros necesitamos tu carrera y cuánto te interesa cada tema. Te lleva un minuto.
        </p>
        <Link href="/alumnos/perfil" className={buttonVariants()}>Completar mi perfil</Link>
      </div>
    );
  }

  // Una persona puede estar en varios proyectos: se juntan todos.
  const proyectosDe = new Map<string, string[]>();
  for (const i of integrantes.data!) proyectosDe.set(i.persona_id, [...(proyectosDe.get(i.persona_id) ?? []), i.proyectos.nombre]);
  const yo = { carrera: carreraDe.get(persona.id) ?? "", estrellas: estrellasDe(persona.id) };
  const sugerencias = otros
    .map((o) => ({
      ...o,
      afinidad: calcularAfinidad(yo, { carrera: carreraDe.get(o.persona_id) ?? "", estrellas: estrellasDe(o.persona_id) }, (id) => nombreTema.get(id) ?? "?"),
    }))
    .sort((a, b) => b.afinidad.puntaje - a.afinidad.puntaje);

  return (
    <>
      <h1 className="mb-2 font-serif text-2xl">Compañeros afines</h1>
      <p className="mb-6 max-w-2xl text-sm text-[#666]">
        Alumnos que buscan equipo, ordenados por afinidad con vos: suman los temas que a los dos les interesan mucho
        (4 o 5 estrellas) y ser de otra carrera; restan los temas que a uno le encantan y al otro casi nada (1 o 2).
        Es una sugerencia: la decisión es de ustedes.
      </p>

      {!miPerfil.busca_equipo && (
        <p className="mb-6 border bg-card px-4 py-3 text-sm">
          Tu perfil está privado: vos ves a los demás, pero ellos no te ven a vos.{" "}
          <Link href="/alumnos/perfil" className="underline underline-offset-4">Marcá “Busco equipo”</Link> para aparecer.
        </p>
      )}

      {sugerencias.length === 0 ? (
        <div className="border bg-card p-8 text-sm text-[#666]">Por ahora nadie más marcó “Busco equipo”. Volvé a mirar en unos días.</div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {sugerencias.map((s) => (
            <li key={s.persona_id} className="flex flex-col gap-4 border bg-background p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-serif text-xl">{s.personas.nombre}</p>
                  <p className="text-sm text-[#666]">{carreraDe.get(s.persona_id)}</p>
                </div>
                <Badge variant={s.afinidad.nivel === "Muy afín" ? "default" : "outline"}>{s.afinidad.nivel}</Badge>
              </div>

              <dl className="grid gap-2 text-sm">
                {s.afinidad.otraCarrera && (
                  <div><dt className="inline text-[#666]">Interdisciplinario: </dt><dd className="inline">es de otra carrera</dd></div>
                )}
                {s.afinidad.enComun.length > 0 && (
                  <div><dt className="inline text-[#666]">Les interesa a los dos: </dt><dd className="inline">{s.afinidad.enComun.join(", ")}</dd></div>
                )}
                {s.afinidad.choques.length > 0 && (
                  <div><dt className="inline text-[#666]">Ojo, no coinciden en: </dt><dd className="inline">{s.afinidad.choques.join(", ")}</dd></div>
                )}
                {proyectosDe.has(s.persona_id) && (
                  <div><dt className="inline text-[#666]">Ya participa en: </dt><dd className="inline">{proyectosDe.get(s.persona_id)!.join(", ")}</dd></div>
                )}
              </dl>

              {s.sobre_mi && <p className="border-l-2 pl-3 text-sm italic">“{s.sobre_mi}”</p>}

              <a href={`mailto:${s.personas.email}`} className="mt-auto text-sm underline underline-offset-4 hover:text-[#666]">
                {s.personas.email}
              </a>
            </li>
          ))}
        </ul>
      )}

      <IdeasParaVos personaId={persona.id} estrellas={yo.estrellas} />
    </>
  );
}
