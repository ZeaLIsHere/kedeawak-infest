# PLAN.md

Rencana kerja induk KedeAwak. Ini satu satunya daftar pekerjaan yang dikerjakan.

- **Cakupan fitur:** `docs/SCOPE.md`
- **Keputusan teknis:** `docs/ARCHITECTURE.md`
- **Aturan kerja:** `AGENTS.md`, `docs/WORKFLOW.md`

## Cara membaca

| Tanda | Arti                                                  |
| ----- | ----------------------------------------------------- |
| `[ ]` | Belum dikerjakan                                      |
| `[~]` | Parsial: implementasi atau verifikasi belum lengkap   |
| `[x]` | Selesai dan sudah di push                             |
| `[!]` | Terhambat, butuh keputusan atau sumber daya dari user |

**Aturan pengerjaan:** kerjakan berurutan sesuai fase. Jangan melompat ke fase
berikutnya sebelum tugas yang menghambat selesai. Setiap tugas selesai langsung
di commit dan di push, sesuai `docs/WORKFLOW.md`.

**Ketergantungan saat ini:** keputusan K1 sampai K4 dan K6 sampai K9 sudah
ditetapkan. Kunci DeepSeek sudah diisi pemilik pada 18 Oktober 2026. K5 tetap
terbuka dan tidak menghambat. Keputusan kanal diperbarui dengan keputusan
user pada 18 Oktober 2026: Fonnte menggantikan Twilio Sandbox sebagai penyedia
kanal WhatsApp, termasuk balasan nyata dari DeepSeek dan voice note otomatis
menjadi teks lalu orderan. Kredensial Fonnte/Groq dan alur provider nyata masih
perlu diverifikasi; panel simulasi tetap tidak bergantung pada layanan luar.

---

## Kemajuan

Angka di bawah dihitung dari tanda status pada tabel tiap fase. Terakhir
diperbarui 18 Oktober 2026.

| Fase | Isi                                 | Selesai | Total |
| ---- | ----------------------------------- | ------- | ----- |
| 0    | Fondasi repo dan aturan main        | 11      | 11    |
| 1    | Kerangka aplikasi dan sistem desain | 9       | 9     |
| 2    | Basis data dan lapisan data         | 8       | 8     |
| 3    | Tool layer                          | 12      | 12    |
| 4    | Lapisan AI dan context lock         | 5       | 10    |
| 5    | Permukaan aplikasi                  | 33      | 46    |
| 6    | Pematangan dan bukti                | 2       | 7     |
|      | Jumlah                              | 80      | 103   |

Checkpoint penghentian sebelumnya dipertahankan sebagai riwayat di bawah.
Pekerjaan kanal dibuka kembali sesuai persetujuan Twilio Sandbox. T5.13 dan
T5.16 kembali parsial karena bukti simulasi lama tidak membuktikan media dan
balasan Twilio nyata.

Pelacak kedua adalah riwayat git. Setiap commit memuat baris `Refs:` yang
menunjuk ID tugas, sehingga `git log` dapat dipakai untuk menelusuri kapan
sebuah tugas dikerjakan dan apa buktinya. Lihat `docs/WORKFLOW.md` bagian 5.

### Urutan kerja dan kondisi sekarang

Potongan pembacaan data pertama selesai pada 17 Oktober 2026.
Pada 18 Oktober 2026 pemilik menyetujui urutan Kasir, kelola produk, lalu
Persetujuan. Implementasi dilanjutkan sampai titik penghentian sesi di bawah;
percakapan dan panel WhatsApp juga sudah memiliki alur nyata di basis data.

Rancangan: `docs/specs/2026-10-17-kasir-kelola-produk-design.md`.
Rencana pelaksanaan: `docs/plans/2026-10-18-penyelesaian-web.md`.
Seluruh status tugas hanya dilacak pada tabel di berkas ini.

`DEEPSEEK_API_KEY` sudah diisi pemilik di `.env.local`, dikonfirmasi
18 Oktober 2026. Nilainya tidak ditulis dalam dokumen, keluaran, atau git.
Kunci tersedia tidak berarti seluruh integrasi sudah diverifikasi.
Pada checkpoint lama, token dan layanan Fonnte nyata belum diperiksa.
Keputusan terkini menggantikannya dengan Twilio Sandbox. S2, S3, dan context
lock tetap masuk cakupan, tanpa pembatalan fitur.

