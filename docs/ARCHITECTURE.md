# ARCHITECTURE.md

Keputusan teknis untuk KedeAwak. Setiap keputusan punya alasan dan batasnya.
Kalau sebuah keputusan hendak diubah, ubah dokumen ini dulu.

Basis: bagian "Mekanisme Teknologi" dan "Desain Sistem" pada proposal.

---

## 1. Prinsip yang mengikat

1. **Alur proposal dipertahankan.** Dua sumber data, satu lapisan orkestrasi
   AI, satu tool layer, satu database, satu dashboard. Bentuk sistem tidak
   diubah hanya karena lebih mudah.
2. **Semua yang bisa berjalan tanpa layanan luar, berjalan tanpa layanan
   luar.** Demo tidak boleh gagal karena jaringan, kuota, atau kunci API.
3. **Kalau sebuah layanan luar tidak tersedia, sediakan pengganti yang jujur.**
   Pengganti tidak boleh menyamar sebagai AI dan tidak boleh mengarang hasil.
4. **Satu lapisan, satu tanggung jawab.** Komponen tidak menyentuh database.
   Hanya `src/lib/ai/` yang memanggil model bahasa.

## 2. Tumpukan teknologi

| Lapisan               | Pilihan                                                      | Alasan                                                                                                                                     |
| --------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Bahasa                | TypeScript, mode strict                                      | Menjaga tipe data transaksi tetap benar                                                                                                    |
| Framework             | Next.js App Router                                           | Server Component untuk data, Route Handler untuk webhook dan agen                                                                          |
| Antarmuka             | Tailwind CSS, shadcn/ui, lucide-react                        | Cepat, aksesibel, ikon SVG bukan emoji, sesuai aturan UI                                                                                   |
| Basis data            | PostgreSQL                                                   | Sesuai proposal                                                                                                                            |
| Driver lokal          | PGlite                                                       | PostgreSQL asli yang berjalan di dalam proses, tanpa pemasangan server, sehingga demo tetap jalan di Windows                               |
| Driver produksi       | Postgres biasa                                               | Supabase atau Neon, kode aplikasi tidak berubah                                                                                            |
| ORM                   | Drizzle                                                      | Skema bertipe, migrasi ringan, mendukung PGlite dan Postgres                                                                               |
| Pengambilan konteks   | Query SQL terstruktur                                        | DeepSeek tidak menyediakan endpoint embedding, dan data warung berupa data terstruktur, sehingga konteks diambil lewat query, bukan vektor |
| Sesi dan context lock | Tabel di PostgreSQL lewat satu antarmuka                     | Menggantikan Redis saat demo, tanpa mengubah pemanggil                                                                                     |
| Model bahasa          | DeepSeek, model `deepseek-flash`, endpoint kompatibel OpenAI | Token sudah tersedia dari user. Mendukung pemanggilan fungsi dan keluaran JSON, dua hal yang dibutuhkan tool layer                         |
| Speech to text        | Web Speech API peramban, yang di Chrome dilayani Google      | Sesuai proposal yang menyebut Google STT. Tidak menambah kunci API, tidak menambah titik gagal                                             |
| Ekstraksi struk       | Model vision, yaitu `deepseek-flash`                         | Satu penyedia menangani teks sekaligus gambar. Fallback tiga lapis sesuai proposal tetap berlaku                                           |
| Uji                   | Vitest untuk unit, Playwright untuk alur browser             | Menutup kriteria demo di `docs/SCOPE.md` bagian 7                                                                                          |

Catatan penyimpangan dari proposal, disengaja dan dicatat:

1. Proposal menyebut Redis. Diganti tabel PostgreSQL karena Redis versi lokal
   menambah satu layanan yang harus hidup saat demo. Perilaku yang dibutuhkan,
   yaitu sesi, context lock, dan pembatas kuota harian, tetap ada.
2. Proposal tidak menyebut framework frontend. Next.js dipilih karena satu
   basis kode menangani antarmuka, webhook, dan pemanggilan model bahasa.
3. Proposal menyebut Whisper atau Google STT untuk voice note. Yang dipakai
   adalah Web Speech API peramban, yang di Chrome memang dilayani Google STT.
   Alasannya, DeepSeek tidak menyediakan endpoint transkripsi audio, sehingga
   menambah penyedia lain berarti menambah kunci API dan satu titik gagal lagi
   saat demo. Rincian ada di bagian 5.

## 3. Struktur direktori

