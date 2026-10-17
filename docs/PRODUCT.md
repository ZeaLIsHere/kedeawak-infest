# PRODUCT.md

Kebenaran produk KedeAwak. Diekstraksi dari
`Proposal_Infest_Hackathon_Tim_Raja_Ibelis_Aseli.pdf` (24 halaman, Lomba
Informatics Festival XII, bidang Hackathon, Universitas Sumatera Utara, 2026).

Dokumen ini adalah **kebenaran produk**. Jangan diubah tanpa persetujuan user.
Kalau ada yang kurang jelas, perbaiki dokumen ini dulu, baru tulis kode.

---

## 1. Identitas

| Item | Isi |
| --- | --- |
| Nama produk | KedeAwak |
| Tema lomba | AI for All, Intelligent Solutions for an Equitable Future |
| Bentuk | Aplikasi web dan mobile berbasis AI, terintegrasi dengan WhatsApp |
| Kalimat produk | Aplikasi AI agent operasional warung yang menyambungkan WhatsApp ke satu sistem terpusat |
| Tim | 241401021 Tariq Rahmadari, 241401030 Frito Radestya S |
| Kontak | anaksimpang31@gmail.com, 089603824534 |

## 2. Masalah yang diselesaikan

1. Dari 64,2 juta pelaku UMKM di Indonesia, lebih dari 90 persen belum
   memanfaatkan AI secara optimal.
2. Hanya 3,51 persen UMKM memiliki laporan keuangan yang memadai, padahal itu
   faktor utama penilaian kelayakan kredit. Akibatnya 69,5 persen UMKM belum
   bisa mengakses kredit bank.
3. WhatsApp adalah kanal transaksi paling dominan bagi UMKM, tetapi hampir
   semua interaksi masih manual. Pemilik warung kewalahan membalas chat,
   mencatat pesanan, dan mengelola operasional sekaligus.
4. Hambatan utama bukan sekadar akses teknologi, melainkan hambatan perilaku.
   Pelaku UMKM menganggap aplikasi pencatatan sebagai beban tambahan karena
   memaksa mereka keluar dari alur kerja harian di WhatsApp.
5. Dari 10 pelaku warung di Kota Medan yang diwawancarai tim, 7 pernah
   mengunduh aplikasi pencatatan lalu berhenti dalam 2 minggu, dan 6 dari 7
   beralasan karena harus berpindah aplikasi.

## 3. Nilai jual utama

1. **Zero behavior change.** Pemilik warung tetap memakai WhatsApp seperti
   biasa. KedeAwak bekerja di belakang layar.
2. **Agentic AI, bukan chatbot.** Sistem tidak hanya menjawab, tetapi
   bertindak: mencatat penjualan, mengirim alert, menyusun laporan. Ada
   human in the loop sebagai pengaman.
3. **Validated pain point.** Masalahnya sudah divalidasi lewat wawancara
   langsung dengan pelaku UMKM.

## 4. Sasaran pengguna

| Kelompok | Prioritas | Manfaat langsung |
| --- | --- | --- |
| Pelaku UMKM mikro dan kecil: warung makan, toko kelontong, online seller | Primer | Pencatatan otomatis dari WhatsApp, laporan keuangan instan, bebas input manual |
| Pelanggan UMKM | Sekunder | Layanan responsif, pemesanan mudah via WhatsApp |
| Karyawan UMKM | Sekunder | Kemudahan operasional lewat instruksi chat atau suara |
| Lembaga pembiayaan | Tersier | Data keuangan UMKM terstruktur untuk penilaian kredit |

## 5. Alur sistem menurut proposal

Dua sumber data masuk:

1. **Dari WhatsApp (pelanggan).** Pesan pesanan, pertanyaan, atau bukti
   transfer masuk lewat WhatsApp Business API, diteruskan ke backend lewat
   webhook.
