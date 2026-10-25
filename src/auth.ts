import { cache } from "react";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { authConfig } from "@/auth.config";
import { puedeEditar } from "@/lib/permisos";

const credencialesSchema = z.object({
  email: z.email().transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credencialesSchema.safeParse(raw);
        if (!parsed.success) return null;

        const [usuario] = await db
          .select()
          .from(usuarios)
          .where(eq(usuarios.email, parsed.data.email))
          .limit(1);
        if (!usuario) return null;

        const ok = await bcrypt.compare(parsed.data.password, usuario.passwordHash);
        if (!ok) return null;

        return { id: String(usuario.id), email: usuario.email, name: usuario.nombre };
      },
    }),
  ],
});

/**
 * Usuario de la sesión, leído de la base de datos en cada petición (una vez por petición
 * gracias a `cache`), para que un cambio de rol o un usuario borrado apliquen de inmediato.
 * Verificación real para páginas, consultas y Server Actions; el proxy es solo optimista.
 */
export const requireUser = cache(async () => {
  const session = await auth();
  const id = Number(session?.user?.id);
  if (!Number.isInteger(id)) throw new Error("No autorizado");
  const [usuario] = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      rol: usuarios.rol,
      contactoId: usuarios.contactoId,
    })
    .from(usuarios)
    .where(eq(usuarios.id, id))
    .limit(1);
  if (!usuario) throw new Error("No autorizado");
  return usuario;
});

/** Igual que `requireUser`, pero exige permiso para modificar datos. */
export async function requireEditor() {
  const usuario = await requireUser();
  if (!puedeEditar(usuario.rol)) throw new Error("No tienes permiso para modificar datos");
  return usuario;
}