```text
src/
  app/
    layout.tsx
    page.tsx                      S1 Dasbor
    percakapan/page.tsx           S2 Percakapan dengan Agen AI
    whatsapp/page.tsx             S3 Integrasi WhatsApp
    laporan/page.tsx              S4 Laporan Keuangan
    stok/page.tsx                 S5 Stok dan Produk
    persetujuan/page.tsx          S6 Persetujuan
    pengaturan/page.tsx           Status koneksi nomor, privasi data
    api/
      whatsapp/webhook/route.ts   Kanal masuk, menerima webhook penyedia
      whatsapp/simulate/route.ts  Panel pengirim pesan tiruan sebagai pelanggan
      agent/chat/route.ts         Percakapan dengan agen, streaming
      agent/transcribe/route.ts   Voice note menjadi teks
      agent/receipt/route.ts      Foto struk menjadi data terstruktur
      reports/route.ts            Ringkasan harian dan mingguan
      approvals/route.ts          Persetujuan dan penolakan aksi
      health/route.ts             Pemeriksaan kesiapan
  components/
    ui/                           Komponen dasar dari shadcn/ui
    shell/                        Kerangka aplikasi: navigasi, header
    dashboard/                    Komponen khusus dasbor
    chat/                         Komponen khusus percakapan agen
    whatsapp/                     Komponen khusus integrasi WhatsApp
    reports/                      Komponen khusus laporan
    stock/                        Komponen khusus stok
    approvals/                    Komponen khusus persetujuan
  styles/
    tokens/
      primitives.css              Lapis 1: nilai mentah
      semantic.css                Lapis 2: makna
      components.css              Lapis 3: keperluan komponen
      index.css                   Mengimpor ketiga lapis
  lib/
    db/
      schema.ts                   Definisi tabel Drizzle
      client.ts                   Pemilih driver PGlite atau Postgres
      migrate.ts                  Penerapan migrasi
      seed.ts                     Data awal untuk demo
      testing.ts                  Basis data dalam memori untuk pengujian
    data/                         Satu satunya pintu akses data
      ids.ts                      Pemeriksaan bentuk kunci baris
      ownership.ts                Pemeriksaan rujukan antar warung
      period.ts                   Batas hari dan minggu menurut Waktu Indonesia Barat
      business.ts
      products.ts
      stock.ts                    Pergerakan stok dan alert
      transactions.ts
      customers.ts
      conversations.ts
      orders.ts
      payments.ts
      purchase-orders.ts
      approvals.ts
      agent-sessions.ts
      tool-invocations.ts
      knowledge.ts
      quota-usage.ts
      reports.ts
    channel/
      incoming.ts                 Titik masuk tunggal untuk semua pesan pelanggan
      fonnte.ts                   Penerjemah payload webhook Fonnte
    ai/
      orchestrator.ts             Pemahaman maksud dan pemilihan tool
      tools/                      Sepuluh tool dari proposal
      providers/
        llm.ts                    Antarmuka model bahasa
        stt.ts                    Antarmuka speech to text
        vision.ts                 Antarmuka pembacaan struk
      prompts/                    Instruksi untuk model
      rag.ts                      Pengambilan konteks bisnis lewat query terstruktur
    session/
      context-lock.ts             Penguncian konteks saat menunggu persetujuan
      quota.ts                    Pembatas pemakaian harian
    crypto/
      field-encryption.ts         Enkripsi nama dan nomor telepon pelanggan
    format/
      currency.ts                 Format rupiah
      date.ts                     Format tanggal Indonesia
      number.ts                   Format angka Indonesia
    ui-copy/
      rules.ts                    Aturan teks UI, dipakai bersama pengujian
  scripts/
    db-migrate.ts                 Penerap migrasi lewat driver yang aktif
    lint-ui-copy.ts               Pemeriksa larangan emoji dan tanda hubung

e2e/
  shell.spec.ts                   Alur peramban: kerangka aplikasi dan navigasi
```

Aturan struktur:

1. `src/app/` hanya berisi halaman dan Route Handler. Tidak ada logika bisnis.
2. `src/lib/data/` adalah satu satunya tempat yang menulis query database.
3. `src/lib/ai/` adalah satu satunya tempat yang memanggil model bahasa.
4. `src/components/` tidak boleh mengimpor dari `src/lib/db/`.
5. Tidak ada fungsi yang dipanggil dari dua tempat berbeda tanpa diletakkan di
   `src/lib/`.
6. `src/lib/channel/` adalah satu satunya tempat yang membaca bentuk payload
   penyedia kanal WhatsApp. Logika bisnis tidak pernah menyentuh bentuk payload
   penyedia.

## 4. Skema data

Satu entitas akar `businesses`. Semua tabel lain terikat padanya, sesuai butir
privasi proposal tentang pemisahan data antar warung.

