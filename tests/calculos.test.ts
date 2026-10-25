import { describe, expect, it } from "vitest";
import { importeLinea, montoVigente, textoResponsable, totalLineas } from "@/lib/format";
import { lineaSchema, pagoSchema } from "@/lib/validaciones";
import { limpiarNumero, regexEscribiendo, regexNumero } from "@/lib/numeros";

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

  it("acepta hasta 3 decimales en cantidad y 2 en precio", () => {
    expect(valida({ cantidad: "1.235", precioUnitario: "9.99" }).data).toMatchObject({ cantidad: 1.235, precioUnitario: 9.99 });
    expect(valida({ cantidad: "1.2345" }).success).toBe(false);
    expect(valida({ precioUnitario: "9.999" }).success).toBe(false);
  });
});

describe("campos numéricos", () => {
  it("mientras se escribe solo se permiten dígitos y un punto, con los decimales permitidos", () => {
    const escribiendo = regexEscribiendo(2);
    for (const ok of ["", "6", "60", "60.", "59.3", "59.30", ".5"]) expect(escribiendo.test(ok), ok).toBe(true);
    for (const mal of ["59,30", "$60", "-5", "59.305", "1.2.3", "6 0", "abc"]) expect(escribiendo.test(mal), mal).toBe(false);
    expect(regexEscribiendo(3).test("1.234")).toBe(true);
  });

  it("el respaldo limpia sin convertir comas (no inventa otro monto)", () => {
    expect(limpiarNumero("59.30", 2)).toBe("59.30");
    expect(limpiarNumero("$60", 2)).toBe("60");
    expect(limpiarNumero("1.2.3", 2)).toBe("1.23");
    expect(limpiarNumero("59.305", 2)).toBe("59.30");
    expect(limpiarNumero("abc", 2)).toBe("");
  });

  it("el regex acepta números completos y rechaza lo demás", () => {
    const dosDecimales = regexNumero(2);
    for (const ok of ["60", "59.3", "59.30", "0.5", ".5", "5."]) expect(dosDecimales.test(ok), ok).toBe(true);
    for (const mal of ["", ".", "59,30", "59.305", "-5", "1e3", " 5", "5 5", "abc", "1.2.3"]) {
      expect(dosDecimales.test(mal), mal).toBe(false);
    }
  });

  it("el servidor rechaza montos con letras, comas o más de 2 decimales", () => {
    const pago = (montoPagado: string) =>
      pagoSchema.safeParse({ atendidoPorId: "", montoPagado, fechaPago: "2026-10-24T12:00", comentario: "" });
    expect(pago("60").data?.montoPagado).toBe(60);
    expect(pago(" 59.30 ").data?.montoPagado).toBe(59.3);
    for (const mal of ["1e3", "59,30", "59.305", "0x10", "Infinity", ""]) {
      expect(pago(mal).success, mal).toBe(false);
    }
  });
});
