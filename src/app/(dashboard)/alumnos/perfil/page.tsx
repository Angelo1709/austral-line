// GRUPO ALUMNOS — "Mi perfil": carrera, cuánto le interesa cada tema (1 a 5 estrellas) y si busca equipo.
import { Suspense } from "react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Label } from "@/components/ui/label";
import { Estrellas } from "../_components/estrellas";
import { BotonGuardar } from "../_components/boton-guardar";
import { AutoGuardado } from "../_components/auto-guardado";

const MINIMO_CALIFICADOS = 4;

const volverCon = (error: string) => redirect(`/alumnos/perfil?error=${encodeURIComponent(error)}`);

async function guardarPerfil(formData: FormData) {
  "use server";
  await requireRol("alumno");
  const supabase = await createClient();

  const { data: maestro, error: errorMaestro } = await supabase.from("alumnos_intereses_maestro").select("id").eq("activo", true);
  if (errorMaestro) volverCon(`No se pudo leer el listado de intereses: ${errorMaestro.message}`);

  const calificadas = (maestro ?? [])
    .map(({ id }) => ({ interes_id: id, estrellas: Number(formData.get(`interes_${id}`) ?? 0) }))
    .filter((r) => Number.isInteger(r.estrellas) && r.estrellas >= 1 && r.estrellas <= 5);
  if (calificadas.length < MINIMO_CALIFICADOS) {
    volverCon(`Calificá al menos ${MINIMO_CALIFICADOS} temas (calificaste ${calificadas.length}).`);
  }

  // Todo en una sola transacción en la base: carrera (solo la primera vez), perfil e intereses.
  // Si algo falla, no se guarda nada. La base vuelve a validar la carrera y el mínimo de temas.
  const { error } = await supabase.rpc("alumnos_guardar_perfil", {
    p_carrera_id: Number(formData.get("carrera_id") ?? 0),
    p_sobre_mi: String(formData.get("sobre_mi") ?? ""),
    p_busca_equipo: formData.get("busca_equipo") === "on",
    p_intereses: calificadas,
  });
  if (error) volverCon(error.message);

  revalidatePath("/alumnos", "layout");
  redirect("/alumnos/perfil?ok=1");
}

// El admin entra a la sección (ve todo), pero el perfil es solo de alumnos.
function SoloAlumnos() {
  return (
    <div className="max-w-xl border bg-card p-8">
      <h1 className="mb-2 font-serif text-2xl">Mi perfil es para alumnos</h1>
      <p className="text-sm text-[#666]">Con tu rol podés recorrer la sección, pero el perfil solo lo carga cada alumno.</p>
    </div>
  );
}

async function Aviso({ searchParams }: Pick<PageProps<"/alumnos/perfil">, "searchParams">) {
  const { error, ok } = await searchParams;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (ok) return <p className="text-sm text-[#666]">Perfil guardado.</p>;
  return null;
}

