import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ClienteForm } from "@/components/forms/cliente-form";

export default function NuevoClientePage() {
  return (
    <>
      <PageHeader title="Nuevo contacto" back={{ href: "/clientes", label: "Contactos" }} />
      <Card>
        <CardContent>
          <ClienteForm />
        </CardContent>
      </Card>
    </>
  );
}
