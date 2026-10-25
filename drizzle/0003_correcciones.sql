CREATE TABLE "ajustes" (
	"id" serial PRIMARY KEY NOT NULL,
	"nota_id" integer NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"motivo" text NOT NULL,
	"registrado_por_id" integer NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ajustes_monto_no_cero" CHECK ("ajustes"."monto" <> 0)
);
--> statement-breakpoint
ALTER TABLE "notas" DROP CONSTRAINT "notas_saldo_valido";--> statement-breakpoint
ALTER TABLE "notas" ADD COLUMN "ajustes_total" numeric(12, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ajustes" ADD CONSTRAINT "ajustes_nota_id_notas_id_fk" FOREIGN KEY ("nota_id") REFERENCES "public"."notas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ajustes" ADD CONSTRAINT "ajustes_registrado_por_id_usuarios_id_fk" FOREIGN KEY ("registrado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ajustes_nota_idx" ON "ajustes" USING btree ("nota_id");--> statement-breakpoint
ALTER TABLE "notas" ADD CONSTRAINT "notas_saldo_valido" CHECK ("notas"."saldo_pendiente" >= 0 and "notas"."saldo_pendiente" <= "notas"."monto_original" + "notas"."ajustes_total");