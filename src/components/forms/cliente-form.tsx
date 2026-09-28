"use client";

import { useActionState } from "react";
import { crearCliente } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "./field";

export function ClienteForm() {
  const [state, action, pending] = useActionState(crearCliente, undefined);
  return (
    <form action={action} className="grid gap-4">
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
