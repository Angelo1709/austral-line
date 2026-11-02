-- Solo corre en local. Un login de prueba por rol, todos con contraseña austral123:
-- admin@austral.edu.ar · ana@alumnos.austral.edu.ar · marta@empresa.com · julio@empresa.com
create function pg_temp.crear_login(mail text) returns void language sql as $$
  with u as (
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      mail, crypt('austral123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')
    returning id, email
  )
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
  select gen_random_uuid(), id, id, jsonb_build_object('sub', id, 'email', email), 'email', now(), now() from u;
$$;

insert into personas (nombre, email, rol) values
  ('Admin Austral', 'admin@austral.edu.ar', 'admin'),
  ('Ana Alumna', 'ana@alumnos.austral.edu.ar', 'alumno'),
  ('Bruno Alumno', 'bruno@alumnos.austral.edu.ar', 'alumno'),
  ('Marta Mentora', 'marta@empresa.com', 'mentor'),
  ('Julio Jurado', 'julio@empresa.com', 'jurado');

insert into proyectos (nombre, descripcion, estado) values
  ('AgroSense', 'Sensores para riego inteligente', 'publicado'),
  ('Tutorly', 'Marketplace de tutorías', 'borrador');

insert into proyecto_integrantes
  select p.id, pe.id from proyectos p, personas pe
  where (p.nombre, pe.email) in (('AgroSense', 'ana@alumnos.austral.edu.ar'), ('Tutorly', 'bruno@alumnos.austral.edu.ar'));

insert into eventos (nombre, tipo, inicio, lugar) values
  ('Kickoff', 'presentacion', now() + interval '7 days', 'Aula Magna'),
  ('Demo Day', 'final', now() + interval '60 days', 'Auditorio');

select pg_temp.crear_login(email) from personas
  where email in ('admin@austral.edu.ar', 'ana@alumnos.austral.edu.ar', 'marta@empresa.com', 'julio@empresa.com');

-- GRUPO JURADO: un proyecto finalista más para probar la planilla de evaluación.
insert into proyectos (nombre, descripcion, estado) values
  ('Reciclá', 'App que premia a los vecinos por separar residuos', 'finalista');

-- GRUPO JURADO: una segunda jurado con evaluaciones cargadas, para ver el tablero de deliberación.
insert into personas (nombre, email, rol) values ('Lucía Inversora', 'lucia@fondo.com', 'jurado');
select pg_temp.crear_login('lucia@fondo.com');

with ev as (
  insert into jurado_evaluaciones (proyecto_id, jurado_id, propuesta_valor, comentarios)
  select p.id, pe.id, v.propuesta, v.comentario
  from (values
    ('AgroSense', 'Ahorro de agua para productores medianos con sensores baratos', 'Equipo sólido. Falta mostrar tracción con clientes reales.'),
    ('Reciclá', 'Premios por reciclar para que los vecinos separen en origen', 'Buena idea, el modelo de ingresos no queda claro.')
  ) as v(proyecto, propuesta, comentario)
  join proyectos p on p.nombre = v.proyecto
  join personas pe on pe.email = 'lucia@fondo.com'
  returning id, proyecto_id
)
insert into jurado_puntajes (evaluacion_id, criterio_id, puntaje)
select ev.id, c.id,
  case when p.nombre = 'AgroSense' then 9 - c.orden + 1 else 4 + c.orden end
from ev join proyectos p on p.id = ev.proyecto_id cross join jurado_criterios c
where not c.es_base; -- las notas de ejemplo usan los criterios originales, no la lista base

-- GRUPO JURADO: ficha de ejemplo para AgroSense (Reciclá queda sin ficha para ver ese caso).
insert into jurado_fichas (proyecto_id, problema, solucion, propuesta_valor, mercado, modelo_negocio, etapa, traccion, link_presentacion)
select id,
  'Los productores medianos riegan "a ojo" y desperdician hasta 40% del agua.',
  'Sensores de humedad de bajo costo conectados a una app que indica cuándo y cuánto regar.',
  'Ahorro de agua y energía para productores medianos, con un equipo que se paga en una temporada.',
  'Productores frutihortícolas de 10 a 200 hectáreas en Mendoza y San Juan.',
  'Venta del kit de sensores + suscripción mensual por hectárea.',
  'prototipo',
  '3 pilotos en fincas de Maipú; 2 cartas de intención.',
  'https://www.notion.so/agrosense'
from proyectos where nombre = 'AgroSense';

-- GRUPO JURADO: una integrante para Reciclá, así el mail post-evento tiene contactos de todos los equipos.
insert into personas (nombre, email, rol) values ('Carla Alumna', 'carla@alumnos.austral.edu.ar', 'alumno');
insert into proyecto_integrantes
  select p.id, pe.id from proyectos p, personas pe
  where p.nombre = 'Reciclá' and pe.email = 'carla@alumnos.austral.edu.ar';

-- GRUPO JURADO: la evaluación de Lucía a Reciclá es del Kickoff (las dos están en el Salón B).
-- La de AgroSense queda sin evento, como las notas cargadas antes de separar por evento.
update jurado_evaluaciones set evento_id = (select id from eventos where nombre = 'Kickoff')
where proyecto_id = (select id from proyectos where nombre = 'Reciclá')
  and jurado_id = (select id from personas where email = 'lucia@fondo.com');

-- GRUPO JURADO: el Kickoff ya tiene notas, así que queda con los criterios que esas notas usaron (como al migrar datos reales).
-- El Demo Day no tiene criterios todavía: los recibe de la lista base cuando se le arma el primer salón, o desde Criterios.
select jurado_criterios_fijar_usados(id) from eventos where nombre = 'Kickoff';

-- GRUPO JURADO: el Kickoff organizado en dos salones (el Demo Day queda sin organizar para ver ese caso).
insert into jurado_salones (evento_id, nombre, orden)
select e.id, s.nombre, s.orden from eventos e, (values ('Salón A', 1), ('Salón B', 2)) as s(nombre, orden)
where e.nombre = 'Kickoff';

insert into jurado_salon_proyectos (evento_id, salon_id, proyecto_id)
select s.evento_id, s.id, p.id from jurado_salones s
join (values ('Salón A', 'AgroSense'), ('Salón B', 'Reciclá')) as a(salon, proyecto) on a.salon = s.nombre
join proyectos p on p.nombre = a.proyecto;

insert into jurado_salon_jurados (evento_id, salon_id, jurado_id)
select s.evento_id, s.id, pe.id from jurado_salones s
join (values ('Salón A', 'julio@empresa.com'), ('Salón B', 'lucia@fondo.com')) as a(salon, email) on a.salon = s.nombre
join personas pe on pe.email = a.email;

-- GRUPO MENTORES: más mentores en distintos estados (publicado prolijo, publicado con
-- correcciones, borrador abandonado, sin empezar), para que el panel de métricas del admin
-- tenga sentido con más de un caso (con solo Marta todo daba 100%/0.0hs/vacío).
insert into personas (nombre, email, rol) values
  ('Pablo Product', 'pablo@empresa.com', 'mentor'),
  ('Rocío Finanzas', 'rocio@empresa.com', 'mentor'),
  ('Diego Ventas', 'diego@empresa.com', 'mentor'),
  ('Sofía Marketing', 'sofia@empresa.com', 'mentor');
select pg_temp.crear_login(email) from personas
  where email in ('pablo@empresa.com', 'rocio@empresa.com', 'diego@empresa.com', 'sofia@empresa.com');

insert into mentores_perfil (persona_id, empresa, cargo, industria, anios_experiencia, bio, areas_ayuda, linkedin_url, estado, iniciado_at, publicado_at, ediciones_post_publicacion)
select id, 'Mercado Libre', 'Product Manager', 'E-commerce', 6,
  'Lidero equipos de producto en marketplaces desde hace 6 años.',
  'Priorización de producto y research con usuarios.',
  'https://linkedin.com/in/pabloproduct',
  'publicado', now() - interval '3 days', now() - interval '3 days' + interval '40 minutes', 0
from personas where email = 'pablo@empresa.com';

insert into mentores_perfil (persona_id, empresa, cargo, industria, anios_experiencia, bio, areas_ayuda, linkedin_url, estado, iniciado_at, publicado_at, ediciones_post_publicacion)
select id, 'BBVA', 'CFO', 'Finanzas', 10,
  'Ayudo a startups a armar su modelo financiero y a prepararse para levantar capital.',
  'Modelo financiero y ronda de inversión.',
  'https://linkedin.com/in/rociofinanzas',
  'publicado', now() - interval '5 days', now() - interval '5 days' + interval '3 hours', 2
from personas where email = 'rocio@empresa.com';

insert into mentores_perfil (persona_id, texto_original, estado, iniciado_at, updated_at)
select id, 'trabajo en ventas b2b hace años, puedo ayudar con pricing', 'borrador', now() - interval '12 days', now() - interval '12 days'
from personas where email = 'diego@empresa.com';
-- Sofía Marketing queda sin fila en mentores_perfil: es el caso "todavía no empezó".

