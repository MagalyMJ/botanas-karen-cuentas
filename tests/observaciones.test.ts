import { describe, expect, it } from "vitest";
import { agregarObservacion } from "@/lib/actions";
import { getNota } from "@/lib/queries";
import { observaciones } from "@/db/schema";
import { comoUsuario, entorno, formulario, sembrar } from "./entorno";

describe("observaciones", () => {
  it("se agregan con quién y cuándo, la más reciente primero", async () => {
    const { usuarios, notas } = await sembrar();
    comoUsuario(usuarios.editor);
    const id = notas.donPepe.id;

    expect(await agregarObservacion(id, undefined, formulario({ texto: "Incluye el pedido del lunes" }))).toEqual({ ok: true });
    expect(await agregarObservacion(id, undefined, formulario({ texto: "  Entregar en la esquina  " }))).toEqual({ ok: true });

    const nota = await getNota(id);
    expect(nota?.observaciones.map((o) => o.texto)).toEqual(["Entregar en la esquina", "Incluye el pedido del lunes"]);
    expect(nota?.observaciones[0]).toMatchObject({ registradoPor: "editor" });
  });

  it("no se guarda una observación vacía", async () => {
    const { usuarios, notas } = await sembrar();
    comoUsuario(usuarios.editor);

    const r = await agregarObservacion(notas.donPepe.id, undefined, formulario({ texto: "   " }));
    expect(r?.fieldErrors?.texto).toBeDefined();
    expect(await entorno.db.select().from(observaciones)).toHaveLength(0);
  });

  it("son internas: consulta las ve, el cliente no, aunque la nota sea suya", async () => {
    const { usuarios, notas } = await sembrar();
    comoUsuario(usuarios.editor);
    await agregarObservacion(notas.donPepe.id, undefined, formulario({ texto: "No fiarle más" }));

    comoUsuario(usuarios.consulta);
    expect((await getNota(notas.donPepe.id))?.observaciones).toHaveLength(1);

    comoUsuario(usuarios.cliente);
    const notaDelCliente = await getNota(notas.donPepe.id);
    expect(notaDelCliente).not.toBeNull();
    expect(notaDelCliente?.observaciones).toEqual([]);
  });
});
