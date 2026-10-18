# KedeAwak

Aplikasi AI agent operasional warung yang menyambungkan WhatsApp ke satu
sistem terpusat. Dibuat untuk Lomba Informatics Festival XII, bidang Hackathon,
Universitas Sumatera Utara, 2026.

## Status

Kasir, kelola produk, laporan pembayaran, Persetujuan, percakapan teks, panel
simulasi WhatsApp, dan privasi sudah memiliki implementasi. Checkpoint
penghentian sebelumnya tetap merupakan riwayat, bukan bukti integrasi baru.

Pada 18 Oktober 2026 user menyetujui **Twilio Sandbox menggantikan Fonnte**,
termasuk balasan nyata kepada peserta yang sudah join/opt in, serta WhatsApp
voice note otomatis menjadi transkrip lalu orderan melalui DeepSeek. Groq
Whisper dipilih tim implementasi untuk transkripsi, bukan permintaan penyedia
spesifik dari user. Migrasi dan verifikasi masih parsial; lihat `PLAN.md` dan
`docs/plans/2026-10-18-twilio.md`. Belum ada klaim uji Twilio, Groq, atau
DeepSeek nyata untuk alur baru ini.

## Fitur yang tersedia dan pekerjaan terbuka

| Halaman                   | Sudah diimplementasikan pada checkpoint                                                                                                                   | Masih terbuka                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Dasbor                    | Ringkasan penjualan, pengeluaran, laba, jumlah order, produk terlaris, alert stok dari basis data                                                         | Audit akhir dan penerimaan demo lengkap             |
| Kasir                     | Produk, keranjang, stok, tunai/transfer/QRIS, kembalian, simpan penjualan, usulan pesanan teks/mikrofon                                                   | Uji DeepSeek dan mikrofon nyata                     |
| Stok dan Produk           | Tambah, ubah, stok awal, ambang, penyesuaian, arsip, alert, draft pembelian, tinjau produk dari asisten                                                   | Uji asisten nyata dan kartu prediksi restok         |
| Laporan Keuangan          | Harian, mingguan, rincian transaksi, jenis pembayaran, dan catat pengeluaran manual                                                                       | Audit akhir                                         |
| Persetujuan               | Antrean, rincian draft, setujui/tolak, riwayat, stok, pencegahan keputusan berulang, pembelian sebagai pengeluaran                                        | Penerimaan demo bersama AI nyata                    |
| Percakapan dengan Agen AI | Teks, riwayat, mode lokal, laporan, parser foto, tinjau bacaan, context lock, kuota                                                                       | Uji AI/foto/mikrofon nyata dan unggah voice note S2 |
| Integrasi WhatsApp        | Kartu koneksi Fonnte tanpa input nomor, daftar pesanan, konfirmasi pesanan menjadi penjualan, pembatalan pesanan baru, dan deteksi pesan pesanan berulang | Uji akun Fonnte nyata dan webhook ngrok             |
| Pengaturan                | Profil pemilik dan usaha tanpa login, persetujuan pemrosesan pesan, privasi, serta langganan Free dan Gold dengan pembayaran berupa konfirmasi            | Penyesuaian penyedia dan audit akhir                |

Sepuluh tool berada di `src/lib/tools/`; setiap pemanggilan meninggalkan audit.
Paket Free membatasi pesanan WhatsApp menjadi 10 per hari dan menutup fitur suara
serta foto struk di Agen AI. Paket Gold Rp19.900 berlaku 30 hari, membuka kedua
fitur itu dan pesanan tanpa batas. Pembelian pada demo hanya meminta konfirmasi,
dan tombol Hapus langganan di Pengaturan mengembalikan warung ke paket Free.
Keberadaan tool prediksi belum berarti kartu prediksi tersedia pada Stok.
Kasir menyimpan orderan, item, transaksi, dan stok secara atomik dengan harga
yang diperiksa ulang di server serta deduplikasi. Orderan WhatsApp baru belum
mengurangi stok. **Perilaku lama tetap berlaku:** nominal bukti cocok dan
confidence >= 0.7 otomatis menyelesaikan orderan, mencatat penjualan dan stok
sekali. Ini pencocokan bacaan nominal, **bukan verifikasi bank**, bukan bukti
uang benar benar diterima. Confidence rendah tetap menunggu. Foto hanya boleh
dikaitkan jika tepat satu orderan menunggu milik pengirim di warung yang sama;
untuk kasus ambigu, minta klarifikasi, jangan menebak orderan.

