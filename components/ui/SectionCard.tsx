import Link from "next/link";

type SectionCardProps = {
  title: string;
  actionLabel?: string;
  actionHref?: string;
  children: React.ReactNode;
};

export function SectionCard({
  title,
  actionLabel,
  actionHref,
  children,
}: SectionCardProps) {
  return (
    <section className="wire-panel">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-wire-700 pb-3">
        <h2 className="wire-section-title">{title}</h2>
        {actionLabel && actionHref ? (
          <Link href={actionHref} className="wire-link">
            {actionLabel}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
