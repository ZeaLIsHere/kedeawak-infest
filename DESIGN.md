# DESIGN.md

Arah visual KedeAwak. Dokumen ini mengunci tampilan sebelum permukaan aplikasi
ditulis, supaya tidak ada halaman yang dibuat dengan selera masing masing.

- **Sumber arah:** `docs/PRODUCT.md` bagian 11, yang bersumber dari proposal.
- **Wujud teknis:** `src/styles/tokens/` dan `src/app/globals.css`.
- **Status:** dikunci pada tugas T1.4. Ini arah, bukan dokumentasi hasil
  bangun. Audit akhir ada di `PLAN.md` tugas T6.3.

---

## 1. Arah

Proposal menyebut tiga kata, dan ketiganya mengikat:

> Dashboard KedeAwak: Clean, Minimalist, Flat.

Ditambah dua hal lain dari proposal: pendekatan antarmuka **chat first**,
karena mengikuti kebiasaan WhatsApp, dan sasaran pengguna yang **termasuk yang
belum melek digital**, sehingga antarmuka harus sederhana dan tidak menuntut
pelatihan.

Terjemahannya menjadi aturan yang bisa diperiksa:

| Kata | Artinya di sini |
| --- | --- |
| Clean | Ruang kosong lega. Satu gagasan per kartu. Tidak ada hiasan yang tidak menjelaskan apa pun |
| Minimalist | Setiap elemen harus punya alasan. Kalau dihapus dan tidak ada yang hilang, hapus |
| Flat | Tanpa gradien, tanpa bayangan tebal, tanpa efek timbul. Ketinggian hanya dari garis tepi dan bayangan sangat halus |
| Chat first | Percakapan adalah pusat pengalaman. Permukaan S2 tampil seperti aplikasi pesan, dengan gelembung pesan dan kolom ketik di bawah |
| Sederhana | Satu tindakan utama per layar. Label memakai kata kerja sehari hari. Angka penting dibuat besar |

---

## 2. Prinsip yang mengikat

1. **Warna hanya dari token.** Tidak ada nilai warna langsung di komponen,
   termasuk nilai inline dan kelas arbitrer.
2. **Hijau hanya untuk merek dan hal positif.** Pemasukan, laba, dan status
   terverifikasi. Bukan untuk hiasan.
3. **Merah hanya untuk hal merugikan.** Pengeluaran, penolakan, dan galat.
4. **Kuning hanya untuk peringatan.** Terutama stok menipis.
5. **Angka uang selalu rata kolom.** Pakai `tabular-nums` pada setiap kolom
   angka dan setiap nilai uang.
6. **Satu tindakan utama per layar.** Tombol lain tampil sebagai tindakan
   kedua, dengan gaya sekunder atau tanpa isian.
7. **Status tidak boleh hanya dibedakan warna.** Setiap warna status wajib
   berpasangan dengan ikon SVG atau teks. Ini untuk pengguna dengan gangguan
   penglihatan warna.
8. **Tidak ada teks yang mengarang data.** Kalau belum ada data, tulis kalimat
   keadaan kosong yang menjelaskan langkah berikutnya.

---

## 3. Warna

Semua nilai di bawah berasal dari `src/styles/tokens/semantic.css`, yang
menunjuk `src/styles/tokens/primitives.css`.

| Peran | Token | Nilai |
| --- | --- | --- |
| Latar halaman | `--background` | `#f8fafc` |
| Teks utama | `--foreground` | `#0f172a` |
| Permukaan kartu | `--card` | `#ffffff` |
| Warna merek | `--primary` | `#059669` |
| Teks sekunder | `--muted-foreground` | `#64748b` |
| Garis | `--border` | `#e2e8f0` |
| Pemasukan | `--income` | `#059669` |
| Pengeluaran | `--expense` | `#dc2626` |
| Laba | `--profit` | `#047857` |
| Peringatan | `--warning` | `#d97706` |
| Berhasil | `--success` | `#059669` |
| Informasi | `--info` | `#2563eb` |

Catatan:

- Latar halaman abu sangat muda, bukan putih, supaya kartu putih punya batas
  yang jelas tanpa perlu bayangan tebal.
- Warna merek dan warna laba berbeda, supaya laba tetap terbaca sebagai angka
  tersendiri, bukan sebagai merek.