| Tabel                  | Isi utama                                                                                 | Catatan                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `businesses`           | Nama warung, jam buka, status koneksi nomor, nomor bisnis                                 | Akar semua data                                                                                                    |
| `products`             | Nama, satuan, harga jual, harga beli, stok, ambang minimum                                | Stok disimpan sebagai angka hasil perhitungan terakhir                                                             |
| `customers`            | Nama dan nomor telepon terenkripsi, ditambah sidik jari nomor                             | Sidik jari nomor dipakai untuk mencari pelanggan tanpa membuka enkripsi                                            |
| `conversations`        | Kanal, rujukan pelanggan, sidik jari nomor, status, waktu                                 | Kanal bernilai `whatsapp` atau `app`. Nomor pelanggan tidak disimpan di sini, lihat aturan 7                       |
| `messages`             | Percakapan, pengirim, jenis, isi teks, tautan media, waktu                                | Jenis bernilai `text`, `voice`, `image`                                                                            |
| `orders`               | Pelanggan, daftar item, total, status                                                     | Berasal dari percakapan WhatsApp                                                                                   |
| `order_items`          | Order, produk, jumlah, harga satuan                                                       |                                                                                                                    |
| `transactions`         | Jenis, keterangan, jumlah, sumber, rujukan pelanggan, tautan bukti, confidence, waktu     | Jenis bernilai `sale`, `expense`, `debt`                                                                           |
| `payments`             | Order, tautan bukti transfer, nominal yang diharapkan, nominal terbaca, status verifikasi | Status bernilai `menunggu`, `cocok`, `tidak cocok`                                                                 |
| `stock_movements`      | Produk, jenis, jumlah perubahan, alasan, waktu                                            | Jejak audit perubahan stok                                                                                         |
| `stock_alerts`         | Produk, stok saat alert, ambang, status                                                   | Status bernilai `aktif`, `selesai`                                                                                 |
| `purchase_orders`      | Nama pemasok, daftar item, total, status, waktu persetujuan                               | Status bernilai `draft`, `disetujui`, `ditolak`. Pemasok disimpan sebagai teks, belum ada tabel pemasok tersendiri |
| `purchase_order_items` | PO, produk, jumlah, harga perkiraan                                                       |                                                                                                                    |
| `approvals`            | Jenis aksi, muatan aksi, ringkasan, status, waktu keputusan                               | Antrean di S6                                                                                                      |
| `agent_sessions`       | Sesi percakapan, status kunci konteks, aksi yang menunggu                                 | Menggantikan Redis                                                                                                 |
| `tool_invocations`     | Sesi, nama tool, muatan, hasil, waktu                                                     | Jejak audit pemanggilan tool                                                                                       |
| `knowledge_chunks`     | Potongan teks, sumber                                                                     | Basis RAG. Konteks diambil lewat query terstruktur, bukan vektor                                                   |
| `quota_usage`          | Tanggal, jumlah pemakaian                                                                 | Pembatas pemakaian harian                                                                                          |

Aturan skema:

1. Semua tabel yang menyimpan uang memakai satuan rupiah penuh sebagai bilangan
   bulat. Tidak ada bilangan desimal untuk uang.
2. Semua tabel punya `created_at`. Tabel yang dapat diubah punya `updated_at`.
3. Penghapusan data pelanggan dilakukan sebagai penghapusan baris sungguhan,
   sesuai butir privasi proposal, bukan penandaan lunak.
4. Setiap perubahan stok wajib meninggalkan baris di `stock_movements`. Kolom
   `products.stock` adalah hasil perhitungan terakhir dari baris baris itu,
   bukan sumber kebenaran.
5. Tabel `conversations` dan `messages` tetap ada karena dibutuhkan untuk
   menerima pesan pelanggan, membentuk orderan, dan menyusun balasan otomatis.
   Keduanya **tidak dirender sebagai tampilan obrolan** di antarmuka. Yang
   ditampilkan ke pemilik adalah orderan, bukti pembayaran, dan pesan asal
   sebagai dasar orderan. Keputusan ini tercatat di `docs/SCOPE.md` bagian 3.1.
6. `businesses` memuat keadaan koneksi kanal WhatsApp, yaitu status koneksi,
   nomor bisnis, waktu koneksi, nama paket penyedia, sisa kuota, dan waktu
   pemeriksaan terakhir. Nama paket dan sisa kuota ikut disimpan supaya
   halaman Pengaturan dapat menyampaikan apa adanya batas paket yang dipakai,
   termasuk bahwa lampiran masuk belum aktif pada paket gratis. Nilai rahasia
   penyedia tidak disimpan di baris ini, lihat bagian 8.
7. Nomor telepon pelanggan tidak pernah disimpan dalam bentuk terbuka, bahkan
   di tabel `customers`. Pencocokan pesan masuk membutuhkan nilai yang dapat
   dicari, sedangkan teks terenkripsi tidak dapat dicari, sehingga nomor juga
   disimpan sebagai sidik jari pada kolom `phone_number_hash`. Tabel
   `conversations` memakai sidik jari yang sama dan tidak menyimpan nomornya.
8. Setiap tabel memuat `business_id` langsung, bukan hanya lewat tabel induk.
   Alasannya, aturan bagian 8 butir 4 mewajibkan setiap query menyertakan
   `business_id`, dan kolom langsung membuat aturan itu dapat dipenuhi tanpa
   join.
9. Kunci utama memakai `uuid` dengan nilai bawaan dari basis data, bukan angka
   berurut. Alasannya, seluruh data terikat pada satu warung, dan angka berurut
   membuat jumlah data antar warung bocor lewat alamat halaman.
10. Nilai enum memakai bahasa Indonesia, mengikuti penyebutan pada tabel di
    atas. Nama tabel dan kolom tetap memakai bahasa Inggris, sesuai
    `docs/CONVENTIONS.md` bagian 7.
11. Setiap rujukan antar tabel diperiksa kepemilikannya lewat
    `src/lib/data/ownership.ts` sebelum dipakai. Kunci asing hanya memeriksa
    keberadaan baris, bukan pemiliknya, sehingga tanpa pemeriksaan ini sebuah
    orderan dapat memakai produk warung lain, dan pembayaran dapat menempel
    pada orderan warung lain. Pemeriksaan dijalankan di dalam transaksi yang
    sama dengan penulisannya, supaya tidak ada celah di antara keduanya.
12. Pencarian dan pengubahan menurut kunci baris memeriksa bentuk uuid lebih
    dulu lewat `src/lib/data/ids.ts`, dan menjawab kosong untuk kunci yang tidak
    sah. Alasannya, kunci yang salah bentuk menjadi galat query, sehingga
    alamat halaman yang salah akan menjadi galat server alih alih jawaban
    kosong.
