# PLAN.md

Rencana kerja induk KedeAwak. Ini satu satunya daftar pekerjaan yang dikerjakan.

- **Cakupan fitur:** `docs/SCOPE.md`
- **Keputusan teknis:** `docs/ARCHITECTURE.md`
- **Aturan kerja:** `AGENTS.md`, `docs/WORKFLOW.md`

## Cara membaca

| Tanda | Arti |
| --- | --- |
| `[ ]` | Belum dikerjakan |
| `[~]` | Sedang dikerjakan |
| `[x]` | Selesai dan sudah di push |
| `[!]` | Terhambat, butuh keputusan atau sumber daya dari user |

**Aturan pengerjaan:** kerjakan berurutan sesuai fase. Jangan melompat ke fase
berikutnya sebelum tugas yang menghambat selesai. Setiap tugas selesai langsung
di commit dan di push, sesuai `docs/WORKFLOW.md`.

**Blocker saat ini:** tidak ada. Fase 0 selesai. Keputusan K1 sampai K4 dan K6
sampai K8 sudah ditetapkan. Hanya K5 yang masih terbuka, dan itu tidak
menghambat. Lihat bagian "Keputusan yang menunggu konfirmasi" di bawah.

---

## Keputusan

| ID | Pertanyaan | Rekomendasi saya | Status |
| --- | --- | --- | --- |
| K1 | Nama dan email untuk identitas git | Perlu dari user | Selesai. Nama `ZeaLIsHere`, email memakai alamat noreply GitHub `180758619+ZeaLIsHere@users.noreply.github.com`. Ganti bila ingin memakai email lain |
| K2 | Cara autentikasi push ke GitHub | Perlu dari user | Selesai. Kredensial `ZeaLIsHere` sudah tersimpan di Windows Credential Manager, push terverifikasi berhasil |
| K3 | Penyedia model bahasa untuk demo | Ditanyakan | **Ditetapkan.** DeepSeek, model `deepseek-flash`, karena token sudah tersedia dari user |
| K4 | Apakah kunci API sudah tersedia | Ditanyakan | **Ditetapkan.** Token DeepSeek tersedia. Disimpan di `.env.local` sebagai `DEEPSEEK_API_KEY` |
| K5 | Pemasangan Python untuk data skill desain | Ditanyakan | Belum dijawab. Tidak menghambat, data CSV dibaca lewat Node sampai diputuskan |
| K6 | Konfirmasi daftar fitur di `docs/SCOPE.md` | Ditanyakan | **Dikonfirmasi user.** Enam permukaan sesuai `docs/SCOPE.md` |
| K7 | Pemakaian PGlite untuk demo, bukan Postgres terpisah | Ditanyakan | **Ditetapkan.** PGlite, setelah dipastikan mendukung CRUD penuh, transaksi, dan pgvector |
| K8 | Transkripsi voice note | Diusulkan | **Ditetapkan.** Web Speech API peramban, karena DeepSeek tidak punya endpoint audio dan proposal menyebut Google STT |

---

## Fase 0: Fondasi repo dan aturan main

Tujuan: aturan main dan rencana tersedia, repo siap menerima kode.

| ID | Tugas | Hasil | Status |
| --- | --- | --- | --- |
| T0.1 | Pasang skills pihak ketiga | 15 skill di `.claude/skills/`, provenance tercatat | `[x]` |
| T0.2 | Tulis `AGENTS.md` berisi aturan main | Aturan fokus, larangan UI, aturan git, definisi selesai | `[x]` |
| T0.3 | Tulis `docs/PRODUCT.md` | Kebenaran produk hasil ekstraksi proposal | `[x]` |
| T0.4 | Tulis `docs/SCOPE.md` | Batas fitur, masuk, simulasi, dan luar scope | `[x]` |
| T0.5 | Tulis `docs/ARCHITECTURE.md` | Tumpukan, struktur direktori, skema data, alur orkestrasi | `[x]` |
| T0.6 | Tulis `docs/CONVENTIONS.md` | Aturan kode, teks UI, penamaan | `[x]` |
| T0.7 | Tulis `docs/WORKFLOW.md` | Alur git, commit, push, verifikasi | `[x]` |
| T0.8 | Tulis `docs/THIRD-PARTY-SKILLS.md` | Provenance dan lisensi skills | `[x]` |
| T0.9 | Tulis `PLAN.md` dan `README.md` | Rencana induk dan gambaran proyek | `[x]` |
| T0.10 | Siapkan `.gitignore` dan konfigurasi OpenCode | Repo aman dari rahasia dan berkas hasil build | `[x]` |
| T0.11 | Atur remote, identitas git, dan autentikasi | Commit pertama terkirim ke `origin` | `[x]` |

