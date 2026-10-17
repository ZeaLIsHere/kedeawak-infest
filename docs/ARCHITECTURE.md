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

| Lapisan | Pilihan | Alasan |
| --- | --- | --- |
| Bahasa | TypeScript, mode strict | Menjaga tipe data transaksi tetap benar |
| Framework | Next.js App Router | Server Component untuk data, Route Handler untuk webhook dan agen |
| Antarmuka | Tailwind CSS, shadcn/ui, lucide-react | Cepat, aksesibel, ikon SVG bukan emoji, sesuai aturan UI |
| Basis data | PostgreSQL | Sesuai proposal |
| Driver lokal | PGlite | PostgreSQL asli yang berjalan di dalam proses, tanpa pemasangan server, sehingga demo tetap jalan di Windows |
| Driver produksi | Postgres biasa | Supabase atau Neon, kode aplikasi tidak berubah |
| ORM | Drizzle | Skema bertipe, migrasi ringan, mendukung PGlite dan Postgres |
| Pencarian vektor | pgvector | Sesuai proposal, untuk RAG konteks bisnis |
| Sesi dan context lock | Tabel di PostgreSQL lewat satu antarmuka | Menggantikan Redis saat demo, tanpa mengubah pemanggil |
| Model bahasa | DeepSeek, model `deepseek-flash`, endpoint kompatibel OpenAI | Token sudah tersedia dari user. Mendukung pemanggilan fungsi dan keluaran JSON, dua hal yang dibutuhkan tool layer |
| Speech to text | Web Speech API peramban, yang di Chrome dilayani Google | Sesuai proposal yang menyebut Google STT. Tidak menambah kunci API, tidak menambah titik gagal |
| Ekstraksi struk | Model vision, yaitu `deepseek-flash` | Satu penyedia menangani teks sekaligus gambar. Fallback tiga lapis sesuai proposal tetap berlaku |
| Uji | Vitest untuk unit, Playwright untuk alur browser | Menutup kriteria demo di `docs/SCOPE.md` bagian 7 |

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
      whatsapp/webhook/route.ts   Kanal masuk, bentuk payload WhatsApp Cloud API
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
  lib/
    db/
      schema.ts                   Definisi tabel Drizzle
      client.ts                   Pemilih driver PGlite atau Postgres
      migrate.ts                  Penerapan migrasi
      seed.ts                     Data awal untuk demo
    data/                         Satu satunya pintu akses data
      products.ts
      transactions.ts
      conversations.ts
      orders.ts
      payments.ts
      stock-alerts.ts
      approvals.ts
      reports.ts
      customers.ts
    ai/
      orchestrator.ts             Pemahaman maksud dan pemilihan tool
      tools/                      Sepuluh tool dari proposal
      providers/
        llm.ts                    Antarmuka model bahasa
        stt.ts                    Antarmuka speech to text
        vision.ts                 Antarmuka pembacaan struk
      prompts/                    Instruksi untuk model
      rag.ts                      Pencarian konteks bisnis lewat pgvector
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
    lint-ui-copy.ts               Pemeriksa larangan emoji dan tanda hubung