### Rencana lanjutan Twilio Sandbox

Rincian: `docs/plans/2026-10-18-twilio.md`. Implementasi dan pengujian dengan
penyedia uji sudah masuk; validasi provider nyata belum diklaim.

- [x] T5.11, T5.12: status koneksi, panduan Sandbox/join, Hubungkan/Putuskan.
- [x] T5.13, T5.14, T5.16: webhook bertanda tangan, TwiML kosong segera,
      `after()` lalu REST reply, teks menjadi orderan dan balasan peserta opt in.
- [x] T5.13, T5.14: satu media, unduh aman, Groq Whisper ke transkrip lalu
      DeepSeek ke orderan; foto hanya untuk orderan sendiri yang tidak ambigu.
- [x] Unit keamanan: tanda tangan, semua parameter form, media-only, SSRF,
      redirect tanpa auth, MIME/ukuran, deduplikasi dan isolasi pengirim/warung.
- [x] Integrasi: teks/audio/foto sampai orderan, bukti, stok, laporan,
      balasan REST serta polling atau muat ulang UI setelah proses selesai.
- [ ] Validasi Node 24, unit/integrasi/E2E dan demo ngrok dengan provider nyata;
      catat kegagalan dan jangan menyebut mock sebagai uji provider nyata.

Webhook adalah `POST /api/channels/whatsapp` pada server Next/UI port 3100,
`WEBHOOK_URL` harus URL HTTPS publik lengkap persis. `/whatsapp` hanya UI;
tidak ada webhook baru atau port 3101. `after()` tidak tahan restart/redeploy:
ini demo, bukan durable worker; bila tidak ada balasan, kirim ulang pesan baru.
Pencocokan nominal lama tetap otomatis mencatat pada confidence >= 0.7,
bukan verifikasi bank. Groq dipilih tim untuk audio, bukan permintaan penyedia
spesifik dari user. `docs/PRODUCT.md` tidak diubah, tidak ada berkas env ditulis,
dan tidak ada commit dalam tugas dokumentasi ini.

## Titik penghentian sesi 18 Oktober 2026 (migrasi Fonnte)

Pengembangan dihentikan atas permintaan pemilik pada 18 Oktober 2026 setelah
migrasi kanal WhatsApp dari Twilio Sandbox ke Fonnte. Seluruh perubahan sudah
diperiksa pada mesin ini: `npm run typecheck`, `npm run lint`,
`npx tsx src/scripts/lint-ui-copy.ts` (115 berkas, tanpa pelanggaran),
`npm test` (506 uji lulus), dan `npm run build` dengan `NEXT_DIST_DIR` terpisah.

Yang sudah berjalan dan terbukti:

- Halaman `/whatsapp` memuat daftar pesanan WhatsApp di atas daftar percakapan.
  Balasan agen tetap tidak ditampilkan, sesuai aturan bagian 11.2 butir 5.
- Tombol Hubungkan WhatsApp pada panel koneksi memakai Fonnte dan berhasil
  mengubah status menjadi terhubung saat diuji di peramban.
- Webhook `POST /api/channels/fonnte` terverifikasi lewat terowongan publik:
  permintaan tanpa kunci ditolak 401, payload tidak sesuai ditolak 400, dan
  pesan grup diabaikan. Uji integrasi baru membuktikan alur pesan sampai
  orderan, balasan DeepSeek, dan pengiriman lewat Fonnte `/send`, termasuk
  penolakan pesan ulang.
- Kode Twilio Sandbox disimpan sebagai cadangan dan tidak ditampilkan lagi di
  antarmuka.

Yang masih terbuka:

- Belum ada bukti pesan WhatsApp nyata dari ponsel kedua sampai balasan
  diterima. Kirim pesan ke nomor warung untuk menguji ujung ke ujung.
- URL webhook perangkat Fonnte bergantung pada terowongan cepat Cloudflare.
  Bila terowongan dijalankan ulang, URL berubah dan harus diperbarui di dasbor
  Fonnte.
- Bersihkan `.next-build` dan `.pglite/build` setelah membangun. `tsconfig.json`
  sempat ditambahi jalur `.next-build` oleh `next typegen`; nilainya
  dikembalikan sebelum commit.
