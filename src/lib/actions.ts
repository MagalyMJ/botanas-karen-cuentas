"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { AuthError } from "next-auth";
import { db } from "@/db";
import { contactos, notas } from "@/db/schema";
import { requireUser, signIn, signOut } from "@/auth";
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
  await requireUser();
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

export async function crearNota(
  contactoId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = notaSchema.safeParse({
    tipo: formData.get("tipo"),
    montoOriginal: formData.get("montoOriginal"),
    fechaInicio: formData.get("fechaInicio"),
  });
  if (!parsed.success) return erroresDeCampo(parsed.error);

  const [nota] = await db
    .insert(notas)
    .values({
      contactoId,
      tipo: parsed.data.tipo,
      montoOriginal: parsed.data.montoOriginal,
      saldoPendiente: parsed.data.montoOriginal,
      fechaInicio: parsed.data.fechaInicio,
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
  await requireUser();
  const parsed = pagoSchema.safeParse({
    montoPagado: formData.get("montoPagado"),
    fechaPago: formData.get("fechaPago"),
    comentario: formData.get("comentario") ?? "",
  });
  if (!parsed.success) return erroresDeCampo(parsed.error);

  const { montoPagado, fechaPago, comentario } = parsed.data;
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
      INSERT INTO pagos (nota_id, monto_pagado, fecha_pago, comentario)
      SELECT id, ${monto}::numeric, ${fechaPago.toISOString()}::timestamptz, ${comentario} FROM upd
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
