/**
 * Borra todos los datos de la rama development de Neon y la llena con los datos de ejemplo
 * (los mismos de la base local PGlite). Uso: npm run db:sembrar
 *
 * Seguridad: solo corre si .env.local apunta a la rama development. Toma DATABASE_URL y
 * NEON_BRANCH de .env.local aunque estén definidas en la terminal, para que la conexión y el
 * nombre de la rama vengan del mismo lugar (`neon checkout` escribe los dos juntos).
 */
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";
import { sembrar } from "../src/db/semilla";

const RAMA_PERMITIDA = "development";

async function main() {
  const { parsed } = config({ path: ".env.local", quiet: true });
  const url = parsed?.DATABASE_URL;
  const rama = parsed?.NEON_BRANCH;
  if (!url || rama !== RAMA_PERMITIDA) {
    console.error(
      `Solo se puede sembrar la rama "${RAMA_PERMITIDA}" y .env.local apunta a "${rama ?? "ninguna"}".\n` +
        `Para cambiar de rama: neon checkout ${RAMA_PERMITIDA}`,
    );
    process.exit(1);
  }

  const db = drizzle(neon(url), { schema });
  // Vacía todas las tablas de la app (no la de migraciones) y reinicia los ids.
  await db.execute(sql`
    TRUNCATE observaciones, ajustes, nota_lineas, pagos, notas, usuarios, contactos
    RESTART IDENTITY CASCADE
  `);
  console.log(`[${rama}] ${await sembrar(db)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
