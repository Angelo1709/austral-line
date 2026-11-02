import { Check, Mail, Phone, Trash2 } from "lucide-react";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormularioMentor, FormularioSolicitud, FormularioVinculo } from "./_components/formularios";
import { atenderSolicitud, quitarVinculo } from "./actions";

const modalidadLabel: Record<string, string> = {
  principal: "Principal", consulta: "Consulta puntual", ambas: "Principal y consulta",
};

export default async function ContactoMentores() {
  const persona = await requireRol("alumno", "mentor");
  const supabase = await createClient();

  if (persona.rol === "mentor") {
    const { data: contacto, error } = await supabase.from("austral_contactos_mentores")
      .select("industria, especialidades, modalidad, email_contacto, telefono_contacto, acepta_consultas_otros, publicado")
      .eq("mentor_id", persona.id).maybeSingle();
    if (error) throw error;
    return (
      <div className="space-y-8">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase text-[#666]">Austral / Mentores</p>
          <h1 className="font-serif text-2xl">Mi contacto</h1>
          <p className="max-w-2xl text-sm text-[#666]">Elegí qué datos compartir. Sin tu autorización el perfil queda como borrador. Si no aceptás consultas de otros equipos, solo te verá el proyecto con vínculo formal registrado.</p>
        </header>
        <FormularioMentor contacto={contacto} />
      </div>
    );
  }

  const [personasResult, contactosResult, vinculosResult, proyectosResult, solicitudesResult] = await Promise.all([
    supabase.from("personas").select("id, nombre, rol").order("nombre"),
    supabase.from("austral_contactos_mentores").select("mentor_id, industria, especialidades, modalidad, email_contacto, telefono_contacto, acepta_consultas_otros, publicado, actualizado_at").order("actualizado_at", { ascending: false }),
    supabase.from("austral_vinculos_mentor_proyecto").select("mentor_id, proyecto_id"),
    supabase.from("proyectos").select("id, nombre").order("nombre"),
    supabase.from("austral_solicitudes_contacto").select("id, alumno_id, mentor_id, motivo, estado, created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  for (const resultado of [personasResult, contactosResult, vinculosResult, proyectosResult, solicitudesResult]) {
    if (resultado.error) throw resultado.error;
  }
  const personas = personasResult.data ?? [];
  const mentores = personas.filter((p) => p.rol === "mentor");
  const contactos = contactosResult.data ?? [];
  const vinculos = vinculosResult.data ?? [];
  const proyectos = proyectosResult.data ?? [];
  const solicitudes = solicitudesResult.data ?? [];
  const nombres = new Map(personas.map((p) => [p.id, p.nombre]));
  const proyectosPorId = new Map(proyectos.map((proyecto) => [proyecto.id, proyecto.nombre]));

  if (persona.rol === "alumno") {
    const disponibles = contactos.filter((contacto) => contacto.publicado);
    const noDisponibles = mentores.filter((mentor) => !disponibles.some((contacto) => contacto.mentor_id === mentor.id));
    return (
      <div className="space-y-8">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase text-[#666]">Austral / Alumnos</p>
          <h1 className="font-serif text-2xl">Contactos de mentores</h1>
        </header>
        {disponibles.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Mentor</TableHead><TableHead>Industria</TableHead><TableHead>Especialidades</TableHead><TableHead>Modalidad</TableHead><TableHead>Contacto</TableHead></TableRow></TableHeader>
              <TableBody>
                {disponibles.map((contacto) => (
                  <TableRow key={contacto.mentor_id}>
                    <TableCell className="font-medium">{nombres.get(contacto.mentor_id)}</TableCell>
                    <TableCell>{contacto.industria}</TableCell>
                    <TableCell>{contacto.especialidades.join(", ")}</TableCell>
                    <TableCell>{modalidadLabel[contacto.modalidad]}</TableCell>
                    <TableCell className="space-y-1">
                      {contacto.email_contacto && <a className="flex items-center gap-2 underline-offset-2 hover:underline" href={`mailto:${contacto.email_contacto}`}><Mail size={14} />{contacto.email_contacto}</a>}
                      {contacto.telefono_contacto && <a className="flex items-center gap-2 underline-offset-2 hover:underline" href={`tel:${contacto.telefono_contacto}`}><Phone size={14} />{contacto.telefono_contacto}</a>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : <p className="border-y py-8 text-sm text-[#666]">Todavía no hay mentores que hayan autorizado compartir su contacto con tu equipo.</p>}
        {noDisponibles.length > 0 && <section className="space-y-4">
          <div>
            <h2 className="font-serif text-xl">Solicitar un contacto</h2>
            <p className="text-sm text-[#666]">Si necesitás hablar con un mentor que no aparece en el directorio, el equipo administrador revisará tu pedido. No se comparten datos sin autorización.</p>
          </div>
          <FormularioSolicitud mentores={noDisponibles} />
        </section>}
        {solicitudes.length > 0 && <section className="space-y-3">
          <h2 className="font-serif text-xl">Mis solicitudes</h2>
          <div className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead>Mentor</TableHead><TableHead>Motivo</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
            <TableBody>{solicitudes.map((solicitud) => <TableRow key={solicitud.id}>
              <TableCell>{nombres.get(solicitud.mentor_id)}</TableCell>
              <TableCell>{solicitud.motivo}</TableCell>
              <TableCell>{solicitud.estado === "pendiente" ? "Pendiente" : "Atendida"}</TableCell>
            </TableRow>)}</TableBody>
          </Table></div>
        </section>}
      </div>
    );
  }

  const perfiles = new Map(contactos.map((contacto) => [contacto.mentor_id, contacto]));
  const sinPerfil = mentores.filter((mentor) => !perfiles.get(mentor.id)?.publicado).length;
  const pendientes = solicitudes.filter((solicitud) => solicitud.estado === "pendiente");
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase text-[#666]">Austral / Administración</p>
        <h1 className="font-serif text-2xl">Contactos de mentores</h1>
        <p className="text-sm text-[#666]">{mentores.length - sinPerfil} de {mentores.length} mentores tienen un contacto publicado. {sinPerfil > 0 && `${sinPerfil} requieren seguimiento para completar o autorizar sus datos.`}</p>
        {pendientes.length > 0 && <p className="text-sm">{pendientes.length} solicitud(es) de alumnos pendientes de revisión.</p>}
      </header>

      <section className="space-y-4">
        <h2 className="font-serif text-xl">Estado de perfiles</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Mentor</TableHead><TableHead>Industria</TableHead><TableHead>Especialidades</TableHead><TableHead>Modalidad</TableHead><TableHead>Consultas de otros equipos</TableHead><TableHead>Estado</TableHead><TableHead>Actualizado</TableHead></TableRow></TableHeader>
            <TableBody>
              {mentores.map((mentor) => {
                const contacto = perfiles.get(mentor.id);
                return <TableRow key={mentor.id}>
                  <TableCell className="font-medium">{mentor.nombre}</TableCell>
                  <TableCell>{contacto?.industria || "Sin cargar"}</TableCell>
                  <TableCell>{contacto?.especialidades.join(", ") || "Sin cargar"}</TableCell>
                  <TableCell>{contacto ? modalidadLabel[contacto.modalidad] : "Sin cargar"}</TableCell>
                  <TableCell>{contacto?.acepta_consultas_otros ? "Sí" : "No"}</TableCell>
                  <TableCell>{contacto?.publicado ? "Publicado" : contacto ? "Sin autorización" : "Sin perfil"}</TableCell>
                  <TableCell>{contacto ? new Date(contacto.actualizado_at).toLocaleDateString("es-AR") : "—"}</TableCell>
                </TableRow>;
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-xl">Solicitudes de alumnos</h2>
        {solicitudes.length ? <div className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Alumno</TableHead><TableHead>Mentor</TableHead><TableHead>Motivo</TableHead><TableHead>Estado</TableHead><TableHead className="w-12"> </TableHead></TableRow></TableHeader>
          <TableBody>{solicitudes.map((solicitud) => <TableRow key={solicitud.id}>
            <TableCell>{nombres.get(solicitud.alumno_id)}</TableCell>
            <TableCell>{nombres.get(solicitud.mentor_id)}</TableCell>
            <TableCell className="min-w-64 whitespace-normal">{solicitud.motivo}</TableCell>
            <TableCell>{solicitud.estado === "pendiente" ? "Pendiente" : "Atendida"}</TableCell>
            <TableCell>{solicitud.estado === "pendiente" && <form action={atenderSolicitud}><input type="hidden" name="id" value={solicitud.id} /><button type="submit" title="Marcar atendida" aria-label="Marcar atendida" className="p-1 hover:bg-muted"><Check size={16} /></button></form>}</TableCell>
          </TableRow>)}</TableBody>
        </Table></div> : <p className="border-y py-6 text-sm text-[#666]">No hay solicitudes registradas.</p>}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-xl">Vínculos formales</h2>
          <p className="text-sm text-[#666]">Registrá únicamente asignaciones ya aprobadas. El directorio no decide qué mentor corresponde a cada proyecto.</p>
        </div>
        <FormularioVinculo mentores={mentores} proyectos={proyectos} />
        {vinculos.length ? <div className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Mentor</TableHead><TableHead>Proyecto</TableHead><TableHead className="w-12"> </TableHead></TableRow></TableHeader>
          <TableBody>{vinculos.map((vinculo) => <TableRow key={`${vinculo.mentor_id}-${vinculo.proyecto_id}`}>
            <TableCell>{nombres.get(vinculo.mentor_id)}</TableCell>
            <TableCell>{proyectosPorId.get(vinculo.proyecto_id)}</TableCell>
            <TableCell><form action={quitarVinculo}><input type="hidden" name="mentor_id" value={vinculo.mentor_id} /><input type="hidden" name="proyecto_id" value={vinculo.proyecto_id} /><button type="submit" title="Quitar vínculo" aria-label="Quitar vínculo" className="p-1 hover:bg-muted"><Trash2 size={16} /></button></form></TableCell>
          </TableRow>)}</TableBody>
        </Table></div> : <p className="border-y py-6 text-sm text-[#666]">No hay vínculos formales registrados.</p>}
      </section>
    </div>
  );
}
