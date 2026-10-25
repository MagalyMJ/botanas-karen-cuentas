CREATE TYPE "public"."rol_usuario" AS ENUM('administrador', 'editor', 'consulta', 'contacto');--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "rol" "rol_usuario" DEFAULT 'consulta' NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "contacto_id" integer;--> statement-breakpoint
-- Los usuarios que ya existían tenían acceso total: se conservan como administradores.
UPDATE "usuarios" SET "rol" = 'administrador';--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_contacto_id_contactos_id_fk" FOREIGN KEY ("contacto_id") REFERENCES "public"."contactos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_contacto_rol" CHECK (("usuarios"."rol" = 'contacto') = ("usuarios"."contacto_id" is not null));