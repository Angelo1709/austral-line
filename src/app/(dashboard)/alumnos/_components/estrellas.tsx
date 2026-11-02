// GRUPO ALUMNOS — calificación de 1 a 5 estrellas sin JavaScript: radios + CSS.
// Los radios van en orden inverso (5 → 1) y la fila se invierte, así "elegido y los de la izquierda"
// se pintan con el selector de hermanos (~). "Quitar" deja el tema sin calificar; mientras no hay
// calificación queda invisible pero ocupa su lugar, así las estrellas no se mueven.
import { Star } from "lucide-react";

export function Estrellas({
  nombre,
  valor,
  tema,
  pregunta = "Cuánto te interesa",
}: {
  nombre: string;
  valor: number;
  tema: string;
  pregunta?: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <div
        role="radiogroup"
        aria-label={`${pregunta} ${tema}`}
        className="flex flex-row-reverse justify-end [&>input:checked~label]:text-primary [&>input:focus-visible+label]:outline [&>label:hover]:text-primary [&>label:hover~label]:text-primary"
      >
        {[5, 4, 3, 2, 1].map((n) => (
          <Estrella key={n} nombre={nombre} n={n} valor={valor} />
        ))}
      </div>
      <label className="w-10 cursor-pointer text-right text-xs text-[#666] has-checked:invisible hover:text-primary">
        <input type="radio" name={nombre} value="0" defaultChecked={valor === 0} className="sr-only" />
        Quitar
      </label>
    </div>
  );
}

function Estrella({ nombre, n, valor }: { nombre: string; n: number; valor: number }) {
  const id = `${nombre}_${n}`;
  return (
    <>
      <input type="radio" id={id} name={nombre} value={n} defaultChecked={valor === n} className="peer sr-only" />
      <label htmlFor={id} className="cursor-pointer px-0.5 text-border" title={`${n} de 5`}>
        <Star size={20} strokeWidth={1.5} className="fill-current" />
        <span className="sr-only">{n} {n === 1 ? "estrella" : "estrellas"}</span>
      </label>
    </>
  );
}