- Setiap warna status punya tiga bentuk, yaitu warna utama, warna teks di atas
  permukaan muda, dan warna permukaan muda. Contohnya `--warning`,
  `--warning-foreground`, dan `--warning-surface`.
- Warna grafik laporan memakai lima token, `--chart-1` sampai `--chart-5`.
  Urutannya sengaja dibuat agar mudah dibedakan, dan dua warna pertama sudah
  bermakna, yaitu penjualan dan pengeluaran.

---

## 4. Huruf

Satu keluarga huruf, yaitu Geist, dimuat lewat `next/font`. Tidak ada huruf
kedua. Pembedaan dibuat lewat ukuran dan ketebalan.

| Peran | Kelas | Ukuran | Ketebalan |
| --- | --- | --- | --- |
| Angka besar dasbor | `text-metric` | 1.875rem | 600 |
| Judul halaman | `text-page-title` | 1.5rem | 600 |
| Judul bagian | `text-section-title` | 1.0625rem | 600 |
| Isi | `text-body` | 0.9375rem | 400 |
| Keterangan kecil | `text-caption` | 0.75rem | 400 |

Aturan:

- Maksimal dua tingkat ukuran huruf dalam satu kartu.
- Judul bagian tidak memakai huruf besar semua, karena lebih sulit dibaca.
- Panjang baris isi dijaga di bawah 75 karakter.
- Nilai uang memakai `tabular-nums`, dan tidak pernah dipotong dengan elipsis.

---

## 5. Bentuk dan ketinggian

| Peran | Token | Nilai |
| --- | --- | --- |
| Kendali, misalnya tombol dan masukan | `--radius-control` | 0.375rem |
| Permukaan, misalnya kartu dan panel | `--radius-surface` | 0.875rem |
| Lencana dan chip | `--radius-pill` | penuh |
| Kartu diam | `shadow-card` | bayangan paling halus |
| Permukaan terangkat | `shadow-raised` | untuk menu dan popover |
| Lapisan atas | `shadow-overlay` | untuk dialog dan lembar |

Aturan:

- Garis tepi satu piksel dengan `--border` adalah cara utama memisahkan
  permukaan. Bayangan hanya tambahan.
- Dilarang gradien, dilarang bayangan berwarna, dilarang efek timbul atau
  bevel. Ini yang dimaksud Flat oleh proposal.
- Sudut lengkung tidak melebihi `--radius-surface` untuk permukaan besar.

---

## 6. Tata letak

| Hal | Token atau aturan |
| --- | --- |
| Jarak tepi halaman | `p-page` |
| Jarak antarbagian | `p-section` |
| Jarak antarunsur dalam satu baris | `p-gutter` |
| Lebar isi maksimum | `--content-max-width`, yaitu 80rem, dipusatkan |
| Lebar sisi navigasi | `--sidebar-width`, yaitu 15.5rem |
| Tinggi kepala halaman | `--header-height`, yaitu 3.5rem |
| Sasaran sentuh minimum | `--touch-target-min`, yaitu 2.75rem |

Titik ubah:

| Lebar | Susunan |
| --- | --- |
| Di bawah 768 piksel | Satu kolom penuh. Navigasi berpindah ke batang bawah. Tabel panjang berubah menjadi daftar kartu |
| 768 sampai 1023 piksel | Satu kolom dengan lebar terbatas, navigasi tetap di batang bawah |
| 1024 piksel ke atas | Sisi navigasi tetap di kiri, isi di kanan, kartu boleh dua atau tiga kolom |

Aturan:

- Sasaran sentuh tidak pernah lebih kecil dari `--touch-target-min`, karena
  pemilik warung memakai telepon genggam.
- Tidak ada gulir mendatar pada halaman.
- Nomor halaman dan judul tidak pernah lebih dari dua tingkat.

---

## 7. Komponen inti