Kriteria selesai fase 0: dokumen aturan main lengkap, commit pertama ada di
`origin`.

---

## Fase 1: Kerangka aplikasi dan sistem desain

Tujuan: aplikasi bisa dijalankan, aturan UI otomatis ditegakkan, arah visual
terkunci.

| ID | Tugas | Hasil | Status |
| --- | --- | --- | --- |
| T1.1 | Inisialisasi Next.js dengan TypeScript strict | Aplikasi berjalan di `npm run dev` | `[ ]` |
| T1.2 | Pasang Tailwind, shadcn/ui, dan lucide-react | Komponen dasar tersedia, ikon memakai SVG | `[ ]` |
| T1.3 | Susun token desain tiga lapis | Warna, jarak, ukuran huruf dari token, tanpa nilai langsung | `[ ]` |
| T1.4 | Kunci arah visual sesuai proposal | Clean, minimalis, rata. Gaya chat first. Dibuktikan lewat `DESIGN.md` | `[ ]` |
| T1.5 | Buat kerangka aplikasi dan navigasi | Navigasi menuju enam permukaan, sasaran sentuh memadai | `[ ]` |
| T1.6 | Buat skrip `lint:ui` | Menolak emoji dan tanda hubung pada teks UI | `[ ]` |
| T1.7 | Pasang ESLint, Prettier, dan skrip `typecheck` | `npm run lint`, `npm run typecheck` berjalan | `[ ]` |
| T1.8 | Pasang Vitest dan Playwright | `npm test` dan `npm run test:e2e` berjalan | `[ ]` |
| T1.9 | Siapkan `.env.example` | Semua nama variabel tercatat, tanpa nilai rahasia | `[ ]` |

Kriteria selesai fase 1: `npm run build`, `npm run lint`, dan `npm run lint:ui`
lulus pada aplikasi kosong yang sudah bernavigasi.

---

## Fase 2: Basis data dan lapisan data

Tujuan: seluruh data scope punya tempat tinggal, dan bisa diisi data demo.

| ID | Tugas | Hasil | Status |
| --- | --- | --- | --- |
| T2.1 | Definisi skema lengkap | Semua tabel di `docs/ARCHITECTURE.md` bagian 4 | `[ ]` |
| T2.2 | Pemilih driver PGlite dan Postgres | Satu kode, dua driver, dipilih dari lingkungan | `[ ]` |
| T2.3 | Migrasi dan perintah penerapannya | `npm run db:migrate` | `[ ]` |
| T2.4 | Enkripsi nama dan nomor telepon pelanggan | Data disimpan terenkripsi, butir privasi proposal | `[ ]` |
| T2.5 | Lapisan akses data untuk tiap entitas | `src/lib/data/`, satu pintu, semua query memuat `business_id` | `[ ]` |
| T2.6 | Perhitungan stok terkini dari pergerakan stok | Stok konsisten, setiap perubahan meninggalkan jejak | `[ ]` |
| T2.7 | Skrip seed data demo | Satu warung, sekitar 20 produk, riwayat transaksi beberapa minggu | `[ ]` |
| T2.8 | Pengujian lapisan data | Uji lulus untuk query dan perhitungan stok | `[ ]` |

Kriteria selesai fase 2: `npm run db:migrate` dan `npm run db:seed` berjalan
bersih, pengujian lapisan data lulus.

---

## Fase 3: Tool layer

Tujuan: sepuluh tool proposal ada, berfungsi, dan teruji.

| ID | Tugas | Hasil | Status |
| --- | --- | --- | --- |
| T3.1 | Kerangka tool dan pencatatan jejak audit | Setiap pemanggilan tercatat di `tool_invocations` | `[ ]` |
| T3.2 | `check_stock` | Membaca stok terkini | `[ ]` |
| T3.3 | `create_sale` | Menulis penjualan, memperbarui stok | `[ ]` |
| T3.4 | `create_expense` | Menulis pengeluaran | `[ ]` |
| T3.5 | `create_debt` | Menulis hutang pelanggan | `[ ]` |
| T3.6 | `create_purchase_order` | Membuat draft PO, bukan langsung menulis, masuk antrean persetujuan | `[ ]` |
| T3.7 | `send_whatsapp` | Menulis balasan ke percakapan, tidak mengirim ke luar | `[ ]` |
| T3.8 | `verify_payment` | Mencocokkan bukti transfer dengan nominal harapan | `[ ]` |
| T3.9 | `get_report` | Ringkasan harian dan mingguan | `[ ]` |
| T3.10 | `forecast_stock` | Rata rata bergerak dengan safety stock | `[ ]` |
| T3.11 | `business_strategy` | Rekomendasi dari data transaksi yang ada | `[ ]` |
| T3.12 | Pengujian seluruh tool | Uji lulus untuk sepuluh tool, termasuk jalur gagal | `[ ]` |

