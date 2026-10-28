"use client";

// GRUPO ALUMNOS — formulario para subir una versión nueva de una entrega.
// El archivo va directo al almacenamiento (con una URL firmada), así no hay límite de tamaño del servidor.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prepararSubida, registrarEntrega } from "../_acciones";

const LIMITE_MB = 50;

// proyectoId = null: entrega individual del alumno logueado.
export function SubirEntrega({
  proyectoId,
  eventoId,
  hayVersiones,
}: {
  proyectoId: string | null;
  eventoId: string;
  hayVersiones: boolean;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState<{ subiendo: boolean; error?: string; ok?: string }>({ subiendo: false });
  const [elegido, setElegido] = useState<string | null>(null);
  const idArchivo = `archivo-${eventoId}-${proyectoId ?? "individual"}`;

  async function subir(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await intentarSubir(e.currentTarget);
    } catch {
      setEstado({ subiendo: false, error: "Algo falló al subir. Probá de nuevo." });
    }
  }

  async function intentarSubir(form: HTMLFormElement) {
    const archivo = (form.elements.namedItem("archivo") as HTMLInputElement).files?.[0];
    const nota = (form.elements.namedItem("nota") as HTMLTextAreaElement).value;
    if (!archivo) return setEstado({ subiendo: false, error: "Elegí un archivo." });
    if (archivo.size > LIMITE_MB * 1024 * 1024) return setEstado({ subiendo: false, error: `El archivo supera los ${LIMITE_MB} MB.` });

    setEstado({ subiendo: true });
    const preparada = await prepararSubida(proyectoId, eventoId, archivo.name, archivo.size);
    if ("error" in preparada) return setEstado({ subiendo: false, error: preparada.error });

    const cuerpo = new FormData();
    cuerpo.append("cacheControl", "3600");
    cuerpo.append("", archivo);
    const respuesta = await fetch(preparada.signedUrl, { method: "PUT", body: cuerpo, headers: { "x-upsert": "false" } }).catch(
      () => null,
    );
    if (!respuesta?.ok) return setEstado({ subiendo: false, error: "No se pudo subir el archivo. Revisá tu conexión y probá de nuevo." });

    const registro = await registrarEntrega({
      proyectoId,
      eventoId,
      version: preparada.version,
      path: preparada.path,
      nombre: archivo.name,
      tamano: archivo.size,
      nota,
    });
    if ("error" in registro) return setEstado({ subiendo: false, error: registro.error });
    form.reset();
    setElegido(null);
    setEstado({ subiendo: false, ok: `Listo: se subió la versión ${preparada.version}.` });
    router.refresh();
  }

  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-medium">{hayVersiones ? "Subir una versión nueva" : "Subir la entrega"}</summary>
      <form onSubmit={subir} className="mt-3 grid gap-3 border bg-card p-4">
        {/* El input real queda oculto; el recuadro con el ícono es lo que se toca para elegir el archivo. */}
        <input
          id={idArchivo}
          type="file"
          name="archivo"
          className="sr-only"
          onChange={(e) => {
            const archivo = e.currentTarget.files?.[0];
            setElegido(archivo ? archivo.name : null);
            setEstado({ subiendo: false });
          }}
        />
        <label
          htmlFor={idArchivo}
          className="flex cursor-pointer items-center gap-4 border border-dashed bg-background px-4 py-4 hover:border-primary"
        >
          <FileUp className="size-8 shrink-0 text-[#666]" aria-hidden />
          <span className="grid gap-0.5">
            <span className="font-medium">{elegido ? elegido : "Elegir archivo"}</span>
            <span className="text-xs text-[#666]">
              {elegido ? "Tocá para cambiarlo" : `PDF, presentación, documento o imagen · hasta ${LIMITE_MB} MB`}
            </span>
          </span>
        </label>
        <textarea
          name="nota"
          rows={2}
          maxLength={500}
          placeholder="¿Qué cambió en esta versión? (opcional)"
          aria-label="Nota de la versión"
          className="border bg-background px-2.5 py-2 text-sm outline-none focus-visible:border-ring"
        />
        <p className="text-xs text-[#666]">Las versiones anteriores no se borran: queda el historial.</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" disabled={estado.subiendo}>{estado.subiendo ? "Subiendo…" : "Subir"}</Button>
          {estado.error && <span className="text-destructive">{estado.error}</span>}
          {estado.ok && <span className="text-[#666]">{estado.ok}</span>}
        </div>
      </form>
    </details>
  );
}
