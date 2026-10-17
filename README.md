# KedeAwak

Aplikasi AI agent operasional warung yang menyambungkan WhatsApp ke satu
sistem terpusat. Dibuat untuk Lomba Informatics Festival XII, bidang Hackathon,
Universitas Sumatera Utara, 2026.

## Status

Pengembangan dihentikan pada titik yang diminta pemilik, 18 Oktober 2026.
Kasir, kelola produk, laporan pembayaran, Persetujuan, percakapan teks,
panel simulasi WhatsApp, dan privasi sudah memiliki implementasi.
Sebagian integrasi dan verifikasi masih terbuka. Lihat `PLAN.md` untuk
status setiap tugas; proyek belum dinyatakan memenuhi seluruh kriteria demo.

## Fitur yang tersedia dan pekerjaan terbuka

| Halaman | Sudah diimplementasikan | Masih terbuka |
| --- | --- | --- |
| Dasbor | Penjualan, pengeluaran, laba, jumlah order, produk terlaris, alert stok dari basis data | Audit akhir dan penerimaan demo lengkap |
| Kasir | Pencarian produk, keranjang, batas stok, tunai, transfer, QRIS, uang diterima, kembalian, simpan penjualan, usulan pesanan dari ketikan atau mikrofon | Uji DeepSeek dan mikrofon nyata |
| Stok dan Produk | Tambah, ubah, stok awal, ambang minimum, penyesuaian beralasan, arsip, aktifkan kembali, alert, draft pembelian, dialog tinjau produk dari asisten | Uji asisten nyata dan tampilan prediksi restok |
| Laporan Keuangan | Harian, mingguan, rincian transaksi, jenis pembayaran dan ringkasan uang masuk | Audit akhir |
| Persetujuan | Antrean, rincian draft, setujui, tolak, riwayat, pembaruan stok, pencegahan keputusan berulang | Penerimaan demo lengkap bersama AI nyata |
| Percakapan dengan Agen AI | Teks, riwayat, mode lokal, laporan bahasa alami, parser foto struk, tinjau bacaan, penguncian konteks, kuota | Uji AI dan foto nyata, mikrofon nyata, unggah berkas voice note |
| Integrasi WhatsApp | Koneksi simulasi, pemeriksaan profil Fonnte, panel pelanggan, orderan, nominal bukti simulasi, balasan tercatat, hapus data pelanggan | Uji Fonnte dan webhook nyata, pembacaan foto bukti lewat AI |
| Pengaturan | Keterangan persetujuan pemrosesan pesan dan privasi | Audit akhir |

Sepuluh tool berada di `src/lib/tools/`: stok, penjualan, pengeluaran,
hutang, draft pembelian, balasan simulasi, pencocokan bukti, laporan, prediksi
stok, dan strategi bisnis. Setiap pemanggilan tool meninggalkan jejak audit.
Keberadaan tool prediksi belum berarti kartu prediksi tersedia pada halaman Stok.

Kasir menyimpan orderan, item, transaksi, dan pergerakan stok secara atomik.
Harga diperiksa ulang di server. Identitas permintaan mencegah kiriman ulang
yang sama mencatat penjualan dua kali. Produk arsip tidak masuk daftar aktif.
Pesanan WhatsApp baru belum mengurangi stok; bukti yang cocok menyelesaikan
orderan dan mencatat penjualan serta stok sekali.

## Menjalankan

Persyaratan: Node.js 24 atau lebih baru. Untuk pemasangan baru:

