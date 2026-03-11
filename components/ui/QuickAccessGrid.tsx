import Link from "next/link";
import { cn } from "@/lib/cn";

type QuickAccessItem = {
  label: string;
  href: string;
  meta?: string;
};

type QuickAccessGridProps = {
  items: QuickAccessItem[];
  columns?: 2 | 3;
};

export function QuickAccessGrid({ items, columns = 3 }: QuickAccessGridProps) {
  return (
    <div
      className={cn(
        "grid gap-2",
        columns === 2 ? "grid-cols-2" : "grid-cols-3",
      )}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="wire-card wire-hover min-h-[76px] rounded-2xl px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
        >
          <p className="text-[13px] font-medium text-wire-100">{item.label}</p>
          {item.meta ? <p className="mt-1 wire-meta">{item.meta}</p> : null}
        </Link>
      ))}
    </div>
  );
}
