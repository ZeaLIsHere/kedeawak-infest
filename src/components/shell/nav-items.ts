import {
  ShoppingBasket,
  Bot,
  Boxes,
  ChartColumn,
  ClipboardCheck,
  LayoutDashboard,
  MessageCircle,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
};

/**
 * Enam permukaan aplikasi, sesuai daftar di docs/SCOPE.md.
 * Urutannya sengaja mengikuti alur pemakaian, bukan abjad.
 */
export const surfaceNavItems: readonly NavItem[] = [
  { href: "/", label: "Dasbor", icon: LayoutDashboard },
  { href: "/kasir", label: "Kasir", icon: ShoppingBasket },
  { href: "/percakapan", label: "Agen AI", icon: Bot },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/laporan", label: "Laporan", icon: ChartColumn },
  { href: "/stok", label: "Stok", icon: Boxes },
  { href: "/persetujuan", label: "Persetujuan", icon: ClipboardCheck },
];

export const settingsNavItem: NavItem = {
  href: "/pengaturan",
  label: "Pengaturan",
  icon: Settings,
};

/**
 * Batang bawah pada layar sempit hanya memuat empat tujuan yang paling
 * sering dibuka. Sisanya masuk menu Lainnya, karena tujuh tujuan tidak
 * muat dengan ukuran sasaran sentuh yang layak.
 */
const bottomBarHrefs: ReadonlySet<string> = new Set([
  "/",
  "/percakapan",
  "/kasir",
  "/laporan",
]);

export const bottomBarItems: readonly NavItem[] = surfaceNavItems.filter((item) =>
  bottomBarHrefs.has(item.href),
);

export const overflowItems: readonly NavItem[] = [
  ...surfaceNavItems.filter((item) => !bottomBarHrefs.has(item.href)),
  settingsNavItem,
];

/** Dasbor hanya cocok pada alamat persisnya, agar tidak selalu menyala. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
