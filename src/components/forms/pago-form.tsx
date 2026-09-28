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
  notaId,
  saldoPendiente,
  fechaHoy,
}: {
  notaId: number;
  saldoPendiente: number;
  fechaHoy: string;
}) {
  const [state, action, pending] = useActionState(registrarPago.bind(null, notaId), undefined);
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
      <Field label="Fecha y hora" htmlFor="fechaPago" errors={state?.fieldErrors?.fechaPago}>
        <Input id="fechaPago" name="fechaPago" type="datetime-local" defaultValue={fechaHoy} required className="h-11" />
      </Field>
      <Field label="Comentario (opcional)" htmlFor="comentario" errors={state?.fieldErrors?.comentario}>
        <Textarea id="comentario" name="comentario" rows={2} maxLength={500} />
      </Field>
      <FormError message={state?.error} />
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? "Registrando…" : "Registrar pago"}
      </Button>
    </form>
  );
}
