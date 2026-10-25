CREATE TABLE "nota_lineas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nota_id" integer NOT NULL,
	"descripcion" text NOT NULL,
	"cantidad" numeric(12, 3) NOT NULL,
	"precio_unitario" numeric(12, 2) NOT NULL,
	"registrado_por_id" integer NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nota_lineas_cantidad_positiva" CHECK ("nota_lineas"."cantidad" > 0),
	CONSTRAINT "nota_lineas_precio_valido" CHECK ("nota_lineas"."precio_unitario" >= 0)
);
--> statement-breakpoint
ALTER TABLE "nota_lineas" ADD CONSTRAINT "nota_lineas_nota_id_notas_id_fk" FOREIGN KEY ("nota_id") REFERENCES "public"."notas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nota_lineas" ADD CONSTRAINT "nota_lineas_registrado_por_id_usuarios_id_fk" FOREIGN KEY ("registrado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nota_lineas_nota_idx" ON "nota_lineas" USING btree ("nota_id");