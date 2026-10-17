# Potongan Vertikal 1 Implementation Plan

Catatan arsip 18 Oktober 2026: potongan ini ditutup pada commit de6e34c.
Kotak langkah di bawah adalah naskah rencana historis, bukan status terkini.
Status berlaku hanya di PLAN.md. Beberapa halaman keterangan dalam rencana
ini sudah digantikan implementasi pada sesi 18 Oktober 2026.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membuat satu alur vertikal utuh dari data demo sampai layar, yaitu seed, Dasbor, Laporan, dan Stok, sehingga tiga permukaan aplikasi benar benar berfungsi dengan data nyata.

**Architecture:** Setiap halaman adalah Server Component yang menyusun kartu kartu. Setiap kartu membaca data lewat `src/lib/data/`, dibungkus `<Suspense>` untuk keadaan memuat dan `CardError` dari `catchError` untuk keadaan gagal, sesuai model Cache Components Next.js 16. Komponen di `src/components/` tetap presentasional dan menerima data lewat prop, sesuai `docs/ARCHITECTURE.md` bagian 3 aturan 4.

**Tech Stack:** Next.js 16.4 dengan `cacheComponents` dan `partialPrefetching`, React 19, Tailwind 4 dari token proyek, Drizzle ORM di atas PGlite, Vitest, Playwright.

**Spec:** `docs/SCOPE.md` bagian 7 (kriteria sukses demo) dan bagian 2 (enam permukaan), `DESIGN.md`, `docs/CONVENTIONS.md`, `PLAN.md` tugas T5.1 sampai T5.4, T5.18 sampai T5.21, T5.22, dan T5.24.

---

## Global Constraints

- Dilarang emoji dan dilarang tanda hubung beserta semua varian dash pada seluruh teks yang dilihat pengguna, termasuk isi seed data. `npm run lint:ui` menolaknya.
- Uang memakai bilangan bulat rupiah, ditulis `Rp150.000`. Tanggal ditulis `17 Oktober 2026`, waktu `14.30`. Persen ditulis `12,5 persen`.
- Tidak ada nilai uang negatif yang ditampilkan dengan tanda minus, karena tanda minus dilarang. Arah nilai dinyatakan dengan kata: `Pengeluaran`, `Rugi`, `Masuk`, `Keluar`.
- Warna, sudut, bayangan, dan ukuran huruf hanya dari token di `src/app/globals.css`. Tidak ada nilai warna langsung dan tidak ada kelas arbitrer.
- Semua pemformatan angka dan tanggal lewat `src/lib/format/`, sesuai `docs/CONVENTIONS.md` bagian 2.3.
- Komponen di `src/components/` dilarang mengimpor dari `src/lib/db/`.
- Query basis data hanya di `src/lib/data/`.
- Batas hari dan minggu mengikuti Waktu Indonesia Barat (UTC+7) menurut `src/lib/data/period.ts`. Rentang waktu bersifat setengah terbuka, `from` ikut dan `to` tidak.
- Setiap daftar dan kartu data wajib punya keadaan memuat, kosong, dan gagal.
- Sebelum menyatakan tugas selesai: `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm run lint:ui`, `npm test`, `npm run build`.
- Setiap tugas berakhir dengan commit yang bisa dibalik sendiri dan push ke `origin`, dengan `Refs:` tugas yang sesuai.

## Review Focus

Masukan dan keadaan yang paling mungkin menggigit pemakai aplikasi ini, berurutan dari yang paling mungkin:

1. **Nilai negatif pada data uang dan stok.** Pemasukan dan pengeluaran, laba rugi, serta pergerakan `keluar` semuanya bernilai negatif di basis data. Pemakai harus melihat `Pengeluaran Rp20.000` dan `Keluar 4`, bukan angka bertanda minus, karena tanda minus dilarang. Diuji di Task 2.
2. **Transaksi tepat pada batas periode.** Transaksi pukul 00.00 WIB pernah bisa terhitung dua kali, karena `summarizePeriod` memakai batas setengah terbuka sementara `listTransactions` memakai batas tertutup. Diuji di Task 5.
3. **Warung yang belum punya data sama sekali.** Basis data yang baru dimigrasi belum punya baris warung, sehingga `getCurrentBusiness` menjawab kosong. Halaman harus menampilkan keadaan kosong, bukan galat. Diuji lewat pemeriksaan peramban di Task 6 sampai 8.
4. **Zona waktu mesin yang bukan WIB.** Pemformatan tidak boleh bergantung pada zona waktu mesin, karena loader dan server produksi belum tentu WIB. Diuji di Task 2 dengan waktu UTC.
5. **Nilai besar dan nama panjang pada layar 393 piksel.** Harga berjuta rupiah dan nama produk panjang tidak boleh terpotong elipsis atau membuat gulir mendatar. Diuji lewat Playwright di Task 9.

---

## File Structure

