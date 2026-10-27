/**
 * Crea (o actualiza) un usuario autorizado.
 * Uso: npm run crear-usuario -- <email> <nombre> <contraseña> <rol> [id-del-contacto]
 *
 * Roles: administrador, editor, consulta, contacto.
 * El rol contacto necesita el id del contacto ligado (el número en /contactos/<id>).
 */
import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { contactos, rolUsuario, usuarios, type RolUsuario } from "../src/db/schema";

const USO =
  "Uso: npm run crear-usuario -- <email> <nombre> <contraseña> <rol> [id-del-contacto]\n" +
  `Roles: ${rolUsuario.enumValues.join(", ")}`;

function salir(mensaje: string): never {
  console.error(mensaje);
  process.exit(1);
}

function esRol(valor: string): valor is RolUsuario {
  return (rolUsuario.enumValues as readonly string[]).includes(valor);
}

// Igual que drizzle.config.ts: .env.local (rama de `neon checkout`) y luego .env; lo que
// ya esté en la terminal tiene prioridad (p. ej. DATABASE_URL="$(neon cs production) …").
config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const [email, nombre, password, rol, contactoArg] = process.argv.slice(2);
  if (!email || !nombre || !password || !rol) salir(USO);
  if (password.length < 8) salir("La contraseña debe tener al menos 8 caracteres.");
  if (!esRol(rol)) salir(`Rol inválido: "${rol}".\n${USO}`);

  let contactoId: number | null = null;
  if (rol === "contacto") {
    contactoId = Number(contactoArg);
    if (!Number.isInteger(contactoId) || contactoId <= 0) {
      salir("El rol contacto necesita el id del contacto (el número en /contactos/<id>).");
    }
  } else if (contactoArg) {
    salir(`El rol ${rol} ve todo; no se liga a un contacto.`);
  }

  if (!process.env.DATABASE_URL) salir("Falta DATABASE_URL (en .env.local, .env o la terminal).");
  const db = drizzle(neon(process.env.DATABASE_URL));

  let contactoNombre = "";
  if (contactoId !== null) {
    const [contacto] = await db
      .select({ nombre: contactos.nombre, tipo: contactos.tipo })
      .from(contactos)
      .where(eq(contactos.id, contactoId));
    if (!contacto) salir(`No existe el contacto ${contactoId}.`);
    contactoNombre = ` ligado a ${contacto.nombre} (${contacto.tipo})`;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db
    .insert(usuarios)
    .values({ email: email.toLowerCase().trim(), nombre, passwordHash, rol, contactoId })
    .onConflictDoUpdate({ target: usuarios.email, set: { nombre, passwordHash, rol, contactoId } });

  console.log(`Usuario ${email} listo: ${rol}${contactoNombre}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
