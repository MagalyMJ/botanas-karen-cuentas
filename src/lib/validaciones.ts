import { z } from "zod";
import { deFechaLocal } from "@/lib/format";

const monto = z.coerce
  .number({ error: "Ingresa un monto válido" })
  .positive("El monto debe ser mayor a 0")
  .max(9_999_999_999.99, "Monto demasiado grande")
  // Redondea a centavos para evitar errores de punto flotante.
  .transform((n) => Math.round(n * 100) / 100);

// Valor de <input type="datetime-local"> ("YYYY-MM-DDTHH:mm"), en hora del negocio.
const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Fecha y hora inválidas")
  .transform(deFechaLocal)
  .refine((d) => !Number.isNaN(d.getTime()), "Fecha y hora inválidas");

const textoOpcional = z
  .string()
  .trim()
  .transform((s) => (s === "" ? null : s))
  .nullable();

export const contactoSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  tipo: z.enum(["cliente", "proveedor", "empleado"], { error: "Elige el tipo de contacto" }),
  telefono: textoOpcional.pipe(
    z.string().regex(/^[\d\s()+-]{7,20}$/, "Teléfono inválido").nullable(),
  ),
});

// Valor del selector "Atendió": "" = el usuario actual; si no, id de un empleado.
const atendidoPorId = z
  .union([z.literal(""), z.coerce.number().int().positive()])
  .transform((v) => (v === "" ? null : v));

export const notaSchema = z.object({
  atendidoPorId,
  tipo: z.enum(["por_cobrar", "por_pagar"], { error: "Elige el tipo de nota" }),
  montoOriginal: monto,
  fechaInicio: fecha,
});

export const pagoSchema = z.object({
  atendidoPorId,
  montoPagado: monto,
  fechaPago: fecha,
  comentario: textoOpcional.pipe(z.string().max(500).nullable()),
});

// Campo numérico obligatorio: "" es error (z.coerce lo convertiría en 0).
const numero = (vacio: string) =>
  z.string().trim().min(1, vacio).pipe(z.coerce.number({ error: "Ingresa un número válido" }));

export const lineaSchema = z.object({
  descripcion: z.string().trim().min(1, "Escribe qué fue").max(200, "Descripción demasiado larga"),
  cantidad: numero("Escribe la cantidad")
    .pipe(z.number().positive("La cantidad debe ser mayor a 0").max(99_999_999, "Cantidad demasiado grande"))
    .transform((n) => Math.round(n * 1000) / 1000),
  precioUnitario: numero("Escribe el precio")
    .pipe(z.number().min(0, "El precio no puede ser negativo").max(9_999_999_999.99, "Precio demasiado grande"))
    .transform((n) => Math.round(n * 100) / 100),
});

export type Linea = z.infer<typeof lineaSchema>;

export const ajusteSchema = z.object({
  direccion: z.enum(["aumentar", "disminuir"], { error: "Elige si el monto sube o baja" }),
  monto,
  motivo: z.string().trim().min(1, "Escribe el motivo de la corrección").max(500),
});

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  ok?: boolean;
} | undefined;

export function erroresDeCampo(error: z.ZodError): FormState {
  return { fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]> };
}