- Tidak ada kredensial baru yang diminta atau ditambahkan. `FONNTE_TOKEN`,
  `FONNTE_WEBHOOK_SECRET`, dan `DEEPSEEK_API_KEY` sudah ada di `.env.local`.

## Titik penghentian sesi sebelumnya (historis, sebelum Twilio)

Catatan historis: pengembangan dihentikan atas permintaan pemilik pada
18 Oktober 2026 sebelum persetujuan lanjutan Twilio Sandbox.
Kode yang sudah dibuat disimpan bersama pembaruan dokumen, pemeriksaan, commit,
dan push. Tidak ada fitur lanjutan yang ditambahkan setelah permintaan itu.

Kasir, formulir produk, arsip, laporan pembayaran, Persetujuan, panel simulasi
WhatsApp, penghapusan pelanggan, dan halaman privasi sudah tersambung.
Percakapan teks dan riwayat, mode lokal, sepuluh tool, kuota, context lock,
serta parser DeepSeek dan struk sudah memiliki implementasi serta uji unit
atau integrasi. Pengujian otomatis penyedia AI memakai penyedia uji yang
disuntikkan; itu tidak membuktikan layanan DeepSeek nyata sudah diuji ulang.

Status `[~]` berarti implementasi atau verifikasi masih belum lengkap.
Pekerjaan tidak sedang dilanjutkan setelah titik ini. Tugas tersebut tetap
terbuka untuk sesi berikutnya, tanpa mengubah cakupan produk.

| Bagian terbuka                     | Kondisi sebenarnya                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| T4.1, T4.3, T4.5, T4.9, T5.7, T5.8 | Adapter, orkestrator, unggah foto, dan tinjau bacaan ada; uji API nyata serta alur foto di peramban belum lengkap         |
| T4.2, T5.6                         | Pengenalan mikrofon Web Speech API dan jalur ketik ada; mikrofon nyata belum diuji, unggah berkas voice note belum dibuat |
| T5.11, T5.12                       | Profil Fonnte dan aksi koneksi aplikasi ada; token, nomor, dan webhook penyedia nyata belum diuji                         |
| T5.14                              | Nominal bukti simulasi diuji; pembacaan foto bukti nyata masih memerlukan uji layanan AI                                  |
| T5.26                              | Tool prediksi stok ada dan diuji; kartu prediksi pada halaman Stok belum dibuat                                           |
| T5.38, T5.43                       | Formulir ketikan, suara, parser, serta dialog tinjau ada; penafsiran DeepSeek dan mikrofon nyata belum diuji ulang        |
| T6.1                               | Alur otomatis baru mencakup bagian yang tersedia, belum seluruh sepuluh langkah penerimaan                                |
| T6.2, T6.3                         | Uji dua lebar layar tersedia; audit menyeluruh aksesibilitas dan desain belum dijalankan                                  |
| T6.6                               | Mode lokal membaca data tanpa AI; simulasi tidak memakai Fonnte, tetapi uji jaringan terputus menyeluruh belum dijalankan |
| T6.7                               | Belum ada rekaman demonstrasi lengkap; bukti pemeriksaan dicatat dalam laporan sesi                                       |

Data lokal pemilik tidak dimigrasi atau disiapkan ulang selama sesi ini.
Migrasi 0001 sampai 0003 dan seed hanya dijalankan pada direktori pengujian
`.pglite/test-completion-20261018`. Sebelum memakai kode baru pada data lokal,
hentikan server yang mengakses PGlite lalu jalankan `npm run db:migrate`.
Jangan menjalankan `db:seed` pada data yang ingin dipertahankan.

---

## Keputusan

