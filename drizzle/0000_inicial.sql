CREATE TYPE "public"."estado_nota" AS ENUM('activo', 'pagado');--> statement-breakpoint
CREATE TYPE "public"."tipo_contacto" AS ENUM('cliente', 'proveedor', 'empleado');--> statement-breakpoint
CREATE TYPE "public"."tipo_nota" AS ENUM('por_cobrar', 'por_pagar');--> statement-breakpoint
CREATE TABLE "contactos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"tipo" "tipo_contacto" DEFAULT 'cliente' NOT NULL,
	"telefono" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notas" (
	"id" serial PRIMARY KEY NOT NULL,
	"contacto_id" integer NOT NULL,
	"tipo" "tipo_nota" DEFAULT 'por_cobrar' NOT NULL,
	"monto_original" numeric(12, 2) NOT NULL,
	"saldo_pendiente" numeric(12, 2) NOT NULL,
	"estado" "estado_nota" DEFAULT 'activo' NOT NULL,
	"fecha_inicio" timestamp with time zone DEFAULT now() NOT NULL,
	"registrado_por_id" integer NOT NULL,
	"atendido_por_id" integer,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notas_monto_positivo" CHECK ("notas"."monto_original" > 0),
	CONSTRAINT "notas_saldo_valido" CHECK ("notas"."saldo_pendiente" >= 0 and "notas"."saldo_pendiente" <= "notas"."monto_original")
);
--> statement-breakpoint
CREATE TABLE "pagos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nota_id" integer NOT NULL,
	"monto_pagado" numeric(12, 2) NOT NULL,
	"fecha_pago" timestamp with time zone DEFAULT now() NOT NULL,
	"comentario" text,
	"registrado_por_id" integer NOT NULL,
	"atendido_por_id" integer,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pagos_monto_positivo" CHECK ("pagos"."monto_pagado" > 0)
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
ALTER TABLE "notas" ADD CONSTRAINT "notas_contacto_id_contactos_id_fk" FOREIGN KEY ("contacto_id") REFERENCES "public"."contactos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas" ADD CONSTRAINT "notas_registrado_por_id_usuarios_id_fk" FOREIGN KEY ("registrado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas" ADD CONSTRAINT "notas_atendido_por_id_contactos_id_fk" FOREIGN KEY ("atendido_por_id") REFERENCES "public"."contactos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_nota_id_notas_id_fk" FOREIGN KEY ("nota_id") REFERENCES "public"."notas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_registrado_por_id_usuarios_id_fk" FOREIGN KEY ("registrado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_atendido_por_id_contactos_id_fk" FOREIGN KEY ("atendido_por_id") REFERENCES "public"."contactos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notas_contacto_idx" ON "notas" USING btree ("contacto_id");--> statement-breakpoint
CREATE INDEX "pagos_nota_idx" ON "pagos" USING btree ("nota_id");