import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { authConfig } from "@/auth.config";

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

/** Verificación de sesión para páginas y Server Actions (el proxy es solo una verificación optimista). */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  return session.user;
}