```powershell
npm install
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

Jangan menimpa `.env.local` yang sudah berisi kunci. Nama konfigurasi tersedia
di `.env.example`. Buat `FIELD_ENCRYPTION_KEY` sesuai petunjuk di berkas itu
dan pertahankan kunci yang sama agar data pelanggan lama tetap dapat dibuka.

Pemilik sudah mengisi `DEEPSEEK_API_KEY` di `.env.local`. Nilainya tetap
lokal dan tidak masuk git. Untuk pemasangan lain, isi kunci sendiri.

Hentikan server yang memakai basis data PGlite sebelum menerapkan migrasi:

```powershell
npm run db:migrate
npm run dev
```

Buka http://localhost:3000. Pada basis data baru yang masih kosong, jalankan
`npm run db:seed` sebelum menyalakan server.

**Perhatian data:** `db:seed` menghapus dan membuat ulang seluruh data demo.
Jangan jalankan pada data yang ingin dipertahankan. Seed berisi satu warung,
20 produk aktif, satu produk arsip, pelanggan, transaksi, dan draft persetujuan.
Migrasi 0001 sampai 0003 menambahkan jenis pembayaran, arsip produk, deduplikasi
pesan dan penjualan, serta konteks sesi. Data lokal pemilik belum dimigrasi
dalam sesi implementasi ini.

## Kunci API dan keterbatasan

- Percakapan memakai DeepSeek bila kunci dan jaringan tersedia. Saat tidak
  tersedia, mode lokal ditulis jelas dan hanya menjawab fungsi deterministik
  yang didukung dari data warung.
- Kasir dan tambah produk lewat asisten tidak memakai penafsir lokal yang
  menyamar sebagai AI. Formulir manual tetap dapat dipakai saat asisten gagal.
- Pengenalan suara memakai Web Speech API. Jalur ketik tersedia bila dukungan
  peramban, izin mikrofon, atau jaringan tidak memadai. Unggah voice note
  sebagai berkas belum diimplementasikan.
- Foto struk ditinjau sebelum menjadi pengeluaran. Parser dan konfirmasi
  sudah diuji dengan penyedia uji; panggilan vision nyata belum diuji ulang.
- Hubungkan simulasi pada halaman WhatsApp untuk demonstrasi tanpa Fonnte.
  Nominal bukti simulasi adalah data uji, bukan verifikasi saldo bank.
- Pemeriksaan nomor Fonnte membaca `FONNTE_TOKEN` dari server. Koneksi aplikasi
  dapat diputus untuk menghentikan pemrosesan. Tindakan itu tidak keluar dari
  perangkat WhatsApp pada dasbor Fonnte.
- Webhook `/api/channels/whatsapp` memerlukan `CHANNEL_WEBHOOK_SECRET`
  melalui header Authorization Bearer atau parameter key. Tanpa kunci,
  penerima menolak pesan. Payload tanpa identitas pesan hanya diproses sebagai
  pertanyaan agar pengulangan penyedia tidak membuat orderan rangkap.
- Balasan pelanggan dan pesanan pembelian disimpan di aplikasi tanpa dikirim
  ke pelanggan atau pemasok asli.
- Tidak ada ekspor PDF atau Excel, cetak struk, pemrosesan pembayaran,
  marketplace, atau fitur lain di luar `docs/SCOPE.md`.

## Verifikasi

```powershell
npm run format:check
npm run typecheck
npm run lint
npm run lint:ui
npm test
npm run build
npm run test:e2e
```

Uji peramban memakai lebar 393 dan 1280 piksel. Untuk menjaga server dan data
pemilik, sesi ini memakai `PGLITE_DATA_DIR=.pglite/test-completion-20261018`,
`NEXT_DIST_DIR=.next-test-completion`, dan
`PLAYWRIGHT_BASE_URL=http://localhost:3100`. Konfigurasi tersebut dipasang
pada proses pengujian, tanpa mengubah `.env.local`.

Hasil pemeriksaan sesi ini dicatat pada
`docs/verification/2026-10-18-checkpoint.md`. Pengujian otomatis dengan
penyedia uji tidak membuktikan mikrofon, DeepSeek, atau Fonnte nyata.

## Dokumen

| Berkas | Isi |
| --- | --- |
| `AGENTS.md` | Aturan kerja dan definisi selesai |
| `PLAN.md` | Rencana induk, status, serta pekerjaan tersisa |
| `DESIGN.md` | Arah visual dan token |
| `docs/PRODUCT.md` | Kebenaran produk dari proposal |
| `docs/SCOPE.md` | Batas fitur dan penerimaan demo |
| `docs/ARCHITECTURE.md` | Teknologi, skema, dan alur |
| `docs/CONVENTIONS.md` | Aturan kode dan teks antarmuka |
| `docs/WORKFLOW.md` | Git, commit, push, dan verifikasi |
| `docs/specs/2026-10-17-kasir-kelola-produk-design.md` | Rancangan Kasir, produk, dan Persetujuan |
| `docs/plans/2026-10-18-penyelesaian-web.md` | Tahapan pelaksanaan |
| `docs/THIRD-PARTY-SKILLS.md` | Asal dan lisensi skills pihak ketiga |

## Kontribusi dan lisensi

Ikuti `AGENTS.md` dan `docs/WORKFLOW.md`. Teks pengguna berbahasa Indonesia,
tanpa emoji dan tanda hubung, serta memakai format angka Indonesia.
Semua perubahan kode wajib di commit dan di push ke origin.

Repo: https://github.com/ZeaLIsHere/kedeawak-infest.
Kode proyek milik tim KedeAwak. Skills pihak ketiga mengikuti lisensi masing
masing yang tercatat pada `docs/THIRD-PARTY-SKILLS.md`.
