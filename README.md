# Cuentas — Botanas Karen

App web privada (mobile-first / PWA) para administrar clientes, préstamos y cobros.

**Stack:** Next.js 16 (App Router, Server Actions) · Neon Postgres · Drizzle ORM · Auth.js v5 (credenciales) · Tailwind CSS 4 + shadcn/ui · Zod.

## Configuración local

1. Crea una base de datos en [Neon](https://neon.tech) y copia la cadena de conexión.
2. Copia `.env.example` a `.env.local` **y** a `.env` (drizzle-kit y los scripts leen `.env`) y llena:
   - `DATABASE_URL`: cadena de conexión de Neon.
   - `AUTH_SECRET`: genera uno con `npx auth secret` u `openssl rand -base64 32`.
3. Instala dependencias y crea las tablas:
   ```bash
   npm install
   npm run db:migrate
   ```
4. Crea un usuario autorizado (no hay registro público):
   ```bash
   npm run crear-usuario -- karen@ejemplo.com "Karen" "una-contraseña-segura"
   ```
   Ejecutarlo de nuevo con el mismo correo cambia la contraseña.
5. `npm run dev` y abre http://localhost:3000.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run db:generate` | Genera una migración tras cambiar `src/db/schema.ts` |
| `npm run db:migrate` | Aplica migraciones pendientes |
| `npm run db:studio` | Explorador visual de la base de datos |
| `npm run crear-usuario` | Crea/actualiza un usuario |

## Despliegue en Vercel

1. Importa el repositorio en Vercel.
2. Agrega `DATABASE_URL` y `AUTH_SECRET` en *Settings → Environment Variables*
   (o conecta la integración de Neon, que define `DATABASE_URL`).
3. Aplica las migraciones contra la base de producción con `npm run db:migrate` desde tu máquina.

## Lógica de negocio

- **Sin intereses:** al crear una nota, `saldo_pendiente = monto_original`.
- **Tipo de nota:** `por_cobrar` (el contacto nos debe) o `por_pagar` (le debemos, p. ej. un proveedor).
  Los montos de notas y pagos siempre son positivos; el **total por contacto** es
  lo que nos deben menos lo que debemos, y puede ser negativo.
- **Pagos atómicos:** `registrarPago` (`src/lib/actions.ts`) ejecuta una sola sentencia SQL que
  descuenta el saldo, marca la nota como `pagado` cuando el saldo llega a 0 e inserta el pago.
  No se permite pagar más que el saldo (la base de datos también lo impide con un `CHECK`).
- **Seguridad:** `src/proxy.ts` redirige a `/login` sin sesión; además cada página (vía el layout)
  y cada Server Action verifican la sesión en el servidor.

## Estructura

```
src/
  app/(app)/          páginas protegidas: inicio, clientes, préstamos
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
