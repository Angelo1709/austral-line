"use client";
// Botón de formulario que se deshabilita y cambia el texto mientras el servidor trabaja.
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function BotonEnviar({ children, enviando, disabled, ...props }: React.ComponentProps<typeof Button> & { enviando?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending && enviando ? enviando : children}
    </Button>
  );
}
