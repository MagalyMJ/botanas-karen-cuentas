import { notFound } from "next/navigation";
import { getPrestamo } from "@/lib/queries";
import { formatoFecha, formatoMoneda, hoy } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EstadoBadge, TipoBadge } from "@/components/estado-badge";
import { PageHeader } from "@/components/page-header";
import { PagoForm } from "@/components/forms/pago-form";

export default async function PrestamoPage({ params }: PageProps<"/prestamos/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const prestamo = await getPrestamo(id);
  if (!prestamo) notFound();

  const pagado = prestamo.montoOriginal - Math.max(prestamo.saldoPendiente, 0);
  const progreso = Math.min(100, Math.round((pagado / prestamo.montoOriginal) * 100));

  return (
    <>
      <PageHeader
        title={`Nota #${prestamo.id}`}
        back={{ href: `/clientes/${prestamo.cliente.id}`, label: prestamo.cliente.nombre }}
        action={
          <div className="flex gap-1.5">
            <TipoBadge tipo={prestamo.tipo} />
            <EstadoBadge estado={prestamo.estado} />
          </div>
        }
      />

      <Card>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Monto de la nota</p>
              <p className="text-lg font-semibold tabular-nums">{formatoMoneda(prestamo.montoOriginal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo pendiente</p>
              <p className="text-lg font-semibold tabular-nums">{formatoMoneda(prestamo.saldoPendiente)}</p>
            </div>
          </div>
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progreso}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {progreso}% pagado · iniciado el {formatoFecha(prestamo.fechaInicio)}
            </p>
          </div>
        </CardContent>
      </Card>

      {prestamo.estado === "activo" && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              {prestamo.tipo === "por_cobrar" ? "Registrar cobro" : "Registrar pago"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PagoForm prestamoId={prestamo.id} saldoPendiente={prestamo.saldoPendiente} fechaHoy={hoy()} />
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Historial de pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {prestamo.pagos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin pagos todavía.</p>
          ) : (
            <ul className="divide-y">
              {prestamo.pagos.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm">{formatoFecha(p.fechaPago)}</p>
                    {p.notas && <p className="text-xs break-words text-muted-foreground">{p.notas}</p>}
                  </div>
                  <span className="font-medium tabular-nums">{formatoMoneda(p.montoPagado)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
