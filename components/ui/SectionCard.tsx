import Link from "next/link";
import { cn } from "@/lib/cn";
import { SectionHeader } from "./SectionHeader";

type SectionCardProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
  children: React.ReactNode;
};

export function SectionCard({
  title,
  subtitle,
  actionLabel,
  actionHref,
  className,
  children,
}: SectionCardProps) {
  return (
    <section className={cn("wire-panel", className)}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        actionNode={
          actionLabel && actionHref ? (
            <Link href={actionHref} className="wire-link">
              {actionLabel}
            </Link>
          ) : undefined
        }
      />
      {children}
    </section>
  );
}
