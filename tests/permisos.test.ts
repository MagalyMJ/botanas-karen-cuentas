import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  agregarObservacion,
  crearContacto,
  crearNota,
  guardarDetalle,
  registrarAjuste,
  registrarPago,
} from "@/lib/actions";
import {
  getContacto,
  getContactos,
  getDescripcionesUsadas,
  getEmpleados,
  getNota,
  getPagosRecientes,
  getResumen,
} from "@/lib/queries";
import { ajustes, contactos, notaLineas, notas, observaciones, pagos, usuarios } from "@/db/schema";
import { comoUsuario, entorno, formulario, Redireccion, sembrar } from "./entorno";

const fecha = "2026-10-24T12:00";

/** Cada acción que modifica datos, lista para llamarse sobre los datos de `sembrar()`. */
function accionesDeEscritura(datos: Awaited<ReturnType<typeof sembrar>>) {
  const nota = datos.notas.donPepe.id;
  return {
    crearContacto: () => crearContacto(undefined, formulario({ nombre: "Nuevo", tipo: "cliente", telefono: "" })),
    crearNota: () =>
      crearNota(datos.contactos.donPepe.id, undefined, formulario({ tipo: "por_cobrar", montoOriginal: "10", fechaInicio: fecha })),
    registrarPago: () => registrarPago(nota, undefined, formulario({ montoPagado: "10", fechaPago: fecha })),
    registrarAjuste: () => registrarAjuste(nota, undefined, formulario({ direccion: "disminuir", monto: "10", motivo: "x" })),
    guardarDetalle: () =>
      guardarDetalle(nota, undefined, formulario({ lineaId: "", lineaDescripcion: "x", lineaCantidad: "1", lineaPrecio: "1" })),
    agregarObservacion: () => agregarObservacion(nota, undefined, formulario({ texto: "x" })),
  };
}

async function contarFilas() {
  const db = entorno.db;
  const n = async (
    t: typeof contactos | typeof notas | typeof pagos | typeof ajustes | typeof notaLineas | typeof observaciones,
  ) => (await db.select().from(t)).length;
  return {
    contactos: await n(contactos),
    notas: await n(notas),
    pagos: await n(pagos),
    ajustes: await n(ajustes),
    lineas: await n(notaLineas),
    observaciones: await n(observaciones),
  };
}

describe("quién puede modificar datos", () => {
  for (const rol of ["consulta", "cliente"] as const) {
    it(`${rol}: todas las acciones de escritura se rechazan y nada cambia`, async () => {
      const datos = await sembrar();
      comoUsuario(datos.usuarios[rol]);
      const antes = await contarFilas();

      for (const [nombre, accion] of Object.entries(accionesDeEscritura(datos))) {
        await expect(accion(), nombre).rejects.toThrow("No tienes permiso para modificar datos");
      }
      expect(await contarFilas()).toEqual(antes);
    });
  }

  it("sin sesión todas las acciones se rechazan", async () => {
    const datos = await sembrar();
    for (const [nombre, accion] of Object.entries(accionesDeEscritura(datos))) {
      await expect(accion(), nombre).rejects.toThrow("No autorizado");
    }
  });

  for (const rol of ["administrador", "editor"] as const) {
    it(`${rol}: puede usar todas las acciones de escritura`, async () => {
      const datos = await sembrar();
      comoUsuario(datos.usuarios[rol]);
      for (const [nombre, accion] of Object.entries(accionesDeEscritura(datos))) {
        // crearContacto y crearNota terminan redirigiendo a lo que crearon.
        await accion().catch((e) => expect(e, nombre).toBeInstanceOf(Redireccion));
      }
      const despues = await contarFilas();
      expect(despues).toMatchObject({ contactos: 4, notas: 3, pagos: 1, ajustes: 1, observaciones: 1 });
    });
  }

  it("un cambio de rol aplica de inmediato, sin volver a iniciar sesión", async () => {
    const datos = await sembrar();
    comoUsuario(datos.usuarios.editor);
    await accionesDeEscritura(datos).guardarDetalle();

    await entorno.db.update(usuarios).set({ rol: "consulta" }).where(eq(usuarios.id, datos.usuarios.editor));
    await expect(accionesDeEscritura(datos).guardarDetalle()).rejects.toThrow("No tienes permiso");
  });
});

describe("qué ve un usuario con rol contacto", () => {
  it("solo ve sus propias notas, aunque pida otras por su número", async () => {
    const datos = await sembrar();
    comoUsuario(datos.usuarios.cliente);

    expect(await getNota(datos.notas.donPepe.id)).toMatchObject({ id: datos.notas.donPepe.id });
    expect(await getNota(datos.notas.proveedor.id)).toBeNull();
    expect(await getContacto(datos.contactos.donPepe.id)).toMatchObject({ nombre: "Don Pepe" });
    expect(await getContacto(datos.contactos.proveedor.id)).toBeNull();
    expect((await getContactos()).map((c) => c.nombre)).toEqual(["Don Pepe"]);
    expect(await getEmpleados()).toEqual([]);
    expect(await getDescripcionesUsadas()).toEqual([]);
  });

  it("el resumen y los pagos recientes solo cuentan lo suyo", async () => {
    const datos = await sembrar();
    comoUsuario(datos.usuarios.editor);
    await registrarPago(datos.notas.donPepe.id, undefined, formulario({ montoPagado: "100", fechaPago: fecha }));
    await registrarPago(datos.notas.proveedor.id, undefined, formulario({ montoPagado: "50", fechaPago: fecha }));

    comoUsuario(datos.usuarios.cliente);
    expect(await getResumen()).toMatchObject({ porCobrar: 900, porPagar: 0, notasActivas: 1, totalContactos: 1 });
    expect((await getPagosRecientes()).map((p) => p.contactoNombre)).toEqual(["Don Pepe"]);

    comoUsuario(datos.usuarios.consulta);
    expect(await getResumen()).toMatchObject({ porCobrar: 900, porPagar: 350, notasActivas: 2, totalContactos: 3 });
    expect(await getPagosRecientes()).toHaveLength(2);
  });

  it("la base no permite un usuario contacto sin contacto ligado", async () => {
    await expect(
      entorno.db.insert(usuarios).values({ email: "x@x", nombre: "x", passwordHash: "x", rol: "contacto" }),
    ).rejects.toThrow();
  });
});