insert into mentores_perfil_eventos (persona_id, tipo, detalle)
select p.id, 'correccion_ia', jsonb_build_object('campo', 'linkedin_url', 'razon', 'le faltaba https://, se completó solo')
from personas p where p.email in ('pablo@empresa.com', 'rocio@empresa.com');
insert into mentores_perfil_eventos (persona_id, tipo, detalle)
select p.id, 'correccion_ia', jsonb_build_object('campo', 'industria', 'razon', 'no estaba sustentado en lo que escribió; se descartó')
from personas p where p.email = 'rocio@empresa.com';

-- GRUPO MENTORES: reuniones de Marta para probar el resumen pre-reunión. Una pasada con notas y dos próximas
-- (la de Tutorly es la primera y no tiene lugar cargado, para ver cómo muestra lo que falta).
insert into mentores_reuniones (proyecto_id, mentor_id, inicio, lugar, notas, proximos_pasos)
select p.id, m.id, now() + v.cuando, v.lugar, v.notas, v.pasos
from (values
  ('AgroSense', interval '-8 days', 'https://meet.google.com/abc-defg-hij',
    'Revisamos el piloto en Maipú: los sensores andan bien, pero los productores no abren la app todos los días.',
    'Probar alertas por WhatsApp con 2 productores y traer números de uso.'),
  ('AgroSense', interval '3 days', 'https://meet.google.com/abc-defg-hij', null, null),
  ('Tutorly', interval '2 days', null, null, null)
) as v(proyecto, cuando, lugar, notas, pasos)
join proyectos p on p.nombre = v.proyecto
join personas m on m.email = 'marta@empresa.com';

-- GRUPO ALUMNOS: alumnos de prueba con perfil, para probar "Compañeros afines".
-- Logins con contraseña austral123: carla@, diego@ y elena@alumnos.austral.edu.ar. Ana arranca sin perfil.
-- Carla ya la suma el bloque de Jurado (integrante de Reciclá); acá solo se agrega si falta.
insert into personas (nombre, email, rol) values
  ('Carla Alumna', 'carla@alumnos.austral.edu.ar', 'alumno'),
  ('Diego Alumno', 'diego@alumnos.austral.edu.ar', 'alumno'),
  ('Elena Alumna', 'elena@alumnos.austral.edu.ar', 'alumno')
on conflict (email) do nothing;

select pg_temp.crear_login(email) from personas
  where email in ('carla@alumnos.austral.edu.ar', 'diego@alumnos.austral.edu.ar', 'elena@alumnos.austral.edu.ar');

insert into alumnos_perfiles (persona_id, sobre_mi, busca_equipo)
select pe.id, v.sobre_mi, v.busca_equipo
from personas pe join (values
  ('carla@alumnos.austral.edu.ar', 'Me interesa mejorar el acceso a la salud en el interior.', true),
  ('diego@alumnos.austral.edu.ar', 'Vengo de una familia de productores, me gustaría algo de agro.', true),
  ('elena@alumnos.austral.edu.ar', null, true),
  ('bruno@alumnos.austral.edu.ar', 'Ya estoy en Tutorly.', false)
) as v(email, sobre_mi, busca_equipo) on v.email = pe.email;

insert into alumnos_carreras (persona_id, carrera_id)
select pe.id, m.id
from (values
  ('carla@alumnos.austral.edu.ar', 'Marketing'),
  ('diego@alumnos.austral.edu.ar', 'Agronegocios'),
  ('elena@alumnos.austral.edu.ar', 'Administración de Empresas'),
  ('bruno@alumnos.austral.edu.ar', 'Negocios Digitales')
) as v(email, carrera)
join personas pe on pe.email = v.email
join alumnos_carreras_maestro m on m.nombre = v.carrera;

-- Cuánto le interesa a cada uno cada tema (1 a 5 estrellas).
insert into alumnos_intereses (persona_id, interes_id, estrellas)
select pe.id, m.id, v.estrellas
from (values
  ('carla@alumnos.austral.edu.ar', 'Salud', 5), ('carla@alumnos.austral.edu.ar', 'Impacto social', 4),
  ('carla@alumnos.austral.edu.ar', 'Finanzas y fintech', 1), ('carla@alumnos.austral.edu.ar', 'Agro y alimentos', 2),
  ('diego@alumnos.austral.edu.ar', 'Agro y alimentos', 5), ('diego@alumnos.austral.edu.ar', 'Sustentabilidad y ambiente', 4),
  ('diego@alumnos.austral.edu.ar', 'Moda y diseño', 1), ('diego@alumnos.austral.edu.ar', 'Educación', 3),
  ('elena@alumnos.austral.edu.ar', 'Agro y alimentos', 4), ('elena@alumnos.austral.edu.ar', 'Finanzas y fintech', 5),
  ('elena@alumnos.austral.edu.ar', 'Salud', 1), ('elena@alumnos.austral.edu.ar', 'Consumo y retail', 3),
  ('bruno@alumnos.austral.edu.ar', 'Educación', 5), ('bruno@alumnos.austral.edu.ar', 'Tecnología y software', 5),
  ('bruno@alumnos.austral.edu.ar', 'Agro y alimentos', 2), ('bruno@alumnos.austral.edu.ar', 'Salud', 3)
) as v(email, interes, estrellas)
join personas pe on pe.email = v.email
join alumnos_intereses_maestro m on m.nombre = v.interes;

