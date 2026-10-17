# Rancangan: Kasir, Kelola Produk, dan Persetujuan

Tanggal: 17 Oktober 2026
Status: disetujui 18 Oktober 2026; pengembangan dihentikan pada titik yang diminta pemilik
Berkas rencana turunan: docs/plans/2026-10-18-penyelesaian-web.md
Status implementasi: mengikuti PLAN.md, bukan daftar berkas rancangan ini

---

## 1. Maksud dan alasan

Kondisi awal sebelum implementasi sesi ini: Dasbor, Laporan, dan daftar Stok
sudah dapat dibaca; permukaan lain
masih halaman keterangan. Belum ada satu pun jalur
tulis di aplikasi ini, sehingga seluruh angka di Dasbor, Laporan, dan Stok hanya
berubah bila data demo disiapkan ulang lewat perintah di luar aplikasi.

Pemilik proyek ingin aplikasi benar benar dapat dipakai: menjual barang di
kasir, mengubah data produk, dan menyelesaikan alur alert stok sampai
persetujuan, sehingga datanya berubah karena transaksi dan suntingan pemilik,
bukan karena data demo. Halaman Agen AI dan Integrasi WhatsApp dikecualikan
untuk sekarang atas keputusan pemilik, dan penundaannya dicatat di `PLAN.md`.

## 2. Sasaran

1. **Kasir sebagai permukaan ketujuh.** Satu halaman tempat pemilik menekan
   produk, mengatur jumlah di keranjang, memilih jenis pembayaran, lalu
   menyimpan penjualan. Penjualan itu langsung mengubah stok dan muncul di
   Dasbor serta Laporan.
2. **Pesanan lewat suara di Kasir.** Tombol mikrofon mengubah ucapan pemilik
   menjadi baris keranjang.
3. **Stok dapat diubah.** Ubah produk, tambah produk, dan arsipkan produk.
   Penambahan dapat lewat suara atau ketikan ke asisten, dengan dialog tinjau
   sebelum data masuk ke daftar. Arsip juga memakai konfirmasi.
4. **Persetujuan berfungsi.** Antrean aksi menunggu dapat disetujui atau
   ditolak, dan menyetujui draft pesanan pembelian menambah stok produk terkait.
5. **Jenis pembayaran terlacak.** Setiap penjualan mencatat uang masuk lewat
   tunai, transfer, atau QRIS, dan jumlahnya tersaji di Laporan.

## 3. Bukan sasaran

- Permukaan S2 Agen AI dan S3 Integrasi WhatsApp tetap halaman kosong yang
  jujur. Penundaan ini dicatat di `PLAN.md` agar dapat dilanjutkan nanti.
- Tidak ada pilihan hutang di Kasir, sesuai keputusan pemilik.
- Tidak ada cetak struk, pemindai barcode, pilihan pelanggan di Kasir, ubah
  harga per baris keranjang, tombol cepat produk terlaris, dan daftar riwayat
  transaksi di halaman Kasir. Semuanya ditawarkan dan tidak dipilih pemilik.
- Tidak ada pengiriman draft pesanan pembelian ke pemasok. Draft hanya
  tersimpan di aplikasi.
- Tidak ada ekspor, mode gelap, multi bahasa, pencarian global, atau
  pengaturan peran, sesuai `docs/SCOPE.md` bagian 6.3.

## 4. Yang akan membuat pekerjaan ini gagal

- Ada angka di layar yang tidak berasal dari basis data.
- Ada tombol atau menu yang tampil tetapi tidak mengerjakan apa pun.
- Aplikasi seolah memakai AI padahal kuncinya tidak ada.
- Fitur di luar cakupan ikut masuk tanpa dicatat di `PLAN.md` dan
  `docs/SCOPE.md`.
- Stok berubah tanpa meninggalkan jejak pergerakan stok.

## 5. Batasan