| Berkas                                             | Tanggung jawab                                                         |
| -------------------------------------------------- | ---------------------------------------------------------------------- |
| `src/lib/format/number.ts`                         | Format angka Indonesia: ribuan titik, desimal koma, persen             |
| `src/lib/format/currency.ts`                       | Format rupiah `Rp150.000` sebagai besaran, arah dijelaskan dengan kata |
| `src/lib/format/date.ts`                           | Format tanggal, waktu, dan rentang menurut WIB                         |
| `src/lib/ui-copy/labels.ts`                        | Terjemahan nilai enum basis data menjadi label Indonesia               |
| `src/lib/data/server.ts`                           | Jembatan pegangan basis data proses ini menuju fungsi `src/lib/data/`  |
| `src/lib/data/transactions.ts`                     | Diubah: batas periode menjadi setengah terbuka                         |
| `src/lib/data/orders.ts`                           | Diubah: penyaring rentang waktu pada `listOrders`                      |
| `src/components/shell/section-card.tsx`            | Kartu bagian: judul, keterangan, dan isi                               |
| `src/components/shell/skeleton.tsx`                | Kerangka muat untuk keadaan memuat                                     |
| `src/components/shell/error-state.tsx`             | Keadaan gagal dengan tombol coba lagi, dipakai `CardError`             |
| `src/components/shell/card-error.tsx`              | Pembatas galat tingkat kartu, dari `catchError`                        |
| `src/components/dashboard/today-summary.tsx`       | Ringkasan penjualan, pengeluaran, laba hari ini (T5.1)                 |
| `src/components/dashboard/order-highlights.tsx`    | Jumlah orderan dan produk terlaris (T5.2)                              |
| `src/components/dashboard/stock-alert-preview.tsx` | Ringkasan alert stok terbaru (T5.3)                                    |
| `src/components/stock/product-list.tsx`            | Daftar produk dengan harga dan stok (T5.22)                            |
| `src/components/stock/stock-alert-list.tsx`        | Daftar alert stok menipis (T5.24)                                      |
| `src/components/reports/period-summary.tsx`        | Pemisahan penjualan, pengeluaran, dan laba (T5.21)                     |
| `src/components/reports/transaction-list.tsx`      | Rincian transaksi per periode (T5.20)                                  |
| `src/components/reports/period-switcher.tsx`       | Pemilih harian dan mingguan beserta hari sebelumnya dan berikutnya     |
| `src/app/page.tsx`                                 | S1 Dasbor                                                              |
| `src/app/laporan/page.tsx`                         | S4 Laporan Keuangan                                                    |
| `src/app/stok/page.tsx`                            | S5 Stok dan Produk                                                     |
| `src/app/percakapan/page.tsx`                      | S2, sementara berisi keterangan jujur tanpa aksi                       |
| `src/app/whatsapp/page.tsx`                        | S3, sementara berisi keterangan jujur tanpa aksi                       |
| `src/app/persetujuan/page.tsx`                     | S6, sementara berisi keterangan jujur tanpa aksi                       |
| `src/app/pengaturan/page.tsx`                      | Pengaturan, sementara berisi keterangan jujur tanpa aksi               |
| `e2e/vertical.spec.ts`                             | Alur peramban potongan vertikal pada dua lebar layar                   |

Nama berkas komponen memakai kebab-case, mengikuti sebelas berkas komponen yang sudah ada, termasuk keluaran `shadcn/ui`. Aturan `docs/CONVENTIONS.md` bagian 6 diselaraskan pada Task 1.

---

## Task 1: Catat urutan kerja dan selaraskan aturan penamaan

**Files:**

- Modify: `PLAN.md`
- Modify: `docs/CONVENTIONS.md`

**Interfaces:**

- Consumes: tidak ada.
- Produces: tidak ada kode. Menghasilkan catatan urutan yang dipakai seluruh tugas berikutnya.

- [ ] **Step 1: Tulis paragraf urutan kerja di `PLAN.md`**

Sisipkan sesudah tabel ringkasan kemajuan, sebelum bagian Fase 0: satu paragraf yang menyatakan bahwa potongan vertikal Fase 5 (S1 Dasbor, S4 Laporan, S5 Stok) dikerjakan lebih dulu atas persetujuan pemilik proyek, sedangkan Fase 3 dan Fase 4 menyusul, dengan alasan supaya ada satu alur yang berfungsi penuh dan bisa didemokan lebih dulu. Sebutkan berkas rencana `docs/plans/2026-10-17-potongan-vertikal-1.md`.

- [ ] **Step 2: Perbarui baris Fokus berikutnya pada `PLAN.md`**

Ganti menjadi: `Fokus berikutnya: T5.1.`

- [ ] **Step 3: Selaraskan aturan penamaan berkas komponen di `docs/CONVENTIONS.md`**

Pada bagian 6, ubah baris `Berkas komponen` dari `PascalCase` beserta contoh `StockAlertList.tsx` menjadi `kebab-case` beserta contoh `stock-alert-list.tsx`, dan tambahkan satu catatan: nama komponen di dalam berkas tetap PascalCase, sedangkan nama berkas memakai kebab-case karena sebelas berkas komponen yang sudah ada memakainya, termasuk komponen bawaan `shadcn/ui`. Nama berkas sengaja disamakan supaya tidak ada dua gaya dalam satu folder.

- [ ] **Step 4: Jalankan pemeriksaan teks**

Run: `npm run lint:ui`
Expected: `Tidak ada pelanggaran`

- [ ] **Step 5: Commit**

```bash
git add PLAN.md docs/CONVENTIONS.md docs/plans/2026-10-17-potongan-vertikal-1.md
git commit -m "docs(rencana): catat urutan potongan vertikal dan selaraskan penamaan komponen"
```

---

## Task 2: Modul pemformatan

**Files:**

- Create: `src/lib/format/number.ts`, `src/lib/format/currency.ts`, `src/lib/format/date.ts`
- Test: `src/lib/format/number.test.ts`, `src/lib/format/currency.test.ts`, `src/lib/format/date.test.ts`

**Interfaces:**

- Consumes: `JAKARTA_OFFSET_MS` dari `src/lib/data/period.ts`.
- Produces:
  - `formatNumber(value: number): string` menghasilkan `1.250`.
  - `formatDecimal(value: number, digits?: number): string` menghasilkan `12,5`.
  - `formatPercent(value: number, digits?: number): string` menghasilkan `12,5 persen`.
  - `formatRupiah(amount: number): string` menghasilkan `Rp150.000`.
  - `formatDate(at: Date): string` menghasilkan `17 Oktober 2026`.
  - `formatDateWithDay(at: Date): string` menghasilkan `Sabtu, 17 Oktober 2026`.
  - `formatTime(at: Date): string` menghasilkan `14.30`.
  - `formatDateTime(at: Date): string` menghasilkan `17 Oktober 2026, 14.30`.
  - `formatDateRange(from: Date, to: Date): string` menghasilkan `12 sampai 18 Oktober 2026`, dan bentuk lain bila bulan atau tahunnya berbeda.

- [ ] **Step 1: Tulis pengujian angka yang gagal**

`src/lib/format/number.test.ts`, dengan `describe("format angka")`:

- `formatNumber(0)` sama dengan `"0"`; `formatNumber(1250)` sama dengan `"1.250"`; `formatNumber(1250000)` sama dengan `"1.250.000"`; `formatNumber(-1250)` sama dengan `"1.250"` beserta uji terpisah bahwa arah ditulis dengan kata, bukan tanda.
- `formatDecimal(12.5)` sama dengan `"12,5"`; `formatDecimal(12.55, 1)` sama dengan `"12,6"`; `formatDecimal(12, 0)` sama dengan `"12"`.
- `formatPercent(12.5)` sama dengan `"12,5 persen"`; `formatPercent(0.4, 1)` sama dengan `"0,4 persen"`.
- Tidak ada hasil yang memuat karakter `-`. Periksa dengan `expect(result).not.toContain("-")` pada setiap hasil di atas.

- [ ] **Step 2: Jalankan pengujian, pastikan gagal**

Run: `npx vitest run src/lib/format/number.test.ts`
Expected: FAIL, `Failed to resolve import "./number"`.

- [ ] **Step 3: Implementasikan `src/lib/format/number.ts`**

Pemisah ribuan dan desimal disusun sendiri dari `Intl.NumberFormat("id-ID", { maximumFractionDigits: digits })`, lalu titik dan koma dipastikan sesuai `docs/CONVENTIONS.md` bagian 2.3. Gunakan `Math.abs` dan jelaskan di komentar bahwa arah nilai dinyatakan dengan kata oleh pemanggil, karena tanda minus dilarang tampil di antarmuka.

- [ ] **Step 4: Tulis pengujian rupiah yang gagal**

`src/lib/format/currency.test.ts`:

- `formatRupiah(150000)` sama dengan `"Rp150.000"`.
- `formatRupiah(0)` sama dengan `"Rp0"`.
- `formatRupiah(1250000)` sama dengan `"Rp1.250.000"`.
- `formatRupiah(-20000)` sama dengan `"Rp20.000"`, membuktikan arah tidak pernah ditulis dengan tanda minus.
- `formatRupiah(150000.4)` sama dengan `"Rp150.000"`, karena uang disimpan sebagai bilangan bulat rupiah.

- [ ] **Step 5: Jalankan, pastikan gagal, lalu implementasikan `src/lib/format/currency.ts`**

`formatRupiah` menyusun `"Rp"` diikuti `formatNumber` dari nilai mutlak, tanpa spasi, sesuai contoh di `docs/CONVENTIONS.md` bagian 2.3.

- [ ] **Step 6: Tulis pengujian tanggal yang gagal**

`src/lib/format/date.test.ts`, memakai waktu UTC supaya terbukti tidak bergantung zona waktu mesin. Titik uji: `2026-10-17T02:00:00.000Z` adalah pukul 09.00 WIB hari Sabtu.

- `formatDate(waktu)` sama dengan `"17 Oktober 2026"`.
- `formatDateWithDay(waktu)` sama dengan `"Sabtu, 17 Oktober 2026"`.
- `formatTime(waktu)` sama dengan `"09.00"`.
- `formatTime` pada `2026-10-17T16:59:00.000Z` sama dengan `"23.59"`.
- `formatTime` pada `2026-10-17T17:00:00.000Z` sama dengan `"00.00"`, sedangkan `formatDate` pada waktu itu sama dengan `"18 Oktober 2026"`, membuktikan pergeseran WIB.
- `formatDateTime(waktu)` sama dengan `"17 Oktober 2026, 09.00"`.
- `formatDateRange(12 Oktober 2026, 18 Oktober 2026)` sama dengan `"12 sampai 18 Oktober 2026"`.
- `formatDateRange(29 September 2026, 5 Oktober 2026)` sama dengan `"29 September sampai 5 Oktober 2026"`.
- `formatDateRange(29 Desember 2025, 4 Januari 2026)` sama dengan `"29 Desember 2025 sampai 4 Januari 2026"`.
- Tidak ada hasil yang memuat karakter `-`.

- [ ] **Step 7: Jalankan, pastikan gagal, lalu implementasikan `src/lib/format/date.ts`**

Seluruh perhitungan memakai `getUTC*` setelah waktu digeser `JAKARTA_OFFSET_MS`, sehingga hasilnya sama di mesin mana pun. Nama hari dan bulan disimpan sebagai daftar tetap berbahasa Indonesia di berkas ini.

- [ ] **Step 8: Jalankan seluruh pengujian modul ini**

Run: `npx vitest run src/lib/format`
Expected: seluruh pengujian lulus.

- [ ] **Step 9: Commit**

```bash
git add src/lib/format
git commit -m "feat(format): tambah pemformatan rupiah, angka, dan tanggal Indonesia"
```

---

## Task 3: Label teks untuk nilai basis data

**Files:**

- Create: `src/lib/ui-copy/labels.ts`
- Test: `src/lib/ui-copy/labels.test.ts`

**Interfaces:**

- Consumes: tipe enum dari `src/lib/db/schema.ts`.
- Produces: `transactionKindLabel`, `transactionSourceLabel`, `orderStatusLabel`, `paymentStatusLabel`, `stockMovementKindLabel`, `stockAlertStatusLabel`, `approvalStatusLabel`. Semuanya menerima nilai enum dan mengembalikan teks Indonesia.

- [ ] **Step 1: Tulis pengujian label yang gagal**

`src/lib/ui-copy/labels.test.ts`:

- Setiap label yang dihasilkan sama dengan teks yang ditetapkan: `sale` menjadi `Penjualan`, `expense` menjadi `Pengeluaran`, `debt` menjadi `Hutang`, `masuk` menjadi `Masuk`, `keluar` menjadi `Keluar`, `penyesuaian` menjadi `Penyesuaian`, `baru` menjadi `Baru`, `dikonfirmasi` menjadi `Dikonfirmasi`, `selesai` menjadi `Selesai`, `menunggu` menjadi `Menunggu`, `cocok` menjadi `Cocok`, `tidak_cocok` menjadi `Tidak cocok`, `aktif` menjadi `Aktif`, `ditolak` menjadi `Ditolak`, `disetujui` menjadi `Disetujui`.
- Tidak ada label yang memuat karakter `-`.

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run src/lib/ui-copy/labels.test.ts`
Expected: FAIL, modul belum ada.

- [ ] **Step 3: Implementasikan `src/lib/ui-copy/labels.ts`**

Setiap fungsi memakai objek tetap dari nilai enum ke teks Indonesia, dengan tipe hasil `Record<EnumValue, string>` supaya nilai enum yang baru langsung menjadi galat tipe bila labelnya belum ditambahkan.

- [ ] **Step 4: Jalankan pengujian dan pemeriksaan teks**

Run: `npx vitest run src/lib/ui-copy/labels.test.ts` lalu `npm run lint:ui`
Expected: lulus, dan `Tidak ada pelanggaran` pada 48 berkas atau lebih.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ui-copy/labels.ts src/lib/ui-copy/labels.test.ts
git commit -m "feat(ui-copy): tambah label Indonesia untuk nilai enum basis data"
```

---

## Task 4: Keadaan bersama dan jembatan data halaman

**Files:**

- Create: `src/components/shell/section-card.tsx`, `src/components/shell/skeleton.tsx`, `src/components/shell/error-state.tsx`, `src/components/shell/card-error.tsx`, `src/lib/data/server.ts`
- Test: `src/lib/data/server.test.ts`
- Modify: `docs/ARCHITECTURE.md` (tabel pohon bagian 3, tambah `server.ts` dan `ui-copy/labels.ts`)

**Interfaces:**

- Consumes: `getDatabase()` dari `src/lib/db/client.ts`, `getCurrentBusiness()` dari `src/lib/data/business.ts`.
- Produces:
  - `withCurrentBusiness<T>(read: (db: Database, businessId: string) => Promise<T>, db?: Database): Promise<T | undefined>` menjawab `undefined` bila belum ada baris warung. Parameter kedua hanya untuk pengujian; halaman tidak pernah mengisinya.
  - `SectionCard({ title, description?, children })`.
  - `Skeleton({ className? })`.
  - `ErrorState({ title, description, onRetry })`, komponen klien dengan tombol `Coba lagi`.
  - `CardError`, pembatas galat dari `catchError` yang menerima prop `title`.

- [ ] **Step 1: Tulis pengujian jembatan data yang gagal**

`src/lib/data/server.test.ts` memakai `createTestDatabase()` dari `src/lib/db/testing.ts` dan menyuntikkan pegangan uji lewat parameter kedua, sehingga tidak ada keadaan global yang perlu diubah:

- `withCurrentBusiness((db, id) => listProducts(db, id), test.db)` menjawab daftar produk warung uji.
- Setelah `deleteAllBusinesses(test.db)`, panggilan yang sama menjawab `undefined`, bukan galat, sehingga halaman dapat menampilkan keadaan kosong.

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run src/lib/data/server.test.ts`
Expected: FAIL, modul belum ada.

- [ ] **Step 3: Implementasikan `src/lib/data/server.ts`**

`withCurrentBusiness` mengambil pegangan dari parameter kedua, dan memakai `getDatabase()` bila parameter itu kosong. Lalu mencari warung dengan `getCurrentBusiness()`, dan meneruskan pegangan beserta `businessId` ke pembaca yang diberikan. Komentar menjelaskan tiga hal: aplikasi demo ini satu warung, `src/components/` dilarang menyentuh `src/lib/db/` sehingga jembatan ini yang menyediakan pegangan, dan parameter pegangan hanya ada untuk pengujian.

- [ ] **Step 4: Jalankan pengujian, pastikan lulus**

Run: `npx vitest run src/lib/data/server.test.ts`
Expected: PASS.

- [ ] **Step 5: Buat komponen keadaan bersama**

`section-card.tsx` menyusun permukaan kartu dari token: `rounded-lg border border-border bg-card p-5 shadow-card`, judul `text-section-title font-semibold`, dan keterangan `text-caption text-muted-foreground`. `skeleton.tsx` menyusun `div` dengan `animate-pulse rounded-md bg-muted`. `error-state.tsx` memakai `"use client"`, ikon `TriangleAlert` dari `lucide-react`, kalimat sebab, dan `Button` bergaya sekunder bertuliskan `Coba lagi`. `card-error.tsx` memakai `"use client"` dan `catchError` dari `next/error`, meneruskan prop `title` ke `ErrorState`, dan menyediakan `retry` sebagai `onRetry`.

- [ ] **Step 6: Perbarui pohon direktori di `docs/ARCHITECTURE.md`**

Tambahkan `server.ts` pada daftar `src/lib/data/` dengan keterangan `Jembatan pegangan basis data untuk halaman`, dan `labels.ts` pada `src/lib/ui-copy/`. Tambahkan juga `db-seed.ts` dan `load-env.ts` pada `src/scripts/` yang belum tercatat.

- [ ] **Step 7: Jalankan pemeriksaan**

Run: `npm run typecheck` lalu `npm run build`
Expected: lulus, dan halaman masih memakai keadaan kosong lama.

- [ ] **Step 8: Commit**

```bash
git add src/lib/data/server.ts src/lib/data/server.test.ts src/lib/db/client.ts src/components/shell docs/ARCHITECTURE.md
git commit -m "feat(ui): tambah kartu bagian, kerangka muat, dan keadaan gagal"
```

---

## Task 5: Rapikan batas periode pada lapisan data

**Files:**

- Modify: `src/lib/data/transactions.ts`, `src/lib/data/orders.ts`
- Test: `src/lib/data/transactions.test.ts`, `src/lib/data/orders.test.ts`

**Interfaces:**

- Consumes: `Period` dari `src/lib/data/reports.ts`.
- Produces: `listTransactions` memakai batas setengah terbuka, `OrderFilter` bertambah `from?: Date` dan `to?: Date` yang menyaring `orders.createdAt`.

- [ ] **Step 1: Tulis pengujian batas periode yang gagal**

Tambahkan pada `src/lib/data/transactions.test.ts` sebuah uji: buat dua transaksi, satu tepat pada `from` dan satu tepat pada `to` dari satu periode dari `startOfDay` sampai `endOfDay`, lalu pastikan transaksi pada `from` ikut terdaftar dan transaksi pada `to` tidak. Uji kedua: jumlah `amount` seluruh transaksi yang terdaftar sama dengan `sales` dari `summarizePeriod` untuk periode yang sama.

Tambahkan pada `src/lib/data/orders.test.ts` sebuah uji: `listOrders` dengan `from` dan `to` hanya mengembalikan orderan yang `createdAt` nya berada di dalam rentang, dan orderan tepat pada batas atas tidak ikut.

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run src/lib/data/transactions.test.ts src/lib/data/orders.test.ts`
Expected: FAIL pada uji batas periode.

- [ ] **Step 3: Ubah `listTransactions` menjadi setengah terbuka**

Ganti `lte(transactions.occurredAt, filter.to)` menjadi `lt(...)`, dan perbarui komentar fungsi supaya menyebut batas setengah terbuka sesuai `src/lib/data/period.ts`. `from` tetap `gte`.

- [ ] **Step 4: Tambahkan penyaring rentang waktu pada `listOrders`**

Tambahkan `from` dan `to` pada `OrderFilter`, lalu susun syarat `gte(orders.createdAt, from)` dan `lt(orders.createdAt, to)`. Perbarui komentar fungsi.

- [ ] **Step 5: Jalankan pengujian, pastikan lulus**

Run: `npx vitest run src/lib/data`
Expected: seluruh pengujian lapisan data lulus, termasuk uji `seed.test.ts` dan `isolation.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/data/transactions.ts src/lib/data/orders.ts src/lib/data/transactions.test.ts src/lib/data/orders.test.ts
git commit -m "fix(data): samakan batas periode transaksi dan tambah rentang waktu orderan"
```

---

## Task 6: S1 Dasbor

**Files:**

- Modify: `src/app/page.tsx`
- Create: `src/components/dashboard/today-summary.tsx`, `src/components/dashboard/order-highlights.tsx`, `src/components/dashboard/stock-alert-preview.tsx`

**Interfaces:**

- Consumes: `withCurrentBusiness` (Task 4), `SectionCard`, `Skeleton`, `CardError` (Task 4), `formatRupiah` dan `formatDateWithDay` (Task 2), `stockMovementKindLabel` (Task 3), `summarizeDay`, `listTopProducts` dari `src/lib/data/reports.ts`, `listOrders` dari `src/lib/data/orders.ts`, `listStockAlerts` dan `listLowStockProducts` dari `src/lib/data/stock.ts` dan `src/lib/data/products.ts`.
- Produces: komponen presentasional yang menerima data lewat prop, misalnya `TodaySummary({ summary, now })`, sehingga `src/app/page.tsx` yang membaca data.

- [ ] **Step 1: Buat tiga komponen presentasional**

`today-summary.tsx` menampilkan tiga angka besar: `Penjualan hari ini`, `Pengeluaran hari ini`, dan `Laba hari ini`, memakai `text-metric` dengan `tabular-nums`. Bila laba negatif, tulis `Rugi` diikuti nilai mutlak laba, bukan tanda minus.

`order-highlights.tsx` menampilkan `Orderan hari ini` berisi jumlah orderan, lalu `Produk terlaris` berisi sampai lima baris nama produk, jumlah terjual beserta satuan, dan nilai penjualannya. Bila daftar kosong, tampilkan kalimat keadaan kosong `Belum ada orderan pada periode ini. Produk terlaris muncul setelah ada orderan pelanggan.`

`stock-alert-preview.tsx` menampilkan sampai tiga alert aktif berisi nama produk, stok sekarang, dan ambang minimum, memakai lencana `Stok menipis` dengan warna peringatan beserta ikon `TriangleAlert`. Bila tidak ada alert, tulis `Semua produk berada di atas ambang minimum.` Ditutup tautan `Buka halaman Stok` menuju `/stok`, yang pada potongan ini sudah berfungsi.

- [ ] **Step 2: Susun `src/app/page.tsx`**

Judul halaman tetap statis. Di bawahnya, tiga `SectionCard`, masing masing membungkus `CardError` lalu `Suspense` dengan kerangka muat, dan di dalamnya komponen async kecil yang memanggil `await connection()` dari `next/server`, lalu `withCurrentBusiness`. Bila `withCurrentBusiness` menjawab `undefined`, tampilkan `EmptyState` berisi `Belum ada data warung. Jalankan npm run db:seed untuk menyiapkan data demo.` Bagian tanggal hari ini dihitung setelah `connection()`, bukan sebelum, supaya tidak dianggap nilai acak saat prarender.

- [ ] **Step 3: Periksa di peramban**

Run: `npm run dev` pada satu jendela, lalu buka `http://localhost:3000`.
Expected: kartu `Penjualan hari ini`, `Pengeluaran hari ini`, dan `Laba hari ini` berisi angka dari data demo; `Produk terlaris` berisi Orderan; `Stok menipis` berisi dua produk dari seed, yaitu `Sarden Kaleng` dan `Biskuit Kaleng`. Dicatat apa adanya di laporan, termasuk bila ada yang tidak sesuai.

- [ ] **Step 4: Jalankan pemeriksaan lengkap**

Run: `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm run lint:ui`, `npm test`, `npm run build`
Expected: semuanya lulus.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/components/dashboard
git commit -m "feat(dasbor): tampilkan ringkasan hari ini, orderan, dan alert stok"
```

---

## Task 7: S5 Stok dan Produk

**Files:**

- Modify: `src/app/stok/page.tsx`
- Create: `src/components/stock/product-list.tsx`, `src/components/stock/stock-alert-list.tsx`

**Interfaces:**

- Consumes: `withCurrentBusiness`, `SectionCard`, `Skeleton`, `CardError`, `formatRupiah`, `formatNumber`, `listProducts`, `listLowStockProducts`, `listStockAlerts`.
- Produces: `ProductList({ products })`, `StockAlertList({ alerts, products })`.

- [ ] **Step 1: Buat `stock-alert-list.tsx`**

Menampilkan setiap alert aktif berisi nama produk, `Stok sekarang 4 kaleng`, `Ambang minimum 6 kaleng`, dan waktu alert muncul memakai `formatDateTime`. Bila kosong, `Tidak ada stok yang menipis. Semua produk berada di atas ambang minimum.`

- [ ] **Step 2: Buat `product-list.tsx`**

Menampilkan daftar produk berisi nama, satuan, harga jual, harga beli, stok, dan ambang minimum. Pada layar 768 piksel ke atas memakai tabel dengan kepala `text-caption` dan kolom angka rata kanan dengan `tabular-nums`; di bawahnya memakai daftar kartu, sesuai `DESIGN.md` bagian 6. Produk yang stoknya di bawah ambang diberi lencana `Stok menipis` berikon `TriangleAlert`, bukan hanya warna. Bila tidak ada produk, `Belum ada produk tercatat. Daftar harga dan sisa stok muncul setelah produk dicatat.`

- [ ] **Step 3: Susun `src/app/stok/page.tsx`**

Dua `SectionCard`, yaitu `Stok menipis` dan `Daftar produk`, masing masing dengan `CardError` dan `Suspense`. Data dibaca lewat `withCurrentBusiness`.

- [ ] **Step 4: Periksa di peramban**

Run: buka `http://localhost:3000/stok` pada jendela 393 piksel dan 1280 piksel.
Expected: 20 produk tampil, dua di antaranya berlencana `Stok menipis`; tidak ada gulir mendatar; harga tidak terpotong elipsis. Dicatat apa adanya.

