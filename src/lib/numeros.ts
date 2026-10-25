// Formato de los campos numéricos (montos, precios, cantidades): solo dígitos y un punto
// decimal. Lo comparten el campo del navegador (CampoNumero) y la validación del servidor.

/** Número completo con hasta `decimales` decimales: "60", "59.30", "5.", ".5". */
export function patronNumero(decimales: number) {
  return `(\\d+(\\.\\d{0,${decimales}})?|\\.\\d{1,${decimales}})`;
}

export function regexNumero(decimales: number) {
  return new RegExp(`^${patronNumero(decimales)}$`);
}

/** Lo que se permite mientras se escribe: incluye el campo vacío y "12." a medias. */
export function regexEscribiendo(decimales: number) {
  return new RegExp(`^\\d*(\\.\\d{0,${decimales}})?$`);
}

/**
 * Respaldo para cuando el navegador no deja bloquear lo escrito (p. ej. algunos teclados de
 * Android): quita todo lo que no sea dígito o punto, deja el primer punto y recorta decimales.
 * No convierte la coma en punto: "1,200.50" y "59,30" son ambiguos y se volverían otro número.
 */
export function limpiarNumero(valor: string, decimales: number) {
  if (regexEscribiendo(decimales).test(valor)) return valor;
  const [entero, ...resto] = valor.replace(/[^\d.]/g, "").split(".");
  return resto.length === 0 ? entero : `${entero}.${resto.join("").slice(0, decimales)}`;
}
