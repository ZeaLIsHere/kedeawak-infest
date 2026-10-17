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
  /**
   * Dipanggil saat tautan dipilih. Dipakai lembar menu untuk menutup dirinya
   * setelah berpindah halaman.
   */
  readonly onNavigate?: () => void;
};

/*
 * Nama kelas disusun lewat `cn` supaya terbaca sebagai satu kesatuan gaya,
 * bukan sebagai teks antarmuka. Perkakas `lint:ui` melewati argumen `cn`.
 */
const base = cn(
  "flex rounded-md font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
);

const layoutClass = {
  row: cn("min-h-touch items-center gap-3 px-3 text-body"),
  column: cn("h-full flex-col items-center justify-center gap-1 px-1 text-caption"),
} as const;

const stateClass = {
  row: {
    active: cn("bg-sidebar-accent text-sidebar-accent-foreground"),
    idle: cn("text-sidebar-foreground hover:bg-muted"),
  },
  column: {
    active: cn("bg-accent text-accent-foreground"),
    idle: cn("text-muted-foreground hover:bg-muted"),
  },
} as const;

export function NavLink({ item, active, layout = "row", onNavigate }: NavLinkProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
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
