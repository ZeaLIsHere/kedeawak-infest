# SCOPE.md

Batas fitur yang dikerjakan. Dokumen ini menurunkan `docs/PRODUCT.md` menjadi
daftar konkret. **Yang tidak ada di sini tidak dikerjakan.**

Aturan induk dari user:

> Fokus agar semua fitur di web berjalan sesuai rencana di proposal.
> Fitur di luar web diabaikan.

---

## 1. Cara membaca dokumen ini

| Tanda | Arti |
| --- | --- |
| MASUK | Dikerjakan sampai berfungsi penuh di web |
| SIMULASI | Dikerjakan di web, tetapi sumber eksternalnya disimulasikan |
| LUAR | Tidak dikerjakan, tidak dibuat kodenya, tidak dibuat skema datanya |

---

## 2. Permukaan aplikasi yang dibangun

Enam permukaan. Semuanya mengacu ke bagian mockup dan fitur utama proposal.

| ID | Permukaan | Isi | Status |
| --- | --- | --- | --- |
| S1 | Dasbor | Statistik penjualan, pengeluaran, laba, jumlah order, produk terlaris, alert stok terbaru | MASUK |
| S2 | Percakapan dengan Agen AI | Obrolan dengan AI untuk mencatat transaksi lewat teks, voice note, dan foto struk, termasuk konfirmasi dan persetujuan aksi | MASUK |
| S3 | Integrasi WhatsApp | Status koneksi nomor, aksi Hubungkan ke WhatsApp beserta tata caranya, orderan yang masuk, bukti pembayaran, status verifikasi | SIMULASI |
| S4 | Laporan Keuangan | Laporan harian dan mingguan: penjualan, pengeluaran, laba, rincian transaksi, ekspor | MASUK |
| S5 | Stok dan Produk | Daftar produk, harga, stok, ambang minimum, alert stok menipis, penyesuaian stok | MASUK |
| S6 | Persetujuan | Antrean aksi yang menunggu persetujuan pemilik, contohnya draft PO ke supplier, dengan aksi setujui atau tolak | MASUK |

## 3. Fitur utama proposal dan statusnya

Enam fitur dari bagian "Fitur Utama" proposal.

### 3.1 Integrasi WhatsApp ke Aplikasi — SIMULASI

Pesan pelanggan, orderan, dan bukti pembayaran tersambung dan tercatat di
aplikasi, dan pemilik menghubungkan nomornya sendiri dari dalam aplikasi.

- **Yang dikerjakan, bagian koneksi:** permukaan S3 memuat status koneksi
  nomor, aksi Hubungkan ke WhatsApp beserta tata caranya sampai nomor
  berstatus terhubung, dan aksi memutuskan koneksi. Nomor hanya diproses
  setelah pemilik menghubungkannya sendiri, sesuai butir opt in pada proposal.
- **Yang dikerjakan, bagian pesan:** kanal masuk yang menerima payload pesan
  WhatsApp, memprosesnya, lalu menyimpannya sebagai orderan dan bukti
  pembayaran yang tampil di permukaan S3 dan S1.
- **Yang tidak ditampilkan:** riwayat percakapan pelanggan dalam bentuk
  tampilan obrolan. Keputusan user: detail percakapan tidak masuk ke
  permukaan S3. Pesan pelanggan tetap diterima dan disimpan karena
  dibutuhkan untuk membentuk orderan dan menyusun balasan, tetapi yang
  ditampilkan ke pemilik adalah hasilnya, yaitu orderan, bukti pembayaran,
  beserta pesan asal yang menjadi dasar orderan tersebut.
- **Yang disimulasikan:** pengiriman dan penerimaan sebenarnya lewat penyedia
  kanal WhatsApp. Kanal masuk dibuat sebagai endpoint webhook, ditambah satu
  panel di aplikasi untuk mengirim pesan tiruan sebagai pelanggan, supaya
  alur dapat didemonstrasikan tanpa kredensial penyedia.
- **Alasan:** pendaftaran penyedia kanal, verifikasi bisnis, dan biaya
  percakapan berada di luar web dan di luar jangkauan tempo lomba.
- **Batas:** tidak ada pengiriman pesan ke nomor pelanggan yang sesungguhnya.
  Tidak ada token penyedia yang disimpan di dalam repo.
- **Menunggu keputusan:** penyedia kanal yang dipakai, yaitu Meta Cloud API,
  Fonnte, atau n8n sebagai perantara. Isi tata cara pada tombol Hubungkan ke
  WhatsApp bergantung pada pilihan ini. Rincian ada di
  `docs/ARCHITECTURE.md` bagian 11 dan keputusan K9 pada `PLAN.md`.


### 3.2 Ekstraksi Data Multimodal — MASUK

AI menerima foto struk, voice note, atau teks, lalu mengubahnya menjadi
catatan keuangan terstruktur.

- **Yang dikerjakan:** di permukaan S2 pengguna dapat mengirim teks, merekam
  atau mengunggah voice note, dan mengunggah foto struk. Ketiganya diubah
  menjadi catatan transaksi terstruktur.
