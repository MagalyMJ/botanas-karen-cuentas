"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { AuthError } from "next-auth";
import { db } from "@/db";
import { contactos, notaLineas, notas } from "@/db/schema";
import { requireEditor, signIn, signOut } from "@/auth";
import {
  contactoSchema,
  erroresDeCampo,
  lineaSchema,
  pagoSchema,
  notaSchema,
  type FormState,
  type Linea,
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

/**
 * Líneas de detalle del formulario de nota (campos repetidos, una posición por renglón).
 * Los renglones vacíos se ignoran; el detalle es opcional.
 */
function leerLineas(formData: FormData): { lineas: Linea[] } | { error: FormState } {
  const texto = (campo: string) => formData.getAll(campo).map((v) => String(v));
  const descripciones = texto("lineaDescripcion");
  const cantidades = texto("lineaCantidad");
  const precios = texto("lineaPrecio");

  const lineas: Linea[] = [];
  const errores: string[] = [];
  descripciones.forEach((descripcion, i) => {
    const renglon = { descripcion, cantidad: cantidades[i] ?? "", precioUnitario: precios[i] ?? "" };
    if (Object.values(renglon).every((v) => v.trim() === "")) return;
    const parsed = lineaSchema.safeParse(renglon);
    if (parsed.success) lineas.push(parsed.data);
    else errores.push(`Renglón ${i + 1}: ${parsed.error.issues[0].message}`);
  });
  return errores.length > 0 ? { error: { fieldErrors: { lineas: errores } } } : { lineas };
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
  const detalle = leerLineas(formData);
  if ("error" in detalle) return detalle.error;

  const { tipo, montoOriginal, fechaInicio, atendidoPorId } = parsed.data;
  const monto = montoOriginal.toFixed(2);
  const lineas = JSON.stringify(
    detalle.lineas.map((l) => ({
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      precio_unitario: l.precioUnitario,
    })),
  );

  // Una sola sentencia SQL = atómica: la nota y su detalle se guardan juntos o nada.
  const result = await db.execute<{ id: number }>(sql`
    WITH n AS (
      INSERT INTO notas (contacto_id, tipo, monto_original, saldo_pendiente, fecha_inicio, registrado_por_id, atendido_por_id)
      VALUES (${contactoId}, ${tipo}::tipo_nota, ${monto}::numeric, ${monto}::numeric,
              ${fechaInicio.toISOString()}::timestamptz, ${usuario.id}::int, ${atendidoPorId}::int)
      RETURNING id
    ), l AS (
      INSERT INTO nota_lineas (nota_id, descripcion, cantidad, precio_unitario, registrado_por_id)
      SELECT n.id, x.descripcion, x.cantidad, x.precio_unitario, ${usuario.id}::int
      FROM n, jsonb_to_recordset(${lineas}::jsonb) AS x(descripcion text, cantidad numeric, precio_unitario numeric)
    )
    SELECT id FROM n
  `);

  revalidatePath("/", "layout");
  redirect(`/notas/${result.rows[0].id}`);
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

export async function agregarLinea(
  notaId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const usuario = await requireEditor();
  const parsed = lineaSchema.safeParse({
    descripcion: formData.get("descripcion") ?? "",
    cantidad: formData.get("cantidad") ?? "",
    precioUnitario: formData.get("precioUnitario") ?? "",
  });
  if (!parsed.success) return erroresDeCampo(parsed.error);

  const [nota] = await db.select({ id: notas.id }).from(notas).where(eq(notas.id, notaId));
  if (!nota) return { error: "La nota no existe." };

  await db.insert(notaLineas).values({ notaId, ...parsed.data, registradoPorId: usuario.id });
  revalidatePath(`/notas/${notaId}`);
  return { ok: true };
}

/** El detalle no afecta el saldo, así que se puede quitar un renglón capturado por error. */
export async function quitarLinea(notaId: number, lineaId: number) {
  await requireEditor();
  await db.delete(notaLineas).where(and(eq(notaLineas.id, lineaId), eq(notaLineas.notaId, notaId)));
  revalidatePath(`/notas/${notaId}`);
}
