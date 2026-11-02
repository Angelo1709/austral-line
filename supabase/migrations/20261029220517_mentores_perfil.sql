-- GRUPO MENTORES: agente de carga de perfil.
-- El mentor escribe en texto libre y el agente de IA organiza esos datos en campos. El mentor
-- siempre confirma antes de guardar (nunca se pisa un dato existente sin que elija reemplazarlo).

create table mentores_perfil (
  persona_id uuid primary key references personas(id) on delete cascade,
  empresa text,
  cargo text,
  industria text,
  anios_experiencia smallint check (anios_experiencia between 0 and 70),
  bio text,
  areas_ayuda text,
  linkedin_url text,
  texto_original text, -- lo último que escribió el mentor, para poder reorganizarlo de nuevo
  estado text not null default 'borrador' check (estado in ('borrador', 'publicado')),
  iniciado_at timestamptz not null default now(), -- arranca el cronómetro de "tiempo en cargar el perfil"
  publicado_at timestamptz,
  ediciones_post_publicacion smallint not null default 0, -- se incrementa si corrige algo ya publicado
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Historial de lo que hizo el agente: sirve para las métricas (tiempo de carga, autocorrecciones,
-- abandono) y para que el admin vea qué quedó marcado como raro/spam.
create table mentores_perfil_eventos (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas(id) on delete cascade,
  tipo text not null check (tipo in (
    'inicio', 'organizado_ia', 'correccion_ia', 'guardado_borrador', 'publicado', 'marcado_spam'
  )),
  detalle jsonb,
  revisado boolean not null default false, -- el admin lo marca una vez que revisó un 'marcado_spam'
  created_at timestamptz not null default now()
);

alter table mentores_perfil enable row level security;
create policy "admin lee" on mentores_perfil for select to authenticated
  using (mi_rol() = 'admin');
-- Así te van a ver los alumnos cuando elijan mentor: solo lo que ya está publicado.
create policy "alumno lee publicados" on mentores_perfil for select to authenticated
  using (mi_rol() = 'alumno' and estado = 'publicado');
create policy "mentor lo suyo" on mentores_perfil for all to authenticated
  using (mi_rol() = 'mentor' and persona_id = (select id from personas where email = auth.jwt() ->> 'email'))
  with check (mi_rol() = 'mentor' and persona_id = (select id from personas where email = auth.jwt() ->> 'email'));
-- La Server Action valida esto antes de publicar, pero esa validación vive en la app: sin esto el
-- mentor podría llamar a la API de Supabase directo y publicar saltándose la revisión de spam.
-- Policy restrictive: se suma (con AND) a las permissive de arriba, no alcanza con pasar esas.
create policy "no publicar con spam sin revisar (insert)" on mentores_perfil as restrictive for insert to authenticated
  with check (estado <> 'publicado' or not exists (
    select 1 from mentores_perfil_eventos e
    where e.persona_id = mentores_perfil.persona_id and e.tipo = 'marcado_spam' and e.revisado = false
  ));
create policy "no publicar con spam sin revisar (update)" on mentores_perfil as restrictive for update to authenticated
  with check (estado <> 'publicado' or not exists (
    select 1 from mentores_perfil_eventos e
    where e.persona_id = mentores_perfil.persona_id and e.tipo = 'marcado_spam' and e.revisado = false
  ));

alter table mentores_perfil_eventos enable row level security;
create policy "admin lee" on mentores_perfil_eventos for select to authenticated
  using (mi_rol() = 'admin');
create policy "admin marca revisado" on mentores_perfil_eventos for update to authenticated
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');
-- Es un historial: el mentor solo agrega y lee lo suyo, nunca lo edita ni lo borra.
create policy "mentor lee lo suyo" on mentores_perfil_eventos for select to authenticated
  using (mi_rol() = 'mentor' and persona_id = (select id from personas where email = auth.jwt() ->> 'email'));
-- El mentor nunca llama a esto directo: solo pasa por la Server Action del agente, que corre con
-- su sesión (no hay admin client acá). "Marcado_spam" lo agrega esa acción según la heurística y
-- la IA, no algo que el mentor elija, así que no hace falta restringirlo más a nivel de fila.
create policy "mentor carga lo suyo" on mentores_perfil_eventos for insert to authenticated
  with check (mi_rol() = 'mentor' and persona_id = (select id from personas where email = auth.jwt() ->> 'email'));