2. **Dari aplikasi (pemilik).** Pemilik mengirim teks, voice note, atau foto
   struk lewat aplikasi KedeAwak.

Tahap pemrosesan:

1. Voice note dikonversi ke teks lewat layanan speech to text.
2. Foto struk diekstrak nominal, tanggal, dan keterangannya lewat vision atau
   OCR.
3. LLM orchestrator memahami maksud pesan dan memanggil tool yang sesuai,
   dilengkapi RAG untuk mengambil konteks bisnis yang akurat.

Tahap aksi dan respons:

1. AI mengeksekusi aksi lewat tool layer: mencatat penjualan, mengecek stok,
   mengirim alert, dan membalas pelanggan di WhatsApp.
2. Data dari WhatsApp tersinkron ke aplikasi. Pemilik melihat riwayat chat,
   orderan, dan pembayaran di dashboard.
3. Balasan ke pelanggan dikirim via WhatsApp secara natural.
4. Balasan ke pemilik berupa konfirmasi dan ringkasan di aplikasi.

Context lock dengan human in the loop: sesi disimpan agar saat AI meminta
persetujuan, pesan berikutnya tidak dianggap transaksi baru.

## 6. Tool layer

Sepuluh fungsi yang dapat dipanggil AI, persis seperti di proposal:

| Tool | Fungsi |
| --- | --- |
| `check_stock(product_id)` | Cek stok terkini |
| `create_sale(items, total)` | Catat penjualan |
| `create_expense(description, amount)` | Catat pengeluaran |
| `create_debt(customer, amount)` | Catat hutang |
| `create_purchase_order(supplier, items)` | Buat draft PO |
| `send_whatsapp(phone, message)` | Kirim pesan WA |
| `verify_payment(image_url, expected_amount)` | Verifikasi bukti transfer |
| `get_report(period)` | Rangkuman statistik |
| `forecast_stock(product_id)` | Prediksi stok |
| `business_strategy()` | Rekomendasi strategi bisnis |

## 7. Fitur utama menurut proposal

| Fitur | Deskripsi |
| --- | --- |
| Integrasi WhatsApp ke Aplikasi | Semua pesan pelanggan, orderan, dan bukti pembayaran dari WhatsApp tersambung dan tercatat di aplikasi |
| Ekstraksi Data Multimodal | AI menerima foto struk atau nota, voice note, atau teks, lalu mengubahnya menjadi catatan keuangan terstruktur |
| Alert Stok Menipis | AI memantau stok secara real time dan mengirim notifikasi proaktif saat stok di bawah ambang minimum |
| Respons Otomatis ke Pelanggan | AI agent menjawab pertanyaan berulang seperti harga, ketersediaan, dan jam buka, otomatis melalui WhatsApp, 24 jam |
| Permintaan Laporan Keuangan | Pemilik mengirim pesan seperti "Laporan hari ini", AI langsung menyajikan rangkuman penjualan, pengeluaran, dan laba |
| Agentic Action | AI membuat draft PO ke supplier, mengirim via WhatsApp setelah disetujui pemilik, lalu memperbarui stok |

## 8. Prioritas menurut proposal

**Core, diimplementasikan dalam hackathon:**

1. Menyambungkan pesan pelanggan dari WhatsApp ke aplikasi secara otomatis,
   sehingga orderan, pertanyaan, dan bukti pembayaran tercatat tanpa input
   manual.
2. Mencatat transaksi keuangan lewat input multimodal (teks, suara, foto
   struk) dengan percakapan natural bersama AI.
3. Menyajikan laporan keuangan harian dan mingguan dari data yang
   terakumulasi otomatis.

**Extended, roadmap pengembangan di luar hackathon:**

1. AI agent yang membalas chat pelanggan dan menerima pesanan otomatis.
2. Prediksi stok dan rekomendasi restok berbasis data historis.
3. Data keuangan terstruktur untuk penilaian kredit oleh lembaga pembiayaan.

