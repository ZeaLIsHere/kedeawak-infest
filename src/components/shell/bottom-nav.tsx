"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

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
  /*
   * Lembar menu dikendalikan dari sini supaya dapat menutup dirinya setelah
   * tujuan di dalamnya dipilih. Tanpa itu, halaman berpindah di balik lembar
   * yang masih terbuka.
   */
  const [menuOpen, setMenuOpen] = useState(false);
  const overflowActive = overflowItems.some((item) => isActivePath(pathname, item.href));

  return (
    <nav
      aria-label="Navigasi bawah"
      className="fixed inset-x-0 bottom-0 z-40 grid h-bottom-nav grid-cols-5 divide-x-2 divide-border border-t-2 border-border bg-card lg:hidden"
    >
      {bottomBarItems.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          layout="column"
          active={isActivePath(pathname, item.href)}
        />
      ))}

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger
          type="button"
          className={cn(
            "flex h-full flex-col items-center justify-center gap-1 text-caption font-bold transition-colors",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            overflowActive
              ? "bg-primary text-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
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
                onNavigate={() => setMenuOpen(false)}
              />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