- **Fallback tiga lapis wajib berjalan:** vision membaca struk, bila confidence
  di bawah 70 persen AI meminta konfirmasi, bila tidak terbaca AI meminta
  input manual atau suara.
- **Batas:** kalau kunci API model tidak tersedia, lapisan AI diganti
  implementasi lokal yang deterministik, dan hal itu ditulis terus terang di
  README serta pada layar, tanpa berpura pura memakai AI.

### 3.3 Alert Stok Menipis — MASUK

AI memantau stok dan memberi notifikasi saat stok di bawah ambang minimum.

- **Yang dikerjakan:** ambang minimum per produk, perhitungan stok terkini
  dari transaksi dan penyesuaian, daftar alert di S5, ringkasan alert di S1,
  dan aksi membuat draft PO dari alert tersebut yang masuk ke S6.
- **Batas:** tidak ada pengiriman notifikasi ke perangkat luar. Notifikasi
  tampil di dalam aplikasi.

### 3.4 Respons Otomatis ke Pelanggan — SIMULASI

AI menjawab pertanyaan berulang seperti harga, ketersediaan, dan jam buka.

- **Yang dikerjakan:** basis pengetahuan warung berisi harga, ketersediaan
  stok, dan jam buka. Saat pesan pelanggan masuk ke kanal S3, AI menyusun
  balasan.
- **Yang disimulasikan:** pengiriman balasan ke WhatsApp asli. Balasan
  disimpan dan ditampilkan sebagai bagian dari konteks pesan pelanggan pada
  orderan di permukaan S3, bukan sebagai tampilan obrolan. Ini mengikuti
  keputusan pada bagian 3.1.
- **Catatan proposal:** fitur ini masuk daftar Extended, tetapi juga muncul
  sebagai fitur utama. Keputusan: dikerjakan dengan status SIMULASI, karena
  seluruh mekanismenya dapat diperagakan di dalam web.


### 3.5 Permintaan Laporan Keuangan — MASUK

Pemilik mengirim pesan seperti "Laporan hari ini", AI menyajikan rangkuman.

- **Yang dikerjakan:** perintah bahasa alami di S2 untuk meminta laporan
  harian dan mingguan, hasilnya tersaji sebagai ringkasan di percakapan dan
  sebagai halaman penuh di S4.
- **Batas:** periode yang didukung hanya harian dan mingguan, sesuai proposal.

### 3.6 Agentic Action — MASUK

AI membuat draft PO, mengirim setelah disetujui pemilik, lalu memperbarui stok.

- **Yang dikerjakan:** AI menyusun draft PO berisi produk dan jumlah, draft
  masuk ke antrean S6, pemilik menyetujui atau menolak, setelah disetujui PO
  tercatat dan stok diperbarui.
- **Human in the loop wajib.** Tidak ada aksi yang mengubah data stok atau
  membuat PO tanpa persetujuan eksplisit pemilik.
- **Context lock:** saat sebuah aksi menunggu persetujuan, konteks sesi
  dikunci sehingga pesan berikutnya tidak diperlakukan sebagai transaksi baru.
- **Batas:** pengiriman PO ke supplier tidak dilakukan. PO disimpan sebagai
  dokumen di dalam aplikasi.

## 4. Tool layer

Sepuluh tool dari proposal. Ini daftar kerja yang harus ada dan berfungsi.

| Tool | Status | Catatan |
| --- | --- | --- |
| `check_stock(product_id)` | MASUK | Membaca stok terkini |
| `create_sale(items, total)` | MASUK | Menulis transaksi penjualan |
| `create_expense(description, amount)` | MASUK | Menulis transaksi pengeluaran |
| `create_debt(customer, amount)` | MASUK | Menulis hutang pelanggan |
| `create_purchase_order(supplier, items)` | MASUK | Membuat draft PO ke antrean persetujuan |
| `send_whatsapp(phone, message)` | SIMULASI | Menulis balasan pada konteks pesan pelanggan, tidak benar benar mengirim |
| `verify_payment(image_url, expected_amount)` | MASUK | Mencocokkan bukti transfer dengan nominal yang diharapkan |
| `get_report(period)` | MASUK | Menghitung ringkasan harian dan mingguan |
| `forecast_stock(product_id)` | MASUK | Rata rata bergerak dengan safety stock, seperti di proposal |
| `business_strategy()` | MASUK | Rekomendasi berbasis data transaksi yang ada |

Kesepuluh tool dipanggil lewat satu lapisan orkestrasi AI, dan setiap
pemanggilan tercatat di jejak audit agar dapat diperiksa saat demo.

## 5. Keamanan dan privasi yang dikerjakan

Empat butir dari bagian privasi proposal. Keempatnya tampil di web.

