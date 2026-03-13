import Link from "next/link";
import { cn } from "@/lib/cn";
import { SectionHeader } from "./SectionHeader";

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
      <SectionHeader
        title={title}
        subtitle={description}
        actionNode={
          actionLabel && actionHref ? (
            <Link href={actionHref} className="wire-link shrink-0">
              {actionLabel}
            </Link>
          ) : undefined
        }
      />
      <div className={cn("space-y-4", contentClassName)}>{children}</div>
    </section>
  );
}
