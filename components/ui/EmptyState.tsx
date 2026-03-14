import Link from "next/link";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-dashed border-wire-600 bg-wire-900/60 px-5 py-8 text-center",
        className,
      )}
    >
      <div className="mx-auto mb-3 h-9 w-9 rounded-full border border-wire-700 bg-wire-800/70" />
      <p className="text-[17px] font-semibold tracking-tight text-wire-100">{title}</p>
      <p className="mx-auto mt-2 max-w-[34ch] text-[14px] leading-relaxed text-wire-300">
        {description}
      </p>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="wire-action-primary mt-5 inline-flex w-auto px-4">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
