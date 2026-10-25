import { notFound } from "next/navigation";
import { requireUser } from "@/auth";
import { puedeEditar } from "@/lib/permisos";
import { getEmpleados, getNota } from "@/lib/queries";
import { ahoraLocal, formatoFecha, formatoMoneda, textoResponsable } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotaBadge } from "@/components/estado-badge";
import { PageHeader } from "@/components/page-header";
import { PagoForm } from "@/components/forms/pago-form";

export default async function NotaPage({ params }: PageProps<"/notas/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [nota, empleados, usuario] = await Promise.all([getNota(id), getEmpleados(), requireUser()]);
  if (!nota) notFound();

  const pagado = nota.montoOriginal - Math.max(nota.saldoPendiente, 0);
  const progreso = Math.min(100, Math.round((pagado / nota.montoOriginal) * 100));

  return (
    <>
      <PageHeader
        title={`Nota #${nota.id}`}
        back={{ href: `/contactos/${nota.contacto.id}`, label: nota.contacto.nombre }}
        action={<NotaBadge tipo={nota.tipo} estado={nota.estado} />}
      />

      <Card>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Monto de la nota</p>
              <p className="text-lg font-semibold tabular-nums">{formatoMoneda(nota.montoOriginal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo pendiente</p>
              <p className="text-lg font-semibold tabular-nums">{formatoMoneda(nota.saldoPendiente)}</p>
            </div>
          </div>
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progreso}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {progreso}% pagado · iniciado el {formatoFecha(nota.fechaInicio)}
            </p>
            <p className="text-xs text-muted-foreground">
              {textoResponsable(nota.atendidoPor, nota.registradoPor)}
            </p>
          </div>
        </CardContent>
      </Card>

      {nota.estado === "activo" && puedeEditar(usuario.rol) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              {nota.tipo === "por_cobrar" ? "Registrar cobro" : "Registrar pago"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PagoForm
              notaId={nota.id}
              saldoPendiente={nota.saldoPendiente}
              fechaHoy={ahoraLocal()}
              empleados={empleados}
              usuarioNombre={usuario.nombre}
            />
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Historial de pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {nota.pagos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin pagos todavía.</p>
          ) : (
            <ul className="divide-y">
              {nota.pagos.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm">{formatoFecha(p.fechaPago)}</p>
                    <p className="text-xs text-muted-foreground">
                      {textoResponsable(p.atendidoPor, p.registradoPor)}
                    </p>
                    {p.comentario && <p className="text-xs break-words text-muted-foreground">{p.comentario}</p>}
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