13. Batas hari dan minggu dihitung menurut Waktu Indonesia Barat, yaitu UTC+7,
    lewat `src/lib/data/period.ts`. Indonesia tidak memakai waktu musim panas,
    jadi pergeseran tetap ini cukup. Bila kelak ada warung di zona waktu lain,
    kolom zona waktu pada tabel warung perlu ditambahkan lebih dulu.

Migrasi dibuat oleh `npm run db:generate`, yang memakai drizzle-kit untuk
membaca skema dan menulis berkas SQL ke folder `drizzle/`. Folder itu masuk
repo, karena merupakan hasil kerja tim, bukan perkakas. Penerapan migrasi
memakai `npm run db:migrate`, yang memakai penerap milik Drizzle ORM, bukan
perintah `drizzle-kit migrate`. Alasannya, perintah itu hanya dapat menyambung
ke Postgres lewat jaringan, sedangkan demo memakai PGlite yang berjalan di
dalam proses. Dengan cara ini migrasi yang sama diterapkan pada kedua driver.

## 5. Antarmuka penyedia AI

Tiga antarmuka, satu implementasi nyata, satu pengganti lokal untuk masing
masing.

```ts
// src/lib/ai/providers/llm.ts
export interface LlmProvider {
  readonly available: boolean;
  interpret(input: InterpretInput): Promise<InterpretResult>;
  compose(input: ComposeInput): Promise<ComposeResult>;
}
```

Aturan pemilihan penyedia:

1. Saat aplikasi mulai, periksa kunci API di lingkungan.
2. Bila kunci tersedia, pakai implementasi nyata.
3. Bila kunci tidak tersedia, pakai pengganti lokal dan tandai
   `available: false`.
4. Saat pengganti lokal aktif, permukaan S2 menampilkan pemberitahuan terus
   terang bahwa pembacaan struk dan suara sedang tidak aktif, dan mengarahkan
   pemilik mengisi data secara manual. Tidak ada hasil yang dikarang.
5. Kasus uji tidak pernah bergantung pada penyedia nyata. Pengganti lokal
   yang deterministik dipakai di pengujian.

### 5.1 DeepSeek sebagai penyedia model bahasa

Fakta berikut sudah diverifikasi dari dokumentasi resmi DeepSeek, bukan
perkiraan. Tanggal pemeriksaan: 17 Oktober 2026.

| Hal                            | Nilai                                                      |
| ------------------------------ | ---------------------------------------------------------- |
| Alamat dasar, format OpenAI    | `https://api.deepseek.com`                                 |
| Alamat dasar, format Anthropic | `https://api.deepseek.com/anthropic`                       |
| Model untuk percakapan         | `deepseek-flash`                                           |
| Model penalaran                | `deepseek-v4-pro`                                          |
| Panjang konteks                | 1 juta token                                               |
| Pemanggilan fungsi             | Didukung kedua model                                       |
| Keluaran JSON                  | Didukung kedua model                                       |
| Gambar                         | Hanya `deepseek-flash`                                     |
| Format gambar                  | JPEG, PNG, GIF, WebP                                       |
| Batas satu gambar              | 32 MB untuk base64 atau alamat luar, 64 MB lewat Files API |
| Endpoint transkripsi audio     | **Tidak ada**                                              |

Konsekuensi yang wajib dipatuhi saat implementasi:

1. **Gambar hanya dikirim di pesan `user`.** Gambar pada pesan `system` atau
   `assistant` ditolak dengan galat `400`.
2. **Pembacaan struk wajib memakai `deepseek-flash`.** `deepseek-v4-pro`
   tidak menerima gambar.
3. **Mode berpikir dan pemaksaan tool tidak dapat digabung.** Pilihan
   `tool_choice` bernilai `required` atau menunjuk tool tertentu ditolak
   dengan galat `400` bila mode berpikir aktif. Untuk tool yang wajib
   dipanggil, matikan mode berpikir lebih dulu.
4. **Keluaran JSON wajib diminta lewat instruksi.** Menyalakan
   `response_format` bernilai `json_object` saja tidak cukup. Instruksi
   pembangkit JSON harus ditulis di pesan `system` atau `user`.
5. **Argumen tool wajib divalidasi.** Dokumentasi DeepSeek menyatakan model
   tidak selalu menghasilkan JSON yang sah dan dapat mengarang parameter yang
   tidak ada di skema. Semua argumen divalidasi dengan skema sebelum
   dijalankan.
6. **Analisis struk memakai skema ketat.** Mode `strict` pada pemanggilan
   fungsi boleh dipakai untuk memaksa keluaran sesuai skema, sehingga
   pembacaan nilai dan tanggal konsisten.

Kunci disimpan di `DEEPSEEK_API_KEY`. Nama variabel lain ada di
`.env.example`.

### 5.2 Voice note

DeepSeek tidak menyediakan transkripsi audio. Yang dipakai adalah Web Speech
API peramban:

1. Peramban merekam suara dan mengubahnya menjadi teks secara langsung pada
   perangkat atau lewat layanan yang dipakai peramban tersebut. Chrome
   memakai layanan Google, yang sejalan dengan penyebutan Google STT pada
   proposal.
2. Bahasa diatur ke Indonesia.
3. Bila peramban tidak mendukung, atau transkripsi gagal, permukaan S2
   menampilkan pemberitahuan dan menyediakan kolom isian teks. Pemilik tetap
   dapat mencatat transaksi.
