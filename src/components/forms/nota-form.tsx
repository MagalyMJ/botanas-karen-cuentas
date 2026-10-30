"use client";

import { useActionState, useState } from "react";
import { crearNota } from "@/lib/actions";
import { ahoraLocal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AtendioSelect, type Empleado } from "./atendio-select";
import { BotonGuardar } from "./boton-guardar";
import { CampoNumero } from "./campo-numero";
import { DetalleNota } from "./detalle-nota";
import { Field, FormError } from "./field";

// Mismos colores que los chips de la nota: "Me debe" salvia, "Le debo" terracota.
const opcionesTipo = [
  {
    value: "por_cobrar",
    label: "Me debe",
    ayuda: "Le presté o le vendí",
    elegida: "has-checked:border-salvia has-checked:bg-salvia/10",
    titulo: "group-has-checked:text-salvia",
  },
  {
    value: "por_pagar",
    label: "Le debo",
    ayuda: "Me prestó o le compré",
    elegida: "has-checked:border-terracota has-checked:bg-terracota/10",
    titulo: "group-has-checked:text-terracota",
  },
] as const;

export function NotaForm({
  contactoId,
  empleados,
  usuarioNombre,
  descripciones,
}: {
  contactoId: number;
  empleados: Empleado[];
  usuarioNombre: string;
  descripciones: string[];
}) {
  const [state, action, pending] = useActionState(crearNota.bind(null, contactoId), undefined);
  // El monto se llena con la suma del detalle hasta que alguien lo escribe a mano.
  const [monto, setMonto] = useState("");
  const [montoManual, setMontoManual] = useState(false);
  // Se usa dentro de un modal, que se monta al abrirlo: fecha y hora sugeridas = al abrir.
  const [fechaInicial] = useState(ahoraLocal);
  return (
    <form action={action} className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Tipo de nota</legend>
        <div className="grid grid-cols-2 gap-2">
          {opcionesTipo.map((o) => (
            <label
              key={o.value}
              className={cn("group cursor-pointer rounded-lg border bg-background p-3", o.elegida)}
            >
              <input
                type="radio"
                name="tipo"
                value={o.value}
                defaultChecked={o.value === "por_cobrar"}
                className="sr-only"
              />
              <span className={cn("block font-semibold", o.titulo)}>{o.label}</span>
              <span className="block text-xs text-muted-foreground">{o.ayuda}</span>
            </label>
          ))}
        </div>
        {state?.fieldErrors?.tipo?.map((e) => (
          <p key={e} className="text-sm text-destructive">
            {e}
          </p>
        ))}
      </fieldset>
      <DetalleNota
        descripciones={descripciones}
        errores={state?.fieldErrors?.lineas}
        onTotal={(total) => {
          if (!montoManual) setMonto(total > 0 ? total.toFixed(2) : "");
        }}
      />
      <Field label="Monto" htmlFor="montoOriginal" errors={state?.fieldErrors?.montoOriginal}>
        <CampoNumero
          id="montoOriginal"
          name="montoOriginal"
          required
          value={monto}
          onChange={(e) => {
            setMonto(e.target.value);
            setMontoManual(e.target.value !== "");
          }}
          className="h-11 text-lg"
        />
      </Field>
      <Field label="Fecha y hora" htmlFor="fechaInicio" errors={state?.fieldErrors?.fechaInicio}>
        <Input id="fechaInicio" name="fechaInicio" type="datetime-local" defaultValue={fechaInicial} required className="h-11" />
      </Field>
      <AtendioSelect
        empleados={empleados}
        usuarioNombre={usuarioNombre}
        errors={state?.fieldErrors?.atendidoPorId}
      />
      <Field label="Observaciones (opcional)" htmlFor="observacion" errors={state?.fieldErrors?.observacion}>
        <Textarea
          id="observacion"
          name="observacion"
          rows={2}
          maxLength={1000}
          placeholder="Ej. Incluye el pedido del lunes"
        />
      </Field>
      <FormError message={state?.error} />
      <BotonGuardar pending={pending}>Guardar nota</BotonGuardar>
    </form>
  );
}