- [ ] **Step 5: Jalankan pemeriksaan lengkap, lalu commit**

Run: `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm run lint:ui`, `npm test`, `npm run build`

```bash
git add src/app/stok/page.tsx src/components/stock
git commit -m "feat(stok): tampilkan daftar produk dan alert stok menipis"
```

---

## Task 8: S4 Laporan Keuangan

**Files:**

- Modify: `src/app/laporan/page.tsx`
- Create: `src/components/reports/period-summary.tsx`, `src/components/reports/transaction-list.tsx`, `src/components/reports/period-switcher.tsx`

**Interfaces:**

- Consumes: `withCurrentBusiness`, `formatRupiah`, `formatDate`, `formatDateRange`, `formatTime`, `formatNumber`, `transactionKindLabel`, `summarizeDay`, `summarizeWeek`, `listTransactions`, `startOfDay`, `endOfDay`, `startOfWeek`, `endOfWeek`.
- Produces: `PeriodSummary({ summary, label })`, `TransactionList({ transactions })`, `PeriodSwitcher({ mode, label, previousHref, nextHref })`.

- [ ] **Step 1: Buat `period-summary.tsx`**

Menampilkan `Penjualan`, `Pengeluaran`, `Laba`, dan `Jumlah transaksi`. Laba negatif ditulis `Rugi` diikuti nilai mutlaknya. Bila laba negatif, warna memakai `text-expense` beserta ikon `TrendingDown`; bila tidak, `text-profit` beserta ikon `TrendingUp`, sesuai aturan `DESIGN.md` bahwa status tidak boleh hanya dibedakan warna.

- [ ] **Step 2: Buat `transaction-list.tsx`**

Menampilkan rincian transaksi periode terpilih: waktu `formatTime`, keterangan, label jenis dari `transactionKindLabel`, dan nilai memakai `formatRupiah`. Bila kosong, `Belum ada transaksi pada periode ini. Ringkasan terisi setelah ada penjualan atau pengeluaran.`

- [ ] **Step 3: Buat `period-switcher.tsx`**

Dua tautan pilihan `Harian` dan `Mingguan` menuju `/laporan?periode=harian` dan `/laporan?periode=mingguan`, ditambah dua tautan `Hari sebelumnya` atau `Minggu sebelumnya` dan `Hari berikutnya` atau `Minggu berikutnya` yang menyertakan `tanggal` pada alamat, misalnya `/laporan?periode=harian&tanggal=2026-10-16`. Tautan masa depan tetap berfungsi dan menampilkan keadaan kosong. Sasaran sentuh tidak lebih kecil dari token sentuh.

- [ ] **Step 4: Susun `src/app/laporan/page.tsx`**

Membaca `searchParams` lewat prop `searchParams` bertipe `PageProps<"/laporan">`, dan menunggunya di dalam batas `Suspense`, mengikuti `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md` bagian Streaming uncached data. Nilai `periode` yang tidak dikenal dianggap `harian`. Nilai `tanggal` diurai dengan pola `YYYY-MM-DD`; bila tidak sah, dipakai waktu berjalan.

- [ ] **Step 5: Periksa di peramban**

Run: buka `http://localhost:3000/laporan`, lalu tekan `Mingguan` dan `Hari sebelumnya`.
Expected: ringkasan harian berisi angka dari data demo, ringkasan mingguan berisi angka yang lebih besar, rincian transaksi berisi waktu dan keterangan, dan alamat halaman berubah sesuai pilihan. Dicatat apa adanya.

- [ ] **Step 6: Jalankan pemeriksaan lengkap, lalu commit**

Run: `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm run lint:ui`, `npm test`, `npm run build`

```bash
git add src/app/laporan/page.tsx src/components/reports
git commit -m "feat(laporan): tambah laporan harian, mingguan, dan rincian transaksi"
```

---

## Task 9: Permukaan yang belum dibuka, uji peramban, dan penutup

**Files:**

- Modify: `src/app/percakapan/page.tsx`, `src/app/whatsapp/page.tsx`, `src/app/persetujuan/page.tsx`, `src/app/pengaturan/page.tsx`, `PLAN.md`, `docs/ARCHITECTURE.md`, `docs/CONVENTIONS.md`
- Create: `e2e/vertical.spec.ts`

**Interfaces:**

- Consumes: seluruh hasil tugas sebelumnya.
- Produces: tidak ada.

- [ ] **Step 1: Ganti isi empat halaman yang belum dibuka**