## Menjalankan demo Twilio

Gunakan **Node.js 24** sebagai runtime normal. Mesin pada pemeriksaan dokumentasi
ini masih Node 20.19.5; jangan menganggap Node 20 memenuhi kebutuhan proyek.
Pasang dependensi dari lockfile:

```powershell
npm ci
```

### Konfigurasi lokal

Berikut contoh lengkap konfigurasi demo untuk diisi sendiri pada `.env.local`.
Semua nilai pengganti di bawah bukan kredensial nyata. Jangan timpa konfigurasi
atau kunci yang sudah dipakai. Akses template env diblokir pengaturan privasi;
tidak ada upaya melewati blokir, membaca template dengan cara lain, atau
menulis berkas env pada tugas dokumentasi ini.

```dotenv
# Kosong memakai PGlite, bukan Postgres jaringan
DATABASE_URL=
PGLITE_DATA_DIR=.pglite/data
FIELD_ENCRYPTION_KEY=GANTI_DENGAN_64_KARAKTER_HEX_DARI_32_BYTE

DEEPSEEK_API_KEY=GANTI_DENGAN_KUNCI_DEEPSEEK
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-flash
# Override khusus teks/gambar tetap didukung; kosong mengikuti DEEPSEEK_MODEL
DEEPSEEK_CHAT_MODEL=
DEEPSEEK_VISION_MODEL=

GROQ_API_KEY=GANTI_DENGAN_KUNCI_GROQ
GROQ_TRANSCRIPTION_MODEL=whisper-large-v3-turbo

TWILIO_ACCOUNT_SID=GANTI_DENGAN_ACCOUNT_SID
TWILIO_AUTH_TOKEN=GANTI_DENGAN_AUTH_TOKEN
TWILIO_WHATSAPP_FROM=whatsapp:+GANTI_DENGAN_NOMOR_SANDBOX
WEBHOOK_URL=https://GANTI_DENGAN_DOMAIN_NGROK/api/channels/whatsapp

# Opsional. Jalur balasan cadangan bila kuota Twilio trial habis.
FONNTE_TOKEN=GANTI_DENGAN_TOKEN_FONNTE
```

Target pemilihan model: override `DEEPSEEK_CHAT_MODEL` atau
`DEEPSEEK_VISION_MODEL`, lalu `DEEPSEEK_MODEL`, lalu bawaan `deepseek-flash`.
Dukungan `DEEPSEEK_MODEL` sudah diimplementasikan di `provider.ts`; override
gambar tetap harus mampu menerima gambar. Pemilihan model ini belum diuji
dengan panggilan DeepSeek nyata.
`FONNTE_TOKEN` dan `CHANNEL_WEBHOOK_SECRET` adalah konfigurasi historis, bukan
autentikasi webhook Twilio; gunakan tanda tangan resmi Twilio. `FONNTE_TOKEN`
kini dapat dipakai sebagai jalur balasan cadangan bila kuota Twilio trial habis,
tetapi pesan masuk tetap melalui webhook Twilio.

**Format kunci sudah diperiksa pada `src/lib/crypto/field-encryption.ts`:**
cipher AES-256-GCM menerima 32 byte dalam **64 karakter hex**, bukan base64.
Perintah Node berikut menghasilkan nilai hex yang dibutuhkan:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Konversi hasilnya sebelum mengisi `FIELD_ENCRYPTION_KEY`:

```powershell
node -e "console.log(Buffer.from('GANTI_DENGAN_HASIL_BASE64', 'base64').toString('hex'))"
```

Atau langsung hasilkan format yang diterima cipher:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Jaga kunci tetap sama agar identitas pelanggan lama dapat dibuka. Jangan
masukkan hasilnya ke git, log, atau percakapan. `PGLITE_DATA_DIR=.pglite/data`
valid sebagai pilihan eksplisit di `src/lib/db/client.ts`; nilai bawaan kode
sebenarnya `.pglite/kedeawak`. Mengganti direktori berarti membuka data lain,
bukan memigrasikan data lama. `DATABASE_URL` yang terisi memilih Postgres.

### Migrasi, server dan Sandbox

