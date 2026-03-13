"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Home,
  Store,
  UserCircle2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";

const navItems = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Market", href: "/market", icon: Store },
  { label: "Events", href: "/events", icon: CalendarDays },
  { label: "Connect", href: "/connect", icon: Users },
  { label: "Profile", href: "/profile", icon: UserCircle2 },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-wire-700 bg-wire-900/96 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5 backdrop-blur">
      <ul className="grid grid-cols-5 gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/home" && pathname.startsWith(item.href));

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-[var(--radius-button)] border px-1.5 py-2 text-center transition-colors duration-150 focus-visible:outline-none",
                  isActive
                    ? "border-accent/45 bg-accent/10 text-wire-100"
                    : "border-wire-700/80 text-wire-300 hover:border-wire-600 hover:bg-wire-800/80 hover:text-wire-100",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="text-[11px] font-medium leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
