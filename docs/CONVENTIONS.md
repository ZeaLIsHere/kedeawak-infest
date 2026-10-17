# CONVENTIONS.md

Aturan kode, teks antarmuka, dan komponen. Detail dari `AGENTS.md` bagian 3 dan 9.

---

## 1. Bahasa

| Konteks                         | Bahasa                                                        |
| ------------------------------- | ------------------------------------------------------------- |
| Teks yang dilihat pengguna      | Indonesia                                                     |
| Nama variabel, fungsi, tipe     | Inggris                                                       |
| Nama berkas dan folder          | Inggris, kebab-case untuk folder, PascalCase untuk komponen   |
| Nama tabel dan kolom basis data | Inggris, snake_case                                           |
| Commit                          | Indonesia untuk deskripsi                                     |
| Dokumen di `docs/`              | Indonesia                                                     |
| Komentar kode                   | Indonesia, singkat, hanya bila kode tidak menjelaskan dirinya |

Istilah yang tetap bahasa Inggris di UI karena lazim dipakai: `WhatsApp`,
`OCR`, `stok`, `draft`.

## 2. Teks antarmuka

### 2.1 Larangan mutlak

1. **Tidak ada emoji.** Berlaku untuk seluruh teks yang dilihat pengguna,
   termasuk isi seed data dan pesan galat.
2. **Tidak ada tanda hubung `-`** dan tidak ada varian dash lain: `-`, `–`,
   `—`, `‑`.
3. Tidak ada teks placeholder, lorem ipsum, atau teks contoh yang tidak
   berhubungan dengan warung.
4. Tidak ada kalimat campuran bahasa Inggris di tengah kalimat Indonesia.

### 2.2 Cara menulis tanpa tanda hubung

| Keperluan           | Salah             | Benar                      |
| ------------------- | ----------------- | -------------------------- |
| Rentang angka       | `Rp15.000-20.000` | `Rp15.000 sampai Rp20.000` |
| Rentang tanggal     | `1-7 Okt`         | `1 sampai 7 Oktober`       |
| Waktu               | `08.00-21.00`     | `08.00 sampai 21.00`       |
| Nilai kosong        | `-`               | `Belum ada data`           |
| Nomor telepon       | `0812-3456`       | `081234567890`             |
| Nama produk majemuk | `Kopi-susu`       | `Kopi susu`                |
| Kata ulang          | `sehari-hari`     | `setiap hari`              |
| Singkatan           | `dll.`            | `dan lain lain`            |

Tanda hubung tetap dipakai pada hal yang tidak dilihat pengguna: nama berkas,
kelas Tailwind, potongan kode, dan alamat halaman. Ini bukan pelanggaran.

### 2.3 Angka, uang, dan tanggal

- Uang: `Rp150.000`, `Rp1.250.000`. Pemisah ribuan titik. Tanpa desimal.
  Bilangan penuh disimpan sebagai bilangan bulat rupiah.
- Angka biasa: `1.250`, pemisah ribuan titik, pemisah desimal koma.
- Persen: `12,5 persen`. Kata "persen" ditulis penuh, bukan lambang.
- Tanggal: `17 Oktober 2026`.
- Tanggal dan waktu: `17 Oktober 2026, 14.30`.
- Waktu: memakai titik, `14.30`, bukan titik dua.
- Nama hari dan bulan ditulis penuh, kapital di awal.

Semua pemformatan lewat `src/lib/format/`. Dilarang memformat angka secara
manual di dalam komponen.

### 2.4 Nada penulisan

1. Sapa pengguna dengan "Anda" pada teks arahan, dan tanpa kata sapaan pada
   label pendek.
2. Kalimat perintah pada tombol: kata kerja, maksimal tiga kata.
   Contoh: `Catat penjualan`, `Setujui draft`, `Hapus data`.
3. Pesan galat menyebut apa yang salah dan apa yang harus dilakukan.
   Contoh: `Foto struk tidak terbaca. Sebutkan totalnya lewat suara atau
ketik manual.`
4. Pesan kosong menyebut langkah berikutnya, bukan hanya "tidak ada data".
   Contoh: `Belum ada orderan. Pesan pelanggan dari WhatsApp akan muncul di
sini.`

