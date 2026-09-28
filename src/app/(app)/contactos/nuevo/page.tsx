import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ContactoForm } from "@/components/forms/contacto-form";
import { esTipoContacto } from "@/components/tipo-contacto";

export default async function NuevoContactoPage({ searchParams }: PageProps<"/contactos/nuevo">) {
  const { tipo } = await searchParams;
  return (
    <>
      <PageHeader title="Nuevo contacto" back={{ href: "/contactos", label: "Contactos" }} />
      <Card>
        <CardContent>
          <ContactoForm tipoInicial={esTipoContacto(tipo) ? tipo : undefined} />
        </CardContent>
      </Card>
    </>
  );
}
