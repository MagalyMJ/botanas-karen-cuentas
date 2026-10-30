"use client";

import { useActionState, useEffect, useEffectEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { registrarPago } from "@/lib/actions";
import { ahoraLocal } from "@/lib/format";
import type { FormState } from "@/lib/validaciones";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AtendioSelect, type Empleado } from "./atendio-select";
import { BotonGuardar } from "./boton-guardar";
import { CampoNumero } from "./campo-numero";
import { Field, FormError } from "./field";
import { useCerrarModal } from "./modal-formulario";

export function PagoForm({
  notaId,
  empleados,
  usuarioNombre,
}: {
  notaId: number;
  empleados: Empleado[];
  usuarioNombre: string;
}) {
  // Se usa dentro de un modal, que se monta al abrirlo: la fecha sugerida es "ahora" al abrir,
  // no cuando cargó la página. Tras registrar un pago vuelve a "ahora".
  const [fecha, setFecha] = useState(ahoraLocal);
  const [state, action, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const resultado = await registrarPago(notaId, prev, formData);
      if (resultado?.ok) setFecha(ahoraLocal());
      return resultado;
    },
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const cerrarModal = useCerrarModal();

  const alGuardar = useEffectEvent(() => {
    toast.success("Pago registrado");
    formRef.current?.reset();
    cerrarModal();
  });
  useEffect(() => {
    if (state?.ok) alGuardar();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
        <Field label="Monto del pago" htmlFor="montoPagado" errors={state?.fieldErrors?.montoPagado}>
          <CampoNumero
            id="montoPagado"
            name="montoPagado"
            required
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
      </div>
      <Field label="Comentario (opcional)" htmlFor="comentario" errors={state?.fieldErrors?.comentario}>
        <Textarea id="comentario" name="comentario" rows={2} maxLength={500} />
      </Field>
      <AtendioSelect
        empleados={empleados}
        usuarioNombre={usuarioNombre}
        errors={state?.fieldErrors?.atendidoPorId}
      />
      <FormError message={state?.error} />
      <BotonGuardar pending={pending} enProceso="Registrando…">Registrar pago</BotonGuardar>
    </form>
  );
}
