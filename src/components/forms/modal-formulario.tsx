"use client";

import { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CerrarModal = createContext<() => void>(() => {});

// En el celular (< sm) los formularios se abren como hoja inferior: suben desde abajo y ocupan
// todo el ancho. Miden lo que su contenido (crecen hacia arriba) hasta un tope de la pantalla
// menos 40px; al llegar al tope, el título queda fijo arriba, el BotonGuardar fijo abajo y
// solo se desplaza lo de en medio (`cuerpo`). Desde sm vuelven al modal centrado del base.
const hojaInferior = cn(
  "max-sm:flex max-sm:flex-col max-sm:overflow-hidden",
  "max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-h-[calc(100dvh-2.5rem)]",
  "max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0",
  "max-sm:rounded-b-none max-sm:pb-[max(1rem,env(safe-area-inset-bottom))]",
  "max-sm:data-open:zoom-in-100 max-sm:data-open:slide-in-from-bottom",
  "max-sm:data-closed:zoom-out-100 max-sm:data-closed:slide-out-to-bottom",
);

/**
 * Para los formularios dentro de un ModalFormulario: cierra el modal (llamarlo al guardar).
 * Fuera de un modal no hace nada, así que el mismo formulario sirve en ambos lugares.
 */
export function useCerrarModal() {
  return useContext(CerrarModal);
}

/**
 * Botón primario que abre un formulario en un modal. Los formularios se cierran solos al
 * guardar con `useCerrarModal`. Se puede usar desde páginas del servidor: `boton` y `children`
 * son JSX, sin funciones.
 */
export function ModalFormulario({
  boton,
  titulo,
  descripcion,
  ancho = "normal",
  children,
}: {
  boton: React.ReactNode;
  titulo: string;
  descripcion?: string;
  /** "amplio" para formularios con renglones (p. ej. el detalle de la nota). */
  ancho?: "normal" | "amplio";
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button type="button" />}>{boton}</DialogTrigger>
      <DialogContent
        className={cn(
          hojaInferior,
          ancho === "amplio" ? "sm:max-h-[90dvh] sm:overflow-y-auto sm:max-w-2xl" : "sm:max-w-md",
        )}
      >
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>
        <CerrarModal.Provider value={() => setAbierto(false)}>
          {/* Cuerpo: la única parte que se desplaza en la hoja inferior. El margen negativo con
              padding deja espacio para el anillo de enfoque de los campos sin recortarlo (abajo
              ese espacio lo pone el contenedor de BotonGuardar, para que quede pegado al borde). */}
          <div className="max-sm:-mx-4 max-sm:-mt-1 max-sm:min-h-0 max-sm:overflow-y-auto max-sm:px-4 max-sm:pt-1">
            {children}
          </div>
        </CerrarModal.Provider>
      </DialogContent>
    </Dialog>
  );
}
