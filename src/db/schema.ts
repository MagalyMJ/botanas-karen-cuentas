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

export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  nombre: text("nombre").notNull(),
  passwordHash: text("password_hash").notNull(),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

export const contactos = pgTable("contactos", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  tipo: tipoContacto("tipo").notNull().default("cliente"),
  telefono: text("telefono"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

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
      sql`${t.saldoPendiente} >= 0 and ${t.saldoPendiente} <= ${t.montoOriginal}`,
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

export type TipoContacto = (typeof tipoContacto.enumValues)[number];
export type TipoNota = (typeof tipoNota.enumValues)[number];
export type EstadoNota = (typeof estadoNota.enumValues)[number];
export type Contacto = typeof contactos.$inferSelect;
export type Nota = typeof notas.$inferSelect;
export type Pago = typeof pagos.$inferSelect;
