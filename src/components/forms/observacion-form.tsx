"use client";

import { useActionState, useEffect, useEffectEvent, useRef } from "react";
import { toast } from "sonner";
import { agregarObservacion } from "@/lib/actions";
import { Textarea } from "@/components/ui/textarea";
import { BotonGuardar } from "./boton-guardar";
import { FormError } from "./field";
import { useCerrarModal } from "./modal-formulario";

/** Agrega una observación interna a la nota (no se puede editar ni borrar después). */
export function ObservacionForm({ notaId }: { notaId: number }) {
  const [state, action, pending] = useActionState(agregarObservacion.bind(null, notaId), undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const cerrarModal = useCerrarModal();

  const alGuardar = useEffectEvent(() => {
    toast.success("Observación agregada");
    formRef.current?.reset();
    cerrarModal();
  });
  useEffect(() => {
    if (state?.ok) alGuardar();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-4">
      <Textarea
        name="texto"
        aria-label="Nueva observación"
        placeholder="Ej. Incluye el pedido del lunes"
        rows={4}
        maxLength={1000}
        required
      />
      {state?.fieldErrors?.texto?.map((e) => (
        <p key={e} className="text-sm text-destructive">
          {e}
        </p>
      ))}
      <FormError message={state?.error} />
      <BotonGuardar pending={pending}>Guardar</BotonGuardar>
    </form>
  );
}