## 9. Strategi fallback pembacaan struk

Proposal menetapkan tiga lapis, dipertahankan apa adanya:

1. **Primer.** Vision LLM mengekstrak data dari foto struk.
2. **Sekunder.** Jika confidence score di bawah 70 persen, AI meminta
   konfirmasi ke pemilik, contohnya "Saya baca total Rp150.000, benar?".
3. **Tersier.** Jika foto tidak terbaca, AI meminta pemilik mendikte lewat
   voice note atau mengetik manual.

Tujuannya agar tidak ada transaksi yang hilang.

## 10. Privasi dan persetujuan data

1. Hanya pesan yang dikirim ke nomor WhatsApp Business milik warung yang
   diproses, bukan akun pribadi.
2. Pemilik menghubungkan nomor WhatsApp Business-nya secara eksplisit, opt in.
3. Data pelanggan seperti nama dan nomor telepon disimpan terenkripsi dan
   hanya dipakai untuk operasional warung tersebut.
4. Pemilik dapat menghapus data pelanggan kapan saja lewat dashboard.

## 11. Arahan visual dari proposal

Proposal menetapkan arah desain yang harus diikuti, bukan ditawar:

- **Dashboard KedeAwak: Clean, Minimalist, Flat.**
- Tampilan chat dengan AI agent di dalam aplikasi.
- Tampilan integrasi WhatsApp di dalam aplikasi.
- Pendekatan antarmuka chat first, karena mengikuti kebiasaan WhatsApp.
- Target pengguna termasuk yang belum melek digital, sehingga antarmuka harus
  sederhana dan tidak menuntut pelatihan.

Larangan tambahan dari user, berlaku di seluruh UI:

- Tidak ada emoji, dalam bentuk apa pun.
- Tidak ada karakter tanda hubung `-` beserta semua variannya.

## 12. Analisis kompetitor menurut proposal

| Aspek | BukuWarung | BukuKas | Moka POS | KedeAwak |
| --- | --- | --- | --- | --- |
| Integrasi WhatsApp otomatis | Tidak ada | Tidak ada | Tidak ada | Chat WA otomatis masuk |
| Input multimodal | Manual | Manual | Formulir | AI ekstraksi otomatis |
| AI agent yang mengeksekusi aksi | Tidak ada | Tidak ada | Tidak ada | Function calling dengan persetujuan |
| Respons otomatis ke pelanggan | Tidak ada | Tidak ada | Tidak ada | 24 jam via WhatsApp |
| Target utama | UMKM mikro | UMKM mikro | UMKM menengah sampai besar | UMKM mikro dan kecil |

## 13. Dampak yang diklaim

Proposal menyatakan dampak berikut. Ini dipakai untuk narasi demo dan
dokumentasi, bukan untuk fitur di dalam aplikasi.

- **Sosial:** inklusi digital, pemberdayaan perempuan pelaku warung,
  pengurangan kesenjangan antar daerah.
- **Ekonomi:** waktu pencatatan turun dari sekitar 5 menit per transaksi
  menjadi sekitar 10 detik, pencatatan otomatis mengurangi kebocoran stok,
  laporan rapi membuka akses KUR.
- **Teknologi:** adopsi AI di kalangan UMKM naik, terbentuk basis data UMKM
  terstruktur, UMKM masuk ekosistem digital.

## 14. Yang tidak ada di proposal

Bagian ini penting supaya tidak ada yang dikarang. Proposal **tidak**
menentukan:

- merek, nama warna, palet, atau font tertentu
- nama halaman atau struktur navigasi aplikasi secara rinci
- skema database atau nama tabel
- pilihan framework frontend
- bahasa pemrograman
- target deployment

Semua itu diputuskan di `docs/ARCHITECTURE.md` dan `docs/CONVENTIONS.md`,
dan boleh diubah tanpa mengubah dokumen ini.
