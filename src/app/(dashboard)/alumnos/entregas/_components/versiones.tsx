// GRUPO ALUMNOS — lista de versiones de una entrega (grupal o individual), con sus devoluciones y la
// conversación debajo de cada una. Contestan quien recibió la entrega, quien dejó la devolución y los profesores.
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { publicarDevolucion } from "../_acciones";

const ZONA = "America/Argentina/Buenos_Aires";
const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", timeZone: ZONA });
const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: ZONA });
const tamano = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

type Autor = { nombre: string; rol: string } | null;
export type Version = {
  id: string;
  version: number;
  archivo_path: string;
  nombre_archivo: string;
  tamano_bytes: number;
  nota: string | null;
  created_at: string;
  subidor: { nombre: string } | null;
  alumnos_entregas_devoluciones: {
    id: string;
    texto: string;
    created_at: string;
    respuesta_a: string | null;
    autor_id: string | null;
    autor: Autor;
  }[];
};

const quien = (a: Autor) =>
  !a ? "Alguien" : a.rol === "admin" ? "Profesores" : a.rol === "mentor" ? `${a.nombre} (mentor)` : a.nombre;

const campo = "border bg-background px-2.5 py-2 text-sm outline-none focus-visible:border-ring";

export function Versiones(props: {
  versiones: Version[];
  linkDe: Map<string, string>;
  persona: { id: string; rol: string };
  proyectoId: string; // para volver al mismo grupo después de publicar
  eventoId: string;
  vacio: string;
}) {
  const { versiones, linkDe, persona } = props;
  const puedeDevolver = persona.rol !== "alumno";
  const ocultos = (
    <>
      <input type="hidden" name="proyecto_id" value={props.proyectoId} />
      <input type="hidden" name="evento_id" value={props.eventoId} />
    </>
  );

  if (versiones.length === 0) return <p className="text-sm text-[#666]">{props.vacio}</p>;

  return (
    <ul className="grid gap-3">
      {versiones.map((v, i) => {
        const devoluciones = [...v.alumnos_entregas_devoluciones].sort((a, b) => a.created_at.localeCompare(b.created_at));
        const raices = devoluciones.filter((d) => !d.respuesta_a);
        return (
          <li key={v.id} className={cn("grid gap-2 border bg-card p-4", i > 0 && "opacity-80")}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={i === 0 ? "default" : "outline"}>{i === 0 ? `Versión ${v.version} · la última` : `Versión ${v.version}`}</Badge>
              {linkDe.get(v.archivo_path) ? (
                <a href={linkDe.get(v.archivo_path)} className="underline underline-offset-4 hover:text-[#666]">
                  {v.nombre_archivo}
                </a>
              ) : (
                <span>{v.nombre_archivo}</span>
              )}
              <span className="text-[#666]">
                {tamano(v.tamano_bytes)} · {v.subidor?.nombre ?? "alguien"} · {fechaHora(v.created_at)}
              </span>
            </div>
            {v.nota && <p className="border-l-2 pl-3 text-sm">{v.nota}</p>}

            {raices.length > 0 && (
              <ul className="grid gap-4 border-t pt-3">
                {raices.map((d) => {
                  const respuestas = devoluciones.filter((r) => r.respuesta_a === d.id);
                  const puedoContestar = persona.rol !== "mentor" || d.autor_id === persona.id;
                  return (
                    <li key={d.id} className="grid gap-2 text-sm">
                      <div className="grid gap-1">
                        <span className="text-xs text-[#666]">
                          <span className="font-medium text-primary">Devolución de {quien(d.autor)}</span> · {fecha(d.created_at)}
                        </span>
                        <p className="whitespace-pre-line">{d.texto}</p>
                      </div>
                      {respuestas.length > 0 && (
                        <ul className="grid gap-2 border-l-2 pl-4">
                          {respuestas.map((r) => (
                            <li key={r.id} className="grid gap-0.5">
                              <span className="text-xs text-[#666]">
                                <span className="font-medium text-primary">{quien(r.autor)}</span> · {fechaHora(r.created_at)}
                              </span>
                              <p className="whitespace-pre-line">{r.texto}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                      {puedoContestar && (
                        <details className="pl-4">
                          <summary className="cursor-pointer text-[#666] hover:text-primary">Contestar</summary>
                          <form action={publicarDevolucion} className="mt-2 grid gap-2">
                            <input type="hidden" name="entrega_id" value={v.id} />
                            <input type="hidden" name="respuesta_a" value={d.id} />
                            {ocultos}
                            <textarea name="texto" required minLength={2} maxLength={2000} rows={2} aria-label="Tu respuesta" className={campo} />
                            <div><Button type="submit" size="sm" variant="outline">Enviar respuesta</Button></div>
                          </form>
                        </details>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {puedeDevolver && (
              <details className="text-sm">
                <summary className="cursor-pointer text-[#666] hover:text-primary">Dejar una devolución</summary>
                <form action={publicarDevolucion} className="mt-2 grid gap-2">
                  <input type="hidden" name="entrega_id" value={v.id} />
                  {ocultos}
                  <textarea name="texto" required minLength={2} maxLength={2000} rows={3} aria-label="Devolución" className={campo} />
                  <div><Button type="submit" size="sm">Enviar devolución</Button></div>
                </form>
              </details>
            )}
          </li>
        );
      })}
    </ul>
  );
}
