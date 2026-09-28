import { Badge } from "@/components/ui/badge";
import type { TipoPrestamo } from "@/db/schema";

export function EstadoBadge({ estado }: { estado: "activo" | "pagado" }) {
  return estado === "activo" ? (
    <Badge variant="default">Activo</Badge>
  ) : (
    <Badge variant="secondary">Pagado</Badge>
  );
}

export const etiquetaTipo: Record<TipoPrestamo, string> = {
  por_cobrar: "Me debe",
  por_pagar: "Le debo",
};

export function TipoBadge({ tipo }: { tipo: TipoPrestamo }) {
  return (
    <Badge
      variant="outline"
      className={
        tipo === "por_cobrar"
          ? "border-emerald-600/30 text-emerald-700 dark:text-emerald-400"
          : "border-amber-600/30 text-amber-700 dark:text-amber-400"
      }
    >
      {etiquetaTipo[tipo]}
    </Badge>
  );
}