- Aturan repo berlaku penuh: tanpa emoji, tanpa tanda hubung pada teks
  antarmuka, format angka Indonesia, tanpa teks contoh, satu lapisan data,
  Server Action untuk setiap perubahan data, stok hanya berubah lewat
  pergerakan stok.
- Perubahan skema hanya lewat migrasi `npm run db:generate` dan
  `npm run db:migrate`.
- Penafsiran bahasa alami memakai DeepSeek. Kunci `DEEPSEEK_API_KEY` sudah
  diisi pemilik di `.env.local`, dikonfirmasi 18 Oktober 2026. Implementasi
  suara dan asisten tetap memerlukan uji integrasi dan peramban. Bila kunci tidak ada saat dijalankan, aplikasi menyatakan
  asisten belum aktif dan tidak berpura pura bekerja.
- Pengenalan suara memakai Web Speech API peramban. Hanya tersedia di Chrome
  dan Edge, dan umumnya butuh jaringan. Karena itu jalur ketik selalu
  disediakan sebagai kanal masukan yang setara.
- Harga di keranjang mengikuti harga jual produk dan tidak dapat diketik bebas.
- Jumlah di keranjang tidak dapat melebihi stok tercatat. Saat stok habis,
  tombol tambah tidak aktif dan keterangan `Stok habis` tampil ketika tombol itu
  ditunjuk. Produk dengan stok nol tidak dapat ditekan sejak awal. Aturan
  `stock.ts` yang menolak stok negatif tetap berlaku, dan Server Action memeriksa
  ulang di sisi server sebelum menyimpan, karena pemeriksaan di peramban saja
  tidak cukup.

## 6. Keputusan pemilik proyek

| Hal                        | Keputusan                                                              |
| -------------------------- | ---------------------------------------------------------------------- |
| Kedudukan Kasir            | Permukaan ketujuh, dicatat sebagai S7 di `docs/SCOPE.md` bagian 2      |
| Urutan pekerjaan           | Kasir, lalu kelola produk di Stok, lalu Persetujuan                    |
| Jenis pembayaran           | Tunai, transfer, dan QRIS. Tidak ada hutang di Kasir                   |
| Pelacakan uang masuk       | Keterangan jenis pembayaran pada rincian laporan dan kartu ringkasan di halaman Laporan |
| Hapus produk               | Diarsipkan supaya riwayat tetap utuh                                   |
| Suara menjadi teks         | Web Speech API peramban                                                |
| Penafsir bahasa alami      | Hanya DeepSeek. Tidak ada penafsir cadangan lokal                      |
| Konfirmasi hasil asisten   | Dialog tinjau di halaman Stok sebelum data disimpan                    |
| Isi tambahan halaman Kasir | Kolom pencarian produk dan pengaturan jumlah di dalam keranjang        |

## 7. Keputusan yang saya ambil

Semuanya dapat dibatalkan pemilik tanpa mengubah bentuk besar rancangan ini.

1. **Jenis pembayaran disimpan sebagai kolom baru pada `transactions`.** Tabel
   `payments` tetap khusus bukti pembayaran dari kanal WhatsApp. Alasannya,
   `transactions` tidak punya kunci ke `orders`, sehingga keterangan jenis
   pembayaran pada baris rincian laporan hanya dapat diambil dari tabel itu.
   Kolomnya boleh kosong, dan baris lama tanpa keterangan ditulis
   `Belum ada keterangan`.
2. **Kasir menyimpan satu rangkaian dalam satu transaksi basis data:** orderan
   berstatus selesai, itemnya, satu transaksi penjualan bersumber `app`, dan
   satu pergerakan stok keluar untuk setiap item. Tidak ada bukti pembayaran,
   karena bukti adalah urusan kanal.
3. **Ringkasan uang masuk dihitung dari transaksi penjualan** yang jenis
   pembayarannya terisi, bukan dari tabel bukti pembayaran.
