import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { getContactos, getPagosRecientes, getResumen } from "@/lib/queries";
import { formatoFecha, formatoMoneda } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Balance, descripcionBalance } from "@/components/balance";
import { TipoContactoBadge } from "@/components/tipo-contacto";

const MAX_TARJETAS = 9;

export default async function InicioPage() {
  const [resumen, conSaldo, pagos] = await Promise.all([
    getResumen(),
    getContactos({ soloConSaldo: true, limite: MAX_TARJETAS }),
    getPagosRecientes(5),
  ]);
  const neto = resumen.porCobrar - resumen.porPagar;


  return (
    <>
      <PageHeader title="Inicio" />
      <Card>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Balance neto{neto !== 0 && (neto > 0 ? " · a tu favor" : " · en contra")}
          </p>
          <Balance valor={neto} className="mt-1 block text-3xl" />
          <dl className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-xs">
            <div>
              <dt className="text-muted-foreground">Me deben</dt>
              <dd className="text-sm font-medium tabular-nums">{formatoMoneda(resumen.porCobrar)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Debo</dt>
              <dd className="text-sm font-medium tabular-nums">{formatoMoneda(resumen.porPagar)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cobrado este mes</dt>
              <dd className="text-sm font-medium tabular-nums">{formatoMoneda(resumen.cobradoMes)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {conSaldo.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nadie te debe ni le debes a nadie. 🎉
        </p>
      ) : (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold text-pizarra">Saldos pendientes</h2>
            <Link
              href="/contactos"
              className="flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              Ver todos
              <ChevronRightIcon className="size-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {conSaldo.map((c) => (
              <Link key={c.id} href={`/contactos/${c.id}`}>
                <Card size="sm" className="h-full transition-colors hover:bg-muted/50">
                  <CardContent className="grid gap-1">
                    <TipoContactoBadge tipo={c.tipo} />
                    <p className="truncate font-medium">{c.nombre}</p>
                    <div>
                      <p className="text-xs text-muted-foreground">{descripcionBalance(c.balance)}</p>
                      <Balance valor={c.balance} sinSigno className="block text-lg" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {pagos.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Pagos recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {pagos.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/notas/${p.notaId}`}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.contactoNombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatoFecha(p.fechaPago)} · {p.tipo === "por_cobrar" ? "Cobro" : "Pago mío"}
                      </p>
                    </div>
                    <span className="font-medium tabular-nums">{formatoMoneda(p.montoPagado)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
