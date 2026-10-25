import { notFound } from "next/navigation";
import { requireUser } from "@/auth";
import { puedeEditar } from "@/lib/permisos";
import { XIcon } from "lucide-react";
import { getDescripcionesUsadas, getEmpleados, getNota } from "@/lib/queries";
import { quitarLinea } from "@/lib/actions";
import {
  ahoraLocal,
  formatoCantidad,
  formatoFecha,
  formatoMoneda,
  importeLinea,
  montoVigente,
  textoResponsable,
  totalLineas,
} from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotaBadge } from "@/components/estado-badge";
import { PageHeader } from "@/components/page-header";
import { PagoForm } from "@/components/forms/pago-form";
import { LineaForm } from "@/components/forms/linea-form";
import { CorregirMonto } from "@/components/forms/corregir-monto";

/** "+$50.00" o "−$30.00". */
function conSigno(monto: number) {
  return `${monto > 0 ? "+" : "−"}${formatoMoneda(Math.abs(monto))}`;
}

export default async function NotaPage({ params }: PageProps<"/notas/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [nota, empleados, descripciones, usuario] = await Promise.all([
    getNota(id),
    getEmpleados(),
    getDescripcionesUsadas(),
    requireUser(),
  ]);
  if (!nota) notFound();
  const editor = puedeEditar(usuario.rol);
  const sumaDetalle = totalLineas(nota.lineas);

  const monto = montoVigente(nota);
  const pagado = monto - Math.max(nota.saldoPendiente, 0);
  // 100% solo con saldo en 0 (también si una corrección dejó el monto en 0); si falta
  // aunque sea un centavo, a lo más 99%.
  const progreso =
    nota.saldoPendiente === 0 ? 100 : Math.min(99, Math.round((pagado / monto) * 100));

  return (
    <>
      <PageHeader
        title={`Nota #${nota.id}`}
        back={{ href: `/contactos/${nota.contacto.id}`, label: nota.contacto.nombre }}
        action={<NotaBadge tipo={nota.tipo} estado={nota.estado} />}
      />

      {/* En pantallas medianas: resumen a la derecha (angosto y fijo al desplazar) y lo demás
          a la izquierda. En el celular, una columna con el resumen primero. */}
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_17rem] md:items-start">
        <Card className="md:sticky md:top-20 md:col-start-2 md:row-start-1">
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-1">
              <div>
                <p className="text-xs text-muted-foreground">Monto de la nota</p>
                <p className="text-lg font-semibold tabular-nums">{formatoMoneda(monto)}</p>
                {nota.ajustesTotal !== 0 && (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    Original {formatoMoneda(nota.montoOriginal)} · {conSigno(nota.ajustesTotal)}
                  </p>
                )}
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

        <div className="grid min-w-0 gap-6 md:col-start-1 md:row-start-1">
          {(nota.lineas.length > 0 || editor) && (
            <Card>
              <CardHeader>
                <CardTitle>Detalle</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {nota.lineas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin detalle. Puedes agregarlo cuando quieras.</p>
                ) : (
                  <div>
                    <ul className="divide-y">
                      {nota.lineas.map((l) => (
                        <li key={l.id} className="flex items-center gap-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm break-words">{l.descripcion}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {formatoCantidad(l.cantidad)} × {formatoMoneda(l.precioUnitario)}
                            </p>
                          </div>
                          <span className="text-sm font-medium tabular-nums">{formatoMoneda(importeLinea(l))}</span>
                          {editor && (
                            <form action={quitarLinea.bind(null, nota.id, l.id)}>
                              <Button type="submit" variant="secondary" size="icon-sm" aria-label={`Quitar ${l.descripcion}`}>
                                <XIcon />
                              </Button>
                            </form>
                          )}
                        </li>
                      ))}
                    </ul>
                    <div className="flex justify-between border-t pt-2 text-sm">
                      <span className="text-muted-foreground">Suma del detalle</span>
                      <span className="font-medium tabular-nums">{formatoMoneda(sumaDetalle)}</span>
                    </div>
                    {sumaDetalle !== monto && (
                      <p role="status" className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                        El detalle suma {formatoMoneda(sumaDetalle)}, pero la nota es de{" "}
                        {formatoMoneda(monto)}.
                      </p>
                    )}
                  </div>
                )}
                {editor && <LineaForm notaId={nota.id} descripciones={descripciones} />}
              </CardContent>
            </Card>
          )}

          {nota.estado === "activo" && editor && (
            <Card>
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

          <Card>
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

          {(nota.ajustes.length > 0 || editor) && (
            <Card>
              <CardHeader>
                <CardTitle>Correcciones</CardTitle>
                {editor && (
                  <CardAction className="self-center">
                    <CorregirMonto notaId={nota.id} />
                  </CardAction>
                )}
              </CardHeader>
              <CardContent className="grid gap-4">
                {nota.ajustes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sin correcciones.
                    {editor && " Si el monto quedó mal, usa “Corregir monto”: la nota original se conserva."}
                  </p>
                ) : (
                  <ul className="divide-y">
                    {nota.ajustes.map((a) => (
                      <li key={a.id} className="flex items-start justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="text-sm break-words">{a.motivo}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatoFecha(a.creadoEn)} · registró {a.registradoPor}
                          </p>
                        </div>
                        <span className="font-medium tabular-nums">{conSigno(a.monto)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
