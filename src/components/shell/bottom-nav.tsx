"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

import { NavLink } from "@/components/shell/nav-link";
import {
  bottomBarItems,
  isActivePath,
  overflowItems,
} from "@/components/shell/nav-items";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const overflowActive = overflowItems.some((item) => isActivePath(pathname, item.href));

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 grid h-bottom-nav grid-cols-5 border-t border-border bg-card lg:hidden"
    >
      {bottomBarItems.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          layout="column"
          active={isActivePath(pathname, item.href)}
        />
      ))}

      <Sheet>
        <SheetTrigger
          type="button"
          className={cn(
            "flex h-full flex-col items-center justify-center gap-1 text-caption font-medium transition-colors",
            "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
            overflowActive
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          <Menu aria-hidden="true" className="size-5 shrink-0" />
          <span>Lainnya</span>
        </SheetTrigger>

        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Menu lainnya</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-1 px-gutter pb-section">
            {overflowItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActivePath(pathname, item.href)}
              />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