Hentikan proses yang mengakses direktori PGlite yang sama sebelum migrasi.
PGlite hanya mengizinkan satu proses menulis. Menjalankan migrasi atau skrip
basis data saat server dev hidup dapat merusak WAL. Hentikan server lebih dulu,
lalu jalankan perintahnya. `db:cleanup-e2e` menghapus produk bernama
`Biskuit uji ...` dan `Persediaan uji ...` yang dibuat uji peramban, beserta
rincian pesanan pembeliannya, dan tidak menyentuh produk yang sudah punya
riwayat orderan. `db:cleanup-demo-stock` mengembalikan stok dua produk demo yang
dulu sengaja dibuat menipis beserta alert dan draft persetujuannya.

```powershell
npm run db:migrate
# Hanya untuk database demo baru yang boleh direset
npm run db:seed
# Bersihkan sisa produk uji e2e. Hentikan server dev lebih dulu.
npm run db:cleanup-e2e
# Kembalikan stok demo lama yang sengaja dibuat menipis.
npm run db:cleanup-demo-stock
npm run dev -- --port 3100
```

**`db:seed` menghapus dan membuat ulang seluruh data demo.** Jangan jalankan
pada data yang ingin dipertahankan. Seed berisi satu warung, 20 produk aktif,
satu produk arsip, pelanggan, dan transaksi. Seluruh stok awal berada di atas
ambang minimum sehingga tidak ada alert stok atau aksi menunggu di awal.

Buka http://localhost:3100/whatsapp. Di terminal lain, setelah server hidup:

```powershell
ngrok http 3100
```

1. Isi `WEBHOOK_URL` dengan URL HTTPS ngrok lengkap, misalnya bentuk
   `https://DOMAIN_NGROK/api/channels/whatsapp`, lalu restart server setelah
   perubahan env. URL harus persis, termasuk path dan query bila ada.
2. Pada konfigurasi Twilio WhatsApp Sandbox, atur **When a message comes in**
   ke URL tersebut dengan metode **POST**. Bila domain ngrok berubah, perbarui
   konfigurasi Twilio dan `WEBHOOK_URL` bersama sama.
3. Setiap peserta mengirim kode `join ...` yang ditampilkan Twilio ke nomor
   Sandbox dan menunggu konfirmasi join. Balasan nyata hanya kepada peserta
   yang opt in dan sesuai batas Sandbox/jendela pesan Twilio.
4. Jalankan Hubungkan pada UI, lalu uji teks, voice note OGG, dan foto bukti.
   Tunggu proses selesai dan muat ulang UI bila belum ada polling/refresh.
   Status konfigurasi terhubung sendiri bukan bukti join atau pengiriman sukses.

Webhook adalah **`POST /api/channels/whatsapp` pada server Next.js/UI port
3100 yang sama**. `/whatsapp` hanya halaman UI, bukan webhook. Tidak ada
server webhook tambahan, port 3101, atau endpoint webhook `/whatsapp`.

Bila Node 24 belum terpasang, alternatif sementara untuk perintah berhingga:

```powershell
npx --package=node@24 -- node --version
npx --package=node@24 -- node node_modules/tsx/dist/cli.mjs src/scripts/db-migrate.ts
# Destruktif: hanya jika data demo boleh direset
npx --package=node@24 -- node node_modules/tsx/dist/cli.mjs src/scripts/db-seed.ts
npx --package=node@24 -- node node_modules/vitest/vitest.mjs run
```

Untuk server, rekomendasinya tetap pasang Node 24 dan gunakan perintah npm
normal di atas; alternatifnya jalankan sendiri
`npx --package=node@24 -- node node_modules/next/dist/bin/next dev --port 3100`.

## Media, keamanan dan keterbatasan

- Parse seluruh parameter form Twilio, lalu validasi `X-Twilio-Signature`
  dengan SDK resmi dan `WEBHOOK_URL` publik persis, bukan URL localhost dari
  proxy. Pesan media-only dengan `Body` kosong tetap valid.
- Maksimal satu media: gambar JPEG/PNG/WebP <= 3 MiB; audio OGG/MP3/MP4/WAV/
  WebM/FLAC <= 16 MiB. MP4/WebM di sini audio, bukan fitur video. Validasi MIME,
  ukuran aktual saat streaming, timeout, dan jumlah media.
- Unduhan awal hanya HTTPS `api.twilio.com` dengan Basic Auth akun Twilio.
  Redirect harus HTTPS ke host allowlist eksplisit, bukan URL bebas, dan
  **tidak boleh meneruskan Authorization** ke target redirect.
- Groq Whisper mengubah audio menjadi teks, kemudian DeepSeek menafsirkan teks
  menjadi orderan. Transkrip disimpan sebagai pesan asal. Audio tidak dikirim
  langsung ke DeepSeek. Jika gagal, minta kirim ulang atau ketik, jangan
  mengarang transkrip/orderan. Web Speech API untuk mikrofon web tetap terpisah.
