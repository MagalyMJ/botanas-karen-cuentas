import "server-only";
import { and, desc, eq, gte, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import { alias } from "drizzle-orm/pg-core";
import { contactos, pagos, notas, usuarios, type TipoContacto } from "@/db/schema";
import { requireUser } from "@/auth";
import { ZONA_HORARIA } from "@/lib/format";
import { contactoVisible } from "@/lib/permisos";

// Todas las consultas filtran según el usuario de la sesión: un usuario con rol
// "contacto" solo obtiene sus propios datos, aunque cambie la dirección de la página.
async function alcance() {
  return contactoVisible(await requireUser());
}

// Saldo con signo: positivo = nos deben, negativo = debemos.
const saldoConSigno = sql`case when ${notas.tipo} = 'por_cobrar' then ${notas.saldoPendiente} else -${notas.saldoPendiente} end`;

export async function getResumen() {
  const soloContacto = await alcance();
  const deContacto = soloContacto === null ? undefined : eq(notas.contactoId, soloContacto);
  const [notasRes, pagosRes, contactosRes] = await Promise.all([
    db
      .select({
        porCobrar: sql<number>`coalesce(sum(${notas.saldoPendiente}) filter (where ${notas.tipo} = 'por_cobrar'), 0)`.mapWith(Number),
        porPagar: sql<number>`coalesce(sum(${notas.saldoPendiente}) filter (where ${notas.tipo} = 'por_pagar'), 0)`.mapWith(Number),
        activos: sql<number>`count(*)`.mapWith(Number),
      })
      .from(notas)
      .where(and(eq(notas.estado, "activo"), deContacto)),
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
          ), eq(notas.tipo, "por_cobrar"), deContacto)),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(contactos)
      .where(soloContacto === null ? undefined : eq(contactos.id, soloContacto)),
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
  const soloContacto = await alcance();
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
    .where(soloContacto === null ? undefined : eq(notas.contactoId, soloContacto))
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
  const soloContacto = await alcance();
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
        soloContacto === null ? undefined : eq(contactos.id, soloContacto),
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
  const soloContacto = await alcance();
  if (soloContacto !== null && soloContacto !== id) return null;
  const [contacto] = await db.select().from(contactos).where(eq(contactos.id, id)).limit(1);
  if (!contacto) return null;
  const notasContacto = await db
    .select()
    .from(notas)
    .where(eq(notas.contactoId, id))
    .orderBy(notas.estado, desc(notas.fechaInicio), desc(notas.id));
  return { ...contacto, notas: notasContacto };
}

/** Para el selector "Atendió"; solo lo usan formularios de captura. */
export async function getEmpleados() {
  if ((await alcance()) !== null) return [];
  return db
    .select({ id: contactos.id, nombre: contactos.nombre })
    .from(contactos)
    .where(eq(contactos.tipo, "empleado"))
    .orderBy(contactos.nombre);
}

const atendio = alias(contactos, "atendio");

export async function getNota(id: number) {
  const soloContacto = await alcance();
  const [row] = await db
    .select({
      nota: notas,
      contacto: contactos,
      registradoPor: usuarios.nombre,
      atendidoPor: atendio.nombre,
    })
    .from(notas)
    .innerJoin(contactos, eq(notas.contactoId, contactos.id))
    .innerJoin(usuarios, eq(notas.registradoPorId, usuarios.id))
    .leftJoin(atendio, eq(notas.atendidoPorId, atendio.id))
    .where(and(eq(notas.id, id), soloContacto === null ? undefined : eq(notas.contactoId, soloContacto)))
    .limit(1);
  if (!row) return null;
  const pagosNota = await db
    .select({
      id: pagos.id,
      montoPagado: pagos.montoPagado,
      fechaPago: pagos.fechaPago,
      comentario: pagos.comentario,
      registradoPor: usuarios.nombre,
      atendidoPor: atendio.nombre,
    })
    .from(pagos)
    .innerJoin(usuarios, eq(pagos.registradoPorId, usuarios.id))
    .leftJoin(atendio, eq(pagos.atendidoPorId, atendio.id))
    .where(eq(pagos.notaId, id))
    .orderBy(desc(pagos.fechaPago), desc(pagos.id));
  return {
    ...row.nota,
    contacto: row.contacto,
    registradoPor: row.registradoPor,
    atendidoPor: row.atendidoPor,
    pagos: pagosNota,
  };
}
