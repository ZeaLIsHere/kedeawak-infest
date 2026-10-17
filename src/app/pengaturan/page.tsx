import { PageHeader } from "@/components/shell/page-header";
import { SectionCard } from "@/components/shell/section-card";

export default function PengaturanPage() {
  return (
    <>
      <PageHeader
        title="Pengaturan"
        description="Keterangan persetujuan pemrosesan pesan dan privasi warung."
      />
      <div className="mx-auto flex w-full max-w-content flex-col gap-section p-page">
        <SectionCard title="Persetujuan pemrosesan pesan">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Hanya pesan yang dikirim ke nomor bisnis warung yang diproses sebagai
              transaksi bisnis. Akun WhatsApp pribadi tidak dibaca.
            </p>
            <p>
              Pemilik menghubungkan kanal secara sadar. Pemrosesan pesan berhenti saat
              koneksi aplikasi diputuskan sampai pemilik menghubungkannya kembali.
            </p>
            <p>
              Pesan pelanggan diproses di dalam aplikasi. Balasan dan draft pesanan
              pembelian tercatat tanpa dikirim ke nomor pelanggan atau pemasok asli.
            </p>
          </div>
        </SectionCard>
        <SectionCard title="Privasi data pelanggan">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Nama dan nomor telepon pelanggan disimpan terenkripsi dan digunakan untuk
              operasional warung. Semua data terkait ke warung yang bersangkutan.
            </p>
            <p>
              Nama dan nomor pelanggan dapat dihapus dengan konfirmasi lebih dulu. Riwayat
              transaksi tetap tersedia tanpa identitas pelanggan.
            </p>
            <p>
              Foto struk yang dibaca oleh asisten diproses oleh penyedia model ketika
              layanan tersedia. Saat layanan tidak tersedia, aplikasi menjelaskan
              keterbatasannya dan menyediakan masukan manual.
            </p>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
