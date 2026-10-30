"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { AuthError } from "next-auth";
import { db } from "@/db";
import { contactos, notas, observaciones } from "@/db/schema";
import { requireEditor, signIn, signOut } from "@/auth";
import {
  ajusteSchema,
  contactoSchema,
  erroresDeCampo,
  lineaSchema,
  observacionSchema,
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
type LineaConId = Linea & { id: number | null };

function leerLineas(formData: FormData): { lineas: LineaConId[] } | { error: FormState } {
  const texto = (campo: string) => formData.getAll(campo).map((v) => String(v));
  const descripciones = texto("lineaDescripcion");
  const cantidades = texto("lineaCantidad");
  const precios = texto("lineaPrecio");
  // Solo al editar: id del renglón existente ("" = renglón nuevo).
  const ids = texto("lineaId");

  const lineas: LineaConId[] = [];
  const errores: string[] = [];
  descripciones.forEach((descripcion, i) => {
    const renglon = { descripcion, cantidad: cantidades[i] ?? "", precioUnitario: precios[i] ?? "" };
    if (Object.values(renglon).every((v) => v.trim() === "")) return;
    const id = ids[i] ? Number(ids[i]) : null;
    if (id !== null && !(Number.isInteger(id) && id > 0)) {
      errores.push(`Renglón ${i + 1}: renglón inválido`);
      return;
    }
    const parsed = lineaSchema.safeParse(renglon);
    if (parsed.success) lineas.push({ ...parsed.data, id });
    else errores.push(`Renglón ${i + 1}: ${parsed.error.issues[0].message}`);
  });
  return errores.length > 0 ? { error: { fieldErrors: { lineas: errores } } } : { lineas };
}

/** Renglones como JSON para jsonb_to_recordset (nombres de columna de la base). */
function lineasJson(lineas: LineaConId[]) {
  return JSON.stringify(
    lineas.map((l) => ({ id: l.id, descripcion: l.descripcion, cantidad: l.cantidad, precio_unitario: l.precioUnitario })),
  );
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
    observacion: formData.get("observacion") ?? "",
  });
  if (!parsed.success) return erroresDeCampo(parsed.error);
  const errorAtendio = await validarAtendio(parsed.data.atendidoPorId);
  if (errorAtendio) return errorAtendio;
  const detalle = leerLineas(formData);
  if ("error" in detalle) return detalle.error;

  const { tipo, montoOriginal, fechaInicio, atendidoPorId, observacion } = parsed.data;
  const monto = montoOriginal.toFixed(2);
  const lineas = lineasJson(detalle.lineas);

  // Una sola sentencia SQL = atómica: la nota, su detalle y su observación se guardan juntos o nada.
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
    ), o AS (
      INSERT INTO observaciones (nota_id, texto, registrado_por_id)
      SELECT n.id, ${observacion}::text, ${usuario.id}::int FROM n
      WHERE ${observacion}::text IS NOT NULL
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

export async function registrarAjuste(
  notaId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const usuario = await requireEditor();
  const parsed = ajusteSchema.safeParse({
    direccion: formData.get("direccion"),
    monto: formData.get("monto"),
    motivo: formData.get("motivo") ?? "",
  });
  if (!parsed.success) return erroresDeCampo(parsed.error);

  const { direccion, monto, motivo } = parsed.data;
  const ajuste = (direccion === "aumentar" ? monto : -monto).toFixed(2);

  // Una sola sentencia SQL = atómica, igual que registrarPago: mueve el saldo y el total
  // de correcciones de la nota e inserta la corrección. Una corrección que sube el monto
  // reabre una nota pagada; una que lo baja no puede dejar el saldo en negativo.
  const result = await db.execute<{ id: number }>(sql`
    WITH upd AS (
      UPDATE notas
      SET saldo_pendiente = saldo_pendiente + ${ajuste}::numeric,
          ajustes_total = ajustes_total + ${ajuste}::numeric,
          estado = CASE
            WHEN saldo_pendiente + ${ajuste}::numeric = 0 THEN 'pagado'::estado_nota
            ELSE 'activo'::estado_nota
          END
      WHERE id = ${notaId} AND saldo_pendiente + ${ajuste}::numeric >= 0
      RETURNING id
    ), ins AS (
      INSERT INTO ajustes (nota_id, monto, motivo, registrado_por_id)
      SELECT id, ${ajuste}::numeric, ${motivo}, ${usuario.id}::int FROM upd
      RETURNING id
    )
    SELECT ins.id FROM upd, ins
  `);

  if (result.rows.length === 0) {
    const [actual] = await db
      .select({ saldo: notas.saldoPendiente })
      .from(notas)
      .where(eq(notas.id, notaId));
    if (!actual) return { error: "La nota no existe." };
    return {
      fieldErrors: {
        monto: [
          `No puede bajar más que el saldo pendiente (${formatoMoneda(actual.saldo)}). ` +
            "Si ya se pagó de más, registra una nota aparte por la diferencia.",
        ],
      },
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Guarda el detalle completo de una nota desde el modal "Editar": actualiza los renglones
 * que llegan con id, agrega los nuevos y quita los que ya no vienen. El detalle es
 * informativo (no cambia monto ni saldo), así que se puede editar libremente.
 */
export async function guardarDetalle(
  notaId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const usuario = await requireEditor();
  const detalle = leerLineas(formData);
  if ("error" in detalle) return detalle.error;

  const [nota] = await db.select({ id: notas.id }).from(notas).where(eq(notas.id, notaId));
  if (!nota) return { error: "La nota no existe." };

  // Una sola sentencia SQL = atómica. Todas las partes ven los datos de antes del cambio,
  // así que borrar, actualizar e insertar no se pisan entre sí. Los ids que no son de esta
  // nota no actualizan nada.
  await db.execute(sql`
    WITH datos AS (
      SELECT * FROM jsonb_to_recordset(${lineasJson(detalle.lineas)}::jsonb)
        AS x(id int, descripcion text, cantidad numeric, precio_unitario numeric)
    ), borrados AS (
      DELETE FROM nota_lineas
      WHERE nota_id = ${notaId} AND id NOT IN (SELECT id FROM datos WHERE id IS NOT NULL)
    ), actualizados AS (
      UPDATE nota_lineas l
      SET descripcion = d.descripcion, cantidad = d.cantidad, precio_unitario = d.precio_unitario
      FROM datos d
      WHERE l.id = d.id AND l.nota_id = ${notaId}
    )
    INSERT INTO nota_lineas (nota_id, descripcion, cantidad, precio_unitario, registrado_por_id)
    SELECT ${notaId}, descripcion, cantidad, precio_unitario, ${usuario.id}::int FROM datos WHERE id IS NULL
  `);

  revalidatePath(`/notas/${notaId}`);
  return { ok: true };
}

/** Las observaciones no se editan ni se borran: solo se agregan. */
export async function agregarObservacion(
  notaId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const usuario = await requireEditor();
  const parsed = observacionSchema.safeParse({ texto: formData.get("texto") ?? "" });
  if (!parsed.success) return erroresDeCampo(parsed.error);

  const [nota] = await db.select({ id: notas.id }).from(notas).where(eq(notas.id, notaId));
  if (!nota) return { error: "La nota no existe." };

  await db.insert(observaciones).values({ notaId, texto: parsed.data.texto, registradoPorId: usuario.id });
  revalidatePath(`/notas/${notaId}`);
  return { ok: true };
}
