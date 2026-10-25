import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";

export function PageHeader({
  title,
  back,
  action,
}: {
  title: string;
  back?: { href: string; label: string };
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 grid gap-1">
      {back && (
        <Link
          href={back.href}
          className="-ml-1 flex w-fit items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex items-center justify-between gap-3">
        <h1 className="truncate text-2xl font-bold tracking-tight text-pizarra">{title}</h1>
        {action}
      </div>
    </div>
  );
}
