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
        "tabular-nums",
        valor > 0 && "text-emerald-700 dark:text-emerald-400",
        valor < 0 && "text-amber-700 dark:text-amber-400",
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
