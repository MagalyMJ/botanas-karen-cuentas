"use client";

import { useActionState, useEffect, useRef } from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { agregarLinea } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SugerenciasDescripcion } from "./detalle-nota";
import { Field, FormError } from "./field";

/** Agrega un renglón de detalle a una nota existente. */
export function LineaForm({ notaId, descripciones }: { notaId: number; descripciones: string[] }) {
  const [state, action, pending] = useActionState(agregarLinea.bind(null, notaId), undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Renglón agregado");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-3">
      <SugerenciasDescripcion id="descripciones-usadas" descripciones={descripciones} />
      <Field label="¿Qué fue?" htmlFor="descripcion" errors={state?.fieldErrors?.descripcion}>
        <Input
          id="descripcion"
          name="descripcion"
          placeholder="Ej. Cacahuate japonés 1 kg"
          list="descripciones-usadas"
          maxLength={200}
          required
          className="h-11"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cantidad" htmlFor="cantidad" errors={state?.fieldErrors?.cantidad}>
          <Input
            id="cantidad"
            name="cantidad"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            defaultValue="1"
            required
            className="h-11"
          />
        </Field>
        <Field label="Precio c/u" htmlFor="precioUnitario" errors={state?.fieldErrors?.precioUnitario}>
          <Input
            id="precioUnitario"
            name="precioUnitario"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            required
            className="h-11"
          />
        </Field>
      </div>
      <FormError message={state?.error} />
      <Button type="submit" variant="outline" className="h-11" disabled={pending}>
        <PlusIcon />
        {pending ? "Agregando…" : "Agregar renglón"}
      </Button>
    </form>
  );
}
