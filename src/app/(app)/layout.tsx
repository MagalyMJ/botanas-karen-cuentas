import { redirect } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { auth } from "@/auth";
import { logout } from "@/lib/actions";
import { BottomNav, TopNav } from "@/components/nav";
import { Button } from "@/components/ui/button";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-4 px-4">
          <span className="font-semibold">Cuentas</span>
          <TopNav />
          <form action={logout} className="ml-auto">
            <Button variant="ghost" size="sm" type="submit">
              <LogOutIcon />
              Salir
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-24 md:pb-8">{children}</main>
      <BottomNav />
    </>
  );
}