Setiap halaman memakai `EmptyState` tanpa aksi, dengan teks berikut, yang sudah disetujui pemilik proyek dan tidak menjanjikan apa pun:

| Halaman        | Judul                         | Keterangan                                                                                                                                                           |
| -------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/percakapan`  | `Halaman ini belum berfungsi` | `Percakapan dengan agen AI belum ditampilkan di sini. Data warung yang sudah tercatat bisa dibuka dari halaman Dasbor, Stok, dan Laporan.`                           |
| `/whatsapp`    | `Halaman ini belum berfungsi` | `Status kanal WhatsApp dan pesan pelanggan belum ditampilkan di sini. Data warung yang sudah tercatat bisa dibuka dari halaman Dasbor, Stok, dan Laporan.`           |
| `/persetujuan` | `Halaman ini belum berfungsi` | `Antrean persetujuan belum ditampilkan di sini. Data warung yang sudah tercatat bisa dibuka dari halaman Dasbor, Stok, dan Laporan.`                                 |
| `/pengaturan`  | `Halaman ini belum berfungsi` | `Keterangan koneksi nomor dan privasi data pelanggan belum ditampilkan di sini. Data warung yang sudah tercatat bisa dibuka dari halaman Dasbor, Stok, dan Laporan.` |

Judul `PageHeader` tiap halaman tetap seperti sekarang.

- [ ] **Step 2: Tulis `e2e/vertical.spec.ts`**

Uji pada kedua proyek lebar layar yang sudah ada di `playwright.config.ts`:

- Dasbor menampilkan `Penjualan hari ini` dan nilai yang diawali `Rp`, serta `Stok menipis` yang memuat `Sarden Kaleng`.
- Stok menampilkan `Beras` dan lencana `Stok menipis` paling sedikit dua kali.
- Laporan menampilkan `Penjualan`, `Pengeluaran`, dan `Laba`; setelah menekan `Mingguan`, alamat halaman memuat `periode=mingguan` dan ringkasannya tetap tampil.
- Navigasi dari Dasbor menuju Stok dan Laporan berhasil pada kedua lebar layar.
- Halaman `/persetujuan` menampilkan `Halaman ini belum berfungsi`.

- [ ] **Step 3: Jalankan uji peramban**

Run: `npm run db:migrate` lalu `npm run db:seed` lalu `npm run test:e2e`
Expected: seluruh uji lulus pada kedua proyek. Uji ini memerlukan basis data lokal yang sudah diisi data demo.

- [ ] **Step 4: Periksa keadaan kosong dan keadaan gagal**

Keadaan kosong: hentikan server, pindahkan folder `.pglite/kedeawak` ke nama lain, jalankan `npm run db:migrate`, jalankan `npm run dev`, buka tiga halaman, dan catat bahwa keadaan kosong tampil tanpa galat. Lalu kembalikan folder dan jalankan `npm run db:seed` kembali.

Keadaan gagal: hentikan server, ubah sementara nama tabel pada satu query di `src/lib/data/reports.ts`, jalankan `npm run dev`, buka Dasbor, dan catat bahwa kartu menampilkan `Coba lagi`. Lalu kembalikan perubahan itu dan pastikan `git status` bersih.

- [ ] **Step 5: Perbarui `PLAN.md`**

Tandai `[x]` pada T5.1, T5.2, T5.3, T5.4, T5.18, T5.19, T5.20, T5.21, T5.22, dan T5.24. Perbarui tabel ringkasan kemajuan pada Fase 5 sesuai jumlah itu, dan ganti baris `Fokus berikutnya` menjadi `Fokus berikutnya: T5.27.` T5.23, T5.25, dan T5.26 tetap `[ ]` beserta catatan singkat bahwa sisanya menunggu potongan berikutnya.

- [ ] **Step 6: Perbarui `docs/ARCHITECTURE.md` bagian 9**

Tambahkan satu paragraf: setiap kartu data di permukaan aplikasi dibungkus `Suspense` dengan kerangka muat dan `CardError` dari `catchError`, sesuai model Cache Components, dan halaman membaca data lewat `withCurrentBusiness` pada `src/lib/data/server.ts`.

- [ ] **Step 7: Jalankan pemeriksaan lengkap**

Run: `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm run lint:ui`, `npm test`, `npm run build`, `npm run test:e2e`
Expected: semuanya lulus. Hasil dicatat apa adanya, termasuk uji yang gagal bila ada.

- [ ] **Step 8: Commit dan push**

```bash
git add -A
git commit -m "feat(permukaan): buka halaman belum berfungsi, uji peramban, dan tutup potongan vertikal"
git push origin main
```

---

## Catatan untuk pelaksana

- `npm run db:seed` menghapus seluruh warung lebih dulu, jadi jalankan ulang sesudah uji peramban yang mengubah data.
- Pemeriksaan `lint:ui` tidak memindai berkas pengujian, tetapi memindai seluruh berkas di `src/`, termasuk modul format dan label baru.
- Bila muncul galat validasi prarender dari Next.js, bacanya: nilai waktu harus dibaca sesudah `await connection()` dan di dalam batas `Suspense`.
- Bila `catchError` belum tersedia pada versi Next.js yang terpasang, ganti dengan `error.tsx` tingkat rute dan catat perbedaannya di laporan.
