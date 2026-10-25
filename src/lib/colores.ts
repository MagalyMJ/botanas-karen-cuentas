/**
 * Paleta de la marca para el código que no usa clases de Tailwind (íconos generados,
 * manifiesto PWA, color de la barra del navegador). En componentes usa las clases
 * (bg-pizarra, text-terracota…), definidas con los mismos valores en src/app/globals.css:
 * si cambias uno, cambia el otro.
 */
export const colores = {
  /** Azul grisáceo oscuro. */
  pizarra: "#2d4354",
  /** Verde gris. */
  salvia: "#73766a",
  /** Durazno claro. */
  arena: "#fed7a5",
  /** Café rojizo. */
  terracota: "#9e6752",
  /** Café violáceo oscuro. */
  ciruela: "#534145",
  /** Casi negro. */
  carbon: "#20212b",
} as const;

export type Color = keyof typeof colores;
