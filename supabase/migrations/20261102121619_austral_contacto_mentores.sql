-- Austral: directorio de contacto publicado por cada mentor y vinculos formales existentes.
create table austral_contactos_mentores (
  mentor_id uuid primary key references personas(id) on delete cascade,
  industria text not null default '',
  especialidades text[] not null default '{}',
  modalidad text not null default 'consulta' check (modalidad in ('principal', 'consulta', 'ambas')),
  email_contacto text not null default '',
  telefono_contacto text not null default '',
  acepta_consultas_otros boolean not null default false,
  publicado boolean not null default false,
  actualizado_at timestamptz not null default now(),
  constraint contacto_publicable check (
    not publicado or (
      length(trim(industria)) > 0 and cardinality(especialidades) > 0 and
      (length(trim(email_contacto)) > 0 or length(trim(telefono_contacto)) > 0)
    )
  )
);

create table austral_vinculos_mentor_proyecto (
  mentor_id uuid not null references personas(id) on delete cascade,
  proyecto_id uuid not null references proyectos(id) on delete cascade,
  registrado_por uuid not null references personas(id),
  registrado_at timestamptz not null default now(),
  primary key (mentor_id, proyecto_id)
);

create index austral_vinculos_proyecto_idx on austral_vinculos_mentor_proyecto(proyecto_id);

create table austral_solicitudes_contacto (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references personas(id),
  mentor_id uuid not null references personas(id),
  motivo text not null check (length(trim(motivo)) between 10 and 500),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'atendida')),
  created_at timestamptz not null default now()
);

create index austral_solicitudes_estado_idx on austral_solicitudes_contacto(estado, created_at desc);

alter table austral_contactos_mentores enable row level security;
alter table austral_vinculos_mentor_proyecto enable row level security;
alter table austral_solicitudes_contacto enable row level security;

create policy "admin lee contactos" on austral_contactos_mentores
  for select to authenticated using (mi_rol() = 'admin');
create policy "mentor gestiona su contacto" on austral_contactos_mentores
  for all to authenticated
  using (mi_rol() = 'mentor' and mentor_id = (
    select id from personas where lower(email) = lower(auth.jwt() ->> 'email')
  ))
  with check (mi_rol() = 'mentor' and mentor_id = (
    select id from personas where lower(email) = lower(auth.jwt() ->> 'email')
  ));
create policy "alumno ve contactos autorizados" on austral_contactos_mentores
  for select to authenticated using (
    mi_rol() = 'alumno' and publicado and (
      acepta_consultas_otros or exists (
        select 1 from austral_vinculos_mentor_proyecto v
        join proyecto_integrantes i on i.proyecto_id = v.proyecto_id
        join personas p on p.id = i.persona_id
        where v.mentor_id = austral_contactos_mentores.mentor_id
          and lower(p.email) = lower(auth.jwt() ->> 'email')
      )
    )
  );

create policy "admin gestiona vinculos formales" on austral_vinculos_mentor_proyecto
  for all to authenticated using (mi_rol() = 'admin') with check (mi_rol() = 'admin');
create policy "mentor ve sus vinculos" on austral_vinculos_mentor_proyecto
  for select to authenticated using (
    mi_rol() = 'mentor' and mentor_id = (
      select id from personas where lower(email) = lower(auth.jwt() ->> 'email')
    )
  );
create policy "alumno ve vinculos de su equipo" on austral_vinculos_mentor_proyecto
  for select to authenticated using (
    mi_rol() = 'alumno' and exists (
      select 1 from proyecto_integrantes i
      join personas p on p.id = i.persona_id
      where i.proyecto_id = austral_vinculos_mentor_proyecto.proyecto_id
        and lower(p.email) = lower(auth.jwt() ->> 'email')
    )
  );

create policy "admin gestiona solicitudes" on austral_solicitudes_contacto
  for all to authenticated using (mi_rol() = 'admin') with check (mi_rol() = 'admin');
create policy "alumno registra solicitudes propias" on austral_solicitudes_contacto
  for insert to authenticated with check (
    mi_rol() = 'alumno' and estado = 'pendiente' and alumno_id = (
      select id from personas where lower(email) = lower(auth.jwt() ->> 'email')
    ) and exists (
      select 1 from personas where id = mentor_id and rol = 'mentor'
    )
  );
create policy "alumno ve solicitudes propias" on austral_solicitudes_contacto
  for select to authenticated using (
    mi_rol() = 'alumno' and alumno_id = (
      select id from personas where lower(email) = lower(auth.jwt() ->> 'email')
    )
  );
