/**
 * Crea (o actualiza la contraseña de) un usuario autorizado.
 * Uso: npm run crear-usuario -- <email> <nombre> <contraseña>
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { usuarios } from "../src/db/schema";

async function main() {
  const [email, nombre, password] = process.argv.slice(2);
  if (!email || !nombre || !password) {
    console.error("Uso: npm run crear-usuario -- <email> <nombre> <contraseña>");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("La contraseña debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  const db = drizzle(neon(process.env.DATABASE_URL!));
  const passwordHash = await bcrypt.hash(password, 12);

  await db
    .insert(usuarios)
    .values({ email: email.toLowerCase().trim(), nombre, passwordHash })
    .onConflictDoUpdate({ target: usuarios.email, set: { nombre, passwordHash } });

  console.log(`Usuario ${email} listo.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
