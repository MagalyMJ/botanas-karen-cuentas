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
        // Texto y orilla del mismo color; fondo suave del mismo tono.
        tipo === "por_cobrar"
          ? "border-salvia bg-salvia/10 font-semibold text-salvia"
          : "border-terracota bg-terracota/10 font-semibold text-terracota"
      }
    >
      {etiquetaTipo[tipo]}
    </Badge>
  );
}
