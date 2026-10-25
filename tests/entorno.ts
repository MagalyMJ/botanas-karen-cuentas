import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq, sql } from "drizzle-orm";
import { expect } from "vitest";
import * as schema from "@/db/schema";

type Db = PgliteDatabase<typeof schema>;

/** Estado compartido con los mocks de tests/setup.ts. */
export const entorno = {
  db: null as unknown as Db,
  usuarioId: null as number | null,
};

/** Lo que lanza el `redirect()` fingido, igual que el real interrumpe la acción. */
export class Redireccion extends Error {
  constructor(public url: string) {
    super(`Redirección a ${url}`);
  }
}

/** Base vacía en memoria con las migraciones reales de drizzle/ (así también se prueban). */
export async function crearBaseDePrueba() {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db;
}

/** Usuarios de cada rol, dos contactos y una nota de $1,000 de Don Pepe. */
export async function sembrar() {
  const db = entorno.db;
  const [donPepe, proveedor, luis] = await db
    .insert(schema.contactos)
    .values([
      { nombre: "Don Pepe", tipo: "cliente" },
      { nombre: "Proveedor", tipo: "proveedor" },
      { nombre: "Luis", tipo: "empleado" },
    ])
    .returning();
  const usuario = (rol: schema.RolUsuario, contactoId: number | null = null) =>
    db
      .insert(schema.usuarios)
      .values({ email: `${rol}-${contactoId ?? 0}@prueba.com`, nombre: rol, passwordHash: "x", rol, contactoId })
      .returning()
      .then(([u]) => u.id);
  const usuarios = {
    administrador: await usuario("administrador"),
    editor: await usuario("editor"),
    consulta: await usuario("consulta"),
    cliente: await usuario("contacto", donPepe.id),
  };
  const [notaDonPepe, notaProveedor] = await db
    .insert(schema.notas)
    .values([
      { contactoId: donPepe.id, tipo: "por_cobrar", montoOriginal: 1000, saldoPendiente: 1000, registradoPorId: usuarios.editor },
      { contactoId: proveedor.id, tipo: "por_pagar", montoOriginal: 400, saldoPendiente: 400, registradoPorId: usuarios.editor },
    ])
    .returning();
  return { contactos: { donPepe, proveedor, luis }, usuarios, notas: { donPepe: notaDonPepe, proveedor: notaProveedor } };
}

/** Las acciones y consultas siguientes corren con la sesión de este usuario. */
export function comoUsuario(id: number) {
  entorno.usuarioId = id;
}

/** FormData a partir de un objeto; un arreglo repite el campo (como los renglones del detalle). */
export function formulario(campos: Record<string, string | string[]>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) for (const x of [v].flat()) fd.append(k, x);
  return fd;
}

export async function leerNota(id: number) {
  const [nota] = await entorno.db.select().from(schema.notas).where(eq(schema.notas.id, id));
  return nota;
}

/**
 * Comprueba que el saldo guardado de cada nota cuadre con su historial:
 * saldo = monto original + correcciones − pagos, y ajustes_total = suma de correcciones.
 */
export async function esperarSaldosCuadrados() {
  const descuadradas = await entorno.db.execute(sql`
    SELECT n.id, n.saldo_pendiente, n.ajustes_total,
           coalesce((SELECT sum(monto_pagado) FROM pagos WHERE nota_id = n.id), 0) AS pagado,
           coalesce((SELECT sum(monto) FROM ajustes WHERE nota_id = n.id), 0) AS corregido
    FROM notas n
    WHERE n.ajustes_total <> coalesce((SELECT sum(monto) FROM ajustes WHERE nota_id = n.id), 0)
       OR n.saldo_pendiente <> n.monto_original + n.ajustes_total
                              - coalesce((SELECT sum(monto_pagado) FROM pagos WHERE nota_id = n.id), 0)
       OR (n.estado = 'pagado') <> (n.saldo_pendiente = 0)
  `);
  expect(descuadradas.rows).toEqual([]);
}