- Webhook segera mengembalikan **TwiML kosong**, lalu Next.js `after()`
  menjalankan pemrosesan dan pengiriman balasan melalui REST Twilio.
  **Ini bukan durable worker.** Stop server/redeploy sebelum selesai dapat
  kehilangan pemrosesan meskipun webhook sudah sukses. Ini batas demo:
  biarkan server hidup dan kirim ulang pesan baru jika tidak ada balasan.
  Jangan mengandalkan retry Twilio setelah respons sukses atau replay SID lama.
- Panel simulasi tetap untuk demo lokal tanpa provider, bukan bukti Twilio
  nyata. Pengiriman PO ke pemasok tetap hanya dicatat di aplikasi.
- Pemrosesan memerlukan persetujuan: Twilio menerima pesan, Groq menerima
  audio, DeepSeek menerima transkrip dan foto. Pertimbangkan privasi/retensi
  masing masing penyedia, biaya pesan, transkripsi dan token, kuota, serta
  jendela pesan dan batas Sandbox. Jangan gunakan data sensitif untuk demo.
- Tidak ada verifikasi bank, pemrosesan uang, ekspor PDF/Excel, cetak struk,
  marketplace atau fitur di luar `docs/SCOPE.md`.

## Verifikasi

Dengan Node 24, jalankan:

```powershell
npm run format:check
npm run typecheck
npm run lint
npm run lint:ui
npm test
npm run build
npm run test:e2e
```

Gunakan direktori data uji terpisah dari data pemilik. Riwayat checkpoint
sebelum Twilio ada pada `docs/verification/2026-10-18-checkpoint.md`: peramban
393/1280 piksel, `PGLITE_DATA_DIR=.pglite/test-completion-20261018`,
`NEXT_DIST_DIR=.next-test-completion`, dan
`PLAYWRIGHT_BASE_URL=http://localhost:3100`, dipasang pada proses tanpa
mengubah `.env.local`. Hasil lama tidak membuktikan Twilio, Groq, DeepSeek,
foto/audio provider, atau mikrofon nyata sudah lulus. Bukti pemeriksaan
implementasi Twilio ada pada `docs/verification/2026-10-18-twilio.md`; uji itu
memakai port 3110 karena port 3100 dipakai proses lain. Rencana dan batas uji
berikutnya ada di `docs/plans/2026-10-18-twilio.md`; proyek belum memenuhi
seluruh kriteria demo.

## Dokumen

| Berkas                                                | Isi                                               |
| ----------------------------------------------------- | ------------------------------------------------- |
| `AGENTS.md`                                           | Aturan kerja dan definisi selesai                 |
| `PLAN.md`                                             | Rencana induk, status dan pekerjaan tersisa       |
| `DESIGN.md`                                           | Arah visual dan token                             |
| `docs/PRODUCT.md`                                     | Kebenaran proposal, tidak diubah pada migrasi ini |
| `docs/SCOPE.md`                                       | Batas fitur dan penerimaan demo                   |
| `docs/ARCHITECTURE.md`                                | Teknologi, keamanan dan alur                      |
| `docs/CONVENTIONS.md`                                 | Aturan kode dan teks antarmuka                    |
| `docs/WORKFLOW.md`                                    | Git dan verifikasi                                |
| `docs/specs/2026-10-17-kasir-kelola-produk-design.md` | Rancangan Kasir, produk dan Persetujuan           |
| `docs/plans/2026-10-18-penyelesaian-web.md`           | Rencana sesi sebelumnya                           |
| `docs/plans/2026-10-18-twilio.md`                     | Rencana migrasi Twilio Sandbox                    |
| `docs/verification/2026-10-18-twilio.md`              | Bukti pemeriksaan implementasi Twilio             |
| `docs/THIRD-PARTY-SKILLS.md`                          | Asal dan lisensi skills pihak ketiga              |

## Kontribusi dan lisensi

Ikuti `AGENTS.md` dan `docs/WORKFLOW.md`. Teks pengguna berbahasa Indonesia,
tanpa emoji dan tanda hubung, dengan format angka Indonesia. Tidak ada commit
pada tugas dokumentasi ini. Repo: https://github.com/ZeaLIsHere/kedeawak-infest.
Kode milik tim KedeAwak; skills pihak ketiga mengikuti lisensi masing masing.
