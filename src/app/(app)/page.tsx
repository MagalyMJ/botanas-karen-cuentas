import Link from "next/link";
import { getPagosRecientes, getResumen } from "@/lib/queries";
import { formatoFecha, formatoMoneda } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Balance, descripcionBalance } from "@/components/balance";

export default async function InicioPage() {
  const [resumen, pagos] = await Promise.all([getResumen(), getPagosRecientes()]);

  const stats = [
    { label: "Me deben", value: formatoMoneda(resumen.porCobrar) },
    { label: "Debo", value: formatoMoneda(resumen.porPagar) },
    { label: "Cobrado este mes", value: formatoMoneda(resumen.cobradoMes) },
    { label: "Notas activas", value: resumen.prestamosActivos },
  ];
  const neto = resumen.porCobrar - resumen.porPagar;

  return (
    <>
      <PageHeader title="Inicio" />
      <Card className="mb-3">
        <CardContent>
          <p className="text-xs text-muted-foreground">Balance neto ({descripcionBalance(neto).toLowerCase()})</p>
          <Balance valor={neto} className="mt-1 block text-3xl font-semibold" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <Card key={s.label} size="sm">
            <CardContent>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Pagos recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {pagos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay pagos registrados.</p>
          ) : (
            <ul className="divide-y">
              {pagos.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/prestamos/${p.prestamoId}`}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.clienteNombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatoFecha(p.fechaPago)} · {p.tipo === "por_cobrar" ? "Cobro" : "Pago mío"}
                      </p>
                    </div>
                    <span className="font-medium tabular-nums">{formatoMoneda(p.montoPagado)}</span>
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
