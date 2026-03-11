import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="wire-panel border-dashed text-center">
      <div className="mx-auto mb-3 h-9 w-9 rounded-xl border border-dashed border-wire-600 bg-wire-900/60" />
      <p className="text-sm font-semibold tracking-tight text-wire-100">{title}</p>
      <p className="mx-auto mt-1 max-w-[28ch] text-[13px] leading-relaxed text-wire-300">
        {description}
      </p>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="wire-action mt-4 inline-flex w-auto px-3">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
