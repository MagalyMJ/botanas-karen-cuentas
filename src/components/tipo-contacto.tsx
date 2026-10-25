import { BriefcaseIcon, TruckIcon, UserIcon, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TipoContacto } from "@/db/schema";

// Chips de color sólido con texto blanco (los tres colores tienen contraste suficiente).
export const tiposContacto: {
  value: TipoContacto;
  singular: string;
  plural: string;
  icon: LucideIcon;
  className: string;
}[] = [
  {
    value: "cliente",
    singular: "Cliente",
    plural: "Clientes",
    icon: UserIcon,
    className: "bg-salvia",
  },
  {
    value: "proveedor",
    singular: "Proveedor",
    plural: "Proveedores",
    icon: TruckIcon,
    className: "bg-terracota",
  },
  {
    value: "empleado",
    singular: "Empleado",
    plural: "Empleados",
    icon: BriefcaseIcon,
    className: "bg-ciruela",
  },
];

export function infoTipoContacto(tipo: TipoContacto) {
  return tiposContacto.find((t) => t.value === tipo)!;
}

export function esTipoContacto(valor: unknown): valor is TipoContacto {
  return tiposContacto.some((t) => t.value === valor);
}

export function TipoContactoBadge({ tipo, className }: { tipo: TipoContacto; className?: string }) {
  const { singular, icon: Icon, className: color } = infoTipoContacto(tipo);
  return (
    <Badge className={cn("text-white", color, className)}>
      <Icon />
      {singular}
    </Badge>
  );
}
