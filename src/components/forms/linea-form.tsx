"use client";

import { useActionState, useEffect, useRef } from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { agregarLinea } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoNumero } from "./campo-numero";
import { columnasAgregarRenglon } from "./detalle-columnas";
import { SugerenciasDescripcion } from "./detalle-nota";
import { FormError } from "./field";

/** Agrega un renglón de detalle a una nota existente, en la misma línea que la lista. */
export function LineaForm({ notaId, descripciones }: { notaId: number; descripciones: string[] }) {
  const [state, action, pending] = useActionState(agregarLinea.bind(null, notaId), undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Renglón agregado");
      formRef.current?.reset();
    }
  }, [state]);

  const errores = state?.fieldErrors
    ? [state.fieldErrors.cantidad, state.fieldErrors.descripcion, state.fieldErrors.precioUnitario].flat()
    : [];

  return (
    <form ref={formRef} action={action} className="grid gap-2">
      <SugerenciasDescripcion id="descripciones-usadas" descripciones={descripciones} />
      <div className={columnasAgregarRenglon}>
        <CampoNumero
          decimales={3}
          name="cantidad"
          aria-label="Cantidad"
          defaultValue="1"
          required
          className="h-10 text-right"
        />
        <Input
          name="descripcion"
          aria-label="Descripción"
          placeholder="Agregar renglón…"
          list="descripciones-usadas"
          maxLength={200}
          required
          className="h-10"
        />
        <CampoNumero
          name="precioUnitario"
          aria-label="Precio c/u"
          placeholder="Precio c/u"
          required
          className="h-10 text-right"
        />
        <Button type="submit" size="icon" aria-label="Agregar renglón" disabled={pending} className="size-10">
          <PlusIcon />
        </Button>
      </div>
      {errores.map((e) =>
        e ? (
          <p key={e} className="text-sm text-destructive">
            {e}
          </p>
        ) : null,
      )}
      <FormError message={state?.error} />
    </form>
  );
}