4. Tidak ada berkas audio yang dikirim ke penyedia model bahasa.

Keterbatasan ini dicatat di `README` supaya tidak mengejutkan saat demo.

### 5.3 Pembacaan struk dan fallback tiga lapis

Sesuai proposal, tiga lapis dipertahankan:

1. **Primer.** `deepseek-flash` membaca foto struk dan mengembalikan nominal,
   tanggal, dan keterangan lewat skema keluaran yang ketat.
2. **Sekunder.** Bila nilai keyakinan hasil bacaan di bawah 70 persen, agen
   meminta konfirmasi, contohnya "Saya baca total Rp150.000, benar?".
3. **Tersier.** Bila foto tidak terbaca, agen meminta pemilik mendikte lewat
   suara atau mengetik manual.

Nilai keyakinan diperoleh dari jawaban model secara terstruktur, bukan dari
logprob, karena logprob tidak tersedia untuk keluaran fungsi. Model diminta
mengisi nilai keyakinan antara 0 dan 1 beserta alasan singkatnya.

## 6. Orkestrasi dan context lock

1. Setiap pesan masuk, baik dari kanal WhatsApp maupun dari percakapan di
   aplikasi, melewati `orchestrator.ts`.
2. Orchestrator memuat konteks: data warung, produk, dan sesi aktif.
3. Bila sesi sedang terkunci karena menunggu persetujuan, pesan diperlakukan
   sebagai jawaban atas pertanyaan persetujuan, bukan transaksi baru.
4. Bila tidak terkunci, orchestrator menentukan maksud lalu memilih tool.
5. Setiap pemanggilan tool dicatat di `tool_invocations`.
6. Tool yang mengubah data penting, yaitu stok dan pembuatan PO, tidak
   dijalankan langsung. Tool tersebut membuat baris di `approvals`, lalu sesi
   dikunci. Data baru berubah setelah pemilik menyetujui.

Ini yang dimaksud human in the loop pada proposal, dan wajib.

## 7. Penanganan kegagalan

| Kegagalan                                     | Perilaku                                                                                  |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Kunci API model tidak ada                     | Pengganti lokal aktif, pemberitahuan tampil di permukaan S2                               |
| Panggilan model gagal                         | Coba sekali lagi, lalu sampaikan ke pemilik bahwa pemrosesan gagal dan minta input manual |
| Confidence pembacaan struk di bawah 70 persen | AI meminta konfirmasi nominal, sesuai lapis kedua proposal                                |
| Foto struk tidak terbaca                      | AI meminta pemilik mendikte atau mengetik manual, sesuai lapis ketiga proposal            |
| Bukti transfer tidak cocok nominalnya         | Status pembayaran menjadi tidak cocok dan muncul di antrean pemeriksaan                   |
| Voice note tidak dapat ditranskripsi          | Sampaikan gagal, minta pemilik mengetik                                                   |
| Basis data belum dimigrasi                    | Halaman menampilkan langkah yang harus dijalankan, bukan galat mentah                     |

## 8. Keamanan

1. Nama dan nomor telepon pelanggan dienkripsi di lapisan aplikasi sebelum
   disimpan, dengan kunci dari variabel lingkungan.
2. Kunci API tidak pernah dikirim ke browser. Semua panggilan penyedia
   dilakukan di server.
3. Variabel lingkungan hanya dari `.env.local`, yang tidak pernah masuk git.
4. Setiap query data wajib menyertakan `business_id`.
5. Kredensial penyedia kanal WhatsApp hanya dibaca dari variabel lingkungan.
   Nomor bisnis dan waktu koneksi boleh disimpan di basis data, tetapi token
   akses tidak pernah disimpan di baris basis data maupun di repo.
6. Pesan masuk dari webhook wajib divalidasi terhadap skema sebelum dipakai,
   karena bentuk payload penyedia berbeda beda dan isinya berasal dari luar.

Rincian enkripsi, sesuai `src/lib/crypto/field-encryption.ts`:

1. Penyandian memakai AES-256-GCM. Perubahan satu bita pada teks terenkripsi
   membuat pembukaan gagal, bukan menghasilkan teks yang salah.
2. Teks terenkripsi disimpan dengan awalan versi, bentuknya
   `v1:iv:tag:isi`. Bentuk lama masih dapat dikenali bila cara penyandian
   berganti.
3. Nomor telepon disidik jari dengan HMAC-SHA256, bukan hash biasa, supaya
   nomor tidak dapat ditebak dengan mencoba seluruh nomor yang mungkin.
4. Dua kunci diturunkan dari satu `FIELD_ENCRYPTION_KEY` memakai HKDF, supaya
   kunci penyandian dan kunci sidik jari tidak pernah sama.
5. Nomor diseragamkan lebih dulu, sehingga `0812...`, `62812...`, dan
   `+62 812 ...` menghasilkan sidik jari yang sama. Tanpa keseragaman ini,
   pelanggan yang sama akan tercatat dua kali.

## 9. Pengujian