| ID  | Pertanyaan                                           | Rekomendasi saya         | Status                                                                                                                                                                                                                                                                                                                                                               |
| --- | ---------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K1  | Nama dan email untuk identitas git                   | Perlu dari user          | Selesai. Nama `ZeaLIsHere`, email memakai alamat noreply GitHub `180758619+ZeaLIsHere@users.noreply.github.com`. Ganti bila ingin memakai email lain                                                                                                                                                                                                                 |
| K2  | Cara autentikasi push ke GitHub                      | Perlu dari user          | Selesai. Kredensial `ZeaLIsHere` sudah tersimpan di Windows Credential Manager, push terverifikasi berhasil                                                                                                                                                                                                                                                          |
| K3  | Penyedia model bahasa untuk demo                     | Ditanyakan               | **Ditetapkan.** DeepSeek, model `deepseek-flash`, karena token sudah tersedia dari user                                                                                                                                                                                                                                                                              |
| K4  | Apakah kunci API sudah tersedia                      | Ditanyakan               | **Ditetapkan.** Kunci DeepSeek sudah diisi pemilik di `.env.local` sebagai `DEEPSEEK_API_KEY`, dikonfirmasi 18 Oktober 2026                                                                                                                                                                                                                                          |
| K5  | Pemasangan Python untuk data skill desain            | Ditanyakan               | Belum dijawab. Tidak menghambat, data CSV dibaca lewat Node sampai diputuskan                                                                                                                                                                                                                                                                                        |
| K6  | Konfirmasi daftar fitur di `docs/SCOPE.md`           | Ditanyakan               | **Dikonfirmasi user.** Tujuh permukaan, termasuk S7 Kasir yang ditambahkan 18 Oktober 2026                                                                                                                                                                                                                                                                           |
| K7  | Pemakaian PGlite untuk demo, bukan Postgres terpisah | **Ditetapkan.**          | PGlite dipilih setelah dipastikan mendukung CRUD penuh dan transaksi. Pencarian vektor tidak dipakai, jadi pgvector tidak diperlukan.                                                                                                                                                                                                                                |
| K8  | Transkripsi voice note                               | Pilihan implementasi tim | **Diperbarui 18 Oktober 2026.** Groq Whisper untuk berkas audio WhatsApp, termasuk OGG, memakai `GROQ_API_KEY` dan `GROQ_TRANSCRIPTION_MODEL=whisper-large-v3-turbo`, lalu DeepSeek menafsirkan transkrip menjadi orderan. User menyetujui alur otomatis, bukan secara khusus memilih Groq. Web Speech API tetap untuk mikrofon peramban                             |
| K9  | Penyedia kanal WhatsApp                              | Fonnte                   | **Diputuskan user 18 Oktober 2026, menggantikan Twilio Sandbox.** Pesan pelanggan ke nomor warung diproses webhook Next.js lalu dibalas DeepSeek lewat perangkat Fonnte. Teks, foto bukti dan voice note otomatis masuk scope demo. Panel simulasi tetap tersedia sebagai jalur lokal dan tidak ditampilkan pada permukaan WhatsApp. Kode Twilio disimpan sebagai cadangan. Webhook dan UI memakai server port 3100 yang sama; keamanan dan keterbatasan `after()` ada di `docs/ARCHITECTURE.md` bagian 11 |

---

## Fase 0: Fondasi repo dan aturan main

Tujuan: aturan main dan rencana tersedia, repo siap menerima kode.

| ID    | Tugas                                         | Hasil                                                     | Status |
| ----- | --------------------------------------------- | --------------------------------------------------------- | ------ |
| T0.1  | Pasang skills pihak ketiga                    | 15 skill di `.claude/skills/`, provenance tercatat        | `[x]`  |
| T0.2  | Tulis `AGENTS.md` berisi aturan main          | Aturan fokus, larangan UI, aturan git, definisi selesai   | `[x]`  |
| T0.3  | Tulis `docs/PRODUCT.md`                       | Kebenaran produk hasil ekstraksi proposal                 | `[x]`  |
| T0.4  | Tulis `docs/SCOPE.md`                         | Batas fitur, masuk, simulasi, dan luar scope              | `[x]`  |
| T0.5  | Tulis `docs/ARCHITECTURE.md`                  | Tumpukan, struktur direktori, skema data, alur orkestrasi | `[x]`  |
| T0.6  | Tulis `docs/CONVENTIONS.md`                   | Aturan kode, teks UI, penamaan                            | `[x]`  |
| T0.7  | Tulis `docs/WORKFLOW.md`                      | Alur git, commit, push, verifikasi                        | `[x]`  |
| T0.8  | Tulis `docs/THIRD-PARTY-SKILLS.md`            | Provenance dan lisensi skills                             | `[x]`  |
| T0.9  | Tulis `PLAN.md` dan `README.md`               | Rencana induk dan gambaran proyek                         | `[x]`  |
| T0.10 | Siapkan `.gitignore` dan konfigurasi OpenCode | Repo aman dari rahasia dan berkas hasil build             | `[x]`  |
| T0.11 | Atur remote, identitas git, dan autentikasi   | Commit pertama terkirim ke `origin`                       | `[x]`  |

