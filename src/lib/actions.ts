"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { AuthError } from "next-auth";
import { db } from "@/db";
import { clientes, prestamos } from "@/db/schema";
import { requireUser, signIn, signOut } from "@/auth";
import {
  clienteSchema,
  erroresDeCampo,
  pagoSchema,
  prestamoSchema,
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

export async function crearCliente(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const parsed = clienteSchema.safeParse({
    nombre: formData.get("nombre"),
    telefono: formData.get("telefono") ?? "",
  });
  if (!parsed.success) return erroresDeCampo(parsed.error);

  const [cliente] = await db.insert(clientes).values(parsed.data).returning({ id: clientes.id });
  revalidatePath("/clientes");
  redirect(`/clientes/${cliente.id}`);
}

export async function crearPrestamo(
  clienteId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = prestamoSchema.safeParse({
    tipo: formData.get("tipo"),
    montoOriginal: formData.get("montoOriginal"),
    fechaInicio: formData.get("fechaInicio"),
  });
  if (!parsed.success) return erroresDeCampo(parsed.error);

  const [prestamo] = await db
    .insert(prestamos)
    .values({
      clienteId,
      tipo: parsed.data.tipo,
      montoOriginal: parsed.data.montoOriginal,
      saldoPendiente: parsed.data.montoOriginal,
      fechaInicio: parsed.data.fechaInicio,
    })
    .returning({ id: prestamos.id });

  revalidatePath("/", "layout");
  redirect(`/prestamos/${prestamo.id}`);
}

export async function registrarPago(
  prestamoId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = pagoSchema.safeParse({
    montoPagado: formData.get("montoPagado"),
    fechaPago: formData.get("fechaPago"),
    notas: formData.get("notas") ?? "",
  });
  if (!parsed.success) return erroresDeCampo(parsed.error);

  const { montoPagado, fechaPago, notas } = parsed.data;
  const monto = montoPagado.toFixed(2);

  // Una sola sentencia SQL = atómica: descuenta el saldo, actualiza el estado e inserta
  // el pago. El UPDATE bloquea la fila, así que pagos simultáneos se aplican en serie.
  // Solo aplica si el préstamo está activo y el pago no excede el saldo.
  const result = await db.execute<{ saldo_pendiente: string; estado: string }>(sql`
    WITH upd AS (
      UPDATE prestamos
      SET saldo_pendiente = saldo_pendiente - ${monto}::numeric,
          estado = CASE
            WHEN saldo_pendiente - ${monto}::numeric = 0 THEN 'pagado'::estado_prestamo
            ELSE 'activo'::estado_prestamo
          END
      WHERE id = ${prestamoId} AND estado = 'activo' AND saldo_pendiente >= ${monto}::numeric
      RETURNING id, saldo_pendiente, estado
    ), ins AS (
      INSERT INTO pagos (prestamo_id, monto_pagado, fecha_pago, notas)
      SELECT id, ${monto}::numeric, ${fechaPago}::date, ${notas} FROM upd
      RETURNING id
    )
    SELECT upd.saldo_pendiente, upd.estado FROM upd, ins
  `);

  if (result.rows.length === 0) {
    const [actual] = await db
      .select({ estado: prestamos.estado, saldo: prestamos.saldoPendiente })
      .from(prestamos)
      .where(eq(prestamos.id, prestamoId));
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
