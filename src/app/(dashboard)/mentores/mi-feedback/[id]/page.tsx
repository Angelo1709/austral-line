// GRUPO MENTORES — contestar el feedback de una reunión. Tres preguntas cortas; una vez enviado no se cambia.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Label } from "@/components/ui/label";
import { fechaHora } from "../../reuniones/fechas";
import { BotonGuardar } from "../../reuniones/boton-guardar";
import { responderEncuesta } from "../../feedback/acciones";
import { puntajes } from "../../feedback/reglas";

const areaTexto = "w-full border bg-transparent p-3 text-base outline-none focus-visible:border-ring";

export default async function Encuesta({ params, searchParams }: PageProps<"/mentores/mi-feedback/[id]">) {
  await requireRol("mentor", "alumno");
  const [{ id }, { ok, error }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: e, error: errorEncuesta } = await supabase
    .from("mentores_encuestas")
    .select("id, estado, papel, proyecto_nombre, reunion_inicio, con_quien, puntaje, sirvio, mejorar, urgente")
    .eq("id", id)
    .maybeSingle();
  if (errorEncuesta?.code === "22P02") notFound(); // id con formato inválido
  if (errorEncuesta) throw errorEncuesta;
  if (!e) notFound(); // no existe o es de otra persona

  const contestada = e.estado === "respondida";
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/mentores/mi-feedback" className="inline-flex min-h-11 items-center text-base text-[#555] hover:text-primary">← Volver a mis encuestas</Link>
      <h1 className="mt-6 font-serif text-2xl">¿Cómo te fue en la reunión?</h1>
      <p className="mt-1 mb-8 text-sm text-[#666]">
        {e.proyecto_nombre} · con {e.con_quien} · {fechaHora(e.reunion_inicio)}
      </p>

      {typeof ok === "string" && <p role="status" className="mb-6 border-l-4 border-primary bg-card p-4 text-base">✓ {ok}</p>}
      {typeof error === "string" && <p role="alert" className="mb-6 border-l-4 border-destructive bg-destructive/5 p-4 text-base text-destructive">{error}</p>}

      {contestada ? (
        <dl className="grid gap-6 border p-6 text-sm">
          <div><dt className="text-[#666]">Qué tan útil fue</dt><dd className="mt-1 font-serif text-2xl">{e.puntaje} <span className="text-sm text-[#666]">de 5 · {puntajes[e.puntaje!]}</span></dd></div>
          <div><dt className="text-[#666]">Qué te sirvió</dt><dd className="mt-1 whitespace-pre-line">{e.sirvio ?? "—"}</dd></div>
          <div><dt className="text-[#666]">Qué mejorarías</dt><dd className="mt-1 whitespace-pre-line">{e.mejorar ?? "—"}</dd></div>
          {e.urgente && <div><dt className="text-[#666]">Para el coordinador</dt><dd className="mt-1 whitespace-pre-line">{e.urgente}</dd></div>}
        </dl>
      ) : (
        <form action={responderEncuesta} className="grid gap-8">
          <input type="hidden" name="id" value={e.id} />
          <fieldset className="grid gap-3">
            <legend className="mb-3 text-base font-medium">1. ¿Qué tan útil fue la reunión? Tocá un número.</legend>
            <div className="grid grid-cols-5 gap-px border bg-border">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="flex cursor-pointer flex-col items-center gap-1 bg-background p-4 text-center has-[:checked]:bg-primary has-[:checked]:text-primary-foreground">
                  <input type="radio" name="puntaje" value={n} required className="sr-only" />
                  <span className="font-serif text-2xl">{n}</span>
                  <span className="text-xs">{puntajes[n]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-2">
            <Label htmlFor="sirvio">¿Qué te sirvió?</Label>
            <textarea id="sirvio" name="sirvio" rows={3} maxLength={2000} className={areaTexto} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mejorar">¿Qué mejorarías para la próxima?</Label>
            <textarea id="mejorar" name="mejorar" rows={3} maxLength={2000} className={areaTexto} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="urgente">¿Pasó algo que el coordinador tenga que saber ya? <span className="font-normal text-[#666]">(opcional)</span></Label>
            <textarea id="urgente" name="urgente" rows={2} maxLength={2000} className={areaTexto} />
            <p className="text-xs text-[#666]">Si escribís algo acá, le avisamos al coordinador en el momento.</p>
          </div>
          <p className="text-sm text-[#666]">
            Tus respuestas las lee solo el coordinador de la materia: {e.papel === "mentor" ? "el equipo" : e.con_quien} no las ve.
          </p>
          <div><BotonGuardar pendiente="Enviando…">Enviar mi respuesta</BotonGuardar></div>
        </form>
      )}
    </div>
  );
}
