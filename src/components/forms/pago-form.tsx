"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { registrarPago } from "@/lib/actions";
import { formatoMoneda } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError } from "./field";

export function PagoForm({
  prestamoId,
  saldoPendiente,
  fechaHoy,
}: {
  prestamoId: number;
  saldoPendiente: number;
  fechaHoy: string;
}) {
  const [state, action, pending] = useActionState(registrarPago.bind(null, prestamoId), undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Pago registrado");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-4">
      <Field label="Monto del pago" htmlFor="montoPagado" errors={state?.fieldErrors?.montoPagado}>
        <Input
          id="montoPagado"
          name="montoPagado"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          max={saldoPendiente}
          required
          placeholder={`Saldo: ${formatoMoneda(saldoPendiente)}`}
          className="h-11 text-lg"
        />
      </Field>
      <Field label="Fecha" htmlFor="fechaPago" errors={state?.fieldErrors?.fechaPago}>
        <Input id="fechaPago" name="fechaPago" type="date" defaultValue={fechaHoy} required className="h-11" />
      </Field>
      <Field label="Notas (opcional)" htmlFor="notas" errors={state?.fieldErrors?.notas}>
        <Textarea id="notas" name="notas" rows={2} maxLength={500} />
      </Field>
      <FormError message={state?.error} />
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? "Registrando…" : "Registrar pago"}
      </Button>
    </form>
  );
}
