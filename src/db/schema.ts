import { sql } from "drizzle-orm";
import {
  check,
  index,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

export const estadoNota = pgEnum("estado_nota", ["activo", "pagado"]);

// por_cobrar: el contacto nos debe (le prestamos / le vendimos).
// por_pagar: nosotros le debemos (nos prestó / le compramos).
export const tipoContacto = pgEnum("tipo_contacto", ["cliente", "proveedor", "empleado"]);

export const tipoNota = pgEnum("tipo_nota", ["por_cobrar", "por_pagar"]);

// administrador y editor: ven y modifican todo. consulta: ve todo, sin modificar.
// contacto: solo ve lo suyo (cliente, proveedor o empleado ligado en contacto_id).
export const rolUsuario = pgEnum("rol_usuario", ["administrador", "editor", "consulta", "contacto"]);

export const contactos = pgTable("contactos", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  tipo: tipoContacto("tipo").notNull().default("cliente"),
  telefono: text("telefono"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

export const usuarios = pgTable(
  "usuarios",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull().unique(),
    nombre: text("nombre").notNull(),
    passwordHash: text("password_hash").notNull(),
    rol: rolUsuario("rol").notNull().default("consulta"),
    contactoId: integer("contacto_id").references(() => contactos.id, { onDelete: "restrict" }),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // El rol contacto siempre está ligado a un contacto; los demás roles nunca.
    check("usuarios_contacto_rol", sql`(${t.rol} = 'contacto') = (${t.contactoId} is not null)`),
  ],
);

export const notas = pgTable(
  "notas",
  {
    id: serial("id").primaryKey(),
    contactoId: integer("contacto_id")
      .notNull()
      .references(() => contactos.id, { onDelete: "restrict" }),
    tipo: tipoNota("tipo").notNull().default("por_cobrar"),
    montoOriginal: numeric("monto_original", { precision: 12, scale: 2, mode: "number" }).notNull(),
    saldoPendiente: numeric("saldo_pendiente", { precision: 12, scale: 2, mode: "number" }).notNull(),
    // Suma de las correcciones (tabla ajustes). El monto original nunca cambia; el monto
    // vigente es monto_original + ajustes_total.
    ajustesTotal: numeric("ajustes_total", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
    estado: estadoNota("estado").notNull().default("activo"),
    fechaInicio: timestamp("fecha_inicio", { withTimezone: true }).notNull().defaultNow(),
    // Usuario que capturó el registro (automático) y empleado que atendió (opcional;
    // vacío = lo atendió quien lo registró).
    registradoPorId: integer("registrado_por_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "restrict" }),
    atendidoPorId: integer("atendido_por_id").references(() => contactos.id, { onDelete: "restrict" }),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notas_contacto_idx").on(t.contactoId),
    check("notas_monto_positivo", sql`${t.montoOriginal} > 0`),
    // Cada nota nunca queda negativa; solo el total por contacto puede serlo.
    check(
      "notas_saldo_valido",
      sql`${t.saldoPendiente} >= 0 and ${t.saldoPendiente} <= ${t.montoOriginal} + ${t.ajustesTotal}`,
    ),
  ],
);

export const pagos = pgTable(
  "pagos",
  {
    id: serial("id").primaryKey(),
    notaId: integer("nota_id")
      .notNull()
      .references(() => notas.id, { onDelete: "restrict" }),
    montoPagado: numeric("monto_pagado", { precision: 12, scale: 2, mode: "number" }).notNull(),
    fechaPago: timestamp("fecha_pago", { withTimezone: true }).notNull().defaultNow(),
    comentario: text("comentario"),
    // Usuario que capturó el registro (automático) y empleado que atendió (opcional;
    // vacío = lo atendió quien lo registró).
    registradoPorId: integer("registrado_por_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "restrict" }),
    atendidoPorId: integer("atendido_por_id").references(() => contactos.id, { onDelete: "restrict" }),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pagos_nota_idx").on(t.notaId),
    check("pagos_monto_positivo", sql`${t.montoPagado} > 0`),
  ],
);

// Correcciones de monto de una nota (p. ej. un precio mal capturado). Positivo = la nota
// sube, negativo = baja. Se suman al saldo de la nota; la nota original no se modifica.
export const ajustes = pgTable(
  "ajustes",
  {
    id: serial("id").primaryKey(),
    notaId: integer("nota_id")
      .notNull()
      .references(() => notas.id, { onDelete: "restrict" }),
    monto: numeric("monto", { precision: 12, scale: 2, mode: "number" }).notNull(),
    motivo: text("motivo").notNull(),
    registradoPorId: integer("registrado_por_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "restrict" }),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ajustes_nota_idx").on(t.notaId),
    check("ajustes_monto_no_cero", sql`${t.monto} <> 0`),
  ],
);

// Detalle opcional de una nota (qué se vendió o compró). Es solo informativo: no cambia
// el monto ni el saldo de la nota, y se puede agregar después de crearla.
export const notaLineas = pgTable(
  "nota_lineas",
  {
    id: serial("id").primaryKey(),
    notaId: integer("nota_id")
      .notNull()
      .references(() => notas.id, { onDelete: "restrict" }),
    descripcion: text("descripcion").notNull(),
    cantidad: numeric("cantidad", { precision: 12, scale: 3, mode: "number" }).notNull(),
    precioUnitario: numeric("precio_unitario", { precision: 12, scale: 2, mode: "number" }).notNull(),
    registradoPorId: integer("registrado_por_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "restrict" }),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("nota_lineas_nota_idx").on(t.notaId),
    check("nota_lineas_cantidad_positiva", sql`${t.cantidad} > 0`),
    check("nota_lineas_precio_valido", sql`${t.precioUnitario} >= 0`),
  ],
);

export type TipoContacto = (typeof tipoContacto.enumValues)[number];
export type TipoNota = (typeof tipoNota.enumValues)[number];
export type EstadoNota = (typeof estadoNota.enumValues)[number];
export type RolUsuario = (typeof rolUsuario.enumValues)[number];
export type Contacto = typeof contactos.$inferSelect;
export type Nota = typeof notas.$inferSelect;
export type Pago = typeof pagos.$inferSelect;
export type NotaLinea = typeof notaLineas.$inferSelect;
export type Ajuste = typeof ajustes.$inferSelect;
