"use client";
// Selector de 1 a 5 estrellas para formularios: manda el valor elegido en un input oculto.
import { useState } from "react";

export function Estrellas({ name, inicial }: { name: string; inicial?: number | null }) {
  const [valor, setValor] = useState(inicial ?? 0);
  const [encima, setEncima] = useState(0);
  const mostrar = encima || valor;

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setEncima(0)}>
      <input type="hidden" name={name} value={valor || ""} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
          aria-pressed={valor === n}
          onClick={() => setValor(n)}
          onMouseEnter={() => setEncima(n)}
          className={`text-2xl leading-none transition-colors ${n <= mostrar ? "text-primary" : "text-[#666]/40"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
