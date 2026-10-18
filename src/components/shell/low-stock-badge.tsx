import { Badge } from "@/components/ui/badge";

/**
 * Lencana keadaan stok menipis.
 *
 * Dipakai bersama oleh Dasbor dan halaman Stok, sehingga teksnya hanya ada di
 * satu tempat. Warna kuning selalu disertai kata `Stok menipis`, sesuai aturan
 * bahwa status tidak boleh dibedakan oleh warna saja.
 */
export function LowStockBadge() {
  return <Badge variant="warning">Stok menipis</Badge>;
}
