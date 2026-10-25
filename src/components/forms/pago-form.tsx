"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { registrarPago } from "@/lib/actions";
import { ahoraLocal, formatoMoneda } from "@/lib/format";
import type { FormState } from "@/lib/validaciones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AtendioSelect, type Empleado } from "./atendio-select";
import { CampoNumero } from "./campo-numero";
import { Field, FormError } from "./field";

export function PagoForm({
  notaId,
  saldoPendiente,
  fechaHoy,
  empleados,
  usuarioNombre,
}: {
  notaId: number;
  saldoPendiente: number;
  fechaHoy: string;
  empleados: Empleado[];
  usuarioNombre: string;
}) {
  // Controlada: la página se vuelve a renderizar tras cada pago con otra `fechaHoy`, y un
  // campo no controlado no puede cambiar su valor inicial. Tras registrar, vuelve a "ahora".
  const [fecha, setFecha] = useState(fechaHoy);
  const [state, action, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const resultado = await registrarPago(notaId, prev, formData);
      if (resultado?.ok) setFecha(ahoraLocal());
      return resultado;
    },
    undefined,
  );
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
        <CampoNumero
          id="montoPagado"
          name="montoPagado"
          required
          placeholder={`Saldo: ${formatoMoneda(saldoPendiente)}`}
          className="h-11 text-lg"
        />
      </Field>
      <Field label="Fecha y hora" htmlFor="fechaPago" errors={state?.fieldErrors?.fechaPago}>
        <Input
          id="fechaPago"
          name="fechaPago"
          type="datetime-local"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          required
          className="h-11"
        />
      </Field>
      <Field label="Comentario (opcional)" htmlFor="comentario" errors={state?.fieldErrors?.comentario}>
        <Textarea id="comentario" name="comentario" rows={2} maxLength={500} />
      </Field>
      <AtendioSelect
        empleados={empleados}
        usuarioNombre={usuarioNombre}
        errors={state?.fieldErrors?.atendidoPorId}
      />
      <FormError message={state?.error} />
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? "Registrando…" : "Registrar pago"}
      </Button>
    </form>
  );
}