```

Aturan struktur:

1. `src/app/` hanya berisi halaman dan Route Handler. Tidak ada logika bisnis.
2. `src/lib/data/` adalah satu satunya tempat yang menulis query database.
3. `src/lib/ai/` adalah satu satunya tempat yang memanggil model bahasa.
4. `src/components/` tidak boleh mengimpor dari `src/lib/db/`.
5. Tidak ada fungsi yang dipanggil dari dua tempat berbeda tanpa diletakkan di
   `src/lib/`.

## 4. Skema data

Satu entitas akar `businesses`. Semua tabel lain terikat padanya, sesuai butir
privasi proposal tentang pemisahan data antar warung.

| Tabel | Isi utama | Catatan |
| --- | --- | --- |
| `businesses` | Nama warung, jam buka, status koneksi nomor, nomor bisnis | Akar semua data |
| `products` | Nama, satuan, harga jual, harga beli, stok, ambang minimum | Stok disimpan sebagai angka hasil perhitungan terakhir |
| `customers` | Nama, nomor telepon | Nama dan nomor telepon disimpan terenkripsi |
| `conversations` | Kanal, nomor pelanggan, status, waktu | Kanal bernilai `whatsapp` atau `app` |
| `messages` | Percakapan, pengirim, jenis, isi teks, tautan media, waktu | Jenis bernilai `text`, `voice`, `image` |
| `orders` | Pelanggan, daftar item, total, status | Berasal dari percakapan WhatsApp |
| `order_items` | Order, produk, jumlah, harga satuan | |
| `transactions` | Jenis, keterangan, jumlah, sumber, tautan bukti, confidence, waktu | Jenis bernilai `sale`, `expense`, `debt` |
| `payments` | Order, tautan bukti transfer, nominal yang diharapkan, nominal terbaca, status verifikasi | Status bernilai `menunggu`, `cocok`, `tidak cocok` |
| `stock_movements` | Produk, jenis, jumlah perubahan, alasan, waktu | Jejak audit perubahan stok |
| `stock_alerts` | Produk, stok saat alert, ambang, status | Status bernilai `aktif`, `selesai` |
| `purchase_orders` | Supplier, daftar item, total, status, waktu persetujuan | Status bernilai `draft`, `disetujui`, `ditolak` |
| `purchase_order_items` | PO, produk, jumlah, harga perkiraan | |
| `approvals` | Jenis aksi, muatan aksi, ringkasan, status, waktu keputusan | Antrean di S6 |
| `agent_sessions` | Sesi percakapan, status kunci konteks, aksi yang menunggu | Menggantikan Redis |
| `tool_invocations` | Sesi, nama tool, muatan, hasil, waktu | Jejak audit pemanggilan tool |
| `knowledge_chunks` | Potongan teks, vektor embedding, sumber | Basis RAG dengan pgvector |
| `quota_usage` | Tanggal, jumlah pemakaian | Pembatas pemakaian harian |

Aturan skema:

1. Semua tabel yang menyimpan uang memakai satuan rupiah penuh sebagai bilangan
   bulat. Tidak ada bilangan desimal untuk uang.
2. Semua tabel punya `created_at`. Tabel yang dapat diubah punya `updated_at`.
3. Penghapusan data pelanggan dilakukan sebagai penghapusan baris sungguhan,
   sesuai butir privasi proposal, bukan penandaan lunak.
4. Setiap perubahan stok wajib meninggalkan baris di `stock_movements`.

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

| Hal | Nilai |
| --- | --- |
| Alamat dasar, format OpenAI | `https://api.deepseek.com` |
| Alamat dasar, format Anthropic | `https://api.deepseek.com/anthropic` |
| Model untuk percakapan | `deepseek-flash` |
| Model penalaran | `deepseek-v4-pro` |
| Panjang konteks | 1 juta token |
| Pemanggilan fungsi | Didukung kedua model |
| Keluaran JSON | Didukung kedua model |
| Gambar | Hanya `deepseek-flash` |
| Format gambar | JPEG, PNG, GIF, WebP |
| Batas satu gambar | 32 MB untuk base64 atau alamat luar, 64 MB lewat Files API |
| Endpoint transkripsi audio | **Tidak ada** |

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

| Kegagalan | Perilaku |
| --- | --- |
| Kunci API model tidak ada | Pengganti lokal aktif, pemberitahuan tampil di permukaan S2 |
| Panggilan model gagal | Coba sekali lagi, lalu sampaikan ke pemilik bahwa pemrosesan gagal dan minta input manual |
| Confidence pembacaan struk di bawah 70 persen | AI meminta konfirmasi nominal, sesuai lapis kedua proposal |
| Foto struk tidak terbaca | AI meminta pemilik mendikte atau mengetik manual, sesuai lapis ketiga proposal |
| Bukti transfer tidak cocok nominalnya | Status pembayaran menjadi tidak cocok dan muncul di antrean pemeriksaan |
| Voice note tidak dapat ditranskripsi | Sampaikan gagal, minta pemilik mengetik |
| Basis data belum dimigrasi | Halaman menampilkan langkah yang harus dijalankan, bukan galat mentah |