| Tingkat        | Alat          | Sasaran                                                                                                        |
| -------------- | ------------- | -------------------------------------------------------------------------------------------------------------- |
| Unit           | Vitest        | Sepuluh tool, perhitungan laporan, rata rata bergerak, context lock, format rupiah dan tanggal, aturan teks UI |
| Integrasi      | Vitest        | Kanal webhook sampai tersimpan sebagai order dan pembayaran, orkestrasi sampai tool terpanggil                 |
| Ujung ke ujung | Playwright    | Sepuluh langkah kriteria sukses demo di `docs/SCOPE.md` bagian 7                                               |
| Aturan UI      | Skrip sendiri | Larangan emoji dan tanda hubung pada semua teks yang dilihat pengguna                                          |

Letak berkas dan perintahnya:

| Perintah             | Isi                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `npm test`           | Vitest, berkas `src/**/*.test.ts` di samping berkas yang diuji                                    |
| `npm run test:watch` | Vitest dalam mode pantau                                                                          |
| `npm run test:e2e`   | Playwright, berkas `e2e/*.spec.ts`, dua cabang tata letak diuji terpisah pada 393 dan 1280 piksel |

`npm run typecheck` menjalankan `next typegen` lebih dulu, karena Next.js
menghasilkan tipe rute dan tipe `LayoutProps` ke dalam `.next`. Tanpa langkah
itu, pemeriksaan tipe gagal pada salinan repo yang baru.

## 10. Keputusan yang sudah ditetapkan

Semua keputusan berikut sudah dikonfirmasi user atau sudah diverifikasi
langsung dari dokumentasi resmi. Tanggal: 17 Oktober 2026.

| Nomor | Hal                                                   | Keputusan                                                                                                                                                       | Dasar                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1    | Penyedia model bahasa                                 | DeepSeek, model `deepseek-flash`                                                                                                                                | User memiliki token DeepSeek                                                                                                                                                                                                                                                                                                                                                                                     |
| A2    | Pembacaan foto struk                                  | `deepseek-flash`, yang menerima gambar                                                                                                                          | Dokumentasi DeepSeek bagian Vision                                                                                                                                                                                                                                                                                                                                                                               |
| A3    | Transkripsi voice note                                | Web Speech API peramban                                                                                                                                         | DeepSeek tidak punya endpoint audio, lihat bagian 5.2                                                                                                                                                                                                                                                                                                                                                            |
| A4    | Basis data demo                                       | PGlite, PostgreSQL di dalam proses                                                                                                                              | User menyetujui setelah dipastikan mendukung CRUD penuh                                                                                                                                                                                                                                                                                                                                                          |
| A5    | Pengambilan konteks bisnis                            | Query SQL terstruktur, tanpa pgvector                                                                                                                           | DeepSeek tidak menyediakan endpoint embedding, sehingga kolom vektor tidak dapat diisi data nyata. Data warung juga berupa data terstruktur, sehingga query lebih tepat daripada kemiripan vektor. PGlite tetap dipakai sesuai K7                                                                                                                                                                                |
| A6    | Identitas git dan autentikasi push                    | Nama `ZeaLIsHere`, email noreply GitHub, kredensial Windows Credential Manager                                                                                  | Push sudah terverifikasi berhasil                                                                                                                                                                                                                                                                                                                                                                                |
| A7    | Akses skill desain                                    | Belum diputuskan, akan dipakai saat fase 1                                                                                                                      | Data skill dibaca lewat Node selama Python belum terpasang                                                                                                                                                                                                                                                                                                                                                       |
| A8    | Penyedia kanal WhatsApp                               | **Fonnte.** Paket gratis, tanpa n8n sebagai perantara                                                                                                           | Nomor user sudah terhubung ke Fonnte dan chat teks berjalan, sehingga demo punya kanal WhatsApp nyata tanpa menunggu verifikasi bisnis Meta. Batasan lampiran dan voice note sudah dipastikan dari dokumentasi resmi dan dicatat di bagian 11. Ditinjau ulang bila keadaan berubah                                                                                                                               |
| A9    | Versi dan opsi bawaan Next.js                         | Next.js 16.4.2, React 19.3.0, Tailwind 4, `cacheComponents` aktif, `partialPrefetching` aktif                                                                   | Keluaran `create-next-app`. Lihat catatan di bawah tabel                                                                                                                                                                                                                                                                                                                                                         |
| A10   | Penulisan otomatis blok aturan Next.js ke `AGENTS.md` | Dimatikan, memakai `agentRules: false` pada `next.config.ts`                                                                                                    | `AGENTS.md` dikelola tim. Panduan Next.js 16 dibaca dari `node_modules/next/dist/docs/`                                                                                                                                                                                                                                                                                                                          |
| A11   | Pustaka primitif dan preset shadcn/ui                 | Pustaka primitif `radix`, preset `nova`, warna dasar `neutral`, ikon `lucide`                                                                                   | Radix paling matang dan sudah tertulis di rencana. Preset nova memakai Lucide, sejalan dengan aturan ikon SVG dan larangan emoji                                                                                                                                                                                                                                                                                 |
| A12   | Arah warna dan susunan token                          | Warna utama hijau `#059669`, susunan tiga lapis di `src/styles/tokens/`, pemetaan ke utilitas Tailwind lewat `@theme inline` di `src/app/globals.css`           | Pilihan user: hijau warung, karena pintu masuk aplikasi adalah WhatsApp. Sumber palet: data skill `ui-ux-pro-max`, profil Grocery dan E-commerce                                                                                                                                                                                                                                                                 |
| A13   | Mode gelap                                            | Tidak dikerjakan                                                                                                                                                | Tidak ada di `docs/SCOPE.md`. Variabel `dark` tetap dideklarasikan tanpa pernah dipasang, supaya kelas `dark:` bawaan shadcn/ui tidak mengikuti pengaturan sistem operasi pengguna                                                                                                                                                                                                                               |
| A14   | Penggabung nama kelas                                 | `cn` diambil dari `src/lib/utils.ts`, bukan langsung dari paket `cn`                                                                                            | Mesin bawaan paket `cn` hanya mengenal ukuran huruf bawaan Tailwind. Tanpa perluasan, `text-body` dan `text-caption` dianggap warna teks dan terbuang saat digabung dengan kelas warna, sehingga ukuran huruf token tidak terpakai. Komponen baru dari perkakas shadcn/ui harus diubah dulu impornya. Bila token `--text-` bertambah di `src/app/globals.css`, daftar di `src/lib/utils.ts` harus ikut bertambah |
| A15   | Perapian format dan pemeriksaan tipe                  | Prettier dengan `eslint-config-prettier`, lebar baris 90, akhir baris LF. Perintah `npm run format`, `npm run format:check`, dan `npm run typecheck`            | Menghentikan perdebatan gaya dan menjaga kode terbaca. `AGENTS.md` dan `docs/PRODUCT.md` dikecualikan karena isinya tidak diubah tanpa persetujuan user. Berkas `src/components/ui/` yang dihasilkan CLI shadcn/ui ikut dirapikan, jadi hasil `shadcn add` berikutnya perlu dirapikan ulang                                                                                                                      |
| A16   | Alat pengujian                                        | Vitest 5 untuk unit dan integrasi pada `src/**/*.test.ts`, Playwright 1.64 untuk alur peramban pada `e2e/*.spec.ts`. Dua proyek tata letak: 393 dan 1280 piksel | Sudah ditetapkan pada rencana dan `docs/ARCHITECTURE.md` bagian 9. Node 24 menjalankan TypeScript langsung, sehingga Vitest tidak perlu pustaka tambahan. `@types/node` dinaikkan dari 20 ke 24 karena Vitest 5 menuntutnya, sekaligus sejalan dengan Node 24 di mesin pengembangan. `vitest.config.mts` memakai akhiran `.mts` karena `package.json` tidak menetapkan `type`                                    |
| A17   | Bentuk skema basis data                               | uuid sebagai kunci utama, `business_id` di setiap tabel, nilai enum bahasa Indonesia, kolom uang bilangan bulat                                                 | Diputuskan saat T2.1 karena tidak diatur di dokumen mana pun. Rinciannya menjadi aturan skema pada bagian 4. Tidak ada kolom vektor, sesuai keputusan A5                                                                                                                                                                                                                                                         |
| A18   | Penerapan migrasi                                     | Penerap milik Drizzle ORM, bukan drizzle-kit migrate                                                                                                            | Perintah drizzle-kit migrate hanya dapat menyambung ke Postgres lewat jaringan, sedangkan demo memakai PGlite di dalam proses. Berkas migrasi tetap dibuat drizzle-kit lewat npm run db:generate, dan folder drizzle/ masuk repo                                                                                                                                                                                 |