### 2.5 Pemeriksaan otomatis

Skrip `src/scripts/lint-ui-copy.ts` memindai berkas di `src/`, termasuk
`src/lib/db/seed.ts`, untuk:

1. Karakter emoji dan simbol unicode dekoratif.
2. Karakter dash pada string yang tidak dilewati oleh penyaringan di bawah
   ini, bukan hanya string yang tampil di antarmuka.
3. Kata terlarang: `lorem`, `ipsum`, `TODO`, `placeholder`, `Coming soon`.

Cara kerja deteksinya:

1. Kumpulkan semua literal string dan JSX text node dari berkas TypeScript dan
   TSX.
2. Lewati string yang bukan teks pengguna: `className`, atribut `import`,
   alamat halaman, nama variabel, kunci objek, nama variabel CSS, argumen `cn`
   dan `cva`, tipe literal, dan pesan galat pengembang.
3. Laporkan berkas, nomor baris, potongan teks, dan aturan yang dilanggar.
4. Berkas yang gagal diurai dilaporkan sebagai kegagalan, bukan dilewati diam
   diam.

Sebagian nama berasal dari luar dan memang memuat tanda hubung, misalnya nama
algoritma penyandian milik OpenSSL. Untuk kasus seperti itu, barisnya diberi
penanda beserta alasan tertulis:

```ts
const ALGORITHM = "aes-256-gcm"; // lint-ui-ignore: nama algoritma milik OpenSSL
```

Aturan pemakaian penanda:

1. Penanda hanya berlaku pada barisnya sendiri, bukan seluruh berkas.
2. Penanda wajib disertai alasan setelah tanda titik dua. Penanda tanpa alasan
   tidak mengecualikan apa pun, sehingga pelanggarannya tetap dilaporkan.
3. Penanda tidak boleh dipakai untuk teks yang dilihat pengguna. Teks seperti
   itu harus diperbaiki, bukan dikecualikan.

Yang tidak ikut diperiksa: `src/lib/ui-copy/rules.ts` karena memuat daftar
karakter dan kata terlarang, `src/scripts/` karena berisi teks perkakas
pengembang, dan berkas pengujian karena memuat contoh teks yang sengaja
melanggar. Aturan teks UI sendiri diuji lewat `npm test`.

Perintah: `npm run lint:ui`.

## 3. TypeScript

1. Mode `strict` menyala. Dilarang mematikan pemeriksaan.
2. Dilarang `any`. Bila benar benar tidak terhindarkan, tulis alasan di
   komentar tepat di atasnya.
3. Dilarang `as` untuk memaksa tipe data hasil query. Validasi dengan skema.
4. Semua data yang masuk dari luar, termasuk payload webhook dan jawaban
   model bahasa, divalidasi dengan skema sebelum dipakai.
5. Tipe bersama diletakkan di `src/lib/types/` atau di sebelah skema yang
   memilikinya.
6. Pakai `type` untuk bentuk data, `interface` hanya untuk kontrak yang
   diterapkan kelas atau di perluas.

## 4. React dan Next.js

1. Server Component adalah bawaan. Tandai `"use client"` hanya pada komponen
   yang benar benar butuh keadaan atau peristiwa peramban.
2. Ambil data di Server Component atau Route Handler, bukan di efek peramban.
3. Dilarang mengambil data langsung dari basis data di dalam komponen.
   Gunakan `src/lib/data/`.
4. Dilarang menaruh angka atau teks yang seharusnya dari data di dalam
   komponen.
5. Setiap daftar wajib punya kunci yang stabil. Dilarang memakai indeks.
6. Setiap formulir wajib punya label yang terlihat, bukan hanya placeholder.
7. Setiap keadaan yang dapat gagal wajib punya tiga tampilan: sedang memuat,
   kosong, dan gagal.
8. Perubahan data wajib memakai Server Action atau Route Handler, lalu
   perbarui tampilan dengan revalidasi.

## 5. Struktur komponen

1. Satu komponen, satu berkas. Nama berkas sama dengan nama komponen.
2. Urutan bagian di dalam berkas: tipe properti, komponen, fungsi pembantu
   lokal.
