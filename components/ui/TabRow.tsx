import Link from "next/link";
import { cn } from "@/lib/cn";

type TabItem = {
  label: string;
  href?: string;
};

type TabRowProps = {
  tabs: TabItem[];
  activeIndex?: number;
};

export function TabRow({ tabs, activeIndex = 0 }: TabRowProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5">
      {tabs.map((tab, idx) => {
        const className = cn(
          "inline-flex min-h-9 min-w-[96px] items-center justify-center whitespace-nowrap rounded-full border px-3 py-1.5 text-center text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
          idx === activeIndex
            ? "border-accent/45 bg-accent/15 text-wire-100"
            : "border-wire-700 bg-wire-800 text-wire-300 hover:border-wire-600 hover:text-wire-100",
        );

        if (tab.href) {
          return (
            <Link key={tab.label} href={tab.href} className={className}>
              {tab.label}
            </Link>
          );
        }

        return (
          <div key={tab.label} className={className}>
            {tab.label}
          </div>
        );
      })}
    </div>
  );
}
