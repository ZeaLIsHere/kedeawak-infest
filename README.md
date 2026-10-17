# KedeAwak

Aplikasi AI agent operasional warung yang menyambungkan WhatsApp ke satu
sistem terpusat. Pemilik warung tetap memakai WhatsApp seperti biasa,
sementara KedeAwak mencatat, menganalisis, dan bertindak di belakang layar.

Dibuat untuk Lomba Informatics Festival XII, bidang Hackathon,
Universitas Sumatera Utara, 2026.

---

## Status

Proyek sedang pada tahap fondasi. Kerangka aplikasi sudah berjalan, tetapi
fitur belum ada. Lihat `PLAN.md` untuk urutan pekerjaan.

## Masalah yang diselesaikan

Lebih dari 90 persen UMKM Indonesia belum memanfaatkan AI. Hanya 3,51 persen
UMKM punya laporan keuangan yang memadai, sehingga 69,5 persen belum bisa
mengakses kredit bank. Sementara itu WhatsApp sudah menjadi kanal transaksi
paling dominan, tetapi hampir semua interaksinya masih dikerjakan manual.

Hambatan utamanya bukan teknologi, melainkan kebiasaan. Aplikasi pencatatan
konvensional memaksa pelaku usaha keluar dari alur kerjanya. KedeAwak
menghilangkan hambatan itu dengan membuat WhatsApp tetap menjadi pintu masuk.

## Fitur

Enam permukaan aplikasi, sesuai `docs/SCOPE.md`:

| Halaman | Isi |
| --- | --- |
| Dasbor | Statistik penjualan, pengeluaran, laba, order, alert stok |
| Percakapan dengan Agen AI | Mencatat transaksi lewat teks, suara, dan foto struk |
| Integrasi WhatsApp | Status koneksi WhatsApp, orderan, bukti pembayaran, status verifikasi |
| Laporan Keuangan | Laporan harian dan mingguan |
| Stok dan Produk | Produk, stok, ambang minimum, alert, prediksi restok |
| Persetujuan | Antrean aksi menunggu persetujuan, misalnya draft PO |

## Dokumen

| Berkas | Isi |
| --- | --- |
| `AGENTS.md` | Aturan main kerja. Wajib dibaca lebih dulu |
| `PLAN.md` | Rencana induk dan daftar tugas |
| `docs/PRODUCT.md` | Kebenaran produk hasil ekstraksi proposal |
| `docs/SCOPE.md` | Batas fitur, termasuk yang tidak dikerjakan |
| `docs/ARCHITECTURE.md` | Tumpukan teknologi, struktur, skema data |
| `docs/CONVENTIONS.md` | Aturan kode dan teks antarmuka |
| `docs/WORKFLOW.md` | Alur git, commit, push, dan verifikasi |
| `docs/THIRD-PARTY-SKILLS.md` | Asal usul dan lisensi skills pihak ketiga |

## Menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:3000.

Perintah lain:

| Perintah | Fungsi |
| --- | --- |
| `npm run build` | Bangun aplikasi untuk produksi |
| `npm run lint` | Periksa aturan kode |
| `npm start` | Jalankan hasil bangun produksi |

Persyaratan: Node.js 24 atau lebih baru.

## Aturan yang mengikat

Dua aturan berikut berlaku pada seluruh teks yang dilihat pengguna:

1. Tidak ada emoji, dalam bentuk apa pun.
2. Tidak ada karakter tanda hubung, dan tidak ada varian dash lain.

Rinciannya di `AGENTS.md` bagian 3 dan `docs/CONVENTIONS.md` bagian 2.

## Kontribusi

Semua perubahan wajib mengikuti `docs/WORKFLOW.md`. Setiap perubahan kode atau
penambahan fitur harus di commit dan di push ke `origin`.

Repo: https://github.com/ZeaLIsHere/kedeawak-infest

## Lisensi dan pihak ketiga

Kode proyek ini milik tim KedeAwak. Skills pihak ketiga di `.claude/skills/`
memiliki lisensi masing masing, tercatat di `docs/THIRD-PARTY-SKILLS.md`.
