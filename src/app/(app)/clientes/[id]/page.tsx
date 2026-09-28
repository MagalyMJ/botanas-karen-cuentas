import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon, PhoneIcon, PlusIcon } from "lucide-react";
import { getCliente } from "@/lib/queries";
import { formatoFecha, formatoMoneda } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EstadoBadge, TipoBadge } from "@/components/estado-badge";
import { Balance, descripcionBalance } from "@/components/balance";
import { PageHeader } from "@/components/page-header";

export default async function ClientePage({ params }: PageProps<"/clientes/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const cliente = await getCliente(id);
  if (!cliente) notFound();

  const activos = cliente.prestamos.filter((p) => p.estado === "activo");
  const suma = (tipo: string) =>
    activos.filter((p) => p.tipo === tipo).reduce((s, p) => s + p.saldoPendiente, 0);
  const meDebe = suma("por_cobrar");
  const leDebo = suma("por_pagar");
  const balance = meDebe - leDebo;

  return (
    <>
      <PageHeader
        title={cliente.nombre}
        back={{ href: "/clientes", label: "Contactos" }}
        action={
          <Link href={`/clientes/${cliente.id}/prestamos/nuevo`} className={buttonVariants()}>
            <PlusIcon />
            Nota
          </Link>
        }
      />
      {cliente.telefono && (
        <a
          href={`tel:${cliente.telefono}`}
          className="mb-4 flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <PhoneIcon className="size-4" />
          {cliente.telefono}
        </a>
      )}

      <Card>
        <CardContent>
          <p className="text-xs text-muted-foreground">Total ({descripcionBalance(balance).toLowerCase()})</p>
          <Balance valor={balance} className="mt-1 block text-3xl font-semibold" />
          {meDebe > 0 && leDebo > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Me debe {formatoMoneda(meDebe)} · Le debo {formatoMoneda(leDebo)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Historial de notas</CardTitle>
        </CardHeader>
        <CardContent>
          {cliente.prestamos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este contacto no tiene notas.</p>
          ) : (
            <ul className="divide-y">
              {cliente.prestamos.map((p) => (
                <li key={p.id}>
                  <Link href={`/prestamos/${p.id}`} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium tabular-nums">{formatoMoneda(p.montoOriginal)}</span>
                        <TipoBadge tipo={p.tipo} />
                        {p.estado === "pagado" && <EstadoBadge estado={p.estado} />}
                      </div>
                      <p className="text-xs text-muted-foreground">{formatoFecha(p.fechaInicio)}</p>
                    </div>
                    {p.estado === "activo" && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Pendiente</p>
                        <p className="font-medium tabular-nums">{formatoMoneda(p.saldoPendiente)}</p>
                      </div>
                    )}
                    <ChevronRightIcon className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
