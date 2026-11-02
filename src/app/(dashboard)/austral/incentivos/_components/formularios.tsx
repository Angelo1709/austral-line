"use client";

import { useActionState, useEffect, useRef } from "react";
import { FilePlus2, Save } from "lucide-react";
import { registrarParticipacion, generarPropuesta } from "../actions";

type Persona = { id: string; nombre: string; rol: string };
type Evento = { id: string; nombre: string };

const field = "mt-1 h-9 w-full border border-border bg-background px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring";
const label = "block text-sm font-medium";

function Mensaje({ success, message }: { success: boolean; message: string }) {
  return message ? <p role="status" className={`text-sm ${success ? "text-[#666]" : "text-destructive"}`}>{message}</p> : null;
}

export function Formularios({ personas, eventos }: { personas: Persona[]; eventos: Evento[] }) {
  const [participacion, guardar, guardando] = useActionState(registrarParticipacion, { success: false, message: "" });
  const [propuesta, generar, generando] = useActionState(generarPropuesta, { success: false, message: "" });
  const participacionForm = useRef<HTMLFormElement>(null);
  const propuestaForm = useRef<HTMLFormElement>(null);

  useEffect(() => { if (participacion.success) participacionForm.current?.reset(); }, [participacion]);
  useEffect(() => { if (propuesta.success) propuestaForm.current?.reset(); }, [propuesta]);

  if (!personas.length) {
    return <p className="border-y py-6 text-sm text-[#666]">Primero agregá mentores o jurados en Miembros.</p>;
  }

  return (
    <div className="grid gap-8 border-y py-6 lg:grid-cols-2">
      <section>
        <h2 className="font-serif text-xl">Registrar participación</h2>
        <form ref={participacionForm} action={guardar} className="mt-5 space-y-4">
          <label className={label}>Mentor o jurado
            <select name="persona_id" required className={field} defaultValue="">
              <option value="" disabled>Seleccionar persona</option>
              {personas.map((p) => <option key={p.id} value={p.id}>{p.nombre} · {p.rol === "mentor" ? "Mentor" : "Jurado"}</option>)}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={label}>Fecha
              <input name="fecha" type="date" required className={field} />
            </label>
            <label className={label}>Evento, si corresponde
              <select name="evento_id" className={field} defaultValue="">
                <option value="">Sin evento</option>
                {eventos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </label>
          </div>
          <label className={label}>Actividad realizada
            <textarea name="actividad" required minLength={3} maxLength={500} rows={3} className={`${field} h-auto py-2`} placeholder="Ej.: Acompañó una sesión de validación" />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={guardando} className="inline-flex h-9 items-center gap-2 bg-primary px-3 text-sm text-primary-foreground disabled:opacity-50"><Save size={16} />{guardando ? "Guardando…" : "Guardar participación"}</button>
            <Mensaje {...participacion} />
          </div>
        </form>
      </section>

      <section>
        <h2 className="font-serif text-xl">Preparar propuesta</h2>
        <form ref={propuestaForm} action={generar} className="mt-5 space-y-4">
          <label className={label}>Mentor o jurado
            <select name="persona_id" required className={field} defaultValue="">
              <option value="" disabled>Seleccionar persona</option>
              {personas.map((p) => <option key={p.id} value={p.id}>{p.nombre} · {p.rol === "mentor" ? "Mentor" : "Jurado"}</option>)}
            </select>
          </label>
          <label className={label}>Tipo de incentivo a explorar
            <select name="categoria" required className={field} defaultValue="">
              <option value="" disabled>Seleccionar tipo</option>
              <option value="comida">Comida durante actividades</option>
              <option value="formacion">Curso o capacitación</option>
              <option value="economico">Posible compensación económica</option>
              <option value="otro">Otra alternativa</option>
            </select>
          </label>
          <label className={label}>Alternativa concreta
            <input name="alternativa" required minLength={3} maxLength={200} className={field} placeholder="Ej.: Invitación a una capacitación" />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={generando} className="inline-flex h-9 items-center gap-2 bg-primary px-3 text-sm text-primary-foreground disabled:opacity-50"><FilePlus2 size={16} />{generando ? "Preparando…" : "Generar borrador"}</button>
            <Mensaje {...propuesta} />
          </div>
        </form>
      </section>
    </div>
  );
}
