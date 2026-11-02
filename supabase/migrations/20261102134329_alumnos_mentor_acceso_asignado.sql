-- ALUMNOS (arreglo de seguridad, lo hace el profe): el acceso de un mentor a las entregas de un grupo
-- salía de "tener una reunión con ese proyecto", pero cada mentor carga sus reuniones con cualquier
-- proyecto. Con una reunión inventada podía leer las entregas de cualquier grupo.
--
-- Ahora el acceso sale de algo que decide el coordinador:
--   * un match aceptado en Mentores (mentores_sugerencias con estado 'aceptada'), o
--   * una reunión con ese proyecto que cargó un admin.
-- El mentor puede seguir cargando sus reuniones como siempre; eso solo ya no le abre las entregas.
--
-- security definer porque mentores_sugerencias solo la lee el admin. `create or replace` mantiene los permisos.
create or replace function public.alumnos_soy_mentor(p_proyecto text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.mi_rol() = 'mentor' and (
    exists (
      select 1 from public.mentores_sugerencias s
      where s.proyecto_id::text = p_proyecto and s.mentor_id = public.mi_persona_id() and s.estado = 'aceptada'
    )
    or exists (
      select 1 from public.mentores_reuniones r
      join public.personas a on a.id = r.cargada_por and a.rol = 'admin'
      where r.proyecto_id::text = p_proyecto and r.mentor_id = public.mi_persona_id()
    )
  )
$$;