-- GRUPO ALUMNOS: grupos de ejemplo para ver la interdisciplinariedad en "Proyectos".
-- Elena (Administración) se suma a Tutorly con Bruno (Negocios Digitales): interdisciplinario.
-- Carla (Marketing) queda sola en Reciclá: una sola carrera, con sugerencias. Ana (AgroSense) no tiene perfil.
insert into proyecto_integrantes (proyecto_id, persona_id)
select p.id, pe.id from proyectos p, personas pe
where p.nombre = 'Tutorly' and pe.email = 'elena@alumnos.austral.edu.ar'
on conflict do nothing;

-- GRUPO ALUMNOS: ideas de ejemplo para el banco de problemas e ideas.
insert into alumnos_ideas (autor_id, titulo, descripcion, interes_id, estado)
select pe.id, v.titulo, v.descripcion, m.id, v.estado
from (values
  ('admin@austral.edu.ar', 'Trazabilidad para pequeños productores',
    'Los productores chicos no pueden demostrar el origen de lo que venden y pierden acceso a mercados que lo exigen. ¿Cómo darles trazabilidad a bajo costo?',
    'Agro y alimentos', 'disponible'),
  ('diego@alumnos.austral.edu.ar', 'Alquiler de maquinaria agrícola entre vecinos',
    'Muchas máquinas pasan la mayor parte del año paradas. Una plataforma para que productores vecinos se las alquilen entre sí.',
    'Agro y alimentos', 'disponible'),
  ('carla@alumnos.austral.edu.ar', 'Turnos médicos en el interior',
    'En pueblos chicos conseguir un turno con un especialista lleva semanas y viajes. Idea: coordinar visitas de especialistas según la demanda acumulada.',
    'Salud', 'disponible'),
  ('admin@austral.edu.ar', 'Finanzas personales para estudiantes',
    'Los estudiantes que empiezan a trabajar no saben cómo ahorrar o invertir sus primeros sueldos.',
    'Finanzas y fintech', 'tomada')
) as v(email, titulo, descripcion, tema, estado)
join personas pe on pe.email = v.email
join alumnos_intereses_maestro m on m.nombre = v.tema;

insert into alumnos_ideas_interesados (idea_id, persona_id)
select i.id, pe.id
from alumnos_ideas i join personas pe on pe.email in ('elena@alumnos.austral.edu.ar', 'diego@alumnos.austral.edu.ar')
where i.titulo = 'Trazabilidad para pequeños productores';

-- GRUPO ALUMNOS: contexto y una conversación de ejemplo en una idea del banco.
update alumnos_ideas set
  a_quien_le_pasa = 'Productores de menos de 50 hectáreas que venden a acopiadores o en ferias.',
  que_se_intento = 'Certificaciones privadas, pero son caras y piden mucho papeleo.',
  como_seria_resuelto = 'Que un productor pueda mostrar el origen de un lote con el celular, sin pagar una certificación.'
where titulo = 'Trazabilidad para pequeños productores';

with pregunta as (
  insert into alumnos_ideas_mensajes (idea_id, autor_id, texto)
  select i.id, pe.id, '¿Hay algún productor que conozcan para entrevistar?'
  from alumnos_ideas i, personas pe
  where i.titulo = 'Trazabilidad para pequeños productores' and pe.email = 'elena@alumnos.austral.edu.ar'
  returning id, idea_id
)
insert into alumnos_ideas_mensajes (idea_id, autor_id, respuesta_a, texto)
select pregunta.idea_id, pe.id, pregunta.id, 'Sí, mi familia trabaja con varios en San Pedro. Les puedo preguntar.'
from pregunta, personas pe where pe.email = 'diego@alumnos.austral.edu.ar';

-- GRUPO ALUMNOS: un reporte pendiente de ejemplo, para ver la moderación en el Panel de profesores.
insert into alumnos_ideas_reportes (idea_id, persona_id, motivo)
select i.id, pe.id, 'Me parece que repite una idea que ya está en el banco con otro nombre.'
from alumnos_ideas i, personas pe
where i.titulo = 'Finanzas personales para estudiantes' and pe.email = 'carla@alumnos.austral.edu.ar';
