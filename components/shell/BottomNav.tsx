"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const navItems = [
  { label: "Home", href: "/home" },
  { label: "Market", href: "/market" },
  { label: "Events", href: "/events" },
  { label: "Connect", href: "/connect" },
  { label: "Profile", href: "/profile" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t border-wire-700 bg-wire-900 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5">
      <ul className="grid grid-cols-5 gap-1.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/home" && pathname.startsWith(item.href));

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center justify-center rounded-xl border px-2 py-2 text-center text-[12px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/35",
                  isActive
                    ? "border-accent/45 bg-accent/10 text-wire-100"
                    : "border-wire-700/70 text-wire-300 hover:border-wire-600 hover:bg-wire-800/70 hover:text-wire-100",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
