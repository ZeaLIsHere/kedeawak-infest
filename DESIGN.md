# DESIGN.md

Arah visual KedeAwak. Dokumen ini mengunci tampilan sebelum permukaan aplikasi
ditulis, supaya tidak ada halaman yang dibuat dengan selera masing masing.

- **Sumber arah:** `docs/PRODUCT.md` bagian 11, yang bersumber dari proposal.
- **Wujud teknis:** `src/styles/tokens/` dan `src/app/globals.css`.
- **Status:** dikunci pada tugas T1.4. Ini arah, bukan dokumentasi hasil
  bangun. Audit akhir ada di `PLAN.md` tugas T6.3.

---

## 1. Arah

Arah visual KedeAwak diperbarui atas permintaan pemilik pada 18 Oktober 2026:
**neo-brutalism monokromatik biru**. Ciri utamanya garis hitam tebal, bayangan
keras tanpa blur, blok warna pekat, dan huruf tebal. Nilai proposal tentang
antarmuka sederhana dan mudah dipakai tetap berlaku.

| Kata       | Artinya di sini                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| Tegas      | Garis hitam dua piksel, bayangan keras empat piksel, dan sudut kecil lima piksel menjadi bahasa bentuk utama      |
| Blok warna | Permukaan putih untuk isi, biru sebagai warna merek, hijau dan merah hanya untuk makna uang                       |
| Bersih     | Satu gagasan per kartu. Ruang kosong lega. Tidak ada hiasan tanpa alasan                                          |
| Tanpa ikon | Navigasi dan kepala kartu hanya memakai teks. Ikon hanya boleh ada pada tombol tindakan bila memperjelas perintah |
| Sederhana  | Satu tindakan utama per layar. Label memakai kata kerja sehari hari. Angka penting dibuat besar                   |

---

## 2. Prinsip yang mengikat

1. **Warna hanya dari token.** Tidak ada nilai warna langsung di komponen,
   termasuk nilai inline dan kelas arbitrer.
2. **Biru untuk merek dan tindakan utama.** Bukan untuk hiasan.
3. **Hijau hanya untuk hal positif.** Pemasukan dan laba.
4. **Merah hanya untuk hal merugikan.** Pengeluaran, penolakan, dan galat.
5. **Kuning hanya untuk peringatan.** Terutama stok menipis.
6. **Angka uang selalu rata kolom.** Pakai `tabular-nums` pada setiap kolom
   angka dan setiap nilai uang.
7. **Satu tindakan utama per layar.** Tombol lain tampil sebagai tindakan
   kedua, dengan gaya sekunder atau tanpa isian.
8. **Status tidak boleh hanya dibedakan warna.** Setiap warna status wajib
   berpasangan dengan teks. Ikon tidak dipakai sebagai penanda status di
   navigasi maupun kepala kartu.
9. **Tidak ada teks yang mengarang data.** Kalau belum ada data, tulis kalimat
   keadaan kosong yang menjelaskan langkah berikutnya.
10. **Navigasi dan kartu tanpa ikon.** Label teks sudah cukup dan lebih mudah
    dibaca pada layar kecil.

---

## 3. Warna

Semua nilai di bawah berasal dari `src/styles/tokens/semantic.css`, yang
menunjuk `src/styles/tokens/primitives.css`.

| Peran           | Token                | Nilai               |
| --------------- | -------------------- | ------------------- |
| Latar halaman   | `--background`       | `hsl(214 95% 93%)`  |
| Teks utama      | `--foreground`       | `#000000`           |
| Permukaan kartu | `--card`             | `#ffffff`           |
| Warna merek     | `--primary`          | `hsl(217 100% 66%)` |
| Teks sekunder   | `--muted-foreground` | `hsl(215 30% 25%)`  |
| Garis           | `--border`           | `#000000`           |
| Pemasukan       | `--income`           | `#047a45`           |
| Pengeluaran     | `--expense`          | `#c81e22`           |
| Laba            | `--profit`           | `hsl(217 90% 45%)`  |
| Peringatan      | `--warning`          | `#6b5300`           |
| Berhasil        | `--success`          | `#047a45`           |
| Informasi       | `--info`             | `hsl(217 90% 45%)`  |

Blok warna pada ubin ringkasan memakai permukaan pekat, yaitu
`--income-surface` `#05e17a`, `--expense-surface` `#ff4d50`,
`--profit-surface` `hsl(217 100% 66%)`, dan `--warning-surface` `#facc00`.
Teks di atas blok selalu hitam agar kontras tetap tinggi.

Catatan:

- Latar halaman biru sangat muda, bukan putih, supaya kartu putih dan garis
  hitam punya batas yang jelas.
- Warna merek dan warna laba berbeda, supaya laba tetap terbaca sebagai angka
  tersendiri, bukan sebagai merek.
- Setiap warna status punya tiga bentuk, yaitu warna utama, warna teks di atas
  permukaan, dan warna permukaan. Contohnya `--warning`, `--warning-foreground`,
  dan `--warning-surface`.
- Warna grafik laporan memakai lima token, `--chart-1` sampai `--chart-5`,
  mengikuti palet neo-brutalism: biru, merah, kuning, hijau, dan ungu.