Catatan A9: `cacheComponents` aktif berarti halaman yang membaca data saat
berjalan wajib dibungkus `Suspense` atau memakai arahan `"use cache"`.
Peraturan ini harus dipatuhi mulai fase 2, saat lapisan data dipasang. Bila
ternyata terlalu menyulitkan untuk tempo lomba, opsi ini dapat dimatikan, dan
keputusan itu dicatat ulang di tabel ini.

## 11. Penyedia kanal WhatsApp

**Ditetapkan:** Fonnte, pada 17 Oktober 2026.

Alasannya, nomor warung sudah terhubung ke Fonnte dan chat teks berjalan, jadi
demo punya kanal WhatsApp nyata tanpa menunggu verifikasi bisnis Meta yang
jangka waktunya di luar kendali kita. n8n tidak dipakai, karena n8n bukan
penyedia WhatsApp, hanya orkestrasi alur.

### 11.1 Tata cara Hubungkan ke WhatsApp

1. Pemilik membuat akun di fonnte.com, lalu menghubungkan nomor warung dengan
   memindai kode QR pada halaman perangkat di dasbor Fonnte.
2. Pemilik menyalin token perangkat dari dasbor Fonnte, lalu mengisinya pada
   `.env.local` sebagai `FONNTE_TOKEN`, sesuai bagian 8 butir 5 yang
   menetapkan kredensial kanal hanya berasal dari variabel lingkungan.
3. Pemilik membuka permukaan S3 dan menjalankan aksi Hubungkan ke WhatsApp.
4. Aplikasi memeriksa token dengan `POST https://api.fonnte.com/device`
   beserta header `Authorization`. Jawaban yang berhasil memuat nomor
   perangkat, status koneksi, nama paket, dan sisa kuota. Jawaban yang gagal
   memuat alasan, misalnya token tidak sah.
5. Aplikasi menyimpan nomor perangkat, status koneksi, nama paket, sisa kuota,
   dan waktu pemeriksaan pada baris `businesses`. Status koneksi pada S3
   mengikuti hasil pemeriksaan ini, bukan tebakan.
6. Pemilik menempelkan alamat webhook aplikasi pada halaman webhook Fonnte.
7. Aksi memutuskan koneksi menandai nomor tidak terhubung dan menghapus
   simpanan status koneksi.

