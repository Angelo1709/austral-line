"use client";

// GRUPO ALUMNOS — guarda cada estrella apenas se toca (sin botón) y avisa con un "Guardado".
// Si no se puede (por ejemplo, quitar un tema dejaría menos del mínimo), vuelve la estrella a como estaba.
import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { guardarEstrella } from "../perfil/_acciones";

type Estado = { tipo: "guardando" | "ok" | "error"; texto: string } | null;

export function AutoGuardado({
  temas,
  perfilCreado,
  children,
}: {
  temas: { id: number; nombre: string }[];
  perfilCreado: boolean;
  children: React.ReactNode;
}) {
  const [estado, setEstado] = useState<Estado>(null);
  const ultimoValor = useRef(new Map<string, string>());
  const contenedor = useRef<HTMLDivElement>(null);

  // Recuerda cómo estaba cada tema al cargar, para poder volver atrás si un cambio no se guarda.
  useEffect(() => {
    for (const r of contenedor.current?.querySelectorAll<HTMLInputElement>('input[type="radio"][name^="interes_"]:checked') ?? []) {
      ultimoValor.current.set(r.name, r.value);
    }
  }, []);
  const nombreDe = new Map(temas.map((t) => [`interes_${t.id}`, t.nombre]));

  return (
    <div
      ref={contenedor}
      onChange={async (e) => {
        const input = e.target as HTMLInputElement;
        if (input.type !== "radio" || !input.name.startsWith("interes_")) return;
        const caja = e.currentTarget;
        const tema = nombreDe.get(input.name) ?? "el tema";
        const valor = Number(input.value);
        setEstado({ tipo: "guardando", texto: `Guardando ${tema}…` });
        const r = await guardarEstrella(Number(input.name.replace("interes_", "")), valor).catch(() => ({ error: "No se pudo guardar. Probá de nuevo." }));
        if ("error" in r) {
          const anterior = ultimoValor.current.get(input.name) ?? "0";
          const radio = caja.querySelector<HTMLInputElement>(`input[name="${input.name}"][value="${anterior}"]`);
          if (radio) radio.checked = true;
          setEstado({ tipo: "error", texto: r.error ?? "No se pudo guardar." });
          return;
        }
        ultimoValor.current.set(input.name, input.value);
        setEstado({ tipo: "ok", texto: valor === 0 ? `Quitaste ${tema}.` : `Guardado: ${tema}, ${valor} ${valor === 1 ? "estrella" : "estrellas"}.` });
      }}
    >
      <p
        role="status"
        className={`mb-2 flex min-h-5 items-center gap-1.5 text-sm ${estado?.tipo === "error" ? "text-destructive" : "text-[#666]"}`}
      >
        {estado?.tipo === "ok" && <Check className="size-4" aria-hidden />}
        {estado?.texto ??
          (perfilCreado
            ? "Las estrellas se guardan solas apenas las tocás."
            : "Las estrellas se guardan solas apenas las tocás. Para terminar tu perfil, elegí tu carrera y tocá Guardar perfil.")}
      </p>
      {children}
    </div>
  );
}
