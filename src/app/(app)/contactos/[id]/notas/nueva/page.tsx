import { notFound } from "next/navigation";
import { requireUser } from "@/auth";
import { puedeEditar } from "@/lib/permisos";
import { getContacto, getDescripcionesUsadas, getEmpleados } from "@/lib/queries";
import { ahoraLocal } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { NotaForm } from "@/components/forms/nota-form";

export default async function NuevaNotaPage({
  params,
}: PageProps<"/contactos/[id]/notas/nueva">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [contacto, empleados, descripciones, usuario] = await Promise.all([
    getContacto(id),
    getEmpleados(),
    getDescripcionesUsadas(),
    requireUser(),
  ]);
  if (!contacto || !puedeEditar(usuario.rol)) notFound();

  return (
    <>
      <PageHeader title="Nueva nota" back={{ href: `/contactos/${id}`, label: contacto.nombre }} />
      <Card>
        <CardContent>
          <NotaForm
            contactoId={id}
            fechaHoy={ahoraLocal()}
            empleados={empleados}
            usuarioNombre={usuario.nombre}
            descripciones={descripciones}
          />
        </CardContent>
      </Card>
    </>
  );
}
