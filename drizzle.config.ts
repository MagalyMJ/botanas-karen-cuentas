import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Lee .env.local (donde `neon checkout` escribe la rama actual) y luego .env. Las variables
// que ya estén definidas en la terminal tienen prioridad, p. ej. para migrar production:
//   DATABASE_URL_UNPOOLED="$(neon cs production)" npm run db:migrate
config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Conexión directa (sin pooler) para migraciones, como recomienda Neon.
  dbCredentials: { url: (process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL)! },
});