Kriteria selesai fase 0: dokumen aturan main lengkap, commit pertama ada di
`origin`.

---

## Fase 1: Kerangka aplikasi dan sistem desain

Tujuan: aplikasi bisa dijalankan, aturan UI otomatis ditegakkan, arah visual
terkunci.

| ID   | Tugas                                          | Hasil                                                                 | Status |
| ---- | ---------------------------------------------- | --------------------------------------------------------------------- | ------ |
| T1.1 | Inisialisasi Next.js dengan TypeScript strict  | Aplikasi berjalan di `npm run dev`                                    | `[x]`  |
| T1.2 | Pasang Tailwind, shadcn/ui, dan lucide-react   | Komponen dasar tersedia, ikon memakai SVG                             | `[x]`  |
| T1.3 | Susun token desain tiga lapis                  | Warna, jarak, ukuran huruf dari token, tanpa nilai langsung           | `[x]`  |
| T1.4 | Kunci arah visual sesuai proposal              | Clean, minimalis, rata. Gaya chat first. Dibuktikan lewat `DESIGN.md` | `[x]`  |
| T1.5 | Buat kerangka aplikasi dan navigasi            | Navigasi menuju enam permukaan, sasaran sentuh memadai                | `[x]`  |
| T1.6 | Buat skrip `lint:ui`                           | Menolak emoji dan tanda hubung pada teks UI                           | `[x]`  |
| T1.7 | Pasang ESLint, Prettier, dan skrip `typecheck` | `npm run lint`, `npm run typecheck` berjalan                          | `[x]`  |
| T1.8 | Pasang Vitest dan Playwright                   | `npm test` dan `npm run test:e2e` berjalan                            | `[x]`  |
| T1.9 | Siapkan `.env.example`                         | Semua nama variabel tercatat, tanpa nilai rahasia                     | `[x]`  |

Kriteria selesai fase 1: `npm run build`, `npm run lint`, dan `npm run lint:ui`
lulus pada aplikasi kosong yang sudah bernavigasi.

---

## Fase 2: Basis data dan lapisan data

Tujuan: seluruh data scope punya tempat tinggal, dan bisa diisi data demo.

| ID   | Tugas                                         | Hasil                                                             | Status |
| ---- | --------------------------------------------- | ----------------------------------------------------------------- | ------ |
| T2.1 | Definisi skema lengkap                        | Semua tabel di `docs/ARCHITECTURE.md` bagian 4                    | `[x]`  |
| T2.2 | Pemilih driver PGlite dan Postgres            | Satu kode, dua driver, dipilih dari lingkungan                    | `[x]`  |
| T2.3 | Migrasi dan perintah penerapannya             | `npm run db:migrate`                                              | `[x]`  |
| T2.4 | Enkripsi nama dan nomor telepon pelanggan     | Data disimpan terenkripsi, butir privasi proposal                 | `[x]`  |
| T2.5 | Lapisan akses data untuk tiap entitas         | `src/lib/data/`, satu pintu, semua query memuat `business_id`     | `[x]`  |
| T2.6 | Perhitungan stok terkini dari pergerakan stok | Stok konsisten, setiap perubahan meninggalkan jejak               | `[x]`  |
| T2.7 | Skrip seed data demo                          | Satu warung, sekitar 20 produk, riwayat transaksi beberapa minggu | `[x]`  |
| T2.8 | Pengujian lapisan data                        | Uji lulus untuk query dan perhitungan stok                        | `[x]`  |

Kriteria selesai fase 2: `npm run db:migrate` dan `npm run db:seed` berjalan
bersih, pengujian lapisan data lulus.

---

## Fase 3: Tool layer

Tujuan: sepuluh tool proposal ada, berfungsi, dan teruji.