Kriteria selesai fase 3: sepuluh tool lulus uji, dan tidak ada tool yang
mengubah stok tanpa meninggalkan jejak.

---

## Fase 4: Lapisan AI dan context lock

Tujuan: percakapan bahasa alami menjadi aksi yang tercatat, dengan pengaman.

| ID | Tugas | Hasil | Status |
| --- | --- | --- | --- |
| T4.1 | Antarmuka penyedia model bahasa | Satu kontrak, implementasi nyata dan pengganti lokal | `[ ]` |
| T4.2 | Antarmuka speech to text lewat Web Speech API peramban | Voice note menjadi teks, dengan fallback isian manual | `[ ]` |
| T4.3 | Antarmuka pembacaan struk lewat `deepseek-flash` | Foto struk menjadi data terstruktur, memakai skema keluaran ketat | `[ ]` |
| T4.4 | Pengganti lokal yang deterministik | Berjalan tanpa kunci API, tidak mengarang hasil | `[ ]` |
| T4.5 | Orkestrator: pemahaman maksud dan pemilihan tool | Pesan masuk dipetakan ke pemanggilan tool, argumen divalidasi dengan skema | `[ ]` |
| T4.6 | RAG konteks bisnis dengan pgvector | Jawaban memakai data warung yang nyata | `[ ]` |
| T4.7 | Context lock saat menunggu persetujuan | Pesan lanjutan tidak dianggap transaksi baru | `[ ]` |
| T4.8 | Pembatas pemakaian harian | Kuota harian tercatat dan ditegakkan | `[ ]` |
| T4.9 | Fallback tiga lapis pembacaan struk | Confidence di bawah 70 persen memicu konfirmasi, lalu minta input manual | `[ ]` |
| T4.10 | Pengujian orkestrasi dan context lock | Uji lulus untuk jalur normal dan jalur gagal | `[ ]` |

Kriteria selesai fase 4: satu pesan bahasa alami dapat menghasilkan catatan
transaksi yang benar, dan aksi berisiko selalu berhenti di antrean persetujuan.

---

## Fase 5: Permukaan aplikasi

Tujuan: enam permukaan berfungsi penuh, sesuai `docs/SCOPE.md` bagian 2.

### S1 Dasbor

| ID | Tugas | Status |
| --- | --- | --- |
| T5.1 | Ringkasan penjualan, pengeluaran, dan laba hari ini | `[ ]` |
| T5.2 | Jumlah order dan produk terlaris | `[ ]` |
| T5.3 | Ringkasan alert stok terbaru | `[ ]` |
| T5.4 | Keadaan memuat, kosong, dan gagal untuk setiap kartu | `[ ]` |

### S2 Percakapan dengan Agen AI

| ID | Tugas | Status |
| --- | --- | --- |
| T5.5 | Percakapan teks dengan agen, dengan riwayat | `[ ]` |
| T5.6 | Input voice note, perekaman dan unggah | `[ ]` |
| T5.7 | Input foto struk | `[ ]` |
| T5.8 | Kartu konfirmasi saat confidence rendah | `[ ]` |
| T5.9 | Pemberitahuan terus terang saat pengganti lokal aktif | `[ ]` |
| T5.10 | Permintaan laporan bahasa alami dari percakapan | `[ ]` |

### S3 Integrasi WhatsApp

| ID | Tugas | Status |
| --- | --- | --- |
| T5.11 | Daftar percakapan pelanggan | `[ ]` |
| T5.12 | Detail percakapan dan riwayat pesan | `[ ]` |
| T5.13 | Orderan yang masuk dari kanal WhatsApp | `[ ]` |
| T5.14 | Bukti pembayaran dan status verifikasi | `[ ]` |
| T5.15 | Panel pengirim pesan tiruan sebagai pelanggan | `[ ]` |
| T5.16 | Balasan otomatis agen tercatat di percakapan | `[ ]` |
| T5.17 | Penghapusan data pelanggan dari antarmuka | `[ ]` |

### S4 Laporan Keuangan

