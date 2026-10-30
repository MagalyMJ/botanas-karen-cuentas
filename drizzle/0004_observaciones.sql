CREATE TABLE "observaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"nota_id" integer NOT NULL,
	"texto" text NOT NULL,
	"registrado_por_id" integer NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "observaciones" ADD CONSTRAINT "observaciones_nota_id_notas_id_fk" FOREIGN KEY ("nota_id") REFERENCES "public"."notas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observaciones" ADD CONSTRAINT "observaciones_registrado_por_id_usuarios_id_fk" FOREIGN KEY ("registrado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "observaciones_nota_idx" ON "observaciones" USING btree ("nota_id");