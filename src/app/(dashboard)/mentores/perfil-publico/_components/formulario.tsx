"use client";
// GRUPO MENTORES — UI de carga de perfil. El mentor escribe libre, la IA propone una
// organización en campos, y el mentor confirma campo por campo antes de guardar: si ya había
// un valor cargado, el default es "mantener" (nunca se pisa sin que él elija lo contrario).
// Si no hay IA configurada (falta AI_GATEWAY_API_KEY), hay un modo manual de respaldo.
import { useState, useTransition } from "react";
import { Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { camposPerfil, SIN_CLAVE_IA, type PerfilMentor } from "../../_lib";
import { guardarCambios, organizar, publicar } from "../_acciones";
import type { PropuestaPerfil, ResultadoOrganizar } from "../_ia";
import { VistaPreviaPerfil } from "./vista-previa";

type Campo = (typeof camposPerfil)[number]["campo"];
type Accion = "organizar" | "borrador" | "publicar";

function asignar<K extends Campo>(destino: Partial<PropuestaPerfil>, campo: K, valor: PropuestaPerfil[K]) {
  destino[campo] = valor;
}

function valoresIniciales(perfil: PerfilMentor | null): PropuestaPerfil {
  const base = {} as PropuestaPerfil;
  for (const { campo } of camposPerfil) asignar(base, campo, (perfil?.[campo] ?? null) as never);
  return base;
}

export function FormularioPerfil({ perfil, nombre }: { perfil: PerfilMentor | null; nombre: string }) {
  const [texto, setTexto] = useState(perfil?.texto_original ?? "");
  const [propuesta, setPropuesta] = useState<ResultadoOrganizar | null>(null);
  const [elecciones, setElecciones] = useState<Partial<Record<Campo, "actual" | "nuevo">>>({});
  const [modoManual, setModoManual] = useState(false);
  const [manual, setManual] = useState<PropuestaPerfil>(() => valoresIniciales(perfil));
  const [errores, setErrores] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  const publicado = perfil?.estado === "publicado";
  const enCurso = (a: Accion) => pendiente && accion === a;

  function onOrganizar() {
    setErrores([]);
    setMensaje(null);
    setAccion("organizar");
    iniciarTransicion(async () => {
      try {
        const resultado = await organizar(texto);
        setPropuesta(resultado);
        // Default: si ya había un valor y la IA propone algo distinto, se mantiene el actual
        // hasta que el mentor elija reemplazarlo. Si no había nada, no hay nada que pisar.
        const nuevasElecciones: Partial<Record<Campo, "actual" | "nuevo">> = {};
        for (const { campo } of camposPerfil) {
          const actual = perfil?.[campo] ?? null;
          nuevasElecciones[campo] = actual ? "actual" : "nuevo";
        }
        setElecciones(nuevasElecciones);
      } catch (e) {
        if (e instanceof Error && e.message === SIN_CLAVE_IA) {
          setModoManual(true);
          setMensaje("El asistente de IA todavía no está configurado en este entorno. Mientras tanto, cargá los datos acá abajo.");
        } else {
          setErrores(["No se pudo organizar el texto. Probá de nuevo en un momento."]);
        }
      }
    });
  }

  function onGuardar(publicarDespues: boolean) {
    setErrores([]);
    setMensaje(null);
    setAccion(publicarDespues ? "publicar" : "borrador");
    iniciarTransicion(async () => {
      try {
        if (modoManual) {
          await guardarCambios(manual);
        } else if (propuesta) {
          const aceptados: Partial<PropuestaPerfil> = {};
          for (const { campo } of camposPerfil) {
            if (elecciones[campo] === "nuevo") asignar(aceptados, campo, propuesta.propuesta[campo]);
          }
          if (Object.keys(aceptados).length > 0) await guardarCambios(aceptados);
        }
        setPropuesta(null);
        if (publicarDespues) {
          const resultado = await publicar();
          if (resultado.errores.length > 0) setErrores(resultado.errores);
          else setMensaje("¡Perfil publicado! Ya lo pueden ver los alumnos.");
        } else {
          setMensaje((m) => m ?? "Borrador guardado. Podés volver cuando quieras a terminarlo.");
        }
      } catch {
        setErrores(["No se pudo guardar. Probá de nuevo en un momento."]);
      }
    });
  }

  return (
    <div className="grid gap-8">
      {publicado && (
        <p className="border-l-2 border-primary pl-4 text-sm text-[#666]">
          Tu perfil ya está publicado. Si corregís algo acá, el cambio queda guardado al instante.
        </p>
      )}

      {!modoManual && (
        <div className="grid gap-2">
          <Label htmlFor="texto" className="text-lg font-medium">Paso 1. Contanos sobre vos, como si se lo dijeras a alguien</Label>
          <p className="text-base leading-relaxed text-[#555]">
            Dónde trabajás, de qué, hace cuántos años, en qué podés ayudar a los alumnos y tu LinkedIn si tenés.
            No hace falta que quede prolijo: el asistente lo ordena por vos.
          </p>
          <textarea
            id="texto"
            rows={7}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ej: trabajo en una fintech como líder de producto, 8 años de experiencia, puedo ayudar con pricing y validación..."
            className="w-full rounded-lg border border-input bg-transparent p-3 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <p className="mt-2 text-lg font-medium">Paso 2. Apretá el botón para que el asistente lo ordene</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={onOrganizar} disabled={pendiente || !texto.trim()} className="h-12 px-5 text-base">
              {enCurso("organizar") ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {enCurso("organizar") ? "Ordenando, esperá unos segundos…" : "Ordenar mi perfil"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setModoManual(true)} className="h-12 px-5 text-base">
              Prefiero completarlo yo, campo por campo
            </Button>
          </div>
          {!texto.trim() && <p className="text-sm text-[#555]">Primero escribí algo en el cuadro de arriba.</p>}
        </div>
      )}

      {propuesta?.advertenciaSpam && (
        <p className="flex items-start gap-2 border-l-2 border-destructive pl-4 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            Esto quedó marcado para que lo revise el administrador antes de poder publicarse
            {propuesta.motivoSpam ? `: ${propuesta.motivoSpam}` : "."}
          </span>
        </p>
      )}

      {propuesta && propuesta.correcciones.length > 0 && (
        <p className="flex items-start gap-2 border-l-2 border-primary pl-4 text-sm text-[#666]">
          <Sparkles className="mt-0.5 size-4 shrink-0" />
          <span>
            El agente ajustó algo solo antes de mostrarte esta propuesta (por ejemplo, {propuesta.correcciones[0].campo}:{" "}
            {propuesta.correcciones[0].razon}), para no inventar ni guardar datos raros.
          </span>
        </p>
      )}

      {propuesta && (
        <div className="grid gap-6 border bg-card p-5">
          <p className="text-lg font-medium">Paso 3. Revisá cómo quedó</p>
          <p className="text-base text-[#555]">Así quedaría tu perfil. Donde ya tenías un dato cargado, tocá la opción que querés dejar. Si está bien, apretá “Publicar mi perfil” abajo.</p>
          {camposPerfil.map(({ campo, label }) => {
            const actual = perfil?.[campo] ?? null;
            const nuevo = propuesta.propuesta[campo] ?? null;
            if (!actual && !nuevo) return null;
            return (
              <div key={campo} className="grid gap-2 border-b pb-4 last:border-b-0 last:pb-0">
                <Label>{label}</Label>
                {actual && nuevo && String(actual) !== String(nuevo) ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-2 border p-2.5 text-sm transition-colors",
                        elecciones[campo] !== "nuevo" ? "border-primary bg-muted/50" : "hover:bg-muted/20",
                      )}
                    >
                      <input type="radio" name={`eleccion-${campo}`} checked={elecciones[campo] !== "nuevo"}
                        onChange={() => setElecciones((e) => ({ ...e, [campo]: "actual" }))} />
                      <span><span className="text-[#666]">Mantener: </span>{actual}</span>
                    </label>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-2 border p-2.5 text-sm transition-colors",
                        elecciones[campo] === "nuevo" ? "border-primary bg-muted/50" : "hover:bg-muted/20",
                      )}
                    >
                      <input type="radio" name={`eleccion-${campo}`} checked={elecciones[campo] === "nuevo"}
                        onChange={() => setElecciones((e) => ({ ...e, [campo]: "nuevo" }))} />
                      <span><span className="text-[#666]">Reemplazar por: </span>{nuevo}</span>
                    </label>
                  </div>
                ) : (
                  <p className="text-sm">{nuevo ?? actual}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modoManual && (
        <div className="grid gap-6 border bg-card p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-base text-[#555]">Completá cada dato. Cuando termines, apretá “Publicar mi perfil” abajo.</p>
            <Button type="button" variant="outline" onClick={() => setModoManual(false)} className="h-11 px-4 text-base">
              Volver a escribirlo libre
            </Button>
          </div>
          {camposPerfil.map(({ campo, label, largo }) => (
            <div key={campo} className="grid gap-2">
              <Label htmlFor={`manual-${campo}`}>{label}</Label>
              {largo ? (
                <textarea
                  id={`manual-${campo}`}
                  rows={3}
                  value={(manual[campo] as string | null) ?? ""}
                  onChange={(e) => setManual((m) => ({ ...m, [campo]: e.target.value || null }))}
                  className="w-full rounded-lg border border-input bg-transparent p-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              ) : (
                <Input
                  id={`manual-${campo}`}
                  type={campo === "anios_experiencia" ? "number" : "text"}
                  value={manual[campo] ?? ""}
                  onChange={(e) => {
                    const valor = campo === "anios_experiencia" ? (e.target.value ? Number(e.target.value) : null) : e.target.value || null;
                    setManual((m) => {
                      const copia = { ...m };
                      asignar(copia, campo, valor as never);
                      return copia;
                    });
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {!propuesta && !modoManual && perfil && (perfil.empresa || perfil.cargo || perfil.bio || perfil.areas_ayuda) && (
        <div className="grid gap-1">
          <p className="text-sm text-[#666]">Vista previa — así te ve un alumno hoy</p>
          <VistaPreviaPerfil perfil={perfil} nombre={nombre} />
        </div>
      )}

      {errores.length > 0 && (
        <ul role="alert" className="list-inside list-disc border-l-2 border-destructive pl-4 text-base text-destructive">
          {errores.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
      {mensaje && <p role="status" className="border-l-2 border-primary pl-4 text-base font-medium text-primary">{mensaje}</p>}

      <div className="sticky bottom-0 grid gap-2 border-t bg-background py-4">
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onGuardar(false)} disabled={pendiente} className="h-12 px-5 text-base">
            {enCurso("borrador") && <Loader2 className="animate-spin" />}
            {enCurso("borrador") ? "Guardando…" : "Guardar y seguir después"}
          </Button>
          <Button type="button" onClick={() => onGuardar(true)} disabled={pendiente} className="h-12 px-5 text-base">
            {enCurso("publicar") && <Loader2 className="animate-spin" />}
            {enCurso("publicar") ? "Guardando…" : publicado ? "Guardar cambios" : "Publicar mi perfil"}
          </Button>
        </div>
        <p className="text-right text-sm text-[#555]">
          {publicado ? "Los alumnos ven los cambios apenas guardás." : "“Guardar y seguir después” no lo muestra a los alumnos. “Publicar” sí."}
        </p>
      </div>
    </div>
  );
}
