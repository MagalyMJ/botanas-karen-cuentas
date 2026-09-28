CREATE TYPE "public"."estado_prestamo" AS ENUM('activo', 'pagado');--> statement-breakpoint
CREATE TYPE "public"."tipo_prestamo" AS ENUM('por_cobrar', 'por_pagar');--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"telefono" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagos" (
	"id" serial PRIMARY KEY NOT NULL,
	"prestamo_id" integer NOT NULL,
	"monto_pagado" numeric(12, 2) NOT NULL,
	"fecha_pago" date DEFAULT now() NOT NULL,
	"notas" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pagos_monto_positivo" CHECK ("pagos"."monto_pagado" > 0)
);
--> statement-breakpoint
CREATE TABLE "prestamos" (
	"id" serial PRIMARY KEY NOT NULL,
	"cliente_id" integer NOT NULL,
	"tipo" "tipo_prestamo" DEFAULT 'por_cobrar' NOT NULL,
	"monto_original" numeric(12, 2) NOT NULL,
	"saldo_pendiente" numeric(12, 2) NOT NULL,
	"estado" "estado_prestamo" DEFAULT 'activo' NOT NULL,
	"fecha_inicio" date DEFAULT now() NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prestamos_monto_positivo" CHECK ("prestamos"."monto_original" > 0),
	CONSTRAINT "prestamos_saldo_valido" CHECK ("prestamos"."saldo_pendiente" >= 0 and "prestamos"."saldo_pendiente" <= "prestamos"."monto_original")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"nombre" text NOT NULL,
	"password_hash" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_prestamo_id_prestamos_id_fk" FOREIGN KEY ("prestamo_id") REFERENCES "public"."prestamos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pagos_prestamo_idx" ON "pagos" USING btree ("prestamo_id");--> statement-breakpoint
CREATE INDEX "prestamos_cliente_idx" ON "prestamos" USING btree ("cliente_id");