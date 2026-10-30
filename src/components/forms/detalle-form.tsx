"use client";

import { useActionState, useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";
import { guardarDetalle } from "@/lib/actions";
import { formatoMoneda, totalLineas } from "@/lib/format";
import { BotonGuardar } from "./boton-guardar";
import { DetalleNota, type LineaGuardada } from "./detalle-nota";
import { FormError } from "./field";
import { useCerrarModal } from "./modal-formulario";

/** Edita todos los renglones del detalle de una nota (se usa dentro del modal "Editar"). */
export function DetalleForm({
  notaId,
  lineas,
  monto,
  descripciones,
}: {
  notaId: number;
  lineas: LineaGuardada[];
  /** Monto vigente de la nota, para avisar si el detalle no cuadra. */
  monto: number;
  descripciones: string[];
}) {
  const [state, action, pending] = useActionState(guardarDetalle.bind(null, notaId), undefined);
  const [suma, setSuma] = useState(() => totalLineas(lineas));
  const cerrarModal = useCerrarModal();

  const alGuardar = useEffectEvent(() => {
    toast.success("Detalle guardado");
    cerrarModal();
  });
  useEffect(() => {
    if (state?.ok) alGuardar();
  }, [state]);

  return (
    <form action={action} className="grid gap-4">
      <DetalleNota
        descripciones={descripciones}
        errores={state?.fieldErrors?.lineas}
        inicial={lineas}
        leyenda={false}
        onTotal={setSuma}
      />
      {suma !== monto && (
        <p role="status" className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          El detalle suma {formatoMoneda(suma)}, pero la nota es de {formatoMoneda(monto)}.
        </p>
      )}
      <FormError message={state?.error} />
      <BotonGuardar pending={pending}>Guardar detalle</BotonGuardar>
    </form>
  );
}
