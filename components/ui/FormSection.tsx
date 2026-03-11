import Link from "next/link";
import { cn } from "@/lib/cn";

type FormSectionProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
};

export function FormSection({
  title,
  description,
  actionLabel,
  actionHref,
  className,
  contentClassName,
  children,
}: FormSectionProps) {
  return (
    <section className={cn("wire-panel", className)}>
      <div className="mb-4 border-b border-wire-700 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="wire-section-title">{title}</h3>
            {description ? <p className="mt-1 wire-meta">{description}</p> : null}
          </div>
          {actionLabel && actionHref ? (
            <Link href={actionHref} className="wire-link shrink-0">
              {actionLabel}
            </Link>
          ) : null}
        </div>
      </div>
      <div className={cn("space-y-3", contentClassName)}>{children}</div>
    </section>
  );
}
