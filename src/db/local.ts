import "server-only";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";
import { aFechaLocal, deFechaLocal } from "@/lib/format";

export const USUARIO_DEMO = { email: "demo@ejemplo.com", password: "demo1234" };

// Un usuario de prueba por rol; todos con la contraseña de USUARIO_DEMO.
const USUARIOS_PRUEBA = {
  editor: "editor@ejemplo.com",
  consulta: "consulta@ejemplo.com",
  cliente: "cliente@ejemplo.com",
  empleado: "empleado@ejemplo.com",
};

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
  if (n === 0) await sembrar(db);

  return db;
}

/** Hace `dias` días, a la hora indicada (hora del negocio). */
function haceDias(dias: number, hora: number, minuto: number) {
  const d = new Date(Date.now() - dias * 86_400_000);
  const [fecha] = aFechaLocal(d).split("T");
  return deFechaLocal(`${fecha}T${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`);
}

async function sembrar(db: PgliteDatabase<typeof schema>) {
  const [contacto, proveedor, empleado, contactoPagado] = await db
    .insert(schema.contactos)
    .values([
      { nombre: "Tienda Don Pepe", tipo: "cliente", telefono: "555 123 4567" },
      { nombre: "Distribuidora de Chiles", tipo: "proveedor", telefono: null },
      { nombre: "Luis (repartidor)", tipo: "empleado", telefono: null },
      { nombre: "Abarrotes La Esquina", tipo: "cliente", telefono: null },
    ])
    .returning({ id: schema.contactos.id });

  const passwordHash = await bcrypt.hash(USUARIO_DEMO.password, 10);
  const [usuario] = await db
    .insert(schema.usuarios)
    .values([
      { email: USUARIO_DEMO.email, nombre: "Demo", rol: "administrador", passwordHash },
      { email: USUARIOS_PRUEBA.editor, nombre: "Editor", rol: "editor", passwordHash },
      { email: USUARIOS_PRUEBA.consulta, nombre: "Consulta", rol: "consulta", passwordHash },
      { email: USUARIOS_PRUEBA.cliente, nombre: "Don Pepe", rol: "contacto", contactoId: contacto.id, passwordHash },
      { email: USUARIOS_PRUEBA.empleado, nombre: "Luis", rol: "contacto", contactoId: empleado.id, passwordHash },
    ])
    .returning({ id: schema.usuarios.id });
  const yo = { registradoPorId: usuario.id };
  const atendioLuis = { ...yo, atendidoPorId: empleado.id };

  const [notaCliente, , , notaPagada] = await db
    .insert(schema.notas)
    .values([
      { contactoId: contacto.id, tipo: "por_cobrar", montoOriginal: 1200, saldoPendiente: 1000, fechaInicio: haceDias(12, 10, 30), ...atendioLuis },
      { contactoId: proveedor.id, tipo: "por_pagar", montoOriginal: 400, saldoPendiente: 400, fechaInicio: haceDias(3, 8, 15), ...yo },
      { contactoId: empleado.id, tipo: "por_cobrar", montoOriginal: 300, saldoPendiente: 300, fechaInicio: haceDias(1, 18, 5), ...yo },
      { contactoId: contactoPagado.id, tipo: "por_cobrar", montoOriginal: 250, saldoPendiente: 0, estado: "pagado", fechaInicio: haceDias(20, 12, 0), ...yo },
    ])
    .returning({ id: schema.notas.id });

  await db.insert(schema.pagos).values([
    { notaId: notaCliente.id, montoPagado: 200, comentario: "Abono en efectivo", fechaPago: haceDias(5, 16, 20), ...atendioLuis },
    { notaId: notaPagada.id, montoPagado: 150, fechaPago: haceDias(14, 11, 45), ...yo },
    { notaId: notaPagada.id, montoPagado: 100, comentario: "Liquidó", fechaPago: haceDias(2, 9, 10), ...atendioLuis },
  ]);

  console.log(
    `[db local] datos de ejemplo creados. Administrador: ${USUARIO_DEMO.email} / ${USUARIO_DEMO.password}` +
      ` (también ${Object.values(USUARIOS_PRUEBA).join(", ")}, misma contraseña)`,
  );
}