| Butir proposal | Status | Wujud di aplikasi |
| --- | --- | --- |
| Hanya memproses pesan ke nomor bisnis warung | MASUK | Setiap entitas data terikat ke `business_id`. Tidak ada query lintas warung |
| Pemilik menghubungkan nomor secara opt in | MASUK | Permukaan S3 berisi status koneksi nomor, tata cara, aksi Hubungkan ke WhatsApp, dan aksi memutuskan koneksi |
| Data pelanggan disimpan terenkripsi | MASUK | Kolom nama dan nomor telepon pelanggan dienkripsi saat disimpan |
| Pemilik dapat menghapus data pelanggan | MASUK | Aksi hapus data pelanggan di S3, dengan konfirmasi |

Butir ke-2 proposal, "pelanggan yang mengirim pesan ke nomor bisnis dianggap
memasuki konteks transaksi bisnis", cukup ditulis sebagai keterangan di
halaman pengaturan.

## 6. Di luar scope

Tidak dikerjakan. Tidak ada kode, halaman, endpoint, maupun tabel untuk ini.

### 6.1 Di luar web, sesuai arahan user

1. Koneksi nyata ke WhatsApp Business Cloud API Meta, termasuk pendaftaran
   aplikasi Meta, verifikasi bisnis, dan pengelolaan nomor.
2. Tampilan WhatsApp mobile dan pembuatan akun pelanggan.
3. Credit scoring dan penyaluran data keuangan ke bank, koperasi, atau
   lembaga pembiayaan.
4. Skema komisi B2B pemasok dan integrasi ke distributor.
5. Billing, langganan, koin pintar, dan seluruh alur pembayaran.
6. Marketplace, rekonsiliasi bank, dan integrasi pihak ketiga lainnya.
7. Kampanye marketing, akuisisi pengguna, dan halaman promosi.
8. Penyusunan dokumen bisnis seperti BMC dan unit economics di dalam aplikasi.

### 6.2 Bagian Extended proposal

Table di bawah ini adalah roadmap enam bulan ke depan, bukan pekerjaan
hackathon. Beberapa di antaranya tetap dibangun dalam bentuk terbatas karena
muncul juga sebagai fitur utama, dan sudah ditandai SIMULASI di bagian 3.

| Item Extended | Keputusan |
| --- | --- |
| AI agent membalas chat pelanggan secara otomatis | Dibangun terbatas, status SIMULASI, lihat 3.4 |
| Prediksi stok dan rekomendasi restok dari data historis | Dibangun lewat `forecast_stock`, lihat bagian 4 |
| Data keuangan terstruktur untuk penilaian kredit | LUAR. Tidak ada ekspor ke lembaga pembiayaan |
| Pilot project 50 sampai 100 warung, target 500 pengguna aktif | LUAR. Ini rencana bisnis, bukan fitur |
| Kolaborasi dengan pemerintah dan lembaga keuangan | LUAR |

### 6.3 Fitur umum yang sering ditambahkan tanpa diminta

Daftar ini sengaja ditulis supaya tidak ikut masuk. Semua LUAR:

- halaman landing produk, halaman pricing, dan halaman tentang kami
- mode gelap atau tema ganda
- dukungan multi bahasa dan pengalih bahasa
- ekspor PDF atau Excel
- notifikasi email, WhatsApp, atau push
- pencarian global dan palet perintah
- manajemen peran dan undangan anggota tim
- log aktivitas pengguna tingkat lanjut
- integrasi peta, kalender eksternal, atau media sosial
- halaman pengaturan lengkap di luar butir privasi di bagian 5

Kalau salah satu di atas terasa perlu, tanyakan dulu. Jangan langsung dibuat.

## 7. Kriteria sukses demo

Demo dianggap berhasil bila seluruh rangkaian ini berjalan tanpa langkah
manual di luar aplikasi:

1. Pemilik membuka permukaan S3, menjalankan aksi Hubungkan ke WhatsApp, dan
   nomor berubah berstatus terhubung.
2. Ada pesan pelanggan masuk ke kanal WhatsApp, lengkap dengan satu orderan
   dan satu bukti transfer.
3. Orderan dan bukti transfer itu otomatis muncul di dasbor dan di permukaan
   S3 dengan status verifikasi yang benar.
4. Pada orderan tersebut terlihat pesan asal pelanggan serta balasan otomatis
   agen. Tidak ada tampilan obrolan, sesuai keputusan bagian 3.1.
5. Pemilik mengirim voice note atau foto struk di percakapan agen AI, dan
   tercatat sebagai transaksi keuangan yang benar.
6. Foto struk dengan confidence rendah memicu permintaan konfirmasi.
7. Pemilik mengetik permintaan laporan, dan ringkasan penjualan beserta laba
   langsung tersaji.
8. Stok sebuah produk turun di bawah ambang minimum, alert muncul.
9. Dari alert itu, AI membuat draft PO. Draft masuk antrean persetujuan.
   Pemilik menyetujui, stok diperbarui.
10. Selama draft PO menunggu persetujuan, pesan berikutnya tidak dianggap
    transaksi baru.

Semua langkah di atas adalah pengujian penerimaan yang harus lulus sebelum
proyek dinyatakan selesai.

