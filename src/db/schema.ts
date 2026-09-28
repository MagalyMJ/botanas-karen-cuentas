import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

export const estadoPrestamo = pgEnum("estado_prestamo", ["activo", "pagado"]);

// por_cobrar: el contacto nos debe (le prestamos / le vendimos).
// por_pagar: nosotros le debemos (nos prestó / le compramos).
export const tipoPrestamo = pgEnum("tipo_prestamo", ["por_cobrar", "por_pagar"]);

export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  nombre: text("nombre").notNull(),
  passwordHash: text("password_hash").notNull(),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

export const clientes = pgTable("clientes", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  telefono: text("telefono"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

export const prestamos = pgTable(
  "prestamos",
  {
    id: serial("id").primaryKey(),
    clienteId: integer("cliente_id")
      .notNull()
      .references(() => clientes.id, { onDelete: "restrict" }),
    tipo: tipoPrestamo("tipo").notNull().default("por_cobrar"),
    montoOriginal: numeric("monto_original", { precision: 12, scale: 2, mode: "number" }).notNull(),
    saldoPendiente: numeric("saldo_pendiente", { precision: 12, scale: 2, mode: "number" }).notNull(),
    estado: estadoPrestamo("estado").notNull().default("activo"),
    fechaInicio: date("fecha_inicio").notNull().defaultNow(),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("prestamos_cliente_idx").on(t.clienteId),
    check("prestamos_monto_positivo", sql`${t.montoOriginal} > 0`),
    // Cada nota nunca queda negativa; solo el total por contacto puede serlo.
    check(
      "prestamos_saldo_valido",
      sql`${t.saldoPendiente} >= 0 and ${t.saldoPendiente} <= ${t.montoOriginal}`,
    ),
  ],
);

export const pagos = pgTable(
  "pagos",
  {
    id: serial("id").primaryKey(),
    prestamoId: integer("prestamo_id")
      .notNull()
      .references(() => prestamos.id, { onDelete: "restrict" }),
    montoPagado: numeric("monto_pagado", { precision: 12, scale: 2, mode: "number" }).notNull(),
    fechaPago: date("fecha_pago").notNull().defaultNow(),
    notas: text("notas"),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pagos_prestamo_idx").on(t.prestamoId),
    check("pagos_monto_positivo", sql`${t.montoPagado} > 0`),
  ],
);

export type TipoPrestamo = (typeof tipoPrestamo.enumValues)[number];
export type Cliente = typeof clientes.$inferSelect;
export type Prestamo = typeof prestamos.$inferSelect;
export type Pago = typeof pagos.$inferSelect;
