"use client";

import { useActionState } from "react";
import { crearNota } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "./field";

const opcionesTipo = [
  { value: "por_cobrar", label: "Me debe", ayuda: "Le presté o le vendí" },
  { value: "por_pagar", label: "Le debo", ayuda: "Me prestó o le compré" },
] as const;

export function NotaForm({ contactoId, fechaHoy }: { contactoId: number; fechaHoy: string }) {
  const [state, action, pending] = useActionState(crearNota.bind(null, contactoId), undefined);
  return (
    <form action={action} className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Tipo de nota</legend>
        <div className="grid grid-cols-2 gap-2">
          {opcionesTipo.map((o) => (
            <label
              key={o.value}
              className="cursor-pointer rounded-lg border p-3 has-checked:border-primary has-checked:bg-muted"
            >
              <input
                type="radio"
                name="tipo"
                value={o.value}
                defaultChecked={o.value === "por_cobrar"}
                className="sr-only"
              />
              <span className="block font-medium">{o.label}</span>
              <span className="block text-xs text-muted-foreground">{o.ayuda}</span>
            </label>
          ))}
        </div>
        {state?.fieldErrors?.tipo?.map((e) => (
          <p key={e} className="text-sm text-destructive">
            {e}
          </p>
        ))}
      </fieldset>
      <Field label="Monto" htmlFor="montoOriginal" errors={state?.fieldErrors?.montoOriginal}>
        <Input
          id="montoOriginal"
          name="montoOriginal"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          required
          className="h-11 text-lg"
        />
      </Field>
      <Field label="Fecha y hora" htmlFor="fechaInicio" errors={state?.fieldErrors?.fechaInicio}>
        <Input id="fechaInicio" name="fechaInicio" type="datetime-local" defaultValue={fechaHoy} required className="h-11" />
      </Field>
      <FormError message={state?.error} />
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? "Guardando…" : "Guardar nota"}
      </Button>
    </form>
  );
}
