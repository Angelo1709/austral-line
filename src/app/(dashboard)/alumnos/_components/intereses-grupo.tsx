// GRUPO ALUMNOS — intereses propios del grupo, dentro de "Tu grupo" (Proyectos).
// Arrancan como el promedio de los integrantes; después el grupo los ajusta y quedan fijos aunque cada
// uno cambie su perfil. Si se suma alguien, se avisa y el grupo decide si recalcular.
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Estrellas } from "./estrellas";
import { calcularInteresesGrupo, guardarInteresesGrupo } from "../_lib/acciones-grupo";

const ZONA = "America/Argentina/Buenos_Aires";
const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: ZONA });

export async function InteresesGrupo({
  proyectoId,
  miembros,
  guardado,
}: {
  proyectoId: string;
  miembros: { id: string; nombre: string }[];
  guardado: boolean;
}) {
  const supabase = await createClient();
  const [maestro, intereses, calculo] = await Promise.all([
    supabase.from("alumnos_intereses_maestro").select("id, nombre").eq("activo", true).order("orden").order("nombre"),
    supabase
      .from("alumnos_grupo_intereses")
      .select("interes_id, estrellas, updated_at, quien:personas!alumnos_grupo_intereses_updated_by_fkey(nombre)")
      .eq("proyecto_id", proyectoId),
    supabase.from("alumnos_grupo_intereses_calculo").select("integrantes, calculado_at").eq("proyecto_id", proyectoId).maybeSingle(),
  ]);
  for (const r of [maestro, intereses, calculo]) if (r.error) throw r.error;

  const oculto = <input type="hidden" name="proyecto_id" value={proyectoId} />;
  const titulo = (
    <div>
      <h3 className="font-serif text-base">Intereses del grupo</h3>
      <p className="text-xs text-[#666]">
        Lo que le interesa al grupo como equipo. Es la base para las recomendaciones que reciban más adelante y no cambia
        sola cuando alguien cambia su perfil.
      </p>
    </div>
  );

  if (!calculo.data) {
    return (
      <section className="grid gap-3 border-t pt-4">
        {titulo}
        <form action={calcularInteresesGrupo} className="flex flex-wrap items-center gap-3">
          {oculto}
          <Button type="submit" size="sm">Armar a partir de los integrantes</Button>
          <span className="text-xs text-[#666]">Se calcula el promedio de estrellas de cada uno; después lo pueden ajustar.</span>
        </form>
      </section>
    );
  }

  const estrellasDe = new Map(intereses.data!.map((i) => [i.interes_id, i.estrellas]));
  const ultimo = [...intereses.data!].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  const nuevos = miembros.filter((m) => !calculo.data!.integrantes.includes(m.id));
  const nombreDe = new Map(maestro.data!.map((m) => [m.id, m.nombre]));
  const fuertes = [...intereses.data!]
    .filter((i) => i.estrellas >= 4 && nombreDe.has(i.interes_id))
    .sort((a, b) => b.estrellas - a.estrellas);

  return (
    <section className="grid gap-4 border-t pt-4">
      {titulo}

      {nuevos.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border bg-background px-4 py-3 text-sm">
          <span>
            {nuevos.map((n) => n.nombre).join(", ")} {nuevos.length === 1 ? "se sumó" : "se sumaron"} después de armar estos intereses.
          </span>
          <details className="ml-auto">
            <summary className="cursor-pointer text-[#666] hover:text-primary">Recalcular con todos</summary>
            <form action={calcularInteresesGrupo} className="mt-2 grid gap-2">
              {oculto}
              <p className="text-xs text-[#666]">Se reemplazan los ajustes que hicieron por el promedio de todos los integrantes.</p>
              <div><Button type="submit" size="sm" variant="outline">Sí, recalcular</Button></div>
            </form>
          </details>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-[#666]">Lo que más les interesa:</span>
        {fuertes.length === 0 ? (
          <span className="text-[#666]">todavía ningún tema con 4 o 5 estrellas.</span>
        ) : (
          fuertes.map((f) => (
            <Badge key={f.interes_id} variant={f.estrellas === 5 ? "default" : "outline"}>
              {nombreDe.get(f.interes_id)} · {f.estrellas}★
            </Badge>
          ))
        )}
      </div>

      <details open={guardado} className="text-sm">
        <summary className="cursor-pointer font-medium">Ver y ajustar todos los temas</summary>
      <form action={guardarInteresesGrupo} className="mt-3 grid gap-3">
        {oculto}
        <div className="grid gap-2">
          {maestro.data!.map(({ id, nombre }) => (
            <div key={id} className="flex items-center justify-between gap-6 border bg-background px-4 py-2">
              <span className="min-w-0 text-sm">{nombre}</span>
              <Estrellas nombre={`grupo_${id}`} valor={estrellasDe.get(id) ?? 0} tema={nombre} pregunta="Cuánto le interesa al grupo" />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm">Guardar intereses del grupo</Button>
          {guardado && <span className="text-sm text-[#666]">Guardado.</span>}
          <span className="ml-auto text-xs text-[#666]">
            {ultimo ? `Último cambio: ${ultimo.quien?.nombre ?? "alguien"} · ${fecha(ultimo.updated_at)}` : `Armado el ${fecha(calculo.data.calculado_at)}`}
          </span>
        </div>
      </form>
      </details>
    </section>
  );
}
