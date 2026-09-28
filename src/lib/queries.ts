import "server-only";
import { and, desc, eq, gte, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import { contactos, pagos, notas, type TipoContacto } from "@/db/schema";
import { ZONA_HORARIA } from "@/lib/format";

// Saldo con signo: positivo = nos deben, negativo = debemos.
const saldoConSigno = sql`case when ${notas.tipo} = 'por_cobrar' then ${notas.saldoPendiente} else -${notas.saldoPendiente} end`;

export async function getResumen() {
  const [notasRes, pagosRes, contactosRes] = await Promise.all([
    db
      .select({
        porCobrar: sql<number>`coalesce(sum(${notas.saldoPendiente}) filter (where ${notas.tipo} = 'por_cobrar'), 0)`.mapWith(Number),
        porPagar: sql<number>`coalesce(sum(${notas.saldoPendiente}) filter (where ${notas.tipo} = 'por_pagar'), 0)`.mapWith(Number),
        activos: sql<number>`count(*)`.mapWith(Number),
      })
      .from(notas)
      .where(eq(notas.estado, "activo")),
    db
      .select({
        cobradoMes: sql<number>`coalesce(sum(${pagos.montoPagado}), 0)`.mapWith(Number),
      })
      .from(pagos)
      .innerJoin(notas, eq(pagos.notaId, notas.id))
      .where(and(gte(
            pagos.fechaPago,
            // Inicio del mes en curso según la hora del negocio.
            sql`date_trunc('month', now() at time zone ${ZONA_HORARIA}) at time zone ${ZONA_HORARIA}`,
          ), eq(notas.tipo, "por_cobrar"))),
    db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(contactos),
  ]);
  return {
    porCobrar: notasRes[0].porCobrar,
    porPagar: notasRes[0].porPagar,
    notasActivas: notasRes[0].activos,
    cobradoMes: pagosRes[0].cobradoMes,
    totalContactos: contactosRes[0].total,
  };
}

export async function getPagosRecientes(limite = 10) {
  return db
    .select({
      id: pagos.id,
      montoPagado: pagos.montoPagado,
      fechaPago: pagos.fechaPago,
      notaId: pagos.notaId,
      tipo: notas.tipo,
      contactoNombre: contactos.nombre,
    })
    .from(pagos)
    .innerJoin(notas, eq(pagos.notaId, notas.id))
    .innerJoin(contactos, eq(notas.contactoId, contactos.id))
    .orderBy(desc(pagos.fechaPago), desc(pagos.id))
    .limit(limite);
}

const balanceContacto = sql<number>`coalesce(sum(${saldoConSigno}) filter (where ${notas.estado} = 'activo'), 0)`;

export async function getContactos({
  busqueda,
  tipo,
  soloConSaldo = false,
  limite,
}: { busqueda?: string; tipo?: TipoContacto; soloConSaldo?: boolean; limite?: number } = {}) {
  const q = busqueda?.trim();
  const query = db
    .select({
      id: contactos.id,
      nombre: contactos.nombre,
      tipo: contactos.tipo,
      telefono: contactos.telefono,
      balance: balanceContacto.mapWith(Number),
      notasActivas: sql<number>`count(${notas.id}) filter (where ${notas.estado} = 'activo')`.mapWith(Number),
    })
    .from(contactos)
    .leftJoin(notas, eq(notas.contactoId, contactos.id))
    .where(
      and(
        q ? ilike(contactos.nombre, `%${q}%`) : undefined,
        tipo ? eq(contactos.tipo, tipo) : undefined,
      ),
    )
    .groupBy(contactos.id)
    .having(soloConSaldo ? sql`${balanceContacto} <> 0` : undefined)
    // Con saldo: primero los montos más grandes (a favor o en contra).
    .orderBy(...(soloConSaldo ? [sql`abs(${balanceContacto}) desc`, contactos.nombre] : [contactos.nombre]))
    .$dynamic();
  return limite ? query.limit(limite) : query;
}

export async function getContacto(id: number) {
  const [contacto] = await db.select().from(contactos).where(eq(contactos.id, id)).limit(1);
  if (!contacto) return null;
  const notasContacto = await db
    .select()
    .from(notas)
    .where(eq(notas.contactoId, id))
    .orderBy(notas.estado, desc(notas.fechaInicio), desc(notas.id));
  return { ...contacto, notas: notasContacto };
}

export async function getNota(id: number) {
  const [row] = await db
    .select({ nota: notas, contacto: contactos })
    .from(notas)
    .innerJoin(contactos, eq(notas.contactoId, contactos.id))
    .where(eq(notas.id, id))
    .limit(1);
  if (!row) return null;
  const pagosNota = await db
    .select()
    .from(pagos)
    .where(eq(pagos.notaId, id))
    .orderBy(desc(pagos.fechaPago), desc(pagos.id));
  return { ...row.nota, contacto: row.contacto, pagos: pagosNota };
}
