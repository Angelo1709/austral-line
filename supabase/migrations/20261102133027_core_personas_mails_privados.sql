-- CORE: los mails de `personas` dejan de ser públicos para cualquier logueado (#29, punto 2).
-- Regla: el admin ve todos; el resto ve el suyo y los de alumnos y coordinadores (admins).
-- Los mails de mentores y jurados solo los ven el admin y la propia persona.
--
-- Cómo se lee ahora:
--   * "quién soy":        public.mi_persona_id()   (en policies: jurado_id = mi_persona_id())
--   * el mail de alguien:  la vista personas_contacto (email = null si no lo podés ver)
-- La columna `email` ya no se puede leer directo con el rol `authenticated`.

-- 1. Quién soy, sin leer mails (security definer, como mi_rol()).
create function public.mi_persona_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.personas where lower(email) = lower(auth.jwt() ->> 'email')
$$;
revoke execute on function public.mi_persona_id() from public, anon;
grant execute on function public.mi_persona_id() to authenticated;

-- Las tareas sin sesión (src/app/api/cron/) usan la clave de servicio: ven todo, como el admin.
create function public.es_servicio() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'service_role'
$$;

-- 2. Vista con el mail filtrado según la regla. Corre como su dueño (no como el usuario), por eso repite
--    el filtro de la policy "leer con rol" de personas. Se puede embeber igual que personas:
--    personas:personas_contacto(nombre, email)
create view public.personas_contacto with (security_invoker = false, security_barrier = true) as
  select p.id, p.nombre, p.rol,
    case
      when public.mi_rol() = 'admin' or public.es_servicio() or p.id = public.mi_persona_id() or p.rol in ('alumno', 'admin') then p.email
    end as email
  from public.personas p
  where public.mi_rol() is not null or public.es_servicio();
revoke all on public.personas_contacto from public, anon;
grant select on public.personas_contacto to authenticated, service_role;

-- 3. Las policies y funciones de los grupos que buscaban "mi persona" comparando el mail del login
--    pasan a comparar el id con mi_persona_id(). Mismo resultado, sin leer la columna email.
do $$
declare
  r record;
  q text;
  c text;
  def text;
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check from pg_policies
    where coalesce(qual, '') || coalesce(with_check, '') ~ 'auth\.jwt\(\) ->> ''email'''
  loop
    q := regexp_replace(r.qual, 'lower\((\w+)\.email\) = lower\(\(auth\.jwt\(\) ->> ''email''::text\)\)', '\1.id = public.mi_persona_id()', 'g');
    q := regexp_replace(q, '(\w+)\.email = \(auth\.jwt\(\) ->> ''email''::text\)', '\1.id = public.mi_persona_id()', 'g');
    c := regexp_replace(r.with_check, 'lower\((\w+)\.email\) = lower\(\(auth\.jwt\(\) ->> ''email''::text\)\)', '\1.id = public.mi_persona_id()', 'g');
    c := regexp_replace(c, '(\w+)\.email = \(auth\.jwt\(\) ->> ''email''::text\)', '\1.id = public.mi_persona_id()', 'g');
    execute format('alter policy %I on %I.%I', r.policyname, r.schemaname, r.tablename)
      || coalesce(' using (' || q || ')', '')
      || coalesce(' with check (' || c || ')', '');
  end loop;

  -- Solo las security invoker: las security definer corren como dueño y siguen leyendo el mail sin problema.
  for r in
    select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and not p.prosecdef and p.prosrc ~ 'auth\.jwt\(\)\s*->>\s*''email'''
  loop
    def := pg_get_functiondef(r.oid);
    def := regexp_replace(def, 'lower\((\m\w+\.)?\memail\)\s*=\s*lower\(\s*auth\.jwt\(\)\s*->>\s*''email''\s*\)', '\1id = public.mi_persona_id()', 'g');
    def := regexp_replace(def, '(\m\w+\.)?\memail\s*=\s*auth\.jwt\(\)\s*->>\s*''email''', '\1id = public.mi_persona_id()', 'g');
    execute def;
  end loop;

  -- Si quedó alguna forma que no reconocimos, mejor fallar acá que en producción.
  if exists (select 1 from pg_policies where coalesce(qual, '') || coalesce(with_check, '') ~ 'auth\.jwt\(\) ->> ''email''') then
    raise exception 'Quedaron policies comparando el mail del login: revisalas a mano';
  end if;
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and not p.prosecdef and p.prosrc ~ 'auth\.jwt\(\)\s*->>\s*''email'''
  ) then
    raise exception 'Quedaron funciones comparando el mail del login: revisalas a mano';
  end if;
end $$;

-- 4. La columna email deja de leerse directo. El resto de las columnas, igual que antes.
revoke select on public.personas from anon, authenticated;
grant select (id, nombre, rol, created_at) on public.personas to authenticated;
