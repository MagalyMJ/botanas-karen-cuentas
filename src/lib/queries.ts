import "server-only";
import { and, desc, eq, gte, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import { clientes, pagos, prestamos } from "@/db/schema";
import { hoy } from "@/lib/format";

// Saldo con signo: positivo = nos deben, negativo = debemos.
const saldoConSigno = sql`case when ${prestamos.tipo} = 'por_cobrar' then ${prestamos.saldoPendiente} else -${prestamos.saldoPendiente} end`;

export async function getResumen() {
  const inicioMes = hoy().slice(0, 8) + "01";
  const [prestamosRes, pagosRes, clientesRes] = await Promise.all([
    db
      .select({
        porCobrar: sql<number>`coalesce(sum(${prestamos.saldoPendiente}) filter (where ${prestamos.tipo} = 'por_cobrar'), 0)`.mapWith(Number),
        porPagar: sql<number>`coalesce(sum(${prestamos.saldoPendiente}) filter (where ${prestamos.tipo} = 'por_pagar'), 0)`.mapWith(Number),
        activos: sql<number>`count(*)`.mapWith(Number),
      })
      .from(prestamos)
      .where(eq(prestamos.estado, "activo")),
    db
      .select({
        cobradoMes: sql<number>`coalesce(sum(${pagos.montoPagado}), 0)`.mapWith(Number),
      })
      .from(pagos)
      .innerJoin(prestamos, eq(pagos.prestamoId, prestamos.id))
      .where(and(gte(pagos.fechaPago, inicioMes), eq(prestamos.tipo, "por_cobrar"))),
    db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(clientes),
  ]);
  return {
    porCobrar: prestamosRes[0].porCobrar,
    porPagar: prestamosRes[0].porPagar,
    prestamosActivos: prestamosRes[0].activos,
    cobradoMes: pagosRes[0].cobradoMes,
    totalClientes: clientesRes[0].total,
  };
}

export async function getPagosRecientes(limite = 10) {
  return db
    .select({
      id: pagos.id,
      montoPagado: pagos.montoPagado,
      fechaPago: pagos.fechaPago,
      prestamoId: pagos.prestamoId,
      tipo: prestamos.tipo,
      clienteNombre: clientes.nombre,
    })
    .from(pagos)
    .innerJoin(prestamos, eq(pagos.prestamoId, prestamos.id))
    .innerJoin(clientes, eq(prestamos.clienteId, clientes.id))
    .orderBy(desc(pagos.fechaPago), desc(pagos.id))
    .limit(limite);
}

export async function getClientes(busqueda?: string) {
  const q = busqueda?.trim();
  return db
    .select({
      id: clientes.id,
      nombre: clientes.nombre,
      telefono: clientes.telefono,
      balance: sql<number>`coalesce(sum(${saldoConSigno}) filter (where ${prestamos.estado} = 'activo'), 0)`.mapWith(Number),
      prestamosActivos: sql<number>`count(${prestamos.id}) filter (where ${prestamos.estado} = 'activo')`.mapWith(Number),
    })
    .from(clientes)
    .leftJoin(prestamos, eq(prestamos.clienteId, clientes.id))
    .where(q ? ilike(clientes.nombre, `%${q}%`) : undefined)
    .groupBy(clientes.id)
    .orderBy(clientes.nombre);
}

export async function getCliente(id: number) {
  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, id)).limit(1);
  if (!cliente) return null;
  const prestamosCliente = await db
    .select()
    .from(prestamos)
    .where(eq(prestamos.clienteId, id))
    .orderBy(prestamos.estado, desc(prestamos.fechaInicio), desc(prestamos.id));
  return { ...cliente, prestamos: prestamosCliente };
}

export async function getPrestamo(id: number) {
  const [row] = await db
    .select({ prestamo: prestamos, cliente: clientes })
    .from(prestamos)
    .innerJoin(clientes, eq(prestamos.clienteId, clientes.id))
    .where(eq(prestamos.id, id))
    .limit(1);
  if (!row) return null;
  const pagosPrestamo = await db
    .select()
    .from(pagos)
    .where(eq(pagos.prestamoId, id))
    .orderBy(desc(pagos.fechaPago), desc(pagos.id));
  return { ...row.prestamo, cliente: row.cliente, pagos: pagosPrestamo };
}
