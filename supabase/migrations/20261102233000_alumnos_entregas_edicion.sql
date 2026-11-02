-- GRUPO ALUMNOS: corregir una entrega hasta el cierre.
-- Los profesores fijan, en cada hito, la fecha y hora de cierre de la entrega (si no la fijan, cierra a la
-- fecha y hora del hito). Hasta el cierre, los alumnos pueden borrar una versión o corregir su nota:
--   * la del grupo, cualquier integrante; la individual, solo su dueño;
--   * nunca si ya tiene una devolución de los profesores o del mentor (para no perder lo que comentaron).
-- Después del cierre todas las versiones quedan fijas. Para cambiar el archivo se borra y se sube otro.

-- Cierre de la entrega de cada hito (va junto al tipo de entrega que ya eligen los profesores).
alter table alumnos_hitos_tipo add column cierre timestamptz;

create function public.alumnos_cierre_hito(p_evento uuid) returns timestamptz
language sql stable security invoker set search_path = public as $$
  select coalesce(
    (select cierre from alumnos_hitos_tipo where evento_id = p_evento),
    (select inicio from eventos where id = p_evento)
  )
$$;

-- ¿Puedo borrar o corregir esta versión? Security definer para poder mirar si tiene devoluciones (el alumno
-- no ve las de otros) sin abrirle nada más: solo devuelve sí o no.
create function public.alumnos_entrega_editable(p_entrega uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select mi_rol() = 'alumno' and exists (
    select 1 from alumnos_entregas e
    where e.id = p_entrega
      and (
        (e.proyecto_id is not null and alumnos_soy_integrante(e.proyecto_id::text))
        or (e.proyecto_id is null and e.persona_id = mi_persona_id())
      )
      and now() < alumnos_cierre_hito(e.evento_id)
      and not exists (select 1 from alumnos_entregas_devoluciones d where d.entrega_id = e.id)
  )
$$;

-- Borrar la versión (la fila). El archivo se borra antes, con la regla de storage de abajo.
create policy "alumno borra hasta el cierre" on alumnos_entregas for delete to authenticated
  using (alumnos_entrega_editable(id));

-- Corregir la nota: solo cambia la nota, nada más de la versión.
create function public.alumnos_editar_nota_entrega(p_entrega uuid, p_nota text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not alumnos_entrega_editable(p_entrega) then
    raise exception 'Esta versión ya no se puede corregir: pasó el cierre o ya tiene una devolución.';
  end if;
  update alumnos_entregas set nota = nullif(left(btrim(p_nota), 500), '') where id = p_entrega;
end;
$$;

-- El archivo de una versión que todavía se puede borrar.
create policy "alumnos-entregas: alumno borra hasta el cierre" on storage.objects for delete to authenticated
  using (
    bucket_id = 'alumnos-entregas'
    and mi_rol() = 'alumno'
    and exists (select 1 from public.alumnos_entregas e where e.archivo_path = objects.name and public.alumnos_entrega_editable(e.id))
  );

revoke execute on function public.alumnos_cierre_hito(uuid), public.alumnos_entrega_editable(uuid),
  public.alumnos_editar_nota_entrega(uuid, text) from public, anon;
grant execute on function public.alumnos_cierre_hito(uuid), public.alumnos_entrega_editable(uuid),
  public.alumnos_editar_nota_entrega(uuid, text) to authenticated;
