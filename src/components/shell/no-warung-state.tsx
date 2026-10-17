import { Store } from "lucide-react";

import { StateBlock } from "@/components/shell/state-block";

/**
 * Keadaan saat perangkat ini belum punya baris warung, misalnya karena basis
 * data baru dimigrasi dan data demo belum diisi.
 *
 * Sengaja tidak memuat perintah penyiapan, karena antarmuka tidak menampilkan
 * perintah pengembang. Cara menyiapkannya ada di `README.md`.
 */
export function NoWarungState() {
  return (
    <StateBlock
      icon={Store}
      title="Belum ada data warung"
      description="Data warung belum disiapkan di perangkat ini. Siapkan data demo lebih dulu, lalu buka kembali halaman ini."
    />
  );
}
