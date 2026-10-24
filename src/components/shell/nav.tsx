"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
}

/** Text tabs on the header baseline; the active one carries a brand-green rule instead of a filled pill. */
export function Nav({ items, className }: { items: NavItem[]; className?: string }) {
  const pathname = usePathname();
  return (
    <nav className={cn("flex items-stretch gap-4 overflow-x-auto", className)}>
      {items.map((it) => {
        const active = pathname === it.href || (it.href !== "/company" && it.href !== "/worker" && pathname.startsWith(it.href));
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center whitespace-nowrap py-3 text-sm transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-brand after:opacity-0 after:transition-opacity",
              active ? "text-foreground after:opacity-100" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
