"use client";
// GRUPO MENTORES — botón de envío que avisa mientras el asistente arma el resumen (puede tardar unos segundos).
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BotonGuardar({ children, pendiente = "Guardando…", ...props }: React.ComponentProps<typeof Button> & { pendiente?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} {...props} className={cn("h-12 px-6 text-base", props.className)}>
      {pending ? pendiente : children}
    </Button>
  );
}
