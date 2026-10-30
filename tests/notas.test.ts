import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { crearNota, guardarDetalle } from "@/lib/actions";
import { notaLineas, notas, observaciones } from "@/db/schema";
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

  it("guarda la observación opcional junto con la nota", async () => {
    const { usuarios, contactos } = await sembrar();
    comoUsuario(usuarios.editor);

    const conObservacion = await crearYObtenerId(contactos.donPepe.id, nota({ observacion: "  Entregar el lunes  " }));
    const sinObservacion = await crearYObtenerId(contactos.donPepe.id, nota({ observacion: "   " }));
    const guardadas = await entorno.db.select().from(observaciones);
    expect(guardadas).toMatchObject([{ notaId: conObservacion, texto: "Entregar el lunes", registradoPorId: usuarios.editor }]);
    expect(guardadas.some((o) => o.notaId === sinObservacion)).toBe(false);
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

describe("editar el detalle de una nota", () => {
  /** El formulario del modal "Editar": un renglón por posición; id "" = renglón nuevo. */
  const detalle = (renglones: { id?: number; descripcion: string; cantidad: string; precio: string }[]) =>
    formulario({
      lineaId: renglones.map((r) => (r.id ? String(r.id) : "")),
      lineaDescripcion: renglones.map((r) => r.descripcion),
      lineaCantidad: renglones.map((r) => r.cantidad),
      lineaPrecio: renglones.map((r) => r.precio),
    });

  it("agrega, cambia y quita renglones a la vez, sin tocar el monto ni el saldo", async () => {
    const { usuarios, notas } = await sembrar();
    comoUsuario(usuarios.editor);
    const id = notas.donPepe.id;

    expect(
      await guardarDetalle(id, undefined, detalle([
        { descripcion: "Cacahuate", cantidad: "3", precio: "25" },
        { descripcion: "Papas", cantidad: "1", precio: "10" },
      ])),
    ).toEqual({ ok: true });
    const [cacahuate, papas] = await lineasDe(id);

    // Cambia el precio del cacahuate, quita las papas y agrega chicharrón.
    expect(
      await guardarDetalle(id, undefined, detalle([
        { id: cacahuate.id, descripcion: "Cacahuate japonés", cantidad: "3", precio: "30" },
        { descripcion: "Chicharrón", cantidad: "2", precio: "15" },
      ])),
    ).toEqual({ ok: true });

    const despues = await lineasDe(id);
    expect(despues).toMatchObject([
      { id: cacahuate.id, descripcion: "Cacahuate japonés", cantidad: 3, precioUnitario: 30 },
      { descripcion: "Chicharrón", cantidad: 2, precioUnitario: 15, registradoPorId: usuarios.editor },
    ]);
    expect(despues.some((l) => l.id === papas.id)).toBe(false);
    expect(await leerNota(id)).toMatchObject({ montoOriginal: 1000, saldoPendiente: 1000 });
  });

  it("guardar sin renglones deja la nota sin detalle", async () => {
    const { usuarios, notas } = await sembrar();
    comoUsuario(usuarios.editor);
    await guardarDetalle(notas.donPepe.id, undefined, detalle([{ descripcion: "X", cantidad: "1", precio: "1" }]));

    expect(await guardarDetalle(notas.donPepe.id, undefined, formulario({}))).toEqual({ ok: true });
    expect(await lineasDe(notas.donPepe.id)).toHaveLength(0);
  });

  it("no toca renglones de otra nota aunque se manden sus ids", async () => {
    const { usuarios, notas } = await sembrar();
    comoUsuario(usuarios.editor);
    await guardarDetalle(notas.proveedor.id, undefined, detalle([{ descripcion: "Chile", cantidad: "1", precio: "100" }]));
    const [ajeno] = await lineasDe(notas.proveedor.id);

    await guardarDetalle(notas.donPepe.id, undefined, detalle([{ id: ajeno.id, descripcion: "Robado", cantidad: "1", precio: "1" }]));
    expect(await lineasDe(notas.proveedor.id)).toMatchObject([{ id: ajeno.id, descripcion: "Chile", precioUnitario: 100 }]);
  });

  it("si un renglón es inválido no cambia nada", async () => {
    const { usuarios, notas } = await sembrar();
    comoUsuario(usuarios.editor);
    await guardarDetalle(notas.donPepe.id, undefined, detalle([{ descripcion: "Cacahuate", cantidad: "3", precio: "25" }]));
    const [cacahuate] = await lineasDe(notas.donPepe.id);

    const r = await guardarDetalle(notas.donPepe.id, undefined, detalle([{ id: cacahuate.id, descripcion: "Cacahuate", cantidad: "3", precio: "" }]));
    expect(r?.fieldErrors?.lineas).toEqual(["Renglón 1: Escribe el precio"]);
    expect(await lineasDe(notas.donPepe.id)).toMatchObject([{ precioUnitario: 25 }]);
  });
});