4. **Data demo diberi jenis pembayaran** pada transaksi penjualannya supaya
   kartu ringkasan di Laporan berisi angka sejak awal. Nilainya tetap
   deterministik mengikuti `SEED`.
5. **Satu produk demo ditambahkan dalam keadaan terarsip**, supaya bagian
   produk arsip di halaman Stok terlihat dan dapat diuji. Jumlah produk aktif
   tetap dua puluh.
6. **Produk terarsip tetap dapat dibuka dan diaktifkan kembali** pada bagian
   tersendiri di halaman Stok, supaya tidak ada jalan buntu bila salah tekan.
7. **Komponen `dialog` dan `input` ditambahkan** ke `src/components/ui/` dengan
   gaya yang sama seperti komponen dasar lain. Pemilih jenis pembayaran memakai
   deretan tombol, bukan radio, mengikuti pola pemilih periode yang sudah ada.
8. **Pada layar sempit, keranjang berada di bawah daftar produk**, bukan pada
   batang menempel di bawah layar, supaya tidak bertabrakan dengan navigasi
   bawah. Pada layar lebar, keranjang menempel di kolom kanan.
9. **Urutan status orderan Kasir adalah `selesai`**, karena penjualan di kasir
   terjadi seketika.
10. **Seluruh perubahan data lewat Server Action** di `src/lib/actions/`, yang
    memanggil lapisan data lalu memperbarui tampilan. Komponen tidak pernah
    menyentuh basis data, sesuai `docs/CONVENTIONS.md` bagian 4.
11. **Panggilan model lewat antarmuka penyedia** di `src/lib/ai/provider.ts`,
    sesuai `docs/ARCHITECTURE.md` bagian 5. Ini sekaligus mengerjakan T4.1 pada
    `PLAN.md` lebih awal dari urutan fase. Penerapannya tetap hanya DeepSeek,
    sesuai keputusan pemilik, dan pengujian unit menyuntikkan penyedia tiruan
    supaya tidak bergantung pada kunci maupun jaringan. Bila kunci tidak ada,
    hasilnya adalah keadaan `asisten belum aktif` yang ditulis terus terang,
    bukan tafsiran palsu.
12. **Produk terarsip disembunyikan menyeluruh:** tidak tampil di Kasir, tidak
    tampil di daftar produk aktif, tidak tampil pada alert stok menipis di Stok
    maupun pada ringkasan alert di Dasbor, dan tidak ikut dicocokkan saat
    pencarian nama produk. Indeks unik nama diubah menjadi indeks unik parsial
    khusus baris yang belum diarsipkan, supaya nama produk terarsip dapat
    dipakai lagi oleh produk baru.
13. **Alert hanya ditutup bila `reconcileStockAlert` menyatakan stok sudah
    mencapai ambang minimum.** Menyetujui draft pesanan yang jumlahnya belum
    cukup meninggalkan alert tetap aktif, karena keadaan sebenarnya memang
    demikian.
14. **Halaman Persetujuan memuat dua bagian:** antrean yang menunggu dan jejak
    aksi yang sudah diputuskan. Bagian kedua memenuhi T5.30 pada `PLAN.md`,
    sehingga keputusan yang sudah diambil tidak hilang tanpa jejak.
15. **Draft pesanan dari alert memakai aturan tetap yang berasal dari data.**
    Nama pemasok diambil dari pesanan pembelian terakhir yang pernah dibuat,
    dan bila belum ada sama sekali dipakai `Pemasok belum ditentukan`. Jumlah
    usulan adalah jumlah yang membawa stok kembali ke dua kali ambang minimum,
    paling sedikit sebesar ambang minimum itu sendiri, sehingga tidak ada angka
    yang dipaku di komponen.
16. **Penguncian konteks sesi ditunda bersama permukaan S2.** Membuat draft dari
    halaman Stok tidak melibatkan percakapan, sedangkan `startSession`
    mewajibkan percakapan. Penguncian itu adalah T4.7 pada `PLAN.md`, dan
    tanda statusnya tetap terbuka supaya tidak dianggap selesai. T5.31 dan
    T5.32 adalah tugas halaman pengaturan, terpisah dari hal ini.
