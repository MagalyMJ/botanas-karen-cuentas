"use client";

import { useActionState, useState } from "react";
import { crearNota } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AtendioSelect, type Empleado } from "./atendio-select";
import { CampoNumero } from "./campo-numero";
import { DetalleNota } from "./detalle-nota";
import { Field, FormError } from "./field";

const opcionesTipo = [
  { value: "por_cobrar", label: "Me debe", ayuda: "Le presté o le vendí" },
  { value: "por_pagar", label: "Le debo", ayuda: "Me prestó o le compré" },
] as const;

export function NotaForm({
  contactoId,
  fechaHoy,
  empleados,
  usuarioNombre,
  descripciones,
}: {
  contactoId: number;
  fechaHoy: string;
  empleados: Empleado[];
  usuarioNombre: string;
  descripciones: string[];
}) {
  const [state, action, pending] = useActionState(crearNota.bind(null, contactoId), undefined);
  // El monto se llena con la suma del detalle hasta que alguien lo escribe a mano.
  const [monto, setMonto] = useState("");
  const [montoManual, setMontoManual] = useState(false);
  return (
    <form action={action} className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Tipo de nota</legend>
        <div className="grid grid-cols-2 gap-2">
          {opcionesTipo.map((o) => (
            <label
              key={o.value}
              className="cursor-pointer rounded-lg border p-3 has-checked:border-primary has-checked:bg-muted"
            >
              <input
                type="radio"
                name="tipo"
                value={o.value}
                defaultChecked={o.value === "por_cobrar"}
                className="sr-only"
              />
              <span className="block font-medium">{o.label}</span>
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
        <Input id="fechaInicio" name="fechaInicio" type="datetime-local" defaultValue={fechaHoy} required className="h-11" />
      </Field>
      <AtendioSelect
        empleados={empleados}
        usuarioNombre={usuarioNombre}
        errors={state?.fieldErrors?.atendidoPorId}
      />
      <FormError message={state?.error} />
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? "Guardando…" : "Guardar nota"}
      </Button>
    </form>
  );
}
