-- Austral: registro de participacion y propuestas conceptuales para mentores y jurados.
create table austral_participaciones (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas(id),
  evento_id uuid references eventos(id),
  fecha date not null,
  actividad text not null check (char_length(actividad) between 3 and 500),
  creado_por uuid not null references personas(id),
  created_at timestamptz not null default now()
);

create index austral_participaciones_persona_fecha_idx
  on austral_participaciones (persona_id, fecha desc);

alter table austral_participaciones enable row level security;
create policy "admin gestiona participaciones" on austral_participaciones
  for all to authenticated
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');

create table austral_propuestas_incentivos (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas(id),
  categoria text not null check (categoria in ('comida', 'formacion', 'economico', 'otro')),
  alternativa text not null check (char_length(alternativa) between 3 and 200),
  fundamento text not null check (char_length(fundamento) between 10 and 2000),
  participaciones_consideradas integer not null check (participaciones_consideradas > 0),
  estado text not null default 'en_estudio' check (estado in ('en_estudio', 'descartada')),
  creado_por uuid not null references personas(id),
  created_at timestamptz not null default now()
);

create index austral_propuestas_incentivos_created_at_idx
  on austral_propuestas_incentivos (created_at desc);

alter table austral_propuestas_incentivos enable row level security;
create policy "admin gestiona propuestas" on austral_propuestas_incentivos
  for all to authenticated
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');