17. **Uji ujung ke ujung menyiapkan ulang data demo di awal setiap kali
    dijalankan**, dan uji yang mengubah data memeriksa selisih sebelum dan
    sesudah, bukan angka mutlak. Alasannya, uji lama mengunci jumlah produk dan
    jumlah lencana alert, sedangkan uji baru justru mengubah keduanya.

## 8. Perubahan skema dan data

| Perubahan                                 | Alasan                                                                  |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| Enum baru `payment_method`                  | Nilai `tunai`, `transfer`, `qris`                                       |
| Kolom `transactions.method`                 | Jenis pembayaran penjualan, boleh kosong                                |
| Kolom `products.archived_at`                | Arsip produk tanpa menghapus barisnya                                   |
| Indeks `products_business_active_idx`       | Menyaring produk aktif pada Kasir dan daftar produk                     |
| Indeks unik nama menjadi parsial            | Hanya berlaku untuk produk yang belum diarsipkan, supaya nama dapat dipakai lagi |
| `src/lib/db/seed.ts`                        | Jenis pembayaran pada transaksi penjualan demo, satu produk terarsip    |
| `src/lib/ui-copy/labels.ts`                 | Label Indonesia untuk jenis pembayaran                                  |

Nilai enum memakai bahasa Indonesia, mengikuti kebiasaan `src/lib/db/schema.ts`.
Nama kolom dan tabel tetap bahasa Inggris.

## 9. Berkas yang ditambah dan diubah

```text
src/lib/db/schema.ts                     ubah   enum, kolom, indeks
src/lib/db/seed.ts                       ubah   jenis pembayaran, produk terarsip
src/lib/ui-copy/labels.ts                ubah   label jenis pembayaran
src/lib/data/sales.ts                    baru   simpan penjualan kasir, ringkasan metode
src/lib/data/sales.test.ts               baru   pengujian lapisan data
src/lib/data/products.ts                 ubah   arsip, aktifkan kembali, saring aktif
src/lib/data/products.test.ts            ubah   pengujian arsip
src/lib/data/reports.ts                  ubah   ringkasan uang masuk per jenis pembayaran
src/lib/data/reports.test.ts             ubah   pengujian ringkasan
src/lib/ai/provider.ts                   baru   antarmuka penyedia model dan penerapan DeepSeek
src/lib/ai/transcript.ts                 baru   penafsir pesanan dan produk
src/lib/ai/transcript.test.ts            baru   pengujian penafsir dengan penyedia tiruan
src/lib/actions/penjualan.ts             baru   Server Action Kasir
src/lib/actions/produk.ts                baru   Server Action kelola produk
src/lib/actions/persetujuan.ts           baru   Server Action setujui dan tolak
src/lib/actions/validation.ts            baru   pembacaan dan pemeriksaan masukan formulir
src/lib/actions/validation.test.ts       baru   pengujian pemeriksaan masukan
src/components/ui/dialog.tsx             baru   dialog dasar
src/components/ui/input.tsx              baru   kolom masukan dasar
src/components/ui/tooltip.tsx            baru   keterangan saat tombol ditunjuk
src/components/kasir/product-picker.tsx  baru   daftar produk yang dapat ditekan
src/components/kasir/cart-panel.tsx      baru   keranjang dan penyimpanan penjualan
src/components/kasir/voice-order.tsx     baru   tombol mikrofon dan kolom ketik
src/components/stock/product-form.tsx    baru   formulir ubah dan tambah produk
src/components/stock/product-actions.tsx baru   tombol ubah, arsipkan, aktifkan kembali
src/components/stock/assistant-product.tsx baru hasil asisten dan dialog tinjau
src/components/stock/archived-products.tsx baru bagian produk arsip
src/components/approvals/approval-list.tsx baru antrean aksi menunggu
src/components/approvals/approval-history.tsx baru jejak aksi yang sudah diputuskan
src/components/reports/payment-method-summary.tsx baru kartu uang masuk per jenis pembayaran
src/app/kasir/page.tsx                   baru   halaman Kasir
src/app/stok/page.tsx                    ubah   tombol tambah, ubah, arsip
src/app/laporan/page.tsx                 ubah   kartu jenis pembayaran
src/app/persetujuan/page.tsx             ubah   antrean persetujuan
src/components/shell/nav-items.ts        ubah   tujuan Kasir
e2e/kasir.spec.ts                        baru   uji alur Kasir di dua lebar layar
e2e/kelola-produk.spec.ts                baru   uji kelola produk
```

