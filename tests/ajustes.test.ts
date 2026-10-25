import { describe, expect, it } from "vitest";
import { registrarAjuste, registrarPago } from "@/lib/actions";
import { ajustes } from "@/db/schema";
import { comoUsuario, entorno, esperarSaldosCuadrados, formulario, leerNota, sembrar } from "./entorno";

const ajuste = (direccion: "aumentar" | "disminuir", monto: string, motivo = "Precio mal capturado") =>
  formulario({ direccion, monto, motivo });

describe("registrarAjuste", () => {
  it("baja el saldo sin tocar el monto original y guarda el motivo", async () => {
    const { usuarios, notas } = await sembrar();
    comoUsuario(usuarios.editor);
    const id = notas.donPepe.id;

    expect(await registrarAjuste(id, undefined, ajuste("disminuir", "50", "Era $950"))).toEqual({ ok: true });
    expect(await leerNota(id)).toMatchObject({ montoOriginal: 1000, ajustesTotal: -50, saldoPendiente: 950 });

    const [guardado] = await entorno.db.select().from(ajustes);
    expect(guardado).toMatchObject({ monto: -50, motivo: "Era $950", registradoPorId: usuarios.editor });
    await esperarSaldosCuadrados();
  });

  it("no deja el saldo en negativo", async () => {
    const { usuarios, notas } = await sembrar();
    comoUsuario(usuarios.editor);
    const id = notas.donPepe.id;
    await registrarPago(id, undefined, formulario({ montoPagado: "900", fechaPago: "2026-10-24T12:00" }));

    const r = await registrarAjuste(id, undefined, ajuste("disminuir", "150"));
    expect(r?.fieldErrors?.monto?.[0]).toMatch(/No puede bajar más que el saldo pendiente/);
    expect(await leerNota(id)).toMatchObject({ saldoPendiente: 100, ajustesTotal: 0 });
    expect(await entorno.db.select().from(ajustes)).toHaveLength(0);
  });

  it("marca la nota pagada si la corrección deja el saldo en cero, y la reabre si sube", async () => {
    const { usuarios, notas } = await sembrar();
    comoUsuario(usuarios.editor);
    const id = notas.donPepe.id;
    await registrarPago(id, undefined, formulario({ montoPagado: "900", fechaPago: "2026-10-24T12:00" }));

    await registrarAjuste(id, undefined, ajuste("disminuir", "100"));
    expect(await leerNota(id)).toMatchObject({ saldoPendiente: 0, estado: "pagado" });

    await registrarAjuste(id, undefined, ajuste("aumentar", "30", "Faltó cobrar una bolsa"));
    expect(await leerNota(id)).toMatchObject({ saldoPendiente: 30, ajustesTotal: -70, estado: "activo" });
    await esperarSaldosCuadrados();
  });

  it("después de una corrección que sube, acepta pagos hasta el nuevo saldo", async () => {
    const { usuarios, notas } = await sembrar();
    comoUsuario(usuarios.editor);
    const id = notas.donPepe.id;

    await registrarAjuste(id, undefined, ajuste("aumentar", "200"));
    const fecha = "2026-10-24T12:00";
    expect(await registrarPago(id, undefined, formulario({ montoPagado: "1200", fechaPago: fecha }))).toEqual({ ok: true });
    expect(await leerNota(id)).toMatchObject({ saldoPendiente: 0, estado: "pagado" });
    await esperarSaldosCuadrados();
  });

  it("exige motivo y un monto válido", async () => {
    const { usuarios, notas } = await sembrar();
    comoUsuario(usuarios.editor);

    expect((await registrarAjuste(notas.donPepe.id, undefined, ajuste("disminuir", "10", "  ")))?.fieldErrors?.motivo).toBeDefined();
    expect((await registrarAjuste(notas.donPepe.id, undefined, ajuste("disminuir", "0")))?.fieldErrors?.monto).toBeDefined();
    expect(await entorno.db.select().from(ajustes)).toHaveLength(0);
  });
});