| ID    | Tugas                                    | Hasil                                                                | Status |
| ----- | ---------------------------------------- | -------------------------------------------------------------------- | ------ |
| T3.1  | Kerangka tool dan pencatatan jejak audit | Setiap pemanggilan tercatat di `tool_invocations`                    | `[x]`  |
| T3.2  | `check_stock`                            | Membaca stok terkini                                                 | `[x]`  |
| T3.3  | `create_sale`                            | Menulis penjualan, memperbarui stok                                  | `[x]`  |
| T3.4  | `create_expense`                         | Menulis pengeluaran                                                  | `[x]`  |
| T3.5  | `create_debt`                            | Menulis hutang pelanggan                                             | `[x]`  |
| T3.6  | `create_purchase_order`                  | Membuat draft PO, bukan langsung menulis, masuk antrean persetujuan  | `[x]`  |
| T3.7  | `send_whatsapp`                          | Menulis balasan pada konteks pesan pelanggan, tidak mengirim ke luar | `[x]`  |
| T3.8  | `verify_payment`                         | Mencocokkan bukti transfer dengan nominal harapan                    | `[x]`  |
| T3.9  | `get_report`                             | Ringkasan harian dan mingguan                                        | `[x]`  |
| T3.10 | `forecast_stock`                         | Rata rata bergerak dengan safety stock                               | `[x]`  |
| T3.11 | `business_strategy`                      | Rekomendasi dari data transaksi yang ada                             | `[x]`  |
| T3.12 | Pengujian seluruh tool                   | Uji lulus untuk sepuluh tool, termasuk jalur gagal                   | `[x]`  |

Kriteria selesai fase 3: sepuluh tool lulus uji, dan tidak ada tool yang
mengubah stok tanpa meninggalkan jejak.

---

## Fase 4: Lapisan AI dan context lock

Tujuan: percakapan bahasa alami menjadi aksi yang tercatat, dengan pengaman.

| ID    | Tugas                                                  | Hasil                                                                      | Status |
| ----- | ------------------------------------------------------ | -------------------------------------------------------------------------- | ------ |
| T4.1  | Antarmuka penyedia model bahasa                        | Satu kontrak, implementasi nyata dan pengganti lokal                       | `[~]`  |
| T4.2  | Antarmuka speech to text lewat Web Speech API peramban | Voice note menjadi teks, dengan fallback isian manual                      | `[~]`  |
| T4.3  | Antarmuka pembacaan struk lewat `deepseek-flash`       | Foto struk menjadi data terstruktur, memakai skema keluaran ketat          | `[~]`  |
| T4.4  | Pengganti lokal yang deterministik                     | Berjalan tanpa kunci API, tidak mengarang hasil                            | `[x]`  |
| T4.5  | Orkestrator: pemahaman maksud dan pemilihan tool       | Pesan masuk dipetakan ke pemanggilan tool, argumen divalidasi dengan skema | `[~]`  |
| T4.6  | RAG konteks bisnis dengan query terstruktur            | Jawaban memakai data warung yang nyata                                     | `[x]`  |
| T4.7  | Context lock saat menunggu persetujuan                 | Pesan lanjutan tidak dianggap transaksi baru                               | `[x]`  |
| T4.8  | Pembatas pemakaian harian                              | Kuota harian tercatat dan ditegakkan                                       | `[x]`  |
| T4.9  | Fallback tiga lapis pembacaan struk                    | Confidence di bawah 70 persen memicu konfirmasi, lalu minta input manual   | `[~]`  |
| T4.10 | Pengujian orkestrasi dan context lock                  | Uji lulus untuk jalur normal dan jalur gagal                               | `[x]`  |

Kriteria selesai fase 4: satu pesan bahasa alami dapat menghasilkan catatan
transaksi yang benar, dan aksi berisiko selalu berhenti di antrean persetujuan.

---

## Fase 5: Permukaan aplikasi

Tujuan: tujuh permukaan berfungsi penuh, sesuai `docs/SCOPE.md` bagian 2.

### S1 Dasbor

| ID   | Tugas                                                | Status |
| ---- | ---------------------------------------------------- | ------ |
| T5.1 | Ringkasan penjualan, pengeluaran, dan laba hari ini  | `[x]`  |
| T5.2 | Jumlah order dan produk terlaris                     | `[x]`  |
| T5.3 | Ringkasan alert stok terbaru                         | `[x]`  |
| T5.4 | Keadaan memuat, kosong, dan gagal untuk setiap kartu | `[x]`  |

### S2 Percakapan dengan Agen AI

| ID    | Tugas                                                 | Status |
| ----- | ----------------------------------------------------- | ------ |
| T5.5  | Percakapan teks dengan agen, dengan riwayat           | `[x]`  |
| T5.6  | Input voice note, perekaman dan unggah                | `[~]`  |
| T5.7  | Input foto struk                                      | `[~]`  |
| T5.8  | Kartu konfirmasi saat confidence rendah               | `[~]`  |
| T5.9  | Pemberitahuan terus terang saat pengganti lokal aktif | `[x]`  |
| T5.10 | Permintaan laporan bahasa alami dari percakapan       | `[x]`  |

