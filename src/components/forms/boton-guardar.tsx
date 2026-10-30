import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Botón principal de los formularios en modal. En el celular, dentro de la hoja inferior de
 * ModalFormulario, queda fijo abajo cuando el formulario no cabe (p. ej. con el teclado
 * abierto). Va dentro de un contenedor con el fondo del modal que ocupa su propio lugar: en
 * reposo no tapa nada, y al desplazar cubre lo que pasa por detrás del botón.
 */
export function BotonGuardar({
  pending,
  enProceso = "Guardando…",
  className,
  children,
}: {
  pending: boolean;
  /** Texto mientras se guarda. */
  enProceso?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-sm:sticky max-sm:bottom-0 max-sm:bg-popover max-sm:pt-2 max-sm:pb-1">
      <Button type="submit" size="lg" disabled={pending} className={cn("h-11 w-full", className)}>
        {pending ? enProceso : children}
      </Button>
    </div>
  );
}
