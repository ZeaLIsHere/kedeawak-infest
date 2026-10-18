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
  "flex rounded-md border-2 border-transparent font-bold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
);

const layoutClass = {
  row: cn("min-h-touch items-center px-3 text-body"),
  column: cn("h-full flex-col items-center justify-center px-1 text-caption"),
} as const;

const stateClass = {
  row: {
    active: cn("border-border bg-primary text-foreground shadow-control"),
    idle: cn("text-sidebar-foreground hover:bg-muted"),
  },
  column: {
    active: cn("bg-primary text-foreground"),
    idle: cn("text-muted-foreground hover:bg-muted"),
  },
} as const;

export function NavLink({ item, active, layout = "row", onNavigate }: NavLinkProps) {
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
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