## 10. Alur

### 10.1 Kasir menyimpan penjualan

1. Pemilik membuka Kasir. Daftar produk aktif tampil beserta harga, sisa stok,
   dan lencana stok menipis. Kolom pencarian menyaring daftar itu di peramban.
2. Menekan produk menambahkan satu ke keranjang. Menekan produk yang sama lagi
   menambah jumlahnya, tetapi tidak pernah melebihi stok tercatat. Saat jumlah
   sudah sama dengan stok, tombol tambah tidak aktif dan keterangan `Stok habis`
   tampil ketika tombol itu ditunjuk. Jumlah dapat diubah dan baris dapat
   dibuang.
3. Pemilik memilih jenis pembayaran. Untuk tunai, pemilik mengisi uang diterima
   dan aplikasi menghitung kembalian. Untuk transfer dan QRIS, pembayaran
   dianggap pas.
4. Tombol simpan mengirim keranjang ke Server Action. Lapisan data menulis
   orderan, item, transaksi penjualan, dan pergerakan stok dalam satu transaksi
   basis data, lalu halaman Kasir, Stok, Dasbor, dan Laporan diperbarui.
5. Setelah berhasil, keranjang dikosongkan dan muncul keterangan singkat berisi
   nomor orderan dan nilai yang tersimpan. Bila jumlah di keranjang melebihi
   stok karena data berubah di saat yang sama, Server Action menolak
   penyimpanan dan menampilkan alasan yang jelas, sehingga stok tidak pernah
   tercatat negatif.

### 10.2 Pesanan lewat suara di Kasir

1. Pemilik menekan tombol mikrofon dan menyebut pesanan, misalnya
   `dua beras pandan wangi dan satu gula pasir`.
2. Peramban mengubah ucapan menjadi teks lewat Web Speech API. Antarmuka ini
   adalah T4.2 pada `PLAN.md` dan dikerjakan lebih awal bersama tahap ini.
3. Teks dikirim ke Server Action, diteruskan ke DeepSeek bersama daftar produk
   aktif, dan dikembalikan sebagai usulan baris keranjang berisi nama produk
   dan jumlah.
4. Usulan itu digabungkan ke keranjang, lalu pemilik melihat apa yang dipahami,
   termasuk baris yang tidak dikenali. Baris yang tidak dikenali tidak
   ditambahkan, dan alasannya ditulis apa adanya.
5. Bila peramban tidak mendukung pengenalan suara, tombol mikrofon tidak
   tampil dan kolom ketik dipakai. Keduanya mengirim teks ke jalur yang sama.

### 10.3 Menambah produk lewat asisten

1. Di halaman Stok, pemilik menekan `Tambah produk`, lalu memilih memasukkan
   sendiri atau lewat asisten.
2. Lewat asisten, pemilik menyebut atau mengetik, misalnya
   `tambah sabun cuci satu botol, harga jual delapan ribu, harga beli enam ribu,
   stok awal dua belas, ambang minimum tiga`.
3. DeepSeek mengubahnya menjadi usulan data produk: nama, satuan, harga jual,
   harga beli, stok awal, dan ambang minimum.
