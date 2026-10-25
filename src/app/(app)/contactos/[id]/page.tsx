import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon, PhoneIcon, PlusIcon } from "lucide-react";
import { requireUser } from "@/auth";
import { getContacto } from "@/lib/queries";
import { puedeEditar } from "@/lib/permisos";
import { formatoFecha, formatoMoneda, montoVigente } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotaBadge } from "@/components/estado-badge";
import { Balance, descripcionBalance } from "@/components/balance";
import { PageHeader } from "@/components/page-header";
import { TipoContactoBadge } from "@/components/tipo-contacto";

export default async function ContactoPage({ params }: PageProps<"/contactos/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [contacto, usuario] = await Promise.all([getContacto(id), requireUser()]);
  if (!contacto) notFound();

  const activos = contacto.notas.filter((p) => p.estado === "activo");
  const suma = (tipo: string) =>
    activos.filter((p) => p.tipo === tipo).reduce((s, p) => s + p.saldoPendiente, 0);
  const meDebe = suma("por_cobrar");
  const leDebo = suma("por_pagar");
  const balance = meDebe - leDebo;

  return (
    <>
      <PageHeader
        title={contacto.nombre}
        back={{ href: "/contactos", label: "Contactos" }}
        action={
          puedeEditar(usuario.rol) && (
            <Link href={`/contactos/${contacto.id}/notas/nueva`} className={buttonVariants()}>
              <PlusIcon />
              Nota
            </Link>
          )
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <TipoContactoBadge tipo={contacto.tipo} />
        {contacto.telefono && (
          <a
            href={`tel:${contacto.telefono}`}
            className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <PhoneIcon className="size-4" />
            {contacto.telefono}
          </a>
        )}
      </div>

      <Card>
        <CardContent>
          <p className="text-xs text-muted-foreground">Total ({descripcionBalance(balance).toLowerCase()})</p>
          <Balance valor={balance} className="mt-1 block text-3xl" />
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
          {contacto.notas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este contacto no tiene notas.</p>
          ) : (
            <ul className="divide-y">
              {contacto.notas.map((p) => (
                <li key={p.id}>
                  <Link href={`/notas/${p.id}`} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium tabular-nums">{formatoMoneda(montoVigente(p))}</span>
                        <NotaBadge tipo={p.tipo} estado={p.estado} />
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
