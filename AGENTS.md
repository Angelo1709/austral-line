# Emprendimientos Austral — reglas para el agente

Panel admin de la materia de Emprendimientos de la Universidad Austral: proyectos de alumnos,
mentores, jurado, votaciones y eventos del concurso. Quienes te piden cambios son alumnos
**no programadores**: explicales en términos de negocio, vos te encargás del código.

Stack: Next.js 16 (App Router, `cacheComponents`) · Supabase (Postgres + Auth) · shadcn/ui con estética Midday · AI SDK + Vercel AI Gateway.

## Los 4 grupos y qué es de cada uno

| Grupo    | Carpeta de páginas              | Prefijo de tablas |
|----------|---------------------------------|-------------------|
| Alumnos  | `src/app/(dashboard)/alumnos/`  | `alumnos_`        |
| Mentores | `src/app/(dashboard)/mentores/` | `mentores_`       |
| Jurado   | `src/app/(dashboard)/jurado/`   | `jurado_`         |
| Austral  | `src/app/(dashboard)/austral/`  | `austral_`        |

**Antes de cambiar algo, preguntale al alumno de qué grupo es si no lo sabés.** Solo tocá la
carpeta y las tablas de ese grupo. Componentes propios del grupo van dentro de su carpeta
(por ejemplo `src/app/(dashboard)/jurado/_components/`).

**CORE (no se toca, es de todos):** las tablas `personas`, `proyectos`, `proyecto_integrantes`
y `eventos`, la función `mi_rol()`, la sección `src/app/(dashboard)/miembros/`, más `src/lib/`
(salvo agregar tu sección en `secciones.ts`), `src/components/`, `src/proxy.ts`,
`supabase/config.toml` y las migraciones de otros grupos.

## Roles

Hay 4 roles: `admin`, `alumno`, `mentor` y `jurado`. El rol de cada usuario sale de su fila en
`personas` (se busca por el email con el que entra). Los admins suman miembros desde **Miembros**;
no hay registro público.

- Cada sección declara quién la ve en `src/lib/secciones.ts` (`roles: [...]`). El admin ve todo.
- Cada carpeta de sección tiene un `layout.tsx` con `await requireRol("jurado")`, que manda al inicio a quien no corresponde. Si creás una subsección nueva, queda protegida por ese layout.
- En el código: `const { persona } = await getUsuario()` (de `@/lib/auth`) devuelve `{ id, nombre, rol }` del usuario logueado. Usá `persona.id` para guardar "quién hizo esto" (por ejemplo, el jurado que votó).
- Logins de prueba en local (contraseña `austral123`): `admin@austral.edu.ar`, `ana@alumnos.austral.edu.ar` (alumno), `marta@empresa.com` (mentor), `julio@empresa.com` (jurado). Si el alumno necesita cambiar algo del core, no lo hagas:
redactale un issue para el profe explicando qué campo necesita y para qué.

## Base de datos: cómo se cambia

Nunca cambies tablas desde el dashboard de Supabase. Todo cambio es una migración en el repo:

1. `npm run db:nueva <grupo>_<que_hace>`, por ejemplo `npm run db:nueva jurado_votos`
2. Escribí el SQL en el archivo que se creó en `supabase/migrations/`
3. `npm run db:reset` (recrea la base local con todas las migraciones + `seed.sql`)
4. `npm run db:types` (regenera `src/lib/database.types.ts`, que **se commitea**)

Reglas:
- Tablas nuevas siempre con el prefijo del grupo. Para referenciar el core, usá FK a `personas(id)` / `proyectos(id)` / `eventos(id)`.
- **Solo cambios que suman:** crear tablas, o agregar columnas con default o nullable. Nunca `drop`, `rename` ni cambiar el tipo de una columna que ya está en `main`; para eso hace falta pedirle al profe.
- Nunca edites una migración que ya está en `main`. Si te equivocaste, hacé una nueva.
- Toda tabla nueva lleva RLS según el rol, con `mi_rol()`. Ejemplo: el jurado carga y ve sus votos, el admin ve todo:
  ```sql
  alter table jurado_votos enable row level security;
  create policy "admin todo" on jurado_votos for all to authenticated
    using (mi_rol() = 'admin') with check (mi_rol() = 'admin');
  create policy "jurado lo suyo" on jurado_votos for all to authenticated
    using (mi_rol() = 'jurado' and jurado_id = (select id from personas where email = auth.jwt() ->> 'email'))
    with check (mi_rol() = 'jurado' and jurado_id = (select id from personas where email = auth.jwt() ->> 'email'));
  ```
- Si hace falta data de prueba, agregala al final de `supabase/seed.sql` con un comentario del grupo.

## Código

- Leer y escribir datos: Server Components y Server Actions con `createClient()` de `@/lib/supabase/server`. Tipado con `database.types.ts`; si un tipo no existe, faltó correr `npm run db:types`.
- `cacheComponents` está activo: lo que lee cookies o la base va dentro de un `<Suspense>` (el layout del dashboard ya envuelve las páginas).
- Nunca uses `createAdminClient()` (salta todos los permisos) fuera de la sección Miembros (la única otra excepción es `src/app/api/cron/`, del core).
- IA: AI SDK con el gateway, pasando el modelo como string (`import { generateText } from "ai"; generateText({ model: "anthropic/claude-sonnet-5.5", prompt })`). Usa `AI_GATEWAY_API_KEY`. Los modelos disponibles están en https://vercel.com/ai-gateway/models

## Diseño: estilo Midday

Referencia: https://github.com/midday-ai/midday (`apps/dashboard/src/components/`). Clonalo y copiá de ahí los patrones (tablas, sheets, formularios, empty states).
- Usá los tokens (`bg-background`, `bg-card`, `border`, `text-primary`, gris secundario `text-[#666]`). Nada de colores sueltos.
- Esquinas rectas (`--radius: 0`), bordes finos, mucho aire. Títulos y números grandes con `font-serif`; el resto con la sans (Hedvig).
- Componentes base: `npx shadcn@latest add <componente>`. No modifiques `src/components/ui/`.
- Para sumar una sección al menú: agregala a `secciones` en `src/lib/secciones.ts`, con sus roles.

## Antes de abrir el PR

- `npm run build` tiene que pasar. Si falla en código de otro grupo, probablemente rompiste algo del core o una tabla ajena: revertí ese cambio.
- Un PR = una funcionalidad chica. Completá el template del PR en lenguaje de negocio.
- Ramas: `<grupo>/<funcionalidad>`, por ejemplo `jurado/votacion-final`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
