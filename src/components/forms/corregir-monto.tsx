"use client";

import { useState } from "react";
import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AjusteForm } from "./ajuste-form";

/** Botón que abre el formulario de corrección en un modal; se cierra solo al guardar. */
export function CorregirMonto({ notaId }: { notaId: number }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button type="button" />}>
        <PencilIcon />
        Corregir monto
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Corregir monto</DialogTitle>
          <DialogDescription>
            La nota original se conserva: se registra la diferencia y su motivo.
          </DialogDescription>
        </DialogHeader>
        <AjusteForm notaId={notaId} onGuardado={() => setAbierto(false)} />
      </DialogContent>
    </Dialog>
  );
}