| ID | Tugas | Status |
| --- | --- | --- |
| T5.18 | Laporan harian | `[ ]` |
| T5.19 | Laporan mingguan | `[ ]` |
| T5.20 | Rincian transaksi per periode | `[ ]` |
| T5.21 | Pemisahan penjualan, pengeluaran, dan laba | `[ ]` |

### S5 Stok dan Produk

| ID | Tugas | Status |
| --- | --- | --- |
| T5.22 | Daftar produk dengan harga dan stok | `[ ]` |
| T5.23 | Pengaturan ambang minimum per produk | `[ ]` |
| T5.24 | Daftar alert stok menipis | `[ ]` |
| T5.25 | Penyesuaian stok manual dengan alasan | `[ ]` |
| T5.26 | Prediksi stok dan rekomendasi restok | `[ ]` |

### S6 Persetujuan

| ID | Tugas | Status |
| --- | --- | --- |
| T5.27 | Antrean aksi menunggu persetujuan | `[ ]` |
| T5.28 | Rincian draft PO sebelum disetujui | `[ ]` |
| T5.29 | Aksi setujui dan tolak, dengan pembaruan stok setelah disetujui | `[ ]` |
| T5.30 | Jejak audit aksi yang sudah diputuskan | `[ ]` |

### Halaman pengaturan

| ID | Tugas | Status |
| --- | --- | --- |
| T5.31 | Status koneksi nomor dan aksi menghubungkan atau memutuskan | `[ ]` |
| T5.32 | Keterangan privasi data sesuai butir proposal | `[ ]` |

Kriteria selesai fase 5: keenam permukaan dan halaman pengaturan dapat dipakai
dari awal sampai akhir tanpa langkah manual di luar aplikasi.

---

## Fase 6: Pematangan dan bukti

Tujuan: kualitas, keandalan, dan bukti demo.

| ID | Tugas | Status |
| --- | --- | --- |
| T6.1 | Uji ujung ke ujung delapan langkah kriteria demo | `[ ]` |
| T6.2 | Audit aksesibilitas dan responsif | `[ ]` |
| T6.3 | Pemeriksaan akhir kualitas desain | `[ ]` |
| T6.4 | Selaraskan semua dokumen dengan kenyataan kode | `[ ]` |
| T6.5 | `README` berisi cara menjalankan dan catatan keterbatasan | `[ ]` |
| T6.6 | Jalur mundur bila demo kehilangan jaringan | `[ ]` |
| T6.7 | Rekaman langkah demo dan ringkasan bukti | `[ ]` |

Kriteria selesai fase 6: delapan langkah kriteria demo di `docs/SCOPE.md`
bagian 7 lulus otomatis, dan semua dokumen sesuai kenyataan.

---

## Pemetaan ke proposal

| Janji proposal | Tugas yang membuktikannya |
| --- | --- |
| Integrasi WhatsApp ke aplikasi | T5.11 sampai T5.16 |
| Ekstraksi data multimodal | T4.2, T4.3, T4.9, T5.6, T5.7, T5.8 |
| Alert stok menipis | T2.6, T5.23, T5.24 |
| Respons otomatis ke pelanggan | T3.7, T4.5, T4.6, T5.16 |
| Permintaan laporan keuangan | T3.9, T5.10, T5.18 sampai T5.21 |
| Agentic action | T3.6, T4.7, T5.27 sampai T5.30 |
| Human in the loop | T3.6, T4.7, T5.29 |
| Sepuluh tool | T3.1 sampai T3.12 |
| Tiga butir privasi | T2.4, T5.17, T5.31, T5.32 |
| Dashboard clean, minimalis, rata | T1.3, T1.4, T6.3 |
| Aturan user: tanpa emoji dan tanpa tanda hubung | T1.6, T6.3 |

---

## Cara memakai rencana ini

1. Ambil tugas pertama yang berstatus `[ ]` dan tidak terhambat.
2. Baca bagian dokumen yang terkait sebelum mulai.
3. Kerjakan sampai tuntas, jangan setengah lalu pindah.
4. Verifikasi sesuai `docs/WORKFLOW.md` bagian 4.
5. Commit dan push.
6. Ubah status tugas di berkas ini menjadi `[x]`.
7. Laporkan ke user: apa yang berubah, bukti verifikasi, dan tugas berikutnya.

Bila di tengah jalan ternyata dibutuhkan pekerjaan yang belum ada di sini,
jangan langsung dikerjakan. Tambahkan dulu ke rencana ini, atau tanyakan ke user.
