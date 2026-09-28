import { z } from "zod";

const monto = z.coerce
  .number({ error: "Ingresa un monto válido" })
  .positive("El monto debe ser mayor a 0")
  .max(9_999_999_999.99, "Monto demasiado grande")
  // Redondea a centavos para evitar errores de punto flotante.
  .transform((n) => Math.round(n * 100) / 100);

const fecha = z.iso.date("Fecha inválida");

const textoOpcional = z
  .string()
  .trim()
  .transform((s) => (s === "" ? null : s))
  .nullable();

export const clienteSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  telefono: textoOpcional.pipe(
    z.string().regex(/^[\d\s()+-]{7,20}$/, "Teléfono inválido").nullable(),
  ),
});

export const prestamoSchema = z.object({
  tipo: z.enum(["por_cobrar", "por_pagar"], { error: "Elige el tipo de nota" }),
  montoOriginal: monto,
  fechaInicio: fecha,
});

export const pagoSchema = z.object({
  montoPagado: monto,
  fechaPago: fecha,
  notas: textoOpcional.pipe(z.string().max(500).nullable()),
});

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  ok?: boolean;
} | undefined;

export function erroresDeCampo(error: z.ZodError): FormState {
  return { fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]> };
}
