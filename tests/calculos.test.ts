import { describe, expect, it } from "vitest";
import { importeLinea, montoVigente, textoResponsable, totalLineas } from "@/lib/format";
import { lineaSchema } from "@/lib/validaciones";

describe("cálculos del detalle", () => {
  it("redondea importes a centavos y suma sin errores de punto flotante", () => {
    expect(importeLinea({ cantidad: 3, precioUnitario: 0.1 })).toBe(0.3);
    expect(importeLinea({ cantidad: 0.333, precioUnitario: 10 })).toBe(3.33);
    expect(totalLineas([{ cantidad: 1, precioUnitario: 0.1 }, { cantidad: 1, precioUnitario: 0.2 }])).toBe(0.3);
    expect(totalLineas([])).toBe(0);
  });

  it("monto vigente = original + correcciones", () => {
    expect(montoVigente({ montoOriginal: 400, ajustesTotal: -40 })).toBe(360);
    expect(montoVigente({ montoOriginal: 0.1, ajustesTotal: 0.2 })).toBe(0.3);
  });

  it("texto de quién atendió y registró", () => {
    expect(textoResponsable("Luis", "Karen")).toBe("Atendió Luis · registró Karen");
    expect(textoResponsable(null, "Karen")).toBe("Atendió y registró Karen");
  });
});

describe("validación de un renglón", () => {
  const valida = (r: Record<string, string>) => lineaSchema.safeParse({ descripcion: "X", cantidad: "1", precioUnitario: "1", ...r });

  it("un precio vacío es error, no $0", () => {
    expect(valida({ precioUnitario: "" }).error?.issues[0].message).toBe("Escribe el precio");
    expect(valida({ precioUnitario: "0" }).data?.precioUnitario).toBe(0);
  });

  it("rechaza cantidad cero o negativa, precio negativo y descripción vacía", () => {
    expect(valida({ cantidad: "0" }).success).toBe(false);
    expect(valida({ cantidad: "-1" }).success).toBe(false);
    expect(valida({ precioUnitario: "-1" }).success).toBe(false);
    expect(valida({ descripcion: "   " }).success).toBe(false);
  });

  it("redondea cantidad a 3 decimales y precio a centavos", () => {
    expect(valida({ cantidad: "1.23456", precioUnitario: "9.999" }).data).toMatchObject({ cantidad: 1.235, precioUnitario: 10 });
  });
});
