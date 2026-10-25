import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { agregarLinea, crearNota, quitarLinea } from "@/lib/actions";
import { notaLineas, notas } from "@/db/schema";
import { comoUsuario, entorno, formulario, leerNota, Redireccion, sembrar } from "./entorno";

const nota = (extra: Record<string, string | string[]> = {}) =>
  formulario({ tipo: "por_cobrar", montoOriginal: "500", fechaInicio: "2026-10-24T09:30", ...extra });

/** crearNota termina con redirect() a la nota nueva; devuelve su id. */
async function crearYObtenerId(contactoId: number, fd: FormData) {
  const error = await crearNota(contactoId, undefined, fd).then(
    (r) => r,
    (e) => e,
  );
  expect(error).toBeInstanceOf(Redireccion);
  return Number((error as Redireccion).url.replace("/notas/", ""));
}

const lineasDe = (notaId: number) =>
  entorno.db.select().from(notaLineas).where(eq(notaLineas.notaId, notaId)).orderBy(notaLineas.id);

describe("crearNota", () => {
  it("crea la nota con saldo igual al monto y sin detalle", async () => {
    const { usuarios, contactos } = await sembrar();
    comoUsuario(usuarios.editor);

    const id = await crearYObtenerId(contactos.donPepe.id, nota());
    expect(await leerNota(id)).toMatchObject({
      contactoId: contactos.donPepe.id,
      montoOriginal: 500,
      saldoPendiente: 500,
      ajustesTotal: 0,
      estado: "activo",
      registradoPorId: usuarios.editor,
    });
    expect(await lineasDe(id)).toHaveLength(0);
  });

  it("guarda el detalle junto con la nota e ignora renglones vacíos", async () => {
    const { usuarios, contactos } = await sembrar();
    comoUsuario(usuarios.editor);

    const id = await crearYObtenerId(
      contactos.donPepe.id,
      nota({
        lineaDescripcion: ["Cacahuate 1 kg", "", "Chicharrón"],
        lineaCantidad: ["2.5", "", "10"],
        lineaPrecio: ["80", "", "30"],
      }),
    );
    expect(await lineasDe(id)).toMatchObject([
      { descripcion: "Cacahuate 1 kg", cantidad: 2.5, precioUnitario: 80, registradoPorId: usuarios.editor },
      { descripcion: "Chicharrón", cantidad: 10, precioUnitario: 30 },
    ]);
  });

  it("si un renglón es inválido no guarda nada y dice cuál revisar", async () => {
    const { usuarios, contactos } = await sembrar();
    comoUsuario(usuarios.editor);
    const antes = (await entorno.db.select().from(notas)).length;

    const r = await crearNota(
      contactos.donPepe.id,
      undefined,
      nota({ lineaDescripcion: ["Cacahuate", "Papas"], lineaCantidad: ["1", "2"], lineaPrecio: ["80", ""] }),
    );
    expect(r?.fieldErrors?.lineas).toEqual(["Renglón 2: Escribe el precio"]);
    expect(await entorno.db.select().from(notas)).toHaveLength(antes);
    expect(await entorno.db.select().from(notaLineas)).toHaveLength(0);
  });
});

describe("detalle después de crear la nota", () => {
  it("agrega y quita renglones sin cambiar el monto ni el saldo", async () => {
    const { usuarios, notas } = await sembrar();
    comoUsuario(usuarios.editor);
    const id = notas.donPepe.id;

    const fd = formulario({ descripcion: "Cacahuate", cantidad: "3", precioUnitario: "25" });
    expect(await agregarLinea(id, undefined, fd)).toEqual({ ok: true });
    const [linea] = await lineasDe(id);
    expect(linea).toMatchObject({ descripcion: "Cacahuate", cantidad: 3, precioUnitario: 25 });
    expect(await leerNota(id)).toMatchObject({ montoOriginal: 1000, saldoPendiente: 1000 });

    await quitarLinea(id, linea.id);
    expect(await lineasDe(id)).toHaveLength(0);
  });

  it("no quita un renglón si no pertenece a la nota indicada", async () => {
    const { usuarios, notas } = await sembrar();
    comoUsuario(usuarios.editor);
    await agregarLinea(notas.donPepe.id, undefined, formulario({ descripcion: "X", cantidad: "1", precioUnitario: "1" }));
    const [linea] = await lineasDe(notas.donPepe.id);

    await quitarLinea(notas.proveedor.id, linea.id);
    expect(await lineasDe(notas.donPepe.id)).toHaveLength(1);
  });
});
