// Datos de ejemplo para probar la app. Los usan la base local PGlite (src/db/local.ts) y
// la rama development de Neon (scripts/sembrar-development.ts). Sin "server-only" para
// poder correr desde scripts.
import bcrypt from "bcryptjs";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { aFechaLocal, deFechaLocal } from "@/lib/format";

export const USUARIO_DEMO = { email: "demo@ejemplo.com", password: "demo1234" };

// Un usuario de prueba por rol; todos con la contraseña de USUARIO_DEMO.
export const USUARIOS_PRUEBA = {
  editor: "editor@ejemplo.com",
  consulta: "consulta@ejemplo.com",
  cliente: "cliente@ejemplo.com",
  empleado: "empleado@ejemplo.com",
};

/** Hace `dias` días, a la hora indicada (hora del negocio). */
function haceDias(dias: number, hora: number, minuto: number) {
  const d = new Date(Date.now() - dias * 86_400_000);
  const [fecha] = aFechaLocal(d).split("T");
  return deFechaLocal(`${fecha}T${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`);
}

export async function sembrar(db: PgDatabase<PgQueryResultHKT, typeof schema>) {
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

  const [notaCliente, notaProveedor, , notaPagada] = await db
    .insert(schema.notas)
    .values([
      { contactoId: contacto.id, tipo: "por_cobrar", montoOriginal: 1200, saldoPendiente: 1000, fechaInicio: haceDias(12, 10, 30), ...atendioLuis },
      { contactoId: proveedor.id, tipo: "por_pagar", montoOriginal: 400, saldoPendiente: 360, ajustesTotal: -40, fechaInicio: haceDias(3, 8, 15), ...yo },
      { contactoId: empleado.id, tipo: "por_cobrar", montoOriginal: 300, saldoPendiente: 300, fechaInicio: haceDias(1, 18, 5), ...yo },
      { contactoId: contactoPagado.id, tipo: "por_cobrar", montoOriginal: 250, saldoPendiente: 0, estado: "pagado", fechaInicio: haceDias(20, 12, 0), ...yo },
    ])
    .returning({ id: schema.notas.id });

  // Detalle de la nota de Don Pepe y de la del proveedor.
  await db.insert(schema.notaLineas).values([
    { notaId: notaCliente.id, descripcion: "Cacahuate japonés 1 kg", cantidad: 10, precioUnitario: 85, ...yo },
    { notaId: notaCliente.id, descripcion: "Chicharrón de harina 500 g", cantidad: 14, precioUnitario: 25, ...yo },
    { notaId: notaProveedor.id, descripcion: "Chile de árbol 1 kg", cantidad: 3, precioUnitario: 120, ...yo },
  ]);

  // Corrección de ejemplo: la nota del proveedor se capturó en $400 y eran $360, como su detalle.
  await db.insert(schema.ajustes).values({
    notaId: notaProveedor.id,
    monto: -40,
    motivo: "Se capturó $400; fueron 3 kg de chile a $120",
    ...yo,
  });

  await db.insert(schema.observaciones).values({
    notaId: notaCliente.id,
    texto: "Incluye el pedido del lunes; entregar en la tienda de la esquina.",
    ...yo,
  });

  await db.insert(schema.pagos).values([
    { notaId: notaCliente.id, montoPagado: 200, comentario: "Abono en efectivo", fechaPago: haceDias(5, 16, 20), ...atendioLuis },
    { notaId: notaPagada.id, montoPagado: 150, fechaPago: haceDias(14, 11, 45), ...yo },
    { notaId: notaPagada.id, montoPagado: 100, comentario: "Liquidó", fechaPago: haceDias(2, 9, 10), ...atendioLuis },
  ]);

  return (
    `datos de ejemplo creados. Administrador: ${USUARIO_DEMO.email} / ${USUARIO_DEMO.password}` +
    ` (también ${Object.values(USUARIOS_PRUEBA).join(", ")}, misma contraseña)`
  );
}
