import { describe, expect, it } from "vitest";
import { registrarPago } from "@/lib/actions";
import { pagos } from "@/db/schema";
import { comoUsuario, entorno, esperarSaldosCuadrados, formulario, leerNota, sembrar } from "./entorno";

const pago = (monto: string, extra: Record<string, string> = {}) =>
  formulario({ montoPagado: monto, fechaPago: "2026-10-24T12:00", ...extra });

describe("registrarPago", () => {
  it("descuenta el saldo, rechaza pagos mayores al saldo y marca la nota pagada en cero", async () => {
    const { usuarios, notas } = await sembrar();
    comoUsuario(usuarios.editor);
    const id = notas.donPepe.id;

    expect(await registrarPago(id, undefined, pago("300"))).toEqual({ ok: true });
    expect(await leerNota(id)).toMatchObject({ saldoPendiente: 700, estado: "activo" });

    const rechazo = await registrarPago(id, undefined, pago("800"));
    expect(rechazo?.fieldErrors?.montoPagado?.[0]).toMatch(/no puede ser mayor al saldo/);
    expect(await leerNota(id)).toMatchObject({ saldoPendiente: 700, estado: "activo" });

    expect(await registrarPago(id, undefined, pago("700"))).toEqual({ ok: true });
    expect(await leerNota(id)).toMatchObject({ saldoPendiente: 0, estado: "pagado" });

    // Una nota pagada ya no acepta pagos.
    expect(await registrarPago(id, undefined, pago("1"))).toEqual({ error: "La nota no existe o ya está pagada." });

    expect(await entorno.db.select().from(pagos)).toHaveLength(2);
    await esperarSaldosCuadrados();
  });

  it("guarda quién registró y quién atendió", async () => {
    const { usuarios, notas, contactos } = await sembrar();
    comoUsuario(usuarios.editor);

    await registrarPago(notas.donPepe.id, undefined, pago("100", { atendidoPorId: String(contactos.luis.id) }));
    const [guardado] = await entorno.db.select().from(pagos);
    expect(guardado).toMatchObject({ registradoPorId: usuarios.editor, atendidoPorId: contactos.luis.id });
  });

  it("solo acepta como 'atendió' a un empleado", async () => {
    const { usuarios, notas, contactos } = await sembrar();
    comoUsuario(usuarios.editor);

    const r = await registrarPago(notas.donPepe.id, undefined, pago("100", { atendidoPorId: String(contactos.donPepe.id) }));
    expect(r?.fieldErrors?.atendidoPorId).toBeDefined();
    expect(await leerNota(notas.donPepe.id)).toMatchObject({ saldoPendiente: 1000 });
  });

  it("valida el monto", async () => {
    const { usuarios, notas } = await sembrar();
    comoUsuario(usuarios.editor);

    for (const monto of ["0", "-5", "abc"]) {
      const r = await registrarPago(notas.donPepe.id, undefined, pago(monto));
      expect(r?.fieldErrors?.montoPagado).toBeDefined();
    }
    expect(await leerNota(notas.donPepe.id)).toMatchObject({ saldoPendiente: 1000 });
  });
});