| Komponen | Aturan |
| --- | --- |
| Tombol utama | Warna `--primary`, teks `--primary-foreground`, tinggi `--control-height-md`, sudut `--radius-control` |
| Tombol sekunder | Permukaan `--card`, garis `--border-strong`, teks `--foreground` |
| Kartu | Permukaan `--card`, garis `--border`, sudut `--radius-surface`, jarak dalam `--card-padding` |
| Lencana status | Bentuk pil, memakai pasangan warna status dan permukaannya, selalu berisi teks |
| Tabel | Kepala tabel memakai `text-caption` dan `--muted-foreground`, kolom angka memakai `tabular-nums` dan rata kanan |
| Keadaan kosong | Judul singkat, satu kalimat penjelasan, satu tindakan lanjutan. Tidak ada gambar hiasan |
| Keadaan memuat | Kerangka abu dengan bentuk menyerupai isi aslinya. Bukan pemutar berputar di tengah halaman |
| Keadaan gagal | Kalimat sebab yang dapat dimengerti, dan satu tombol coba lagi |
| Dialog konfirmasi | Dipakai untuk tindakan yang tidak bisa dibatalkan, misalnya menghapus data pelanggan |

---

## 8. Gerak

Gerak hanya dipakai untuk memberi umpan balik, bukan untuk hiasan.

| Keperluan | Durasi |
| --- | --- |
| Umpan balik langsung, misalnya tombol ditekan | `--motion-fast`, 120 milidetik |
| Perubahan tampilan, misalnya kartu muncul | `--motion-normal`, 200 milidetik |
| Perpindahan panel atau lembar | `--motion-slow`, 320 milidetik |

Aturan:

- Kurva gerak memakai `ease-standard` atau `ease-out`.
- Tidak ada animasi yang berjalan terus menerus, kecuali penanda memuat.
- Gerak wajib mati bila pengguna mengaktifkan `prefers-reduced-motion`.

---

## 9. Yang dilarang

1. Emoji dalam bentuk apa pun, termasuk di judul, tombol, dan isi data.
2. Karakter tanda hubung dan semua variannya. Lihat `docs/CONVENTIONS.md`
   bagian 2 untuk cara penulisan penggantinya.
3. Gradien, bayangan tebal, dan efek timbul.
4. Nilai warna, ukuran, atau teks yang ditulis langsung di komponen.
5. Warna di luar token, termasuk warna yang ditulis inline.
6. Status yang hanya dibedakan lewat warna.
7. Tombol mati, menu belum berfungsi, dan tulisan "segera hadir".
8. Mode gelap. Belum ada di `docs/SCOPE.md`, jadi belum dikerjakan.
9. Menampilkan riwayat percakapan pelanggan sebagai tampilan obrolan di S3.
   Keputusannya ada di `docs/SCOPE.md` bagian 3.1.

---

## 10. Di mana tokennya

| Berkas | Isi |
| --- | --- |
| `src/styles/tokens/primitives.css` | Lapis 1, nilai mentah berawalan `--primitive-` |
| `src/styles/tokens/semantic.css` | Lapis 2, makna, misalnya `--primary` dan `--income` |
| `src/styles/tokens/components.css` | Lapis 3, sudut, ketinggian, tinggi kendali, ukuran kerangka |
| `src/styles/tokens/index.css` | Mengimpor ketiga lapis secara berurutan |
| `src/app/globals.css` | Pemetaan token menjadi utilitas Tailwind lewat blok `@theme inline` |

Aturan penamaan yang wajib dijaga: nama di lapis 2 dan lapis 3 tidak boleh
bertabrakan dengan ruang nama tema Tailwind, yaitu `--color-`, `--text-`,
`--spacing-`, `--radius-`, `--shadow-`, dan `--ease-`. Jarak memakai awalan
`--space-` dan ukuran huruf memakai `--type-`. Kalau aturan ini dilanggar,
pemetaan di `globals.css` akan membuat variabel merujuk dirinya sendiri dan
token itu akan bernilai kosong.

---

## 11. Status dokumen

- Dokumen ini dikunci pada tugas T1.4, sebelum permukaan aplikasi ditulis.
- Dokumen ini menyatakan arah, bukan mendokumentasikan hasil bangun.
- Pemeriksaan akhir kualitas desain dilakukan pada tugas T6.3, dan
  penyelarasan seluruh dokumen dengan kenyataan kode pada tugas T6.4.
- Bila kode menyimpang dari dokumen ini, salah satu harus diperbaiki dalam
  commit yang sama. Membiarkan keduanya berbeda dilarang.
