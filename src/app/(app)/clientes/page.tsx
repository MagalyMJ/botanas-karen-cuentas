import Link from "next/link";
import { ChevronRightIcon, PlusIcon, SearchIcon } from "lucide-react";
import { getClientes } from "@/lib/queries";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { Balance, descripcionBalance } from "@/components/balance";

export default async function ClientesPage({ searchParams }: PageProps<"/clientes">) {
  const { q } = await searchParams;
  const busqueda = typeof q === "string" ? q : "";
  const clientes = await getClientes(busqueda);

  return (
    <>
      <PageHeader
        title="Contactos"
        action={
          <Link href="/clientes/nuevo" className={buttonVariants()}>
            <PlusIcon />
            Nuevo
          </Link>
        }
      />
      <form className="relative mb-4">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          type="search"
          defaultValue={busqueda}
          placeholder="Buscar por nombre…"
          className="h-11 pl-9"
        />
      </form>

      {clientes.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {busqueda ? "Sin resultados." : "Aún no hay contactos. Crea el primero."}
        </p>
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <ul className="divide-y">
              {clientes.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/clientes/${c.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.prestamosActivos === 0
                          ? "Sin notas activas"
                          : `${c.prestamosActivos} nota${c.prestamosActivos > 1 ? "s" : ""} activa${c.prestamosActivos > 1 ? "s" : ""} · ${descripcionBalance(c.balance)}`}
                      </p>
                    </div>
                    {c.balance !== 0 && <Balance valor={c.balance} className="font-medium" />}
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
