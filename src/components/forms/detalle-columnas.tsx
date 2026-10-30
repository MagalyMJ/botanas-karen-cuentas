import { cn } from "@/lib/utils";

/**
 * Columnas de los formularios de detalle (al crear la nota y al agregar un renglón), para
 * que cada renglón quede en una línea y alineado con su encabezado:
 * cantidad · descripción · precio c/u · importe (solo en pantallas anchas) · acción.
 */
export const columnasDetalle =
  "grid grid-cols-[3.5rem_minmax(0,1fr)_5.5rem_2.5rem] items-center gap-2 sm:grid-cols-[4.5rem_minmax(0,1fr)_6.5rem_6rem_2.5rem]";

export function EncabezadoDetalle({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn(columnasDetalle, "text-xs text-muted-foreground", className)}>
      <span className="text-right">Cant.</span>
      <span>Descripción</span>
      <span className="text-right">Precio c/u</span>
      <span className="hidden text-right sm:block">Importe</span>
      <span />
    </div>
  );
}
