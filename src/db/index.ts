import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function crearDbNeon(url: string) {
  return drizzle(neon(url), { schema });
}

type Db = ReturnType<typeof crearDbNeon>;

async function crearDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) return crearDbNeon(url);

  if (process.env.VERCEL) throw new Error("Falta la variable de entorno DATABASE_URL");

  // Sin DATABASE_URL (desarrollo local): Postgres embebido. Ambos drivers exponen la
  // misma API de Drizzle para Postgres, así que se tipa como el de Neon.
  const { crearDbLocal } = await import("./local");
  return (await crearDbLocal()) as unknown as Db;
}

// Se guarda en globalThis para no reabrir la base local en cada recarga en caliente.
const g = globalThis as unknown as { __db?: Promise<Db> };
export const db: Db = await (g.__db ??= crearDb());
