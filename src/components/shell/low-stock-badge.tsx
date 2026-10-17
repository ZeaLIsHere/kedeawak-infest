import { TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";

/**
 * Lencana keadaan stok menipis.
 *
 * Dipakai bersama oleh Dasbor dan halaman Stok, sehingga teksnya hanya ada di
 * satu tempat. Berisi ikon, bukan hanya warna, sesuai aturan `DESIGN.md` bahwa
 * status tidak boleh dibedakan oleh warna saja.
 */
export function LowStockBadge() {
  return (
    <Badge variant="warning">
      <TriangleAlert aria-hidden="true" />
      Stok menipis
    </Badge>
  );
}
