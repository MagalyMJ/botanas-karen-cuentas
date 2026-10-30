import Link from "next/link";
import { ChevronRightIcon, PlusIcon, SearchIcon } from "lucide-react";
import { requireUser } from "@/auth";
import { getContactos } from "@/lib/queries";
import { puedeEditar } from "@/lib/permisos";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { Balance, descripcionBalance } from "@/components/balance";
import { esTipoContacto, TipoContactoBadge, tiposContacto } from "@/components/tipo-contacto";
import { ContactoForm } from "@/components/forms/contacto-form";
import { ModalFormulario } from "@/components/forms/modal-formulario";

export default async function ContactosPage({ searchParams }: PageProps<"/contactos">) {
  const params = await searchParams;
  const busqueda = typeof params.q === "string" ? params.q : "";
  const tipo = esTipoContacto(params.tipo) ? params.tipo : undefined;
  const [contactos, usuario] = await Promise.all([getContactos({ busqueda, tipo }), requireUser()]);

  const hrefFiltro = (t?: string) => {
    const sp = new URLSearchParams();
    if (busqueda) sp.set("q", busqueda);
    if (t) sp.set("tipo", t);
    const qs = sp.toString();
    return qs ? `/contactos?${qs}` : "/contactos";
  };
  const filtros = [{ value: undefined, label: "Todos" }, ...tiposContacto.map((t) => ({ value: t.value, label: t.plural }))];

  return (
    <>
      <PageHeader
        title="Contactos"
        action={
          puedeEditar(usuario.rol) && (
            <ModalFormulario boton={<><PlusIcon />Nuevo</>} titulo="Nuevo contacto">
              <ContactoForm tipoInicial={tipo} />
            </ModalFormulario>
          )
        }
      />
      <form className="relative mb-3">
        {tipo && <input type="hidden" name="tipo" value={tipo} />}
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          type="search"
          defaultValue={busqueda}
          placeholder="Buscar por nombre…"
          className="h-11 pl-9"
        />
      </form>
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {filtros.map((f) => (
          <Link
            key={f.label}
            href={hrefFiltro(f.value)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm max-sm:py-2",
              tipo === f.value ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {contactos.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {busqueda || tipo ? "Sin resultados." : "Aún no hay contactos. Crea el primero."}
        </p>
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <ul className="divide-y">
              {contactos.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/contactos/${c.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
                  >
                    {/* En el celular la etiqueta de tipo baja a una tercera fila, para dejarle
                        espacio al nombre y al saldo; desde sm va junto al nombre. */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{c.nombre}</p>
                        {!tipo && <TipoContactoBadge tipo={c.tipo} className="max-sm:hidden" />}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.notasActivas === 0
                          ? "Sin notas activas"
                          : `${c.notasActivas} nota${c.notasActivas > 1 ? "s" : ""} activa${c.notasActivas > 1 ? "s" : ""} · ${descripcionBalance(c.balance)}`}
                      </p>
                      {!tipo && <TipoContactoBadge tipo={c.tipo} className="mt-1 sm:hidden" />}
                    </div>
                    {c.balance !== 0 && <Balance valor={c.balance} className="shrink-0 whitespace-nowrap max-sm:text-lg" />}
                    <ChevronRightIcon className="size-4 text-muted-foreground" />
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