4. Usulan itu tampil pada dialog tinjau sebagai formulir yang dapat diperbaiki.
   Tidak ada data yang tersimpan sebelum pemilik menekan `Simpan produk`.
5. Saat disimpan, produk dibuat dan stok awalnya dicatat sebagai pergerakan stok
   masuk dengan alasan `Stok awal`.

### 10.4 Mengubah produk dan menyesuaikan stok

1. Setiap baris produk memiliki tombol `Ubah` dan `Arsipkan`.
2. Formulir ubah memuat nama, satuan, harga jual, harga beli, stok, dan ambang
   minimum.
3. Bila kolom stok berubah, kolom alasan wajib diisi dan perubahannya dicatat
   sebagai pergerakan stok `penyesuaian`. Nilai stok di kolom itu hanya dapat
   berubah lewat pergerakan tersebut.
4. Bila nama diubah menjadi nama yang sudah dipakai produk lain, penyimpanan
   ditolak dengan keterangan yang jelas.
5. Mengubah ambang minimum langsung memperbarui daftar alert stok menipis.

### 10.5 Mengarsipkan produk

1. Tombol `Arsipkan` membuka dialog konfirmasi berisi akibatnya: produk tidak
   lagi muncul di Kasir dan daftar produk, dan riwayat transaksinya tetap utuh.
2. Setelah diarsipkan, produk pindah ke bagian `Produk arsip` yang tertutup,
   beserta tombol `Aktifkan kembali` dan nama pengguna yang tidak dipakai.

### 10.6 Menyetujui draft pesanan pembelian

1. Alert stok menipis di halaman Stok memiliki tombol `Buat draft pesanan`.
   Menekannya membuat draft pesanan pembelian berisi produk dan jumlah usulan,
   lalu draft itu masuk antrean Persetujuan. Tombol ini yang nanti dipanggil
   agen pada permukaan S2.
2. Antrean Persetujuan menampilkan ringkasan aksi, nama pemasok, daftar produk,
   jumlah, dan perkiraan nilai, beserta tombol `Setujui` dan `Tolak`.
3. Menyetujui menandai keputusan itu lalu menambah stok setiap produk pada
   draft. Alert yang bersangkutan hanya tertutup bila stoknya sudah mencapai
   ambang minimum, sesuai `reconcileStockAlert`. Menolak hanya menandai
   keputusan itu tanpa mengubah stok.
4. Aksi yang sudah diputuskan tetap terlihat pada bagian jejak di halaman yang
   sama, supaya tidak hilang tanpa keterangan.
5. Selama aksi masih menunggu, konteks sesi terkunci, sesuai aturan pada
   `docs/SCOPE.md` bagian 3.6. Penguncian itu menyusul bersama permukaan S2,
   karena halaman Stok tidak memiliki percakapan yang dapat dikunci.

## 11. Naskah antarmuka

Seluruh teks berikut sudah mematuhi larangan emoji dan tanda hubung pada
`AGENTS.md` bagian 3.

**Halaman Kasir**

| Tempat            | Teks                                                                 |
| ----------------- | -------------------------------------------------------------------- |
| Judul halaman     | `Kasir`                                                              |
| Keterangan        | `Catat penjualan warung, lalu stok dan laporan ikut berubah.`        |
| Kolom cari        | `Cari produk`                                                        |
| Judul keranjang   | `Keranjang`                                                          |
| Keranjang kosong  | `Belum ada produk di keranjang` dan `Tekan produk untuk menambahkannya.` |
| Jenis pembayaran  | `Jenis pembayaran` dengan pilihan `Tunai`, `Transfer`, `QRIS`         |
| Tunai             | `Uang diterima` dan `Kembalian`                                      |
| Tombol simpan     | `Simpan penjualan`                                                   |
| Stok habis        | `Stok habis` pada tombol tambah yang tidak aktif, dan `Stok tersisa 2` pada kartu produk |
| Sisa stok berubah | `Stok pada keranjang sudah berubah. Sisa 1, jumlah di keranjang 3.`   |
| Suara             | `Pesan lewat suara`, `Tekan mikrofon lalu sebutkan pesanan.`          |
| Suara tidak ada   | `Peramban ini belum mendukung perintah suara. Tulis pesanan pada kolom di bawah.` |
| Kolom ketik       | `Tulis atau tempel pesanan`                                          |

