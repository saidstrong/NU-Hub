import Link from "next/link";
import { cn } from "@/lib/cn";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
  actionNode?: React.ReactNode;
  className?: string;
};

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  actionHref,
  actionNode,
  className,
}: SectionHeaderProps) {
  return (
    <header className={cn("mb-4 border-b border-wire-700 pb-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="wire-section-title">{title}</h2>
          {subtitle ? <p className="mt-1 wire-meta">{subtitle}</p> : null}
        </div>
        {actionNode ? (
          <div className="shrink-0">{actionNode}</div>
        ) : actionLabel && actionHref ? (
          <Link href={actionHref} className="wire-link shrink-0">
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </header>
  );
}
