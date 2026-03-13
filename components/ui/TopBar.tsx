import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/cn";

type Action = {
  label: string;
  href?: string;
  variant?: "secondary" | "ghost";
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
        <div className="flex min-w-0 items-start gap-3">
          {backHref ? (
            <Link
              href={backHref}
              className="wire-action-compact grid h-9 w-9 place-items-center p-0"
              aria-label="Go back"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          ) : null}
          <div className="min-w-0">
            <h1 className="wire-title">{title}</h1>
            {subtitle ? (
              <p className="wire-subtitle">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {actions.length > 0 ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 pt-1">
            {actions.map((action) =>
              action.href ? (
                <Link
                  key={`${action.label}-${action.href}`}
                  href={action.href}
                  className={cn(
                    action.variant === "ghost" ? "wire-action-ghost" : "wire-action-compact",
                    "min-w-[76px]",
                  )}
                >
                  {action.label}
                </Link>
              ) : (
                <button
                  key={action.label}
                  type="button"
                  className={cn(
                    action.variant === "ghost" ? "wire-action-ghost" : "wire-action-compact",
                    "min-w-[76px]",
                  )}
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
