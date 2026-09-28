import { Badge } from "@/components/ui/badge";
import type { EstadoNota, TipoNota } from "@/db/schema";

export const etiquetaTipo: Record<TipoNota, string> = {
  por_cobrar: "Me debe",
  por_pagar: "Le debo",
};

/** Una sola etiqueta por nota: "Pagado" si ya se liquidó; si no, su tipo. */
export function NotaBadge({ tipo, estado }: { tipo: TipoNota; estado: EstadoNota }) {
  if (estado === "pagado") return <Badge variant="secondary">Pagado</Badge>;
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
