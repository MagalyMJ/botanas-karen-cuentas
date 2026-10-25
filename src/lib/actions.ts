"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { AuthError } from "next-auth";
import { db } from "@/db";
import { contactos, notas } from "@/db/schema";
import { requireEditor, signIn, signOut } from "@/auth";
import {
  contactoSchema,
  erroresDeCampo,
  pagoSchema,
  notaSchema,
  type FormState,
} from "@/lib/validaciones";
import { formatoMoneda } from "@/lib/format";

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: "Correo o contraseña incorrectos." };
    throw error; // la redirección de éxito se propaga como excepción
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

export async function crearContacto(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireEditor();
  const parsed = contactoSchema.safeParse({
    nombre: formData.get("nombre"),
    tipo: formData.get("tipo"),
    telefono: formData.get("telefono") ?? "",
  });
  if (!parsed.success) return erroresDeCampo(parsed.error);

  const [contacto] = await db.insert(contactos).values(parsed.data).returning({ id: contactos.id });
  revalidatePath("/contactos");
  redirect(`/contactos/${contacto.id}`);
}

/** Verifica que quien atendió (si se eligió) sea un empleado registrado. */
async function validarAtendio(atendidoPorId: number | null): Promise<FormState> {
  if (atendidoPorId === null) return undefined;
  const [empleado] = await db
    .select({ id: contactos.id })
    .from(contactos)
    .where(and(eq(contactos.id, atendidoPorId), eq(contactos.tipo, "empleado")));
  return empleado ? undefined : { fieldErrors: { atendidoPorId: ["Elige un empleado válido."] } };
}

export async function crearNota(
  contactoId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const usuario = await requireEditor();
  const parsed = notaSchema.safeParse({
    atendidoPorId: formData.get("atendidoPorId") ?? "",
    tipo: formData.get("tipo"),
    montoOriginal: formData.get("montoOriginal"),
    fechaInicio: formData.get("fechaInicio"),
  });
  if (!parsed.success) return erroresDeCampo(parsed.error);
  const errorAtendio = await validarAtendio(parsed.data.atendidoPorId);
  if (errorAtendio) return errorAtendio;

  const [nota] = await db
    .insert(notas)
    .values({
      contactoId,
      tipo: parsed.data.tipo,
      montoOriginal: parsed.data.montoOriginal,
      saldoPendiente: parsed.data.montoOriginal,
      fechaInicio: parsed.data.fechaInicio,
      registradoPorId: usuario.id,
      atendidoPorId: parsed.data.atendidoPorId,
    })
    .returning({ id: notas.id });

  revalidatePath("/", "layout");
  redirect(`/notas/${nota.id}`);
}

export async function registrarPago(
  notaId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const usuario = await requireEditor();
  const parsed = pagoSchema.safeParse({
    atendidoPorId: formData.get("atendidoPorId") ?? "",
    montoPagado: formData.get("montoPagado"),
    fechaPago: formData.get("fechaPago"),
    comentario: formData.get("comentario") ?? "",
  });
  if (!parsed.success) return erroresDeCampo(parsed.error);

  const errorAtendio = await validarAtendio(parsed.data.atendidoPorId);
  if (errorAtendio) return errorAtendio;

  const { montoPagado, fechaPago, comentario, atendidoPorId } = parsed.data;
  const monto = montoPagado.toFixed(2);

  // Una sola sentencia SQL = atómica: descuenta el saldo, actualiza el estado e inserta
  // el pago. El UPDATE bloquea la fila, así que pagos simultáneos se aplican en serie.
  // Solo aplica si la nota está activa y el pago no excede el saldo.
  const result = await db.execute<{ saldo_pendiente: string; estado: string }>(sql`
    WITH upd AS (
      UPDATE notas
      SET saldo_pendiente = saldo_pendiente - ${monto}::numeric,
          estado = CASE
            WHEN saldo_pendiente - ${monto}::numeric = 0 THEN 'pagado'::estado_nota
            ELSE 'activo'::estado_nota
          END
      WHERE id = ${notaId} AND estado = 'activo' AND saldo_pendiente >= ${monto}::numeric
      RETURNING id, saldo_pendiente, estado
    ), ins AS (
      INSERT INTO pagos (nota_id, monto_pagado, fecha_pago, comentario, registrado_por_id, atendido_por_id)
      SELECT id, ${monto}::numeric, ${fechaPago.toISOString()}::timestamptz, ${comentario},
             ${usuario.id}::int, ${atendidoPorId}::int
      FROM upd
      RETURNING id
    )
    SELECT upd.saldo_pendiente, upd.estado FROM upd, ins
  `);

  if (result.rows.length === 0) {
    const [actual] = await db
      .select({ estado: notas.estado, saldo: notas.saldoPendiente })
      .from(notas)
      .where(eq(notas.id, notaId));
    if (actual?.estado === "activo") {
      return {
        fieldErrors: {
          montoPagado: [`El pago no puede ser mayor al saldo (${formatoMoneda(actual.saldo)}).`],
        },
      };
    }
    return { error: "La nota no existe o ya está pagada." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