### S3 Integrasi WhatsApp

Catatan 18 Oktober 2026: permukaan S3 sementara hanya menampilkan daftar
pesanan. Kontrol koneksi, kotak masuk, panel simulasi, dan pengaturan data
pelanggan tidak ditampilkan sampai rancangan baru disepakati.

| ID    | Tugas                                                                                                | Status |
| ----- | ---------------------------------------------------------------------------------------------------- | ------ |
| T5.11 | Status koneksi nomor WhatsApp                                                                        | `[~]`  |
| T5.12 | Tata cara dan aksi Hubungkan ke WhatsApp sampai berstatus terhubung, beserta aksi memutuskan koneksi | `[~]`  |
| T5.13 | Orderan WhatsApp dari teks dan transkrip voice note Fonnte                                          | `[~]`  |
| T5.14 | Foto bukti pada orderan sendiri yang tidak ambigu, pencocokan nominal bukan verifikasi bank          | `[~]`  |
| T5.15 | Panel pengirim pesan tiruan tersedia di kode, belum ditampilkan di S3                                | `[~]`  |
| T5.16 | Balasan otomatis tercatat dan dikirim nyata melalui Fonnte                                           | `[~]`  |
| T5.17 | Penghapusan data pelanggan tersedia di kode, belum ditampilkan di S3                                 | `[~]`  |

Catatan terkini: Fonnte menggantikan Twilio Sandbox berdasarkan keputusan
user. Permukaan WhatsApp menampilkan daftar pesanan dari pesan masuk di atas
daftar percakapan; balasan agen tetap tidak ditampilkan. Status parsial
mencakup migrasi kanal, media dan balasan nyata yang belum memiliki bukti
penerimaan lengkap. Tata cara dan batas demo ada di `docs/ARCHITECTURE.md`
bagian 11.

### S4 Laporan Keuangan

| ID    | Tugas                                      | Status |
| ----- | ------------------------------------------ | ------ |
| T5.18 | Laporan harian                             | `[x]`  |
| T5.19 | Laporan mingguan                           | `[x]`  |
| T5.20 | Rincian transaksi per periode              | `[x]`  |
| T5.21 | Pemisahan penjualan, pengeluaran, dan laba | `[x]`  |

### S5 Stok dan Produk

| ID    | Tugas                                 | Status |
| ----- | ------------------------------------- | ------ |
| T5.22 | Daftar produk dengan harga dan stok   | `[x]`  |
| T5.23 | Pengaturan ambang minimum per produk  | `[x]`  |
| T5.24 | Daftar alert stok menipis             | `[x]`  |
| T5.25 | Penyesuaian stok manual dengan alasan | `[x]`  |
| T5.26 | Prediksi stok dan rekomendasi restok  | `[~]`  |

Catatan: formulir ambang dan penyesuaian stok sudah tersedia. Tool forecast_stock
sudah dibuat dan diuji; T5.26 tetap terbuka karena tampilan prediksi belum ada.
Tambah, ubah, arsip, dan asisten produk dilacak pada T5.41 sampai T5.44.

### S6 Persetujuan

| ID    | Tugas                                                           | Status |
| ----- | --------------------------------------------------------------- | ------ |
| T5.27 | Antrean aksi menunggu persetujuan                               | `[x]`  |
| T5.28 | Rincian draft PO sebelum disetujui                              | `[x]`  |
| T5.29 | Aksi setujui dan tolak, dengan pembaruan stok setelah disetujui | `[x]`  |
| T5.30 | Jejak audit aksi yang sudah diputuskan                          | `[x]`  |

### S7 Kasir

