import { notFound } from "next/navigation";
import { getCliente } from "@/lib/queries";
import { hoy } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { PrestamoForm } from "@/components/forms/prestamo-form";

export default async function NuevoPrestamoPage({
  params,
}: PageProps<"/clientes/[id]/prestamos/nuevo">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const cliente = await getCliente(id);
  if (!cliente) notFound();

  return (
    <>
      <PageHeader title="Nueva nota" back={{ href: `/clientes/${id}`, label: cliente.nombre }} />
      <Card>
        <CardContent>
          <PrestamoForm clienteId={id} fechaHoy={hoy()} />
        </CardContent>
      </Card>
    </>
  );
}
