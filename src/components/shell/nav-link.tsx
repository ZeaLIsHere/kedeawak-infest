import Link from "next/link";

import type { NavItem } from "@/components/shell/nav-items";
import { cn } from "@/lib/utils";

type NavLinkProps = {
  readonly item: NavItem;
  readonly active: boolean;
  /**
   * `row` untuk sisi navigasi dan daftar di dalam lembar,
   * `column` untuk batang bawah pada layar sempit.
   */
  readonly layout?: "row" | "column";
};

const base =
  "flex rounded-md font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none";

const layoutClass = {
  row: "min-h-touch items-center gap-3 px-3 text-body",
  column: "h-full flex-col items-center justify-center gap-1 px-1 text-caption",
} as const;

const stateClass = {
  row: {
    active: "bg-sidebar-accent text-sidebar-accent-foreground",
    idle: "text-sidebar-foreground hover:bg-muted",
  },
  column: {
    active: "bg-accent text-accent-foreground",
    idle: "text-muted-foreground hover:bg-muted",
  },
} as const;

export function NavLink({ item, active, layout = "row" }: NavLinkProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        base,
        layoutClass[layout],
        active ? stateClass[layout].active : stateClass[layout].idle,
      )}
    >
      <Icon aria-hidden="true" className="size-5 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
