// GRUPO MENTORES — tarjeta grande para cada cosa que se puede hacer en Mentores.
// Pensada para gente que no usa mucha tecnología: toda la tarjeta se puede apretar, dice en palabras
// simples qué pasa al entrar y, si hay algo pendiente, lo muestra con un número bien visible.
import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Accion({
  href, icono: Icono, titulo, descripcion, boton, pendientes = 0, textoPendientes,
}: {
  href: string;
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
  boton: string;
  pendientes?: number;
  textoPendientes?: string;
}) {
  const hayPendientes = pendientes > 0;
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-[180px] flex-col gap-4 border bg-background p-6 transition-colors hover:border-primary hover:bg-card",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        hayPendientes && "border-primary",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center bg-muted text-primary" aria-hidden>
          <Icono className="size-6" strokeWidth={1.75} />
        </span>
        {hayPendientes && (
          <span className="bg-primary px-2.5 py-1 text-sm font-medium text-primary-foreground">
            {pendientes} {textoPendientes ?? (pendientes === 1 ? "pendiente" : "pendientes")}
          </span>
        )}
      </div>
      <div className="grid gap-1.5">
        <h2 className="text-lg font-medium">{titulo}</h2>
        <p className="text-base leading-relaxed text-[#555]">{descripcion}</p>
      </div>
      <span className="mt-auto inline-flex items-center gap-1 text-base font-medium text-primary underline-offset-4 group-hover:underline">
        {boton} <ChevronRight className="size-5" aria-hidden />
      </span>
    </Link>
  );
}

// Encabezado de cada pantalla: título, una frase de para qué sirve y, opcional, cómo volver.
export function Encabezado({ titulo, bajada, volver }: { titulo: string; bajada: string; volver?: { href: string; texto: string } }) {
  return (
    <div className="mb-8">
      {volver && (
        <Link href={volver.href} className="mb-4 inline-flex min-h-11 items-center gap-1 text-base text-[#555] hover:text-primary">
          ← {volver.texto}
        </Link>
      )}
      <h1 className="font-serif text-3xl">{titulo}</h1>
      <p className="mt-2 max-w-2xl text-base leading-relaxed text-[#555]">{bajada}</p>
    </div>
  );
}
