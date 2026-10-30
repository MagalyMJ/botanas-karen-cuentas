import "server-only";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import { sembrar } from "./semilla";

/**
 * Base de datos local para desarrollo sin Neon: Postgres (PGlite) embebido en el
 * proceso, persistido en `.pglite/`. En cada arranque sincroniza el esquema de
 * `schema.ts` (sin migraciones), así que se puede cambiar el esquema libremente.
 * Para empezar de cero: `npm run db:local:reset`.
 */
export async function crearDbLocal() {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { pushSchema } = await import("drizzle-kit/api");

  const client = new PGlite(process.env.PGLITE_DIR ?? ".pglite");
  const db = drizzle(client, { schema });

  const push = await pushSchema(schema, drizzle(client));
  if (push.statementsToExecute.length > 0) {
    for (const w of push.warnings) console.warn(`[db local] ${w}`);
    await push.apply();
    console.log(`[db local] esquema sincronizado (${push.statementsToExecute.length} cambios)`);
  }

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.usuarios);
  if (n === 0) console.log(`[db local] ${await sembrar(db)}`);

  return db;
}
