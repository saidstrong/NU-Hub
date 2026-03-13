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
    <div className="wire-panel text-center">
      <div className="mx-auto mb-3 h-10 w-10 rounded-full border border-wire-700 bg-wire-800/70" />
      <p className="text-[18px] font-semibold tracking-tight text-wire-100">{title}</p>
      <p className="mx-auto mt-2 max-w-[32ch] text-[14px] leading-relaxed text-wire-300">
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
