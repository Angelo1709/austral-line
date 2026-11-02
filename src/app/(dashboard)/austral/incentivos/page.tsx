import { RotateCcw, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cambiarEstado } from "./actions";
import { Formularios } from "./_components/formularios";

const categoriaLabel: Record<string, string> = {
  comida: "Comida",
  formacion: "Formación",
  economico: "Económica",
  otro: "Otra",
};

export default async function Incentivos() {
  const supabase = await createClient();
  const [personasResult, eventosResult, participacionesResult, propuestasResult] = await Promise.all([
    supabase.from("personas").select("id, nombre, rol").in("rol", ["mentor", "jurado"]).order("nombre"),
    supabase.from("eventos").select("id, nombre").order("inicio", { ascending: false }),
    supabase.from("austral_participaciones").select("id, persona_id, evento_id, fecha, actividad").order("fecha", { ascending: false }).limit(100),
    supabase.from("austral_propuestas_incentivos").select("id, persona_id, categoria, alternativa, fundamento, participaciones_consideradas, estado, created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  for (const result of [personasResult, eventosResult, participacionesResult, propuestasResult]) {
    if (result.error) throw result.error;
  }

  const personas = personasResult.data ?? [];
  const eventos = eventosResult.data ?? [];
  const participaciones = participacionesResult.data ?? [];
  const propuestas = propuestasResult.data ?? [];
  const nombres = new Map(personas.map((p) => [p.id, p.nombre]));
  const nombresEventos = new Map(eventos.map((e) => [e.id, e.nombre]));

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase text-[#666]">Austral / Exploración</p>
        <h1 className="font-serif text-2xl">Incentivos para mentores y jurados</h1>
        <p className="max-w-3xl text-sm text-[#666]">Las alternativas son propuestas conceptuales. Su disponibilidad, presupuesto y aprobación institucional deben validarse antes de ofrecer cualquier beneficio.</p>
      </header>

      <Formularios personas={personas} eventos={eventos} />

      <section>
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-xl">Propuestas en revisión</h2>
          <span className="text-sm text-[#666]">{propuestas.length} recientes</span>
        </div>
        {propuestas.length ? (
          <Table>
            <TableHeader><TableRow><TableHead>Persona</TableHead><TableHead>Alternativa</TableHead><TableHead>Fundamento</TableHead><TableHead>Estado</TableHead><TableHead>Acción</TableHead></TableRow></TableHeader>
            <TableBody>
              {propuestas.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="align-top font-medium">{nombres.get(p.persona_id) ?? "Persona no disponible"}</TableCell>
                  <TableCell className="min-w-44 align-top whitespace-normal"><span className="text-xs text-[#666]">{categoriaLabel[p.categoria]}</span><br />{p.alternativa}</TableCell>
                  <TableCell className="max-w-xl min-w-64 align-top whitespace-normal text-[#666]">{p.fundamento}<p className="mt-2 text-xs">Basado en {p.participaciones_consideradas} {p.participaciones_consideradas === 1 ? "participación registrada" : "participaciones registradas"}.</p></TableCell>
                  <TableCell className="align-top">{p.estado === "en_estudio" ? "En estudio" : "Descartada"}</TableCell>
                  <TableCell className="align-top">
                    <form action={cambiarEstado}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="estado" value={p.estado === "en_estudio" ? "descartada" : "en_estudio"} />
                      <button type="submit" className="inline-flex h-8 items-center gap-1.5 border px-2 text-xs hover:bg-muted">
                        {p.estado === "en_estudio" ? <><X size={14} />Descartar</> : <><RotateCcw size={14} />Reabrir</>}
                      </button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : <p className="border-y py-8 text-sm text-[#666]">Todavía no hay propuestas. Registrá una participación y prepará el primer borrador.</p>}
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-xl">Participaciones registradas</h2>
          <span className="text-sm text-[#666]">{participaciones.length} recientes</span>
        </div>
        {participaciones.length ? (
          <Table>
            <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Persona</TableHead><TableHead>Evento</TableHead><TableHead>Actividad</TableHead></TableRow></TableHeader>
            <TableBody>
              {participaciones.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.fecha.split("-").reverse().join("/")}</TableCell>
                  <TableCell>{nombres.get(p.persona_id) ?? "Persona no disponible"}</TableCell>
                  <TableCell>{p.evento_id ? nombresEventos.get(p.evento_id) ?? "Evento no disponible" : "—"}</TableCell>
                  <TableCell className="min-w-64 whitespace-normal">{p.actividad}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : <p className="border-y py-8 text-sm text-[#666]">Todavía no hay participaciones registradas.</p>}
      </section>
    </div>
  );
}