## 8. Keamanan

1. Nama dan nomor telepon pelanggan dienkripsi di lapisan aplikasi sebelum
   disimpan, dengan kunci dari variabel lingkungan.
2. Kunci API tidak pernah dikirim ke browser. Semua panggilan penyedia
   dilakukan di server.
3. Variabel lingkungan hanya dari `.env.local`, yang tidak pernah masuk git.
4. Setiap query data wajib menyertakan `business_id`.

## 9. Pengujian

| Tingkat | Alat | Sasaran |
| --- | --- | --- |
| Unit | Vitest | Sepuluh tool, perhitungan laporan, rata rata bergerak, context lock, format rupiah dan tanggal, aturan teks UI |
| Integrasi | Vitest | Kanal webhook sampai tersimpan sebagai order dan pembayaran, orkestrasi sampai tool terpanggil |
| Ujung ke ujung | Playwright | Delapan langkah kriteria sukses demo di `docs/SCOPE.md` bagian 7 |
| Aturan UI | Skrip sendiri | Larangan emoji dan tanda hubung pada semua teks yang dilihat pengguna |

## 10. Keputusan yang sudah ditetapkan

Semua keputusan berikut sudah dikonfirmasi user atau sudah diverifikasi
langsung dari dokumentasi resmi. Tanggal: 17 Oktober 2026.

| Nomor | Hal | Keputusan | Dasar |
| --- | --- | --- | --- |
| A1 | Penyedia model bahasa | DeepSeek, model `deepseek-flash` | User memiliki token DeepSeek |
| A2 | Pembacaan foto struk | `deepseek-flash`, yang menerima gambar | Dokumentasi DeepSeek bagian Vision |
| A3 | Transkripsi voice note | Web Speech API peramban | DeepSeek tidak punya endpoint audio, lihat bagian 5.2 |
| A4 | Basis data demo | PGlite, PostgreSQL di dalam proses | User menyetujui setelah dipastikan mendukung CRUD penuh |
| A5 | Pencarian vektor | Ekstensi pgvector untuk PGlite | PGlite menyediakan paket `@electric-sql/pglite-pgvector` |
| A6 | Identitas git dan autentikasi push | Nama `ZeaLIsHere`, email noreply GitHub, kredensial Windows Credential Manager | Push sudah terverifikasi berhasil |
| A7 | Akses skill desain | Belum diputuskan, akan dipakai saat fase 1 | Data skill dibaca lewat Node selama Python belum terpasang |

### Kemampuan PGlite yang sudah dipastikan

PGlite adalah PostgreSQL asli yang dikompilasi ke WebAssembly dan berjalan di
dalam proses Node. Yang tersedia dan akan dipakai:

| Kemampuan | Keterangan |
| --- | --- |
| Baca dan tulis | Method `query` dengan parameter, method `exec` untuk banyak pernyataan |
| Transaksi | Method `transaction` dengan commit otomatis dan rollback otomatis bila gagal |
| Query bertemplate | Method `sql` dengan pengikatan parameter otomatis |
| Impor dan ekspor | Device virtual `/dev/blob` lewat perintah `COPY` |
| Ekstensi | Objek `extensions` saat inisialisasi, termasuk `pgvector` |
| Penyimpanan | `file://` ke disk, `memory://` sementara, atau `idb://` di peramban |

Konsekuensi: seluruh operasi basis data yang dibutuhkan aplikasi ini, termasuk
CRUD, transaksi, dan pencarian vektor, dapat berjalan tanpa server basis data.
Berkas basis data disimpan di direktori yang masuk `.gitignore`.