export default async function MiPerfil({ searchParams }: PageProps<"/alumnos/perfil">) {
  const persona = await requireRol("alumno");
  if (persona.rol !== "alumno") return <SoloAlumnos />;
  const supabase = await createClient();
  const [
    { data: perfil, error: e1 },
    { data: maestro, error: e2 },
    { data: misIntereses, error: e3 },
    { data: miCarrera, error: e4 },
    { data: carreras, error: e5 },
  ] = await Promise.all([
    supabase.from("alumnos_perfiles").select("*").eq("persona_id", persona.id).maybeSingle(),
    supabase.from("alumnos_intereses_maestro").select("id, nombre").eq("activo", true).order("orden").order("nombre"),
    supabase.from("alumnos_intereses").select("interes_id, estrellas").eq("persona_id", persona.id),
    supabase.from("alumnos_carreras").select("alumnos_carreras_maestro(nombre)").eq("persona_id", persona.id).maybeSingle(),
    supabase.from("alumnos_carreras_maestro").select("id, nombre").eq("activo", true).order("orden").order("nombre"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  if (e3) throw e3;
  if (e4) throw e4;
  if (e5) throw e5;

  const estrellasDe = new Map(misIntereses.map((i) => [i.interes_id, i.estrellas]));

  return (
    <>
      <h1 className="mb-2 font-serif text-2xl">Mi perfil</h1>
      <p className="mb-8 max-w-2xl text-sm text-[#666]">
        Con esto te sugerimos compañeros afines para armar equipo: priorizamos gente de otras carreras
        (para cumplir la interdisciplinariedad) que quiera trabajar en los mismos temas que vos.
      </p>

      <form action={guardarPerfil} className="grid max-w-3xl gap-10">
        <section className="grid gap-4 border bg-card p-6">
          <h2 className="font-serif text-lg">Carrera</h2>
          {miCarrera ? (
            <div className="grid gap-1">
              <p className="font-serif text-xl">{miCarrera.alumnos_carreras_maestro.nombre}</p>
              <p className="text-sm text-[#666]">La carrera queda fija una vez guardada. Si te equivocaste, pedile a los profesores que la corrijan.</p>
            </div>
          ) : (
            <div className="grid max-w-sm gap-2">
              <Label htmlFor="carrera_id">¿Qué estudiás?</Label>
              <select id="carrera_id" name="carrera_id" required defaultValue="" className="h-8 border bg-background px-2 text-sm">
                <option value="" disabled>Elegí una carrera</option>
                {carreras.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <p className="text-sm text-[#666]">Elegila bien: una vez guardada no se puede cambiar.</p>
            </div>
          )}
        </section>

        <section className="grid gap-4 border bg-card p-6">
          <div>
            <h2 className="font-serif text-lg">¿Hacia dónde te gustaría llevar un proyecto?</h2>
            <p className="text-sm text-[#666]">
              Calificá cada tema de 1 a 5 estrellas: 1 es “no me interesa para nada” y 5 “me encantaría trabajar en esto”.
              Calificá al menos {MINIMO_CALIFICADOS} temas; los que dejes sin calificar no cuentan. Podés cambiarlos cuando quieras.
            </p>
          </div>
          {(() => {
            const filas = (
              <div className="grid gap-2">
                {maestro.map(({ id, nombre }) => (
                  <div key={id} className="flex items-center justify-between gap-6 border bg-background px-4 py-3">
                    <span className="min-w-0 text-sm">{nombre}</span>
                    <Estrellas nombre={`interes_${id}`} valor={estrellasDe.get(id) ?? 0} tema={nombre} />
                  </div>
                ))}
              </div>
            );
            // Cada estrella se guarda sola al tocarla, también antes de armar el perfil (así no se pierde nada).
            return <AutoGuardado temas={maestro} perfilCreado={!!perfil}>{filas}</AutoGuardado>;
          })()}
        </section>

        <section className="grid gap-4 border bg-card p-6">
          <h2 className="font-serif text-lg">Sobre vos</h2>
          <div className="grid gap-2">
            <Label htmlFor="sobre_mi">Contale a tus futuros compañeros qué te motiva o qué sabés hacer (opcional)</Label>
            <textarea
              id="sobre_mi"
              name="sobre_mi"
              rows={3}
              maxLength={400}
              defaultValue={perfil?.sobre_mi ?? ""}
              className="border bg-background px-2.5 py-2 text-sm outline-none focus-visible:border-ring"
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="busca_equipo" defaultChecked={perfil?.busca_equipo ?? false} className="mt-0.5 accent-current" />
            <span>
              <strong className="font-medium">Busco equipo.</strong>{" "}
              <span className="text-[#666]">Si lo marcás, otros alumnos te ven como compañero afín, junto con tu mail. Si no, tu perfil queda privado.</span>
            </span>
          </label>
        </section>

        <div className="flex items-center gap-4">
          <BotonGuardar minimo={MINIMO_CALIFICADOS} />
          <Suspense><Aviso searchParams={searchParams} /></Suspense>
        </div>
      </form>
    </>
  );
}
