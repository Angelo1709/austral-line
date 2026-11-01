-- GRUPO ALUMNOS: entregas individuales en el repositorio.
-- Los profesores eligen en cada hito si la entrega es grupal, individual o ambas. La entrega individual
-- funciona igual que la grupal (versiones, devoluciones y conversación) y la ven solo el alumno y los
-- profesores: ni los compañeros de grupo ni el mentor.

-- Tipo de entrega de cada hito. Si un hito no tiene fila, es grupal. ----------------------------
create table alumnos_hitos_tipo (
  evento_id uuid primary key references eventos(id) on delete cascade,
  tipo text not null default 'grupal' check (tipo in ('grupal', 'individual', 'ambas')),
  updated_at timestamptz not null default now()
);

alter table alumnos_hitos_tipo enable row level security;

create policy "leer con rol" on alumnos_hitos_tipo for select to authenticated
  using (mi_rol() is not null);
create policy "admin escribe" on alumnos_hitos_tipo for all to authenticated
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');

create function public.alumnos_tipo_hito(p_evento uuid) returns text
language sql stable security invoker set search_path = public as $$
  select coalesce((select tipo from alumnos_hitos_tipo where evento_id = p_evento), 'grupal')
$$;
revoke execute on function public.alumnos_tipo_hito(uuid) from public, anon;
grant execute on function public.alumnos_tipo_hito(uuid) to authenticated;

-- Entregas individuales: cada alumno ve y sube solo las suyas -----------------------------------
create policy "alumno ve sus individuales" on alumnos_entregas for select to authenticated
  using (mi_rol() = 'alumno' and persona_id = alumnos_yo());
create policy "alumno sube su individual" on alumnos_entregas for insert to authenticated
  with check (
    mi_rol() = 'alumno'
    and proyecto_id is null
    and persona_id = alumnos_yo()
    and subida_por = alumnos_yo()
    and alumnos_tipo_hito(evento_id) in ('individual', 'ambas')
  );
-- Y las del grupo, solo en los hitos grupales (se suma a los permisos que ya había).
create policy "grupales solo en hitos grupales" on alumnos_entregas as restrictive for insert to authenticated
  with check (mi_rol() = 'admin' or proyecto_id is null or alumnos_tipo_hito(evento_id) in ('grupal', 'ambas'));

-- Devoluciones de una entrega individual: el alumno las lee y las contesta ----------------------
create policy "alumno lee las de sus individuales" on alumnos_entregas_devoluciones for select to authenticated
  using (mi_rol() = 'alumno' and exists (
    select 1 from alumnos_entregas e where e.id = entrega_id and e.persona_id = alumnos_yo()));
create policy "alumno contesta en sus individuales" on alumnos_entregas_devoluciones for insert to authenticated
  with check (
    mi_rol() = 'alumno'
    and respuesta_a is not null
    and autor_id = alumnos_yo()
    and exists (select 1 from alumnos_entregas e where e.id = entrega_id and e.persona_id = alumnos_yo())
  );

-- Archivos individuales: carpeta individual/<persona_id>/... del mismo bucket ------------------
create policy "alumnos-entregas: individual propio lee" on storage.objects for select to authenticated
  using (
    bucket_id = 'alumnos-entregas'
    and mi_rol() = 'alumno'
    and (storage.foldername(name))[1] = 'individual'
    and (storage.foldername(name))[2] = alumnos_yo()::text
  );
create policy "alumnos-entregas: individual propio sube" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'alumnos-entregas'
    and mi_rol() = 'alumno'
    and (storage.foldername(name))[1] = 'individual'
    and (storage.foldername(name))[2] = alumnos_yo()::text
  );

