"use client";

// GRUPO ALUMNOS — botón para borrar una versión, con confirmación en dos pasos (sin ventanas del navegador).
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { borrarVersion } from "../_acciones";

export function BorrarVersion({ entregaId, proyectoId, eventoId, version }: { entregaId: string; proyectoId: string; eventoId: string; version: number }) {
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="inline-flex items-center gap-1 text-[#666] hover:text-destructive"
      >
        <Trash2 className="size-3.5" aria-hidden /> Borrar
      </button>
    );
  }
  return (
    <form action={borrarVersion} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="entrega_id" value={entregaId} />
      <input type="hidden" name="proyecto_id" value={proyectoId} />
      <input type="hidden" name="evento_id" value={eventoId} />
      <span className="text-destructive">¿Borrar la versión {version}? No se puede deshacer.</span>
      <Button type="submit" size="sm" variant="destructive">Sí, borrar</Button>
      <Button type="button" size="sm" variant="outline" onClick={() => setConfirmando(false)}>Cancelar</Button>
    </form>
  );
}