---

## 4. Huruf

Satu keluarga huruf, yaitu Geist, dimuat lewat `next/font`. Tidak ada huruf
kedua. Pembedaan dibuat lewat ukuran dan ketebalan. Isi memakai ketebalan 500,
sedangkan judul dan angka utama memakai ketebalan 700.

| Peran              | Kelas                | Ukuran    | Ketebalan |
| ------------------ | -------------------- | --------- | --------- |
| Angka besar dasbor | `text-metric`        | 2.25rem   | 700       |
| Judul halaman      | `text-page-title`    | 1.875rem  | 700       |
| Judul bagian       | `text-section-title` | 1.25rem   | 700       |
| Isi                | `text-body`          | 0.9375rem | 500       |
| Keterangan kecil   | `text-caption`       | 0.8125rem | 500       |

Aturan:

- Hierarki dalam satu kartu dibatasi pada empat tingkat: judul bagian, label,
  angka utama, dan keterangan. Tidak ada tingkat tambahan di bawahnya.
- Judul bagian tidak memakai huruf besar semua, karena lebih sulit dibaca.
- Panjang baris isi dijaga di bawah 75 karakter.
- Nilai uang memakai `tabular-nums`, dan tidak pernah dipotong dengan elipsis.
- Angka utama dibuat besar karena pemilik warung membaca dasbor sekilas, sering
  dari layar telepon genggam di tengah kesibukan.

---

## 5. Bentuk dan ketinggian

| Peran                                | Token              | Nilai                         |
| ------------------------------------ | ------------------ | ----------------------------- |
| Kendali, misalnya tombol dan masukan | `--radius-control` | 4 piksel                      |
| Permukaan, misalnya kartu dan panel  | `--radius-surface` | 5 piksel                      |
| Lencana dan chip                     | `--radius-pill`    | penuh                         |
| Garis tepi                           | `--border`         | 2 piksel hitam pada permukaan |
| Kartu diam                           | `shadow-card`      | 4 piksel 4 piksel tanpa blur  |
| Kendali masukan                      | `shadow-control`   | 2 piksel 2 piksel tanpa blur  |
| Permukaan terangkat                  | `shadow-raised`    | 4 piksel 4 piksel tanpa blur  |
| Lapisan atas                         | `shadow-overlay`   | 8 piksel 8 piksel tanpa blur  |

Aturan:

- Garis tepi hitam dua piksel adalah cara utama memisahkan permukaan.
- Bayangan selalu keras, tanpa blur, dan hanya bergerak ke kanan bawah.
- Dilarang gradien, dilarang bayangan berwarna, dilarang efek timbul atau
  bevel.
- Sudut lengkung tidak melebihi 5 piksel untuk permukaan besar.

---

## 6. Tata letak

| Hal                               | Token atau aturan                              |
| --------------------------------- | ---------------------------------------------- |
| Jarak tepi halaman                | `p-page`                                       |
| Jarak antarbagian                 | `p-section`                                    |
| Jarak antarunsur dalam satu baris | `p-gutter`                                     |
| Lebar isi maksimum                | `--content-max-width`, yaitu 80rem, dipusatkan |
| Lebar sisi navigasi               | `--sidebar-width`, yaitu 15.5rem               |
| Tinggi kepala halaman             | `--header-height`, yaitu 3.5rem                |
| Sasaran sentuh minimum            | `--touch-target-min`, yaitu 3rem (48 piksel)   |

Titik ubah:

| Lebar                  | Susunan                                                                                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Di bawah 768 piksel    | Satu kolom penuh. Navigasi berpindah ke batang bawah berisi empat tujuan tersering, dan tujuan lain beserta Pengaturan masuk menu `Lainnya` berupa lembar dari bawah. Tabel panjang berubah menjadi daftar kartu |
| 768 sampai 1023 piksel | Satu kolom dengan lebar terbatas, navigasi tetap di batang bawah                                                                                                                                                 |
| 1024 piksel ke atas    | Sisi navigasi tetap di kiri, isi di kanan, kartu boleh dua atau tiga kolom                                                                                                                                       |

Aturan:

- Sasaran sentuh tidak pernah lebih kecil dari `--touch-target-min`, karena
  pemilik warung memakai telepon genggam.
- Tidak ada gulir mendatar pada halaman.
- Nomor halaman dan judul tidak pernah lebih dari dua tingkat.

---

## 7. Komponen inti

