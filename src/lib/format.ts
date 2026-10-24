export const ZONA_HORARIA = "America/Mexico_City";

const moneda = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

export function formatoMoneda(valor: number | string) {
  return moneda.format(Number(valor));
}

const fechaHora = new Intl.DateTimeFormat("es-MX", {
  timeZone: ZONA_HORARIA,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** Fecha y hora en la zona horaria del negocio, p. ej. "28 sep 2026, 3:45 p.m.". */
export function formatoFecha(fecha: Date) {
  return fechaHora.format(fecha);
}

const partesLocales = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_HORARIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Fecha/hora "YYYY-MM-DDTHH:mm" (formato de <input type="datetime-local">) en la zona del negocio. */
export function aFechaLocal(fecha: Date) {
  const p = Object.fromEntries(partesLocales.formatToParts(fecha).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function ahoraLocal() {
  return aFechaLocal(new Date());
}

/** Convierte "YYYY-MM-DDTHH:mm" (hora de reloj en la zona del negocio) al instante real. */
export function deFechaLocal(valor: string) {
  const comoUtc = new Date(`${valor}:00Z`);
  // Desfase de la zona en ese momento: lo que marca el reloj local menos UTC.
  const desfase = (d: Date) => new Date(`${aFechaLocal(d)}:00Z`).getTime() - d.getTime();
  const aprox = new Date(comoUtc.getTime() - desfase(comoUtc));
  // Segunda pasada por si el desfase cambia justo en ese rango (horario de verano).
  return new Date(comoUtc.getTime() - desfase(aprox));
}

/** "Atendió Luis · registró Karen", o "Atendió y registró Karen" si fue la misma persona. */
export function textoResponsable(atendidoPor: string | null, registradoPor: string) {
  return atendidoPor
    ? `Atendió ${atendidoPor} · registró ${registradoPor}`
    : `Atendió y registró ${registradoPor}`;
}
