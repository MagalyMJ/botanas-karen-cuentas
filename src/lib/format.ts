export const ZONA_HORARIA = "America/Mexico_City";

const moneda = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

export function formatoMoneda(valor: number | string) {
  return moneda.format(Number(valor));
}

/** Formatea una fecha "YYYY-MM-DD" (columna date) sin desfase de zona horaria. */
export function formatoFecha(fecha: string) {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Fecha de hoy en formato "YYYY-MM-DD" según la zona horaria del negocio. */
export function hoy() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA }).format(new Date());
}