3. Dilarang membuat komponen dengan lebih dari sekitar 200 baris. Pecah.
4. Komponen yang dipakai di lebih dari satu permukaan dipindahkan ke
   `src/components/ui/` atau folder bersama yang sesuai.
5. Komponen tingkat halaman tidak boleh dipindahkan ke folder bersama hanya
   karena satu bagian kecil dipakai ulang.

## 6. Penamaan

| Hal                 | Gaya                 | Contoh                        |
| ------------------- | -------------------- | ----------------------------- |
| Komponen            | PascalCase           | `StockAlertList`              |
| Fungsi dan variabel | camelCase            | `formatRupiah`                |
| Konstanta           | SCREAMING_SNAKE_CASE | `LOW_STOCK_THRESHOLD_DEFAULT` |
| Tipe dan antarmuka  | PascalCase           | `TransactionInput`            |
| Berkas komponen     | PascalCase           | `StockAlertList.tsx`          |
| Berkas lain         | kebab-case           | `stock-alerts.ts`             |
| Tabel basis data    | snake_case, jamak    | `stock_alerts`                |
| Kolom basis data    | snake_case           | `minimum_stock`               |
| Route API           | kebab-case           | `/api/agent/receipt`          |

## 7. Gaya CSS

1. Tailwind saja. Dilarang CSS terpisah kecuali untuk hal yang tidak bisa
   dilakukan Tailwind, dan harus dijelaskan alasannya.
2. Warna, jarak, dan ukuran huruf selalu dari token di `src/app/globals.css`.
   Dilarang menulis warna langsung seperti `#1f2937` di dalam komponen.
3. Dilarang memakai ukuran tetap yang membuat tata letak rusak di layar kecil.
4. Sasaran utama adalah layar ponsel, sesuai pengguna warung. Rancang dari
   ukuran terkecil lebih dulu.
5. Sasaran sentuh minimal 44 kali 44 piksel, sesuai aturan aksesibilitas.
6. Dilarang menyembunyikan fokus papan tik.
7. Nama kelas digabung lewat `cn` dari `src/lib/utils.ts`, bukan langsung dari
   paket `cn`. Berkas itu memperluas pengenal ukuran huruf proyek, sehingga
   `text-body` dan `text-caption` tidak terbuang saat digabung dengan kelas
   warna teks. Komponen baru dari perkakas shadcn/ui perlu diubah dulu
   impornya. Lihat keputusan A14 di `docs/ARCHITECTURE.md`.

## 8. Keadaan di antarmuka

Setiap daftar, tabel, dan kartu data wajib menangani:

| Keadaan       | Wujud                                                   |
| ------------- | ------------------------------------------------------- |
| Sedang memuat | Kerangka muat, bukan pemutar berputar di tengah halaman |
| Kosong        | Keterangan singkat berisi langkah berikutnya            |
| Gagal         | Keterangan sebab dan tombol coba lagi                   |
| Berhasil      | Data tampil, tanpa notifikasi yang mengganggu           |

## 9. Komentar dan dokumentasi kode

1. Komentar menjelaskan alasan, bukan mengulang kode.
2. Dilarang meninggalkan `TODO` pada alur yang dipakai pengguna. Bila ada
   pekerjaan tersisa, catat di `PLAN.md`.
3. Fungsi yang memuat aturan bisnis penting wajib punya komentar singkat
   berisi rujukan ke bagian proposal atau dokumen terkait.

## 10. Yang sering keliru

| Kesalahan                                        | Yang benar                           |
| ------------------------------------------------ | ------------------------------------ |
| Menulis `Rp15.000-20.000`                        | `Rp15.000 sampai Rp20.000`           |
| Memakai emoji pada tombol                        | Ikon SVG dari `lucide-react`         |
| Menampilkan `-` untuk data kosong                | `Belum ada data`                     |
| Query basis data di dalam komponen               | Lewat `src/lib/data/`                |
| Memanggil model bahasa di komponen               | Lewat `src/lib/ai/`                  |
| Menyimpan uang sebagai bilangan desimal          | Bilangan bulat rupiah                |
| Menambah fitur di luar scope                     | Tanyakan dulu                        |
| Menyatakan selesai tanpa menjalankan pemeriksaan | Jalankan `docs/WORKFLOW.md` bagian 4 |
