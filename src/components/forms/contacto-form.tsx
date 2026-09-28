"use client";

import { useActionState } from "react";
import { crearContacto } from "@/lib/actions";
import type { TipoContacto } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tiposContacto } from "@/components/tipo-contacto";
import { Field, FormError } from "./field";

export function ContactoForm({ tipoInicial = "cliente" }: { tipoInicial?: TipoContacto }) {
  const [state, action, pending] = useActionState(crearContacto, undefined);
  return (
    <form action={action} className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Tipo de contacto</legend>
        <div className="grid grid-cols-3 gap-2">
          {tiposContacto.map(({ value, singular, icon: Icon }) => (
            <label
              key={value}
              className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-3 text-sm font-medium has-checked:border-primary has-checked:bg-muted"
            >
              <input
                type="radio"
                name="tipo"
                value={value}
                defaultChecked={value === tipoInicial}
                className="sr-only"
              />
              <Icon className="size-5" />
              {singular}
            </label>
          ))}
        </div>
        {state?.fieldErrors?.tipo?.map((e) => (
          <p key={e} className="text-sm text-destructive">
            {e}
          </p>
        ))}
      </fieldset>
      <Field label="Nombre" htmlFor="nombre" errors={state?.fieldErrors?.nombre}>
        <Input id="nombre" name="nombre" required autoComplete="off" className="h-11" />
      </Field>
      <Field label="Teléfono (opcional)" htmlFor="telefono" errors={state?.fieldErrors?.telefono}>
        <Input id="telefono" name="telefono" type="tel" inputMode="tel" className="h-11" />
      </Field>
      <FormError message={state?.error} />
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? "Guardando…" : "Guardar contacto"}
      </Button>
    </form>
  );
}
