import { cn } from "@/lib/utils";
import { formatoMoneda } from "@/lib/format";

/** Saldo neto con un contacto: positivo = nos debe, negativo = le debemos. */
export function Balance({
  valor,
  sinSigno = false,
  className,
}: {
  valor: number;
  /** Muestra el monto sin "-" (el color sigue indicando la dirección). */
  sinSigno?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-bold tabular-nums",
        // A favor en pizarra (el color más fuerte de la paleta), en contra en terracota.
        valor > 0 && "text-pizarra",
        valor < 0 && "text-terracota",
        className,
      )}
    >
      {formatoMoneda(sinSigno ? Math.abs(valor) : valor)}
    </span>
  );
}

export function descripcionBalance(valor: number) {
  if (valor > 0) return "Te debe";
  if (valor < 0) return "Le debes";
  return "Sin saldo";
}
