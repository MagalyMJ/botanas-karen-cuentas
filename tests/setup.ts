import { beforeEach, vi } from "vitest";
import { crearBaseDePrueba, entorno } from "./entorno";

// Base de datos real (PGlite en memoria) en lugar de Neon. Se lee en cada acceso para
// que cada test use la base nueva que crea `beforeEach`.
vi.mock("@/db", async () => {
  const { entorno } = await import("./entorno");
  return {
    get db() {
      return entorno.db;
    },
  };
});

// Sesión fingida: `auth()` devuelve el usuario que el test eligió con `comoUsuario`.
// El resto de src/auth.ts (leer el rol de la base, requireEditor) es el código real.
vi.mock("next-auth", async () => {
  const { entorno } = await import("./entorno");
  return {
    default: () => ({
      auth: async () => (entorno.usuarioId === null ? null : { user: { id: String(entorno.usuarioId) } }),
      handlers: {},
      signIn: vi.fn(),
      signOut: vi.fn(),
    }),
    AuthError: class AuthError extends Error {},
  };
});
vi.mock("next-auth/providers/credentials", () => ({ default: () => ({}) }));

// Funciones de Next que solo tienen sentido con la app corriendo.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", async () => {
  const { Redireccion } = await import("./entorno");
  return {
    redirect: (url: string) => {
      throw new Redireccion(url);
    },
  };
});

beforeEach(async () => {
  entorno.usuarioId = null;
  entorno.db = await crearBaseDePrueba();
});