**Halaman Stok**

| Tempat             | Teks                                                                |
| ------------------ | ------------------------------------------------------------------- |
| Tombol tambah      | `Tambah produk`                                                     |
| Pilihan cara       | `Isi sendiri` dan `Tambah lewat asisten`                            |
| Judul dialog tinjau| `Periksa data produk`                                               |
| Tombol simpan      | `Simpan produk`                                                     |
| Formulir ubah      | `Ubah produk` dengan kolom `Nama produk`, `Satuan`, `Harga jual`, `Harga beli`, `Stok`, `Ambang minimum`, `Alasan perubahan stok` |
| Konfirmasi arsip   | `Arsipkan produk ini` dengan keterangan `Produk tidak lagi muncul di Kasir dan daftar produk. Riwayat transaksinya tetap utuh.` |
| Bagian arsip       | `Produk arsip` dan tombol `Aktifkan kembali`                        |
| Draft dari alert   | `Buat draft pesanan`                                                |

**Halaman Persetujuan**

| Tempat            | Teks                                                                    |
| ----------------- | ----------------------------------------------------------------------- |
| Judul halaman     | `Persetujuan`                                                           |
| Keterangan        | `Aksi agen yang menunggu persetujuan Anda sebelum dijalankan.`          |
| Aksi kosong       | `Tidak ada aksi yang menunggu persetujuan`                              |
| Tombol keputusan  | `Setujui` dan `Tolak`                                                   |
| Setelah disetujui | `Draft pesanan disetujui dan stok produk terkait sudah ditambah.`       |

**Halaman Laporan**

| Tempat            | Teks                                                          |
| ----------------- | ------------------------------------------------------------- |
| Kartu baru        | `Uang masuk per jenis pembayaran`                             |
| Baris kartu       | `Tunai`, `Transfer`, `QRIS`, `Jumlah uang masuk`              |
| Baris tanpa data  | `Belum ada data`                                              |
| Rincian transaksi | Keterangan jenis pembayaran pada setiap baris penjualan       |

## 12. Pengujian

- **Unit, lapisan data.** Penjualan kasir menulis orderan, item, transaksi, dan
  pergerakan stok; stok berkurang tepat sebesar jumlah yang dijual; penjualan
  yang jumlahnya melebihi stok ditolak dengan alasan yang jelas; ringkasan uang
  masuk per jenis pembayaran menghitung periode setengah terbuka dengan benar;
  arsip produk menyembunyikan produk dari daftar aktif tanpa menghapus
  barisnya; mengaktifkan kembali memulihkannya.
- **Unit, pemeriksaan masukan.** Harga dan jumlah negatif ditolak; nama kosong
  ditolak; alasan wajib ada saat stok berubah.
- **Unit, penafsir.** Teks contoh diubah menjadi usulan baris keranjang yang
  benar, nama produk yang tidak ada di daftar diabaikan dengan keterangan.
- **Ujung ke ujung.** Di dua lebar layar, 393 dan 1280 piksel: menambah dua
  produk ke keranjang, memastikan tombol tambah tidak aktif dan berketerangan
  `Stok habis` saat jumlah menyentuh stok, menyimpan penjualan tunai, lalu
  memastikan stok produk berkurang di halaman Stok dan penjualan muncul di
  Laporan; menambah produk lewat formulir biasa; mengubah stok dengan alasan;
  mengarsipkan lalu mengaktifkan kembali sebuah produk; menyetujui draft
  pesanan pada halaman Persetujuan lalu memastikan stok bertambah.
