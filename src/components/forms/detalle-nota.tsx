"use client";

import { useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { formatoMoneda, importeLinea, totalLineas } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoNumero } from "./campo-numero";
import { columnasDetalle, EncabezadoDetalle } from "./detalle-columnas";

// `id` es el renglón ya guardado (al editar); null = renglón nuevo.
type Renglon = { key: number; id: number | null; descripcion: string; cantidad: string; precio: string };

export type LineaGuardada = { id: number; descripcion: string; cantidad: number; precioUnitario: number };

const nuevoRenglon = (key: number): Renglon => ({ key, id: null, descripcion: "", cantidad: "1", precio: "" });

function numero(valor: string) {
  if (valor.trim() === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Renglones con cantidad y precio capturados, para calcular importes y total. */
function conNumeros(renglones: Renglon[]) {
  return renglones.flatMap((x) => {
    const cantidad = numero(x.cantidad);
    const precioUnitario = numero(x.precio);
    return cantidad !== null && precioUnitario !== null ? [{ cantidad, precioUnitario }] : [];
  });
}

/** Lista de descripciones ya usadas, compartida por los campos de descripción. */
export function SugerenciasDescripcion({ id, descripciones }: { id: string; descripciones: string[] }) {
  return (
    <datalist id={id}>
      {descripciones.map((d) => (
        <option key={d} value={d} />
      ))}
    </datalist>
  );
}

/**
 * Editor de renglones del detalle: al crear una nota (vacío, opcional) y al editar el detalle
 * de una nota (`inicial`). Envía los campos repetidos lineaId, lineaDescripcion, lineaCantidad
 * y lineaPrecio (uno por renglón) y avisa el total, p. ej. para proponer el monto.
 */
export function DetalleNota({
  descripciones,
  errores,
  onTotal,
  inicial = [],
  leyenda = true,
}: {
  descripciones: string[];
  errores?: string[];
  onTotal?: (total: number) => void;
  inicial?: LineaGuardada[];
  /** Muestra "Detalle (opcional)" arriba; en un modal ya titulado no hace falta. */
  leyenda?: boolean;
}) {
  const [renglones, setRenglones] = useState<Renglon[]>(() =>
    inicial.map((l, i) => ({
      key: i + 1,
      id: l.id,
      descripcion: l.descripcion,
      cantidad: String(l.cantidad),
      precio: l.precioUnitario.toFixed(2),
    })),
  );

  function actualizar(siguientes: Renglon[]) {
    setRenglones(siguientes);
    onTotal?.(totalLineas(conNumeros(siguientes)));
  }

  const cambiar = (key: number, campo: keyof Omit<Renglon, "key">, valor: string) =>
    actualizar(renglones.map((x) => (x.key === key ? { ...x, [campo]: valor } : x)));
  const agregar = () => actualizar([...renglones, nuevoRenglon((renglones.at(-1)?.key ?? 0) + 1)]);
  const quitar = (key: number) => actualizar(renglones.filter((x) => x.key !== key));

  const total = totalLineas(conNumeros(renglones));

  return (
    <fieldset className="grid gap-2">
      {leyenda && (
        <legend className="mb-2 text-sm font-medium">
          Detalle <span className="font-normal text-muted-foreground">(opcional)</span>
        </legend>
      )}
      <SugerenciasDescripcion id="descripciones-usadas" descripciones={descripciones} />
      {renglones.length > 0 && <EncabezadoDetalle />}
      {renglones.map((x, i) => {
        const importe = conNumeros([x])[0];
        return (
          <div key={x.key} className={columnasDetalle}>
            <input type="hidden" name="lineaId" value={x.id ?? ""} />
            <CampoNumero
              decimales={3}
              name="lineaCantidad"
              aria-label={`Cantidad del renglón ${i + 1}`}
              value={x.cantidad}
              onChange={(e) => cambiar(x.key, "cantidad", e.target.value)}
              className="h-10 text-right"
            />
            <Input
              name="lineaDescripcion"
              aria-label={`Descripción del renglón ${i + 1}`}
              placeholder="Ej. Cacahuate japonés 1 kg"
              list="descripciones-usadas"
              maxLength={200}
              value={x.descripcion}
              onChange={(e) => cambiar(x.key, "descripcion", e.target.value)}
              className="h-10"
            />
            <CampoNumero
              name="lineaPrecio"
              aria-label={`Precio unitario del renglón ${i + 1}`}
              value={x.precio}
              onChange={(e) => cambiar(x.key, "precio", e.target.value)}
              className="h-10 text-right"
            />
            <span className="hidden text-right text-sm font-medium tabular-nums sm:block">
              {importe ? formatoMoneda(importeLinea(importe)) : "—"}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label={`Quitar renglón ${i + 1}`}
              className="size-10"
              onClick={() => quitar(x.key)}
            >
              <XIcon />
            </Button>
          </div>
        );
      })}
      {errores?.map((e) => (
        <p key={e} className="text-sm text-destructive">
          {e}
        </p>
      ))}
      <div className="mt-1 flex items-center justify-between gap-2">
        <Button type="button" variant="secondary" onClick={agregar}>
          <PlusIcon />
          {renglones.length === 0 ? (leyenda ? "Agregar detalle" : "Agregar") : "Nuevo"}
        </Button>
        {renglones.length > 0 && (
          <span className="text-sm text-muted-foreground">
            Suma <span className="font-medium text-foreground tabular-nums">{formatoMoneda(total)}</span>
          </span>
        )}
      </div>
    </fieldset>
  );
}