Token tidak pernah disimpan di baris basis data, sesuai bagian 8 butir 5. Bila
`FONNTE_TOKEN` belum diisi, S3 menampilkan tata cara di atas beserta keterangan
bahwa token belum ada, bukan tombol yang tidak berfungsi.

### 11.2 Batasan Fonnte yang sudah dipastikan

Diambil dari dokumentasi resmi Fonnte pada 17 Oktober 2026.

| Batasan         | Isi dokumentasi                                                                                                              | Akibat pada aplikasi                                                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lampiran masuk  | Halaman Webhook Get Attachment menyatakan `url`, `filename`, dan `extension` hanya diterima perangkat berpakat `all feature` | Pada paket gratis yang dipakai sekarang, gambar dari pelanggan tidak sampai ke webhook. Penerjemah payload tetap ditulis mengikuti bentuk itu dan menangani ketiadaan `url` tanpa gagal |
| Jenis berkas    | Hanya `png`, `jpg`, `jpeg`, `webp`, `mp4`, `pdf`, `doc`, `docx`, `xls`, `xlsx`, `csv`, `txt`, dan `mp3`, paling besar 10 MB  | Voice note WhatsApp berformat `ogg`, jadi tidak pernah diteruskan ke webhook walaupun paket dinaikkan. Fitur voice note tetap ada di permukaan S2 lewat Web Speech API, sesuai A3       |
| Pengiriman luar | Tool `send_whatsapp` hanya menulis balasan pada konteks pesan pelanggan, tidak mengirim ke luar, sesuai `docs/SCOPE.md`      | Balasan otomatis agen terlihat pada orderan di dalam aplikasi. Ini sudah sesuai kriteria demo langkah 4 yang tidak meminta tampilan obrolan                                             |
| Autoreply       | Fitur autoreply Fonnte tidak bekerja bila webhook dipakai                                                                    | Tidak merugikan, karena balasan otomatis disusun aplikasi sendiri                                                                                                                       |

### 11.3 Akibat pada rancangan

1. Aplikasi tidak menggantungkan kriteria demo pada kanal luar. Panel pengirim
   pesan tiruan menulis ke fungsi pemrosesan pesan masuk yang sama dengan
   webhook penyedia, sehingga seluruh langkah kriteria demo tetap berjalan
   ketika jaringan bermasalah atau kuota Fonnte habis.
2. Penerjemah payload penyedia berada di `src/lib/channel/`, sesuai aturan
   struktur butir 6.
3. Nama paket dan sisa kuota ditampilkan pada halaman Pengaturan apa adanya,
   termasuk keterangan bahwa lampiran masuk belum aktif pada paket gratis.
   Pemilik jadi tahu batasnya, bukan menemukan sendiri lewat kegagalan.
4. Pesan teks nyata lewat Fonnte adalah nilai tambah demo, bukan tumpuan.

## 12. Kemampuan PGlite yang sudah dipastikan

PGlite adalah PostgreSQL asli yang dikompilasi ke WebAssembly dan berjalan di
dalam proses Node. Yang tersedia dan akan dipakai:

| Kemampuan         | Keterangan                                                                   |
| ----------------- | ---------------------------------------------------------------------------- |
| Baca dan tulis    | Method `query` dengan parameter, method `exec` untuk banyak pernyataan       |
| Transaksi         | Method `transaction` dengan commit otomatis dan rollback otomatis bila gagal |
| Query bertemplate | Method `sql` dengan pengikatan parameter otomatis                            |
| Impor dan ekspor  | Device virtual `/dev/blob` lewat perintah `COPY`                             |
| Ekstensi          | Tidak ada ekstensi tambahan                                                  |
| Penyimpanan       | `file://` ke disk, `memory://` sementara, atau `idb://` di peramban          |

Konsekuensi: seluruh operasi basis data yang dibutuhkan aplikasi ini, termasuk
CRUD dan transaksi dapat berjalan tanpa server basis data.
Berkas basis data disimpan di direktori yang masuk `.gitignore`.

Pemilih driver ada di `src/lib/db/client.ts`. Aturannya satu: bila
`DATABASE_URL` terisi, aplikasi memakai Postgres biasa lewat driver `pg`, dan
bila kosong, aplikasi memakai PGlite dengan folder penyimpanan dari
`PGLITE_DATA_DIR`. Lapisan akses data hanya menerima satu tipe `Database`,
sehingga tidak ada kode aplikasi lain yang berubah saat berpindah driver.

PGlite juga sudah dipastikan berjalan di dalam proses server Next, bukan hanya
di skrip Node. Dua hal yang ditemukan saat pengujian, beserta penanganannya:

1. PGlite hanya membuat direktori terakhir dari jalur penyimpanannya, bukan
   direktori bertingkat. Karena itu pemilih driver membuat folder lebih dulu
   dengan `mkdirSync` sebelum membuka penyimpanan.
2. Data hanya berada di dalam proses server, dan berkasnya tidak ikut ke
   produksi. Halaman yang menampilkan data tidak boleh disajikan dari hasil
   build, karena isinya akan terbekukan pada saat build dan tidak berubah saat
   pemilik memakai aplikasi. Mekanisme pencegahannya ditetapkan pada T5.1,
   dengan memperhatikan `cacheComponents` yang aktif.