- **Penyiapan data uji.** Perintah uji ujung ke ujung menyiapkan ulang data demo
  lebih dulu, dan uji yang mengubah data memeriksa selisih sebelum dan sesudah
  alih alih angka mutlak. Uji lama pada `e2e/vertical.spec.ts` yang mengunci
  jumlah produk dan jumlah lencana alert disesuaikan supaya tetap sahih
  terhadap keadaan yang berubah, bukan dihapus.
- **Yang tidak dapat diuji otomatis.** Pengenalan suara dan penafsiran DeepSeek
  bergantung pada kunci dan pada dukungan peramban. Keduanya diuji manual dan
  hasilnya dilaporkan apa adanya, termasuk bila belum dapat diuji.

## 13. Urutan pengerjaan

Tiga tahap, masing masing punya rencana dan commit sendiri.

1. **Tahap A, Kasir.** Skema jenis pembayaran, lapisan data penjualan, Server
   Action, halaman Kasir, kartu jenis pembayaran di Laporan, lalu suara dan
   penafsir DeepSeek.
2. **Tahap B, Kelola produk.** Arsip produk, formulir ubah, penyesuaian stok
   dengan alasan, tambah produk manual, tambah produk lewat asisten dengan
   dialog tinjau, bagian produk arsip.
3. **Tahap C, Persetujuan.** Antrean, tombol setujui dan tolak, tombol buat
   draft dari alert, penutupan alert setelah disetujui.

Setiap tahap diakhiri pemeriksaan penuh: `typecheck`, `lint`, `lint:ui`, `test`,
`build`, `test:e2e`, lalu commit dan push.

## 14. Perubahan dokumen

- `docs/SCOPE.md` bagian 2: menambah baris permukaan S7 Kasir beserta isinya.
- `PLAN.md`: menambah bagian S7 Kasir beserta tugasnya, menandai T4.1, T4.2,
  T5.23, T5.25, dan T5.30 selesai setelah tahapnya masing masing, dan mencatat
  bahwa S2, S3, serta penguncian konteks T4.7 ditunda atas keputusan pemilik.
- `docs/ARCHITECTURE.md`: menambah bagian tentang lapisan aksi Server Action,
  jenis pembayaran, arsip produk, dan catatan bahwa antarmuka penyedia model
  pada bagian 5 mulai dipakai pada tahap ini.
- `docs/CONVENTIONS.md`: menambah aturan penamaan berkas aksi dan formulir.

## 15. Catatan sebelum implementasi dan verifikasi terbuka

1. Catatan pengujian sebelum sesi implementasi ini: kunci `DEEPSEEK_API_KEY` sudah diisi di `.env.local` dan sudah saya uji
   langsung: daftar model memuat `deepseek-flash`, dan satu permintaan uji
   dengan mode JSON menjawab dalam 1,7 detik, tepat memisahkan dua baris pesanan
   yang dikenali dari satu nama yang tidak dikenali. Yang belum teruji adalah
   pengenalan suara lewat mikrofon, karena bergantung pada peramban dan izin
   mikrofon.
2. Dukungan Web Speech API pada peramban yang dipakai saat demo belum dipastikan.
   Bila tidak tersedia, jalur ketik tetap berfungsi penuh.
3. Apakah pengenalan suara Chrome dapat memanggil layanan pengenalnya di jaringan
   tempat lomba berlangsung. Jalur ketik menutupi kemungkinan ini.

## 16. Titik penghentian 18 Oktober 2026

Kasir, kelola produk manual, arsip, ringkasan jenis pembayaran, dan Persetujuan
sudah diimplementasikan. Parser, isian suara, dan dialog tinjau asisten ada,
namun uji DeepSeek serta mikrofon nyata belum diulang. Tabel tugas yang
berlaku ada pada PLAN.md. Catatan pengujian lama bagian 15 merupakan riwayat,
bukan bukti pengujian kode sesi ini.
