# Cuentas — Botanas Karen

App web privada (mobile-first / PWA) para llevar las cuentas con clientes, proveedores y empleados: notas por cobrar o por pagar y sus pagos.

**Stack:** Next.js 16 (App Router, Server Actions) · Neon Postgres · Drizzle ORM · Auth.js v5 (credenciales) · Tailwind CSS 4 + shadcn/ui · Zod.

## Probar sin base de datos (modo local)

Si no defines `DATABASE_URL`, la app usa un Postgres embebido ([PGlite](https://pglite.dev))
guardado en `.pglite/`. No necesitas Neon, migraciones ni seeds:

```bash
npm install
npx auth secret   # crea AUTH_SECRET en .env.local
npm run dev
```

- Entra con **demo@ejemplo.com / demo1234** (administrador; se crea junto con datos de ejemplo la primera vez).
  Para probar los demás roles, con la misma contraseña: `editor@ejemplo.com`, `consulta@ejemplo.com`,
  `cliente@ejemplo.com` (ligado a Tienda Don Pepe) y `empleado@ejemplo.com` (ligado a Luis).
- Al arrancar, el esquema de `src/db/schema.ts` se sincroniza solo: puedes cambiarlo libremente.
- `npm run dev:fresh` borra la base local y arranca con datos de ejemplo nuevos (o `npm run db:local:reset` solo para borrarla).
- En Vercel siempre se exige `DATABASE_URL`; el modo local nunca se usa en producción.

## Configuración con Neon

El proyecto está ligado a Neon con el [CLI de Neon](https://neon.com/docs/reference/neon-cli)
(`neon.ts` y `.neon`). Hay dos ramas de la base:

| rama | para qué | dónde se usa |
| --- | --- | --- |
| `production` | datos reales | la app desplegada (Vercel) |
| `development` | pruebas en tu computadora | `npm run dev` (vía `.env.local`) |

`neon checkout <rama>` escribe en `.env.local` la conexión de esa rama (`DATABASE_URL`,
`DATABASE_URL_UNPOOLED`, `NEON_BRANCH`). `npm run db:migrate` y `npm run crear-usuario` leen
`.env.local` y luego `.env`; una variable definida en la terminal tiene prioridad.

Primera vez en una computadora nueva:

```bash
npm install
npm i -g neon@latest && neon login
neon checkout development      # escribe la conexión de development en .env.local
npx auth secret                # agrega AUTH_SECRET a .env.local
npm run dev                    # entra con demo@ejemplo.com / demo1234 (solo existe en development)
```

Cambios de esquema (después de editar `src/db/schema.ts` y correr `npm run db:generate`):

```bash
npm run db:migrate                                              # rama development
DATABASE_URL_UNPOOLED="$(neon cs production)" npm run db:migrate # rama production
```

Usuarios (no hay registro público). Sin variable en la terminal se crean en `development`:

```bash
DATABASE_URL="$(neon cs production --pooled)" \
  npm run crear-usuario -- karen@ejemplo.com "Karen" "una-contraseña-segura" administrador
DATABASE_URL="$(neon cs production --pooled)" \
  npm run crear-usuario -- pepe@ejemplo.com "Don Pepe" "otra-contraseña" contacto 5
```

El rol `contacto` necesita el id del contacto ligado (el número en `/contactos/<id>`).
Ejecutarlo de nuevo con el mismo correo cambia la contraseña, el rol y el contacto ligado.

Las ramas nuevas que no sean `development` expiran a los 7 días (política en `neon.ts`), útil
para pruebas desechables: `neon branches create --name prueba --parent production`.

Para volver a la base local sin Neon (PGlite), quita `DATABASE_URL` de `.env.local`.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run db:generate` | Genera una migración tras cambiar `src/db/schema.ts` |
| `npm run db:migrate` | Aplica migraciones pendientes |
| `npm run db:studio` | Explorador visual de la base de datos |
| `npm run crear-usuario` | Crea/actualiza un usuario (rama de `.env.local`, o la de `DATABASE_URL` en la terminal) |
| `npm run db:local:reset` | Borra la base local de desarrollo |
| `npm test` | Corre los tests (`npm run test:watch` los repite al guardar) |

## Tests

`npm test` corre los tests de `tests/` con [Vitest](https://vitest.dev). Cada test usa una base
PGlite nueva en memoria con las migraciones reales de `drizzle/`; no se toca la base local ni Neon.
La sesión y las funciones de Next (`revalidatePath`, `redirect`) se fingen en `tests/setup.ts`, así
que las Server Actions y consultas se prueban tal cual, con el rol que elija cada test
(`comoUsuario`). `esperarSaldosCuadrados()` comprueba que el saldo guardado de cada nota coincida con
monto original + correcciones − pagos.

## Despliegue en Vercel

1. Importa el repositorio en Vercel.
2. Agrega en *Settings → Environment Variables*:
   - `DATABASE_URL`: la conexión con pooler de la rama production (`neon cs production --pooled`).
   - `AUTH_SECRET`: uno nuevo para producción (`npx auth secret --raw` u `openssl rand -base64 32`).
3. Antes de desplegar un cambio de esquema, aplica sus migraciones a production
   (ver *Configuración con Neon*).

## Lógica de negocio

- **Sin intereses:** al crear una nota, `saldo_pendiente = monto_original`.
- **Tablas:** `usuarios`, `contactos` (tipo `cliente`, `proveedor` o `empleado`), `notas`, `pagos`,
  `nota_lineas` y `ajustes`.
- **Tipo de nota:** `por_cobrar` (el contacto nos debe) o `por_pagar` (le debemos, p. ej. un proveedor).
  Los montos de notas y pagos siempre son positivos; el **total por contacto** es
  lo que nos deben menos lo que debemos, y puede ser negativo.
- **Pagos atómicos:** `registrarPago` (`src/lib/actions.ts`) ejecuta una sola sentencia SQL que
  descuenta el saldo, marca la nota como `pagado` cuando el saldo llega a 0 e inserta el pago.
  No se permite pagar más que el saldo (la base de datos también lo impide con un `CHECK`).
- **Detalle** (`nota_lineas`): renglones opcionales de texto libre (descripción, cantidad, precio).
  Son informativos: no cambian el monto ni el saldo, y se pueden agregar después de crear la nota.
- **Correcciones** (`ajustes`): la nota original nunca se edita. Una corrección guarda la diferencia
  (positiva o negativa) y su motivo, y en la misma sentencia mueve `saldo_pendiente` y
  `ajustes_total`. Monto vigente = `monto_original + ajustes_total`. Una corrección no puede dejar
  el saldo en negativo; si sube el monto de una nota pagada, la reabre.
- **Roles** (`usuarios.rol`): `administrador` y `editor` ven y modifican todo; `consulta` ve todo
  sin modificar; `contacto` solo ve lo suyo (el cliente, proveedor o empleado en `usuarios.contacto_id`).
  Los permisos se revisan en el servidor (`src/lib/permisos.ts`): las consultas de `src/lib/queries.ts`
  filtran por contacto y las Server Actions exigen `requireEditor()`.
- **Seguridad:** `src/proxy.ts` redirige a `/login` sin sesión; además cada página (vía el layout)
  y cada Server Action verifican la sesión en el servidor.

## Estructura

```
src/
  app/(app)/          páginas protegidas: inicio, /contactos, /notas
  app/login/          inicio de sesión
  app/manifest.ts     manifiesto PWA (+ icon.tsx / apple-icon.tsx)
  auth.ts             Auth.js (proveedor de credenciales)
  db/schema.ts        esquema Drizzle
  lib/actions.ts      Server Actions
  lib/queries.ts      consultas de lectura
  lib/validaciones.ts esquemas Zod
drizzle/              migraciones SQL
scripts/              crear-usuario.ts
```
