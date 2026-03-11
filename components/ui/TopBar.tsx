import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/cn";

type Action = {
  label: string;
  href?: string;
};

type TopBarProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  actions?: Action[];
  className?: string;
};

export function TopBar({
  title,
  subtitle,
  backHref,
  actions = [],
  className,
}: TopBarProps) {
  return (
    <header
      className={cn(
        "wire-topbar",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {backHref ? (
            <Link
              href={backHref}
              className="wire-action-compact grid h-9 w-9 place-items-center p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          ) : null}
          <div>
            <h1 className="wire-title">{title}</h1>
            {subtitle ? (
              <p className="wire-subtitle">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {actions.length > 0 ? (
          <div className="flex flex-wrap justify-end gap-2 pt-0.5">
            {actions.map((action) =>
              action.href ? (
                <Link
                  key={`${action.label}-${action.href}`}
                  href={action.href}
                  className="wire-action-compact min-w-[58px]"
                >
                  {action.label}
                </Link>
              ) : (
                <button
                  key={action.label}
                  type="button"
                  className="wire-action-compact min-w-[58px]"
                >
                  {action.label}
                </button>
              ),
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
}
