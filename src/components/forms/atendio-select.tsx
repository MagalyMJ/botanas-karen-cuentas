"use client";

import { UserIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "./field";

export type Empleado = { id: number; nombre: string };

/**
 * Selector de quién atendió: el usuario actual o un empleado registrado. El usuario actual
 * es el valor `null`, que se envía como "" (el servidor lo toma como "lo atendió quien registra").
 */
export function AtendioSelect({
  empleados,
  usuarioNombre,
  errors,
}: {
  empleados: Empleado[];
  usuarioNombre: string;
  errors?: string[];
}) {
  const yo = `Yo (${usuarioNombre})`;
  const items = [{ value: null, label: yo }, ...empleados.map((e) => ({ value: String(e.id), label: e.nombre }))];

  return (
    <Field label="Atendió" htmlFor="atendidoPorId" errors={errors}>
      <Select name="atendidoPorId" items={items} defaultValue={null}>
        {/* Mismo alto, letra y margen izquierdo que los Input (el tamaño "default" del trigger
            fija h-8 con un selector data-*, por eso se reemplaza con la misma variante).
            "Yo" es una opción real, no un placeholder: sin el gris de data-placeholder. */}
        <SelectTrigger
          id="atendidoPorId"
          className="w-full pr-3 pl-2.5 text-base data-placeholder:text-foreground data-[size=default]:h-11 md:text-sm"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} className="p-1">
          <SelectItem value={null} className="py-2 pr-9 pl-2.5">
            <UserIcon className="text-muted-foreground" />
            {yo}
          </SelectItem>
          {empleados.length > 0 && <SelectSeparator />}
          {empleados.map((e) => (
            <SelectItem key={e.id} value={String(e.id)} className="py-2 pr-9 pl-2.5">
              {e.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
