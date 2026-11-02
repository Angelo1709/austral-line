"use client";

import { useActionState } from "react";
import { guardarContacto, registrarVinculo, solicitarContacto, type EstadoFormulario } from "../actions";

const inicial: EstadoFormulario = { message: "", success: false };
const campo = "mt-1 h-9 w-full border bg-background px-3 text-sm outline-none focus:border-foreground";
const boton = "inline-flex h-9 items-center border border-foreground bg-foreground px-4 text-sm text-background hover:opacity-85 disabled:opacity-50";

type Contacto = {
  industria: string;
  especialidades: string[];
  modalidad: string;
  email_contacto: string;
  telefono_contacto: string;
  acepta_consultas_otros: boolean;
  publicado: boolean;
} | null;

export function FormularioMentor({ contacto }: { contacto: Contacto }) {
  const [estado, action, pendiente] = useActionState(guardarContacto, inicial);
  return (
    <form action={action} className="max-w-2xl space-y-5 border-t pt-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Industria
          <input className={campo} name="industria" defaultValue={contacto?.industria} maxLength={100} placeholder="Ej. Agrotecnología" />
        </label>
        <label className="text-sm">Modalidad
          <select key={contacto?.modalidad ?? "sin-perfil"} className={campo} name="modalidad" defaultValue={contacto?.modalidad ?? "consulta"}>
            <option value="principal">Mentor principal</option>
            <option value="consulta">Consulta puntual</option>
            <option value="ambas">Ambas</option>
          </select>
        </label>
      </div>
      <label className="block text-sm">Especialidades
        <input className={campo} name="especialidades" defaultValue={contacto?.especialidades.join(", ")} placeholder="Ej. Finanzas, Producto, Ventas" />
        <span className="mt-1 block text-xs text-[#666]">Separalas con comas.</span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Email para compartir
          <input className={campo} name="email_contacto" type="email" defaultValue={contacto?.email_contacto} maxLength={180} placeholder="nombre@empresa.com" />
        </label>
        <label className="text-sm">Teléfono para compartir
          <input className={campo} name="telefono_contacto" type="tel" defaultValue={contacto?.telefono_contacto} maxLength={50} placeholder="+54 ..." />
        </label>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input className="mt-1" type="checkbox" name="acepta_consultas_otros" defaultChecked={contacto?.acepta_consultas_otros} />
        Acepto consultas de alumnos de otros equipos.
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input className="mt-1" type="checkbox" name="publicado" defaultChecked={contacto?.publicado} />
        Autorizo a publicar estos datos de contacto para los alumnos habilitados.
      </label>
      <div className="flex items-center gap-4">
        <button className={boton} type="submit" disabled={pendiente}>{pendiente ? "Guardando..." : "Guardar perfil"}</button>
        {estado.message && <p role="status" className={`text-sm ${estado.success ? "text-foreground" : "text-destructive"}`}>{estado.message}</p>}
      </div>
    </form>
  );
}

export function FormularioVinculo({
  mentores, proyectos,
}: {
  mentores: { id: string; nombre: string }[];
  proyectos: { id: string; nombre: string }[];
}) {
  const [estado, action, pendiente] = useActionState(registrarVinculo, inicial);
  return (
    <form action={action} className="grid max-w-3xl gap-4 border-t pt-5 sm:grid-cols-2">
      <label className="text-sm">Mentor
        <select className={campo} name="mentor_id" required defaultValue="">
          <option value="" disabled>Seleccionar mentor</option>
          {mentores.map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.nombre}</option>)}
        </select>
      </label>
      <label className="text-sm">Proyecto
        <select className={campo} name="proyecto_id" required defaultValue="">
          <option value="" disabled>Seleccionar proyecto</option>
          {proyectos.map((proyecto) => <option key={proyecto.id} value={proyecto.id}>{proyecto.nombre}</option>)}
        </select>
      </label>
      <label className="flex items-start gap-3 text-sm sm:col-span-2">
        <input className="mt-1" type="checkbox" name="confirmado" required />
        Confirmo que esta relación entre mentor y proyecto ya fue aprobada fuera del sistema.
      </label>
      <div className="flex items-center gap-4 sm:col-span-2">
        <button className={boton} type="submit" disabled={pendiente}>{pendiente ? "Guardando..." : "Registrar vínculo"}</button>
        {estado.message && <p role="status" className={`text-sm ${estado.success ? "text-foreground" : "text-destructive"}`}>{estado.message}</p>}
      </div>
    </form>
  );
}

export function FormularioSolicitud({ mentores }: { mentores: { id: string; nombre: string }[] }) {
  const [estado, action, pendiente] = useActionState(solicitarContacto, inicial);
  return (
    <form action={action} className="max-w-2xl space-y-4 border-t pt-5">
      <label className="block text-sm">Mentor
        <select className={campo} name="mentor_id" required defaultValue="">
          <option value="" disabled>Seleccionar mentor</option>
          {mentores.map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.nombre}</option>)}
        </select>
      </label>
      <label className="block text-sm">Motivo de la consulta
        <textarea className="mt-1 min-h-24 w-full border bg-background p-3 text-sm outline-none focus:border-foreground" name="motivo" minLength={10} maxLength={500} required />
      </label>
      <div className="flex items-center gap-4">
        <button className={boton} type="submit" disabled={pendiente}>{pendiente ? "Enviando..." : "Solicitar contacto"}</button>
        {estado.message && <p role="status" className={`text-sm ${estado.success ? "text-foreground" : "text-destructive"}`}>{estado.message}</p>}
      </div>
    </form>
  );
}
