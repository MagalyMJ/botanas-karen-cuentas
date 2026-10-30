"use client";

import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { limpiarNumero, patronNumero, regexEscribiendo } from "@/lib/numeros";

/**
 * Campo de texto para montos, precios y cantidades. No usa type="number" porque ese cambia
 * el valor al deslizar con el trackpad o la rueda, o con las flechas del teclado.
 * Abre el teclado numérico en el celular y solo deja escribir o pegar dígitos y un punto:
 * lo demás se rechaza completo en vez de "arreglarlo" (una coma pegada podría cambiar el monto).
 * Funciona controlado (value + onChange) o no controlado (defaultValue).
 * Los campos de dinero (2 decimales, el valor por defecto) muestran "$0.00" como placeholder.
 */
export function CampoNumero({
  decimales = 2,
  onChange,
  placeholder = decimales === 2 ? "$0.00" : undefined,
  ...props
}: Omit<React.ComponentProps<"input">, "type" | "inputMode" | "pattern" | "ref"> & { decimales?: number }) {
  // `beforeinput` se puede cancelar antes de que el texto llegue al campo (teclear, pegar,
  // arrastrar). React no lo expone de forma fiable, así que se escucha directo.
  const bloquearInvalido = useCallback(
    (el: HTMLInputElement | null) => {
      if (!el) return;
      const permitido = regexEscribiendo(decimales);
      const alEscribir = (e: InputEvent) => {
        if (!e.inputType.startsWith("insert") || !e.cancelable) return;
        const texto = e.data ?? e.dataTransfer?.getData("text/plain") ?? "";
        const inicio = el.selectionStart ?? el.value.length;
        const fin = el.selectionEnd ?? inicio;
        if (!permitido.test(el.value.slice(0, inicio) + texto + el.value.slice(fin))) e.preventDefault();
      };
      el.addEventListener("beforeinput", alEscribir);
      return () => el.removeEventListener("beforeinput", alEscribir);
    },
    [decimales],
  );

  return (
    <Input
      {...props}
      placeholder={placeholder}
      ref={bloquearInvalido}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      pattern={patronNumero(decimales)}
      title={decimales > 0 ? "Escribe solo números y punto decimal, p. ej. 59.30" : "Escribe solo números"}
      onChange={(e) => {
        const limpio = limpiarNumero(e.currentTarget.value, decimales);
        if (limpio !== e.currentTarget.value) e.currentTarget.value = limpio;
        onChange?.(e);
      }}
    />
  );
}
