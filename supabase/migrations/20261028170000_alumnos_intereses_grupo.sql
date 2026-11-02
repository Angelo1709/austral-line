-- GRUPO ALUMNOS: intereses propios del grupo.
-- Cuando un grupo arranca, sus intereses se calculan como el promedio de estrellas de sus integrantes
-- (del mismo maestro de 14 temas). Después el grupo los ajusta y quedan fijos aunque cada uno cambie
-- su perfil: son la base estable para los agentes que recomiendan y buscan cosas para el equipo.
-- Cualquier integrante puede ajustarlos; queda historial. Si se suma alguien, no se recalcula solo.

-- Intereses del grupo (estrellas 1 a 5 por tema) ------------------------------------------------
create table alumnos_grupo_intereses (
  proyecto_id uuid not null references proyectos(id) on delete cascade,
  interes_id smallint not null references alumnos_intereses_maestro(id) on delete cascade,
  estrellas smallint not null check (estrellas between 1 and 5),
  updated_at timestamptz not null default now(),
  updated_by uuid references personas(id) on delete set null,
  primary key (proyecto_id, interes_id)
);

-- Con qué integrantes se calculó el promedio, para avisar si después se suma alguien.
create table alumnos_grupo_intereses_calculo (
  proyecto_id uuid primary key references proyectos(id) on delete cascade,
  integrantes uuid[] not null,
  calculado_por uuid references personas(id) on delete set null,
  calculado_at timestamptz not null default now()
);

-- Historial de cambios (lo escribe solo el trigger) --------------------------------------------
create table alumnos_grupo_intereses_historial (
  id bigint generated always as identity primary key,
  proyecto_id uuid not null,
  interes_id smallint not null,
  estrellas_antes smallint,
  estrellas_despues smallint,
  persona_id uuid,
  created_at timestamptz not null default now()
);

create function public.alumnos_registrar_cambio_interes_grupo() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  quien uuid := (select id from personas where lower(email) = lower(auth.jwt() ->> 'email'));
begin
  if tg_op = 'DELETE' then
    insert into alumnos_grupo_intereses_historial (proyecto_id, interes_id, estrellas_antes, estrellas_despues, persona_id)
    values (old.proyecto_id, old.interes_id, old.estrellas, null, quien);
    return old;
  end if;
  if tg_op = 'UPDATE' and old.estrellas = new.estrellas then
    return new;
  end if;
  insert into alumnos_grupo_intereses_historial (proyecto_id, interes_id, estrellas_antes, estrellas_despues, persona_id)
  values (new.proyecto_id, new.interes_id, case when tg_op = 'UPDATE' then old.estrellas end, new.estrellas, quien);
  return new;
end;
$$;

create trigger alumnos_grupo_intereses_historial after insert or update or delete on alumnos_grupo_intereses
  for each row execute function public.alumnos_registrar_cambio_interes_grupo();

-- Permisos: los integrantes del proyecto leen y ajustan; el admin todo ------------------------
create function public.alumnos_es_mi_proyecto(p_proyecto uuid) returns boolean
language sql stable security invoker set search_path = public as $$
  select mi_rol() = 'alumno' and exists (
    select 1 from proyecto_integrantes i
    join personas p on p.id = i.persona_id
    where i.proyecto_id = p_proyecto and lower(p.email) = lower(auth.jwt() ->> 'email')
  )
$$;
revoke execute on function public.alumnos_es_mi_proyecto(uuid) from public, anon;
grant execute on function public.alumnos_es_mi_proyecto(uuid) to authenticated;

alter table alumnos_grupo_intereses enable row level security;
create policy "admin todo" on alumnos_grupo_intereses for all to authenticated
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');
create policy "grupo lee y ajusta" on alumnos_grupo_intereses for all to authenticated
  using (alumnos_es_mi_proyecto(proyecto_id)) with check (alumnos_es_mi_proyecto(proyecto_id));

alter table alumnos_grupo_intereses_calculo enable row level security;
create policy "admin todo" on alumnos_grupo_intereses_calculo for all to authenticated
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');
create policy "grupo lee" on alumnos_grupo_intereses_calculo for select to authenticated
  using (alumnos_es_mi_proyecto(proyecto_id));

alter table alumnos_grupo_intereses_historial enable row level security;
create policy "admin ve todo" on alumnos_grupo_intereses_historial for select to authenticated
  using (mi_rol() = 'admin');
create policy "grupo ve el suyo" on alumnos_grupo_intereses_historial for select to authenticated
  using (alumnos_es_mi_proyecto(proyecto_id));

-- Calcular (o recalcular) desde los integrantes ---------------------------------------------
-- Security definer porque un alumno no ve las estrellas de un compañero que no busca equipo; antes
-- de leer nada, verifica que quien lo pide sea integrante del proyecto (o admin). Solo escribe tablas
-- de este grupo. Pisa los intereses del grupo con el promedio redondeado de cada tema calificado.
create function public.alumnos_calcular_intereses_grupo(p_proyecto uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  yo uuid := (select id from personas where lower(email) = lower(auth.jwt() ->> 'email'));
  miembros uuid[];
  temas integer;
begin
  if not (mi_rol() = 'admin' or exists (
    select 1 from proyecto_integrantes where proyecto_id = p_proyecto and persona_id = yo
  )) then
    raise exception 'Solo los integrantes del grupo pueden calcular sus intereses.';
  end if;

  select coalesce(array_agg(persona_id order by persona_id), '{}') into miembros
  from proyecto_integrantes where proyecto_id = p_proyecto;

  delete from alumnos_grupo_intereses where proyecto_id = p_proyecto;
  insert into alumnos_grupo_intereses (proyecto_id, interes_id, estrellas, updated_by)
  select p_proyecto, i.interes_id, round(avg(i.estrellas))::smallint, yo
  from alumnos_intereses i
  join alumnos_intereses_maestro m on m.id = i.interes_id and m.activo
  where i.persona_id = any (miembros)
  group by i.interes_id;
  get diagnostics temas = row_count;

  insert into alumnos_grupo_intereses_calculo (proyecto_id, integrantes, calculado_por, calculado_at)
  values (p_proyecto, miembros, yo, now())
  on conflict (proyecto_id) do update
    set integrantes = excluded.integrantes, calculado_por = excluded.calculado_por, calculado_at = excluded.calculado_at;

  return temas;
end;
$$;
revoke execute on function public.alumnos_calcular_intereses_grupo(uuid) from public, anon;
grant execute on function public.alumnos_calcular_intereses_grupo(uuid) to authenticated;
