// GRUPO MENTORES — tarjeta que imita cómo un alumno ve el perfil de un mentor. La usa el propio
// mentor (para saber cómo queda antes de publicar) y el admin (para auditar un perfil puntual).
import { Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PerfilMentor } from "../../_lib";

export function VistaPreviaPerfil({ perfil, nombre }: { perfil: PerfilMentor; nombre: string }) {
  return (
    <div className="border bg-card p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center bg-primary font-serif text-lg text-primary-foreground">
          {nombre.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-serif text-lg leading-snug">{nombre}</p>
          {(perfil.cargo || perfil.empresa) && (
            <p className="text-sm text-[#666]">
              {perfil.cargo}
              {perfil.cargo && perfil.empresa ? " en " : ""}
              {perfil.empresa}
            </p>
          )}
        </div>
      </div>

      {(perfil.industria || perfil.anios_experiencia) && (
        <div className="mb-5 flex flex-wrap gap-2">
          {perfil.industria && <Badge variant="outline">{perfil.industria}</Badge>}
          {perfil.anios_experiencia && <Badge variant="outline">{perfil.anios_experiencia} años de experiencia</Badge>}
        </div>
      )}

      {perfil.bio && <p className="mb-5 text-sm">{perfil.bio}</p>}

      {perfil.areas_ayuda && (
        <div className="mb-5 grid gap-0.5">
          <p className="text-xs text-[#666]">Puede ayudarte con</p>
          <p className="text-sm">{perfil.areas_ayuda}</p>
        </div>
      )}

      {perfil.linkedin_url && (
        <a
          href={perfil.linkedin_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <Link2 className="size-3.5" /> Ver perfil de LinkedIn
        </a>
      )}
    </div>
  );
}