| ID    | Tugas                                                                   | Status |
| ----- | ----------------------------------------------------------------------- | ------ |
| T5.33 | Skema dan migrasi jenis pembayaran beserta data demo                    | `[x]`  |
| T5.34 | Penyimpanan penjualan, orderan, item, dan pergerakan stok secara atomik | `[x]`  |
| T5.35 | Daftar produk, pencarian, keranjang, dan pembatas jumlah menurut stok   | `[x]`  |
| T5.36 | Pilihan tunai, transfer, QRIS, uang diterima, dan kembalian             | `[x]`  |
| T5.37 | Simpan penjualan dan perbarui Kasir, Stok, Dasbor, serta Laporan        | `[x]`  |
| T5.38 | Pesanan lewat suara atau ketikan dengan penafsiran DeepSeek             | `[~]`  |
| T5.39 | Ringkasan uang masuk per jenis pembayaran dan rincian transaksi         | `[x]`  |
| T5.40 | Uji Kasir sampai stok dan laporan berubah pada dua lebar layar          | `[x]`  |

### Kelengkapan kelola produk dan alur persetujuan

| ID    | Tugas                                                                    | Status |
| ----- | ------------------------------------------------------------------------ | ------ |
| T5.41 | Tambah dan ubah produk dengan pencatatan stok awal                       | `[x]`  |
| T5.42 | Arsip dan aktifkan kembali produk tanpa menghapus riwayat                | `[x]`  |
| T5.43 | Tambah produk lewat asisten dengan dialog tinjau sebelum simpan          | `[~]`  |
| T5.44 | Uji kelola produk, ambang, stok, dan arsip pada dua lebar layar          | `[x]`  |
| T5.45 | Buat draft pesanan dari alert stok dan cegah draft rangkap yang menunggu | `[x]`  |
| T5.46 | Uji setujui, tolak, riwayat, dan perubahan stok pada dua lebar layar     | `[x]`  |

### Halaman pengaturan

| ID    | Tugas                                                           | Status |
| ----- | --------------------------------------------------------------- | ------ |
| T5.31 | Keterangan opt in dan persetujuan pemilik atas pemrosesan pesan | `[x]`  |
| T5.32 | Keterangan privasi data sesuai butir proposal                   | `[x]`  |

Kriteria selesai fase 5: setelah setup manual Sandbox, ngrok, webhook dan
join peserta sesuai `README.md`, ketujuh permukaan dan halaman pengaturan
dapat dipakai dari awal sampai akhir. Integrasi baru tetap memerlukan bukti
provider nyata, bukan hanya panel simulasi.

---

## Fase 6: Pematangan dan bukti

Tujuan: kualitas, keandalan, dan bukti demo.

| ID   | Tugas                                                     | Status |
| ---- | --------------------------------------------------------- | ------ |
| T6.1 | Uji ujung ke ujung sepuluh langkah kriteria demo          | `[~]`  |
| T6.2 | Audit aksesibilitas dan responsif                         | `[~]`  |
| T6.3 | Pemeriksaan akhir kualitas desain                         | `[~]`  |
| T6.4 | Selaraskan semua dokumen dengan kenyataan kode            | `[x]`  |
| T6.5 | `README` berisi cara menjalankan dan catatan keterbatasan | `[x]`  |
| T6.6 | Jalur mundur bila demo kehilangan jaringan                | `[~]`  |
| T6.7 | Rekaman langkah demo dan ringkasan bukti                  | `[ ]`  |

Kriteria selesai fase 6: sepuluh langkah kriteria demo di `docs/SCOPE.md`
bagian 7 lulus otomatis, dan semua dokumen sesuai kenyataan.

---

## Pemetaan ke proposal

| Janji proposal                                  | Tugas yang membuktikannya               |
| ----------------------------------------------- | --------------------------------------- |
| Integrasi WhatsApp ke aplikasi                  | T5.11 sampai T5.17                      |
| Ekstraksi data multimodal                       | T4.2, T4.3, T4.9, T5.6, T5.7, T5.8      |
| Alert stok menipis                              | T2.6, T5.23, T5.24                      |
| Respons otomatis ke pelanggan                   | T3.7, T4.5, T4.6, T5.16                 |
| Permintaan laporan keuangan                     | T3.9, T5.10, T5.18 sampai T5.21         |
| Agentic action                                  | T3.6, T4.7, T5.27 sampai T5.30          |
| Human in the loop                               | T3.6, T4.7, T5.29                       |
| Sepuluh tool                                    | T3.1 sampai T3.12                       |
| Tiga butir privasi                              | T2.4, T5.11, T5.12, T5.17, T5.31, T5.32 |
| Dashboard clean, minimalis, rata                | T1.3, T1.4, T6.3                        |
| Aturan user: tanpa emoji dan tanpa tanda hubung | T1.6, T6.3                              |

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
