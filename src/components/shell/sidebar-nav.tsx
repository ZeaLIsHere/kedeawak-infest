"use client";

import { usePathname } from "next/navigation";

import { NavLink } from "@/components/shell/nav-link";
import {
  isActivePath,
  settingsNavItem,
  surfaceNavItems,
} from "@/components/shell/nav-items";

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      className="flex flex-1 flex-col gap-1 overflow-y-auto px-gutter py-section"
    >
      {surfaceNavItems.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          active={isActivePath(pathname, item.href)}
        />
      ))}

      <div className="mt-auto pt-section">
        <NavLink
          item={settingsNavItem}
          active={isActivePath(pathname, settingsNavItem.href)}
        />
      </div>
    </nav>
  );
}
