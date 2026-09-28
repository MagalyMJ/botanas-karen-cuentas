import { BriefcaseIcon, TruckIcon, UserIcon, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TipoContacto } from "@/db/schema";

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
    className: "border-sky-600/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  {
    value: "proveedor",
    singular: "Proveedor",
    plural: "Proveedores",
    icon: TruckIcon,
    className: "border-violet-600/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  {
    value: "empleado",
    singular: "Empleado",
    plural: "Empleados",
    icon: BriefcaseIcon,
    className: "border-rose-600/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
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
    <Badge variant="outline" className={cn(color, className)}>
      <Icon />
      {singular}
    </Badge>
  );
}