| Komponen          | Aturan                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| Tombol utama      | Biru `--primary`, teks hitam, garis hitam dua piksel, sudut 5 piksel, bayangan keras                               |
| Tombol sekunder   | Permukaan putih, teks hitam, garis hitam dua piksel, bayangan keras                                                |
| Kartu             | Permukaan `--card`, garis hitam dua piksel, sudut `--radius-surface`, bayangan keras, jarak dalam `--card-padding` |
| Kepala kartu      | Hanya judul dan satu kalimat keterangan. Tidak ada ikon                                                            |
| Ubin angka        | Blok warna pekat dengan teks hitam, garis hitam, bayangan keras, tanpa ikon                                        |
| Lencana status    | Bentuk pil, garis hitam, teks hitam, latar kuning untuk peringatan                                                 |
| Navigasi          | Hanya teks. Tujuan aktif memakai blok biru, garis hitam, dan bayangan kecil                                        |
| Tabel             | Kepala tabel memakai `text-caption` dan `--muted-foreground`, kolom angka memakai `tabular-nums` dan rata kanan    |
| Keadaan kosong    | Judul tebal, satu kalimat penjelasan, satu tindakan lanjutan. Tidak ada ikon hiasan                                |
| Keadaan memuat    | Kerangka abu dengan bentuk menyerupai isi aslinya. Bukan pemutar berputar di tengah halaman                        |
| Keadaan gagal     | Kalimat sebab yang dapat dimengerti, dan satu tombol coba lagi                                                     |
| Dialog konfirmasi | Dipakai untuk tindakan yang tidak bisa dibatalkan, misalnya menghapus data pelanggan                               |

---

## 8. Gerak

Gerak hanya dipakai untuk memberi umpan balik, bukan untuk hiasan.

| Keperluan                                     | Durasi                           |
| --------------------------------------------- | -------------------------------- |
| Umpan balik langsung, misalnya tombol ditekan | `--motion-fast`, 120 milidetik   |
| Perubahan tampilan, misalnya kartu muncul     | `--motion-normal`, 200 milidetik |
| Perpindahan panel atau lembar                 | `--motion-slow`, 320 milidetik   |

Aturan:

- Kurva gerak memakai `ease-standard` atau `ease-out`.
- Tidak ada animasi yang berjalan terus menerus, kecuali penanda memuat.
- Gerak wajib mati bila pengguna mengaktifkan `prefers-reduced-motion`.

---

## 9. Yang dilarang

1. Emoji dalam bentuk apa pun, termasuk di judul, tombol, dan isi data.
2. Karakter tanda hubung dan semua variannya. Lihat `docs/CONVENTIONS.md`
   bagian 2 untuk cara penulisan penggantinya.
3. Gradien dan bayangan berblur. Bayangan yang dipakai selalu keras.
4. Nilai desain yang ditulis langsung di komponen, termasuk warna, ukuran,
   dan teks. Ukuran yang dihitung dari data, misalnya lebar batang proporsi,
   tidak termasuk.
5. Warna di luar token, termasuk warna yang ditulis inline.
6. Status yang hanya dibedakan lewat warna.
7. Ikon pada navigasi sisi, navigasi bawah, dan kepala kartu. Ikon hanya boleh
   muncul pada tombol tindakan bila memperjelas perintah.
8. Tombol mati, menu belum berfungsi, dan tulisan "segera hadir".
9. Mode gelap. Belum ada di `docs/SCOPE.md`, jadi belum dikerjakan.
10. Menampilkan riwayat percakapan pelanggan sebagai tampilan obrolan di S3.
    Keputusannya ada di `docs/SCOPE.md` bagian 3.1.

---

## 10. Di mana tokennya

| Berkas                             | Isi                                                                 |
| ---------------------------------- | ------------------------------------------------------------------- |
| `src/styles/tokens/primitives.css` | Lapis 1, nilai mentah berawalan `--primitive-`                      |
| `src/styles/tokens/semantic.css`   | Lapis 2, makna, misalnya `--primary` dan `--income`                 |
| `src/styles/tokens/components.css` | Lapis 3, sudut, ketinggian, tinggi kendali, ukuran kerangka         |
| `src/styles/tokens/index.css`      | Mengimpor ketiga lapis secara berurutan                             |
| `src/app/globals.css`              | Pemetaan token menjadi utilitas Tailwind lewat blok `@theme inline` |

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

## 12. Permukaan tambahan dan status pemeriksaan

Tema neo-brutalism biru ditetapkan pemilik pada 18 Oktober 2026. Seluruh
permukaan memakai palet, garis, bayangan, dan radius yang sama. Navigasi sisi,
navigasi bawah, dan kepala kartu tidak memakai ikon.

S7 Kasir ditambahkan atas keputusan pemilik 18 Oktober 2026 dan mengikuti
arah visual serta token yang sama. Keranjang berada setelah daftar produk
pada layar sempit. Dialog produk dan arsip memakai Radix melalui komponen
UI bersama. Antrean Persetujuan memisahkan aksi menunggu dari riwayat.
WhatsApp menyajikan kartu orderan, pesan asal, dan balasan tanpa tampilan
obrolan pelanggan.

S1 Dasbor disusun untuk dibaca sekilas oleh pemilik warung dan kasir: ubin
blok warna untuk penjualan, pengeluaran, dan laba; jumlah orderan hari ini;
produk terlaris dengan batang proporsi; serta stok menipis sebagai kartu
peringatan. Tindakan memuat ulang ringkasan berada di kepala halaman.

Pengembangan dihentikan pada titik yang diminta pemilik. Uji peramban dua
ukuran layar tersedia, tetapi audit akhir aksesibilitas dan kualitas desain
T6.2 serta T6.3 belum selesai; dokumen ini tidak mengklaim audit tersebut lulus.
