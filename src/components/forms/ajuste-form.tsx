"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { registrarAjuste } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError } from "./field";

const opcionesDireccion = [
  { value: "aumentar", label: "Sube", ayuda: "Faltó cobrar algo" },
  { value: "disminuir", label: "Baja", ayuda: "Se cobró de más" },
] as const;

/** Corrige el monto de una nota sin modificarla: registra la diferencia y su motivo. */
export function AjusteForm({ notaId }: { notaId: number }) {
  const [state, action, pending] = useActionState(registrarAjuste.bind(null, notaId), undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Corrección registrada");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">El monto…</legend>
        <div className="grid grid-cols-2 gap-2">
          {opcionesDireccion.map((o) => (
            <label
              key={o.value}
              className="cursor-pointer rounded-lg border p-3 has-checked:border-primary has-checked:bg-muted"
            >
              <input
                type="radio"
                name="direccion"
                value={o.value}
                defaultChecked={o.value === "disminuir"}
                className="sr-only"
              />
              <span className="block font-medium">{o.label}</span>
              <span className="block text-xs text-muted-foreground">{o.ayuda}</span>
            </label>
          ))}
        </div>
        {state?.fieldErrors?.direccion?.map((e) => (
          <p key={e} className="text-sm text-destructive">
            {e}
          </p>
        ))}
      </fieldset>
      <Field label="Diferencia" htmlFor="monto" errors={state?.fieldErrors?.monto}>
        <Input
          id="monto"
          name="monto"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          required
          className="h-11 text-lg"
        />
      </Field>
      <Field label="Motivo" htmlFor="motivo" errors={state?.fieldErrors?.motivo}>
        <Textarea
          id="motivo"
          name="motivo"
          rows={2}
          maxLength={500}
          required
          placeholder="Ej. El precio era $45, no $50"
        />
      </Field>
      <FormError message={state?.error} />
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? "Guardando…" : "Guardar corrección"}
      </Button>
    </form>
  );
}
