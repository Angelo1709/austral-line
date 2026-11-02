-- MENTORES: agente de match proyecto–mentor. Los perfiles los lee de mentores_perfil (agente de carga de perfil).
-- El agente solo sugiere (hasta 3 por pedido); el coordinador (admin) acepta o rechaza.

-- Cada vez que el coordinador le pide sugerencias al agente para un proyecto.
create table mentores_match_pedidos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references proyectos(id) on delete cascade,
  pedido_por uuid references personas(id) on delete set null,
  aviso text, -- el agente no encontró un buen match o vio datos raros: alerta para el coordinador
  alerta_revisada_at timestamptz, -- null = alerta sin revisar
  alerta_revisada_por uuid references personas(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Lo único que escribe el agente. Una sugerencia aceptada = mentor asignado al proyecto.
-- 'quitada' = estuvo asignado y el coordinador lo sacó después (métrica "hubo que cambiar mentor").
create table mentores_sugerencias (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references mentores_match_pedidos(id) on delete cascade,
  proyecto_id uuid not null references proyectos(id) on delete cascade,
  mentor_id uuid not null references personas(id) on delete cascade,
  afinidad int not null check (afinidad between 0 and 100),
  motivo text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'rechazada', 'quitada')),
  decidido_por uuid references personas(id) on delete set null,
  decidido_at timestamptz,
  quitado_por uuid references personas(id) on delete set null,
  quitado_at timestamptz,
  motivo_quitado text,
  minutos_ahorrados int, -- al aceptar: tiempo de buscarlo a mano (60 min) menos lo que tardó con el agente
  satisfaccion int check (satisfaccion between 1 and 5), -- estrellas que pone el coordinador al match
  opinion text,
  calificado_por uuid references personas(id) on delete set null,
  calificado_at timestamptz,
  created_at timestamptz not null default now()
);

-- Pedidos y sugerencias: solo el coordinador (admin).
alter table mentores_match_pedidos enable row level security;
create policy "admin todo" on mentores_match_pedidos for all to authenticated
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');

alter table mentores_sugerencias enable row level security;
create policy "admin todo" on mentores_sugerencias for all to authenticated
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');
