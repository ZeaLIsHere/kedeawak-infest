# SCOPE.md

Batas fitur yang dikerjakan. Dokumen ini menurunkan `docs/PRODUCT.md` menjadi
daftar konkret. **Yang tidak ada di sini tidak dikerjakan.**

Aturan induk dari user:

> Fokus agar semua fitur di web berjalan sesuai rencana di proposal.
> Fitur di luar web diabaikan.

---

## 1. Cara membaca dokumen ini

| Tanda    | Arti                                                               |
| -------- | ------------------------------------------------------------------ |
| MASUK    | Dikerjakan sampai berfungsi penuh di web                           |
| SIMULASI | Dikerjakan di web, tetapi sumber eksternalnya disimulasikan        |
| LUAR     | Tidak dikerjakan, tidak dibuat kodenya, tidak dibuat skema datanya |

---

## 2. Permukaan aplikasi yang dibangun

Tujuh permukaan. Enam di antaranya mengacu ke bagian mockup dan fitur utama
proposal. Yang ketujuh, Kasir, ditambahkan atas permintaan pemilik proyek.

| ID  | Permukaan                 | Isi                                                                                                                                              | Status |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| S1  | Dasbor                    | Statistik penjualan, pengeluaran, laba, jumlah order, produk terlaris, alert stok terbaru                                                        | MASUK  |
| S2  | Percakapan dengan Agen AI | Obrolan dengan AI untuk mencatat transaksi lewat teks, voice note, dan foto struk, termasuk konfirmasi dan persetujuan aksi                      | MASUK  |
| S3  | Integrasi WhatsApp        | Daftar pesanan WhatsApp dan kartu koneksi Fonnte tanpa input nomor. Pesanan baru dapat dikonfirmasi untuk mencatat penjualan dan mengurangi stok | MASUK  |
| S4  | Laporan Keuangan          | Laporan harian dan mingguan: penjualan, pengeluaran, laba, rincian transaksi, dan catat pengeluaran manual                                       | MASUK  |
| S5  | Stok dan Produk           | Daftar, tambah, ubah, dan arsip produk, stok, ambang minimum, alert, penyesuaian beralasan, asisten dengan dialog tinjau                         | MASUK  |
| S6  | Persetujuan               | Antrean aksi yang menunggu persetujuan pemilik, contohnya draft PO ke supplier, dengan aksi setujui atau tolak                                   | MASUK  |
| S7  | Kasir                     | Daftar produk yang dapat ditekan, keranjang, jenis pembayaran tunai atau transfer atau QRIS, pesanan lewat suara                                 | MASUK  |

Catatan S7. Kasir tidak diambil dari proposal, melainkan permintaan langsung
pemilik proyek pada 18 Oktober 2026, supaya penjualan di warung dapat dicatat
dari dalam aplikasi dan datanya ikut berubah. Kasir tidak menggantikan atau
mengurangi satu pun permukaan lain. Rancangannya ada di
`docs/specs/2026-10-17-kasir-kelola-produk-design.md`, dan tugasnya ada di
`PLAN.md` bagian S7.

Halaman Pengaturan memuat profil pemilik dan usaha tanpa login. Pemilik dapat
mengubah nama pemilik, nama usaha, jenis usaha, alamat, nomor telepon, jam
buka, jam tutup, dan deskripsi. Data itu dipakai agen AI untuk menyapa pemilik
dan menyesuaikan jawaban dengan usahanya, bukan untuk membuat akun atau login.

## 2.1 Status implementasi

Checkpoint sebelum migrasi: S1 dan S4 membaca data; S7 menyimpan penjualan;
S5 mengelola produk/stok; S6 memutus draft. S2 mempunyai percakapan, mode lokal
dan tinjau struk. S3 memakai Fonnte untuk kanal WhatsApp. Pengaturan memuat
profil pemilik, persetujuan, serta privasi. Ini riwayat, bukan bukti Twilio.

Pada 18 Oktober 2026 user menetapkan Fonnte sebagai kanal WhatsApp utama.
Token perangkat dan secret webhook berasal dari `.env.local`. Aplikasi tidak
meminta nomor WhatsApp, karena nomor perangkat dibaca langsung dari Fonnte
setelah token diverifikasi. Verifikasi akun Fonnte nyata belum diklaim sampai
ada bukti pengujian pada akun yang dipakai demo. `docs/PRODUCT.md` tidak diubah.

## 2.2 Langganan

Langganan diatur di halaman Pengaturan dan terdiri dari dua tier.

| Tier | Harga              | Isi                                                                                  |
| ---- | ------------------ | ------------------------------------------------------------------------------------ |
| Free | Rp0                | 10 pesanan WhatsApp per hari, tanpa fitur suara dan foto struk di Agen AI            |
| Gold | Rp19.900 per bulan | Pesanan WhatsApp tanpa batas, fitur suara dan foto struk di Agen AI, berlaku 30 hari |

Pembelian hanya berupa konfirmasi pada demo ini, belum memproses uang.
Tombol hapus langganan berada pada kartu terpisah di halaman Pengaturan dan
mengembalikan warung ke paket Free. Batas harian memakai Waktu Indonesia Barat
dan hanya menghitung pesanan WhatsApp yang tercatat pada hari berjalan.
Pesanan ke-11 dan seterusnya ditolak tanpa dicatat, lalu pelanggan menerima
balasan bahwa kuota hari ini habis. Fitur suara dan foto struk dibatasi hanya
pada halaman Agen AI, bukan pada media masuk WhatsApp.

## 3. Fitur utama proposal dan statusnya

Enam fitur dari bagian "Fitur Utama" proposal.

### 3.1 Integrasi WhatsApp ke Aplikasi — MASUK (Fonnte)

Keputusan user: Fonnte menjadi kanal WhatsApp utama untuk demo.

- **Tampilan saat ini:** S3 menampilkan kartu koneksi Fonnte dan daftar
  pesanan. Kartu koneksi tidak meminta nomor WhatsApp. Nomor perangkat dibaca
  dari Fonnte setelah token diverifikasi. Kotak masuk, panel simulasi, dan
  pengaturan data pelanggan belum ditampilkan.
- **Koneksi:** pemilik menyiapkan perangkat di dasbor Fonnte, mengisi
  `FONNTE_TOKEN` dan `FONNTE_WEBHOOK_SECRET` pada `.env.local`, lalu menekan
  Hubungkan WhatsApp. Aplikasi memeriksa token dengan
  `POST https://api.fonnte.com/device`, memastikan perangkat berstatus
  terhubung, lalu menyimpan nomor, paket, kuota, dan waktu pemeriksaan pada
  baris `businesses`. Putuskan koneksi hanya menghentikan pemrosesan lokal.
- **Pesan nyata:** pesan teks pelanggan menjadi orderan dan balasan agen.
  Pesan yang tidak dapat dipahami tetap dicatat sebagai pesan pelanggan dan
  meminta pelanggan menulis nama produk serta jumlah dengan jelas. Tidak ada
  orderan rekaan saat pemrosesan gagal.
- **Media:** pada paket gratis Fonnte, lampiran masuk tidak diteruskan ke
  webhook. Voice note WhatsApp berformat OGG juga tidak diteruskan karena
  Fonnte hanya menerima MP3. Karena itu foto bukti dan voice note pelanggan
  tidak diandalkan pada demo ini. Pesan teks tetap diproses.
- **Bukti:** pencocokan bukti pembayaran tetap tersedia lewat jalur aplikasi
  dan simulasi, bukan klaim verifikasi bank. Nominal cocok dan confidence
  tinggi mencatat penjualan serta stok sekali. Confidence rendah tetap
  menunggu.
- **Tampilan:** daftar pesanan beserta rincian item, status pesanan, keadaan
  pembayaran, dan pesan asal pelanggan. Setiap pesanan berstatus baru memiliki
  tombol Konfirmasi pesanan dengan pilihan tunai, transfer, atau QRIS.
  Konfirmasi mencatat penjualan, mengurangi stok, dan mengubah status menjadi
  selesai. Pesanan berstatus baru juga memiliki tombol Batalkan pesanan dengan
  konfirmasi. Pesanan yang dibatalkan tetap tampil dengan status Dibatalkan,
  tanpa mengubah stok atau pendapatan. Pesanan yang sudah dikonfirmasi tidak
  dapat dibatalkan.
  Balasan agen tidak ditampilkan di S3, dan tidak ada halaman obrolan
  pelanggan. Muat ulang halaman dilakukan manual setelah pemrosesan latar
  selesai.
- **Webhook:** `POST /api/channels/fonnte?key=SECRET` adalah Route Handler Next
  pada server UI yang sama. Secret dibaca dari `FONNTE_WEBHOOK_SECRET`.
  `/whatsapp` hanya UI, bukan webhook.
- **Batas demo:** webhook langsung menjawab lalu memproses pesan lewat Next
  `after()`. Ini bukan durable worker. Biarkan server hidup selama demo. Kanal
  luar tetap bergantung pada koneksi perangkat Fonnte dan jaringan.
- **Simulasi tetap ada:** panel pelanggan tiruan memakai jalur domain yang
  sama tanpa mengirim pesan provider nyata. Panel ini belum ditampilkan di S3
  sampai pembahasan berikutnya. Kredensial tidak disimpan di repo.

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

### 3.4 Respons Otomatis ke Pelanggan — MASUK (peserta Sandbox opt in)

AI menjawab pertanyaan berulang seperti harga, ketersediaan, dan jam buka.

- **Yang dikerjakan:** basis pengetahuan warung berisi harga, ketersediaan
  stok, dan jam buka. Saat pesan pelanggan masuk ke kanal S3, AI menyusun
  balasan.
- **Pengiriman nyata yang disetujui:** REST Twilio mengirim balasan kepada
  peserta yang telah join/opt in, sesuai batas Sandbox dan jendela pesan.
  Balasan juga dicatat pada konteks orderan S3, bukan tampilan obrolan.
  Simulasi hanya mencatat balasan lokal dan tidak menghubungi provider.
- **Batas:** bukan broadcast, marketing, pengiriman ke nomor sembarang atau
  integrasi produksi. Ketergantungan `after()` dan risiko kehilangan proses
  pada restart mengikuti bagian 3.1. Uji nyata masih perlu bukti.

### 3.5 Permintaan Laporan Keuangan — MASUK

Pemilik mengirim pesan seperti "Laporan hari ini", AI menyajikan rangkuman.

- **Yang dikerjakan:** perintah bahasa alami di S2 untuk meminta laporan
  harian dan mingguan, hasilnya tersaji sebagai ringkasan di percakapan dan
  sebagai halaman penuh di S4.
- **Pengeluaran manual:** S4 menyediakan formulir keterangan, nominal, dan
  tanggal. Data ditulis ke tabel `transactions` dan langsung dipakai laporan
  serta ringkasan hari ini.
- **Batas:** periode yang didukung hanya harian dan mingguan, sesuai proposal.

### 3.6 Agentic Action — MASUK

AI membuat draft PO, mengirim setelah disetujui pemilik, lalu memperbarui stok.

- **Yang dikerjakan:** AI menyusun draft PO berisi produk dan jumlah, draft
  masuk ke antrean S6, pemilik menyetujui atau menolak, setelah disetujui PO
  tercatat dan stok diperbarui. Persetujuan juga mencatat pengeluaran sebesar
  total draft, sehingga ringkasan dashboard ikut berubah.
- **Human in the loop wajib.** Tidak ada aksi yang mengubah data stok atau
  membuat PO tanpa persetujuan eksplisit pemilik.
- **Context lock:** saat sebuah aksi menunggu persetujuan, konteks sesi
  dikunci sehingga pesan berikutnya tidak diperlakukan sebagai transaksi baru.
- **Batas:** pengiriman PO ke supplier tidak dilakukan. PO disimpan sebagai
  dokumen di dalam aplikasi.

### 3.7 Langganan — MASUK (pembayaran disimulasikan)

Pembatasan fitur menurut paket, diminta pemilik pada 18 Oktober 2026.

- **Free:** pesanan WhatsApp dibatasi 10 per hari. Pesanan berikutnya ditolak
  dan tidak dicatat. Fitur suara serta foto struk di Agen AI tidak tersedia.
- **Gold:** Rp19.900 per bulan, berlaku 30 hari, membuka pesanan WhatsApp tanpa
  batas serta fitur suara dan foto struk di Agen AI.
- **Pembelian:** hanya konfirmasi, belum memproses pembayaran. Status dan tanggal
  berakhir tampil di Pengaturan. Hapus langganan tersedia pada kartu terpisah.
- **Batas:** tidak ada penagihan berulang, faktur, atau integrasi pembayaran.
  Media masuk WhatsApp tetap diproses seperti sebelumnya tanpa dibatasi paket.

## 4. Tool layer

Sepuluh tool dari proposal. Ini daftar kerja yang harus ada dan berfungsi.

| Tool                                         | Status | Catatan                                                                     |
| -------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| `check_stock(product_id)`                    | MASUK  | Membaca stok terkini                                                        |
| `create_sale(items, total)`                  | MASUK  | Menulis transaksi penjualan                                                 |
| `create_expense(description, amount)`        | MASUK  | Menulis transaksi pengeluaran                                               |
| `create_debt(customer, amount)`              | MASUK  | Menulis hutang pelanggan                                                    |
| `create_purchase_order(supplier, items)`     | MASUK  | Membuat draft PO ke antrean persetujuan                                     |
| `send_whatsapp(phone, message)`              | MASUK  | Balasan REST Twilio hanya peserta Sandbox opt in; mode simulasi tetap lokal |
| `verify_payment(image_url, expected_amount)` | MASUK  | Mencocokkan bukti transfer dengan nominal yang diharapkan                   |
| `get_report(period)`                         | MASUK  | Menghitung ringkasan harian dan mingguan                                    |
| `forecast_stock(product_id)`                 | MASUK  | Rata rata bergerak dengan safety stock, seperti di proposal                 |
| `business_strategy()`                        | MASUK  | Rekomendasi berbasis data transaksi yang ada                                |

Kesepuluh tool dipanggil lewat satu lapisan orkestrasi AI, dan setiap
pemanggilan tercatat di jejak audit agar dapat diperiksa saat demo.

## 5. Keamanan dan privasi yang dikerjakan

Empat butir dari bagian privasi proposal. Keempatnya tampil di web.

| Butir proposal                               | Status | Wujud di aplikasi                                                                                            |
| -------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| Hanya memproses pesan ke nomor bisnis warung | MASUK  | Setiap entitas data terikat ke `business_id`. Tidak ada query lintas warung                                  |
| Pemilik menghubungkan nomor secara opt in    | MASUK  | Permukaan S3 berisi status koneksi nomor, tata cara, aksi Hubungkan ke WhatsApp, dan aksi memutuskan koneksi |
| Data pelanggan disimpan terenkripsi          | MASUK  | Kolom nama dan nomor telepon pelanggan dienkripsi saat disimpan                                              |
| Pemilik dapat menghapus data pelanggan       | MASUK  | Aksi hapus data pelanggan di S3, dengan konfirmasi                                                           |

Butir ke-2 proposal, "pelanggan yang mengirim pesan ke nomor bisnis dianggap
memasuki konteks transaksi bisnis", cukup ditulis sebagai keterangan di
halaman pengaturan.

Untuk demo Sandbox, jelaskan bahwa Twilio memproses pesan, Groq menerima audio,
dan DeepSeek menerima transkrip/foto. Perhatikan persetujuan, retensi pihak
ketiga, biaya pesan/transkripsi/token dan kuota. Jangan menyatakan penghapusan
di aplikasi otomatis menghapus data pada penyedia luar. Kredensial tetap di
server; tidak ada akses template env yang diblokir privasi dengan cara lain.

## 6. Di luar scope

Tidak dikerjakan. Tidak ada kode, halaman, endpoint, maupun tabel untuk ini.

### 6.1 Di luar web, sesuai arahan user

1. Pembuatan/pengelolaan akun penyedia, verifikasi bisnis dan pembelian paket
   tidak dibangun sebagai fitur aplikasi. Setup manual Twilio Sandbox, ngrok,
   webhook POST dan join peserta adalah prasyarat demo yang didokumentasikan,
   bukan larangan integrasi nyata. Integrasi produksi dan worker tahan restart
   di luar cakupan demo ini.
2. Tampilan WhatsApp mobile dan pembuatan akun pelanggan.
3. Credit scoring dan penyaluran data keuangan ke bank, koperasi, atau
   lembaga pembiayaan.
4. Skema komisi B2B pemasok dan integrasi ke distributor.
5. Billing produksi, penagihan otomatis, dan pembayaran uang nyata. Langganan
   demo dengan konfirmasi dijelaskan pada bagian 2.2 dan tetap tanpa alur uang.
6. Marketplace, rekonsiliasi bank, dan integrasi pihak ketiga lainnya.
7. Kampanye marketing, akuisisi pengguna, dan halaman promosi.
8. Penyusunan dokumen bisnis seperti BMC dan unit economics di dalam aplikasi.

### 6.2 Bagian Extended proposal

Table di bawah ini adalah roadmap enam bulan ke depan, bukan pekerjaan
hackathon. Beberapa di antaranya tetap dibangun dalam bentuk terbatas karena
muncul juga sebagai fitur utama; balasan Sandbox kini MASUK sesuai bagian 3.

| Item Extended                                                 | Keputusan                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------- |
| AI agent membalas chat pelanggan secara otomatis              | MASUK terbatas untuk peserta Twilio Sandbox opt in, lihat 3.4 |
| Prediksi stok dan rekomendasi restok dari data historis       | Dibangun lewat `forecast_stock`, lihat bagian 4               |
| Data keuangan terstruktur untuk penilaian kredit              | LUAR. Tidak ada ekspor ke lembaga pembiayaan                  |
| Pilot project 50 sampai 100 warung, target 500 pengguna aktif | LUAR. Ini rencana bisnis, bukan fitur                         |
| Kolaborasi dengan pemerintah dan lembaga keuangan             | LUAR                                                          |

### 6.3 Fitur umum yang sering ditambahkan tanpa diminta

Daftar ini sengaja ditulis supaya tidak ikut masuk. Semua LUAR:

- halaman landing produk, halaman pricing, dan halaman tentang kami
- mode gelap atau tema ganda
- dukungan multi bahasa dan pengalih bahasa
- ekspor PDF atau Excel
- notifikasi email, WhatsApp proaktif/broadcast, atau push; balasan peserta
  Sandbox pada bagian 3.4 adalah pengecualian yang disetujui
- pencarian global dan palet perintah
- manajemen peran dan undangan anggota tim
- log aktivitas pengguna tingkat lanjut
- integrasi peta, kalender eksternal, atau media sosial
- halaman pengaturan lengkap di luar profil pemilik dan butir privasi di bagian 5

Kalau salah satu di atas terasa perlu, tanyakan dulu. Jangan langsung dibuat.

## 7. Kriteria sukses demo

Sesudah setup manual Sandbox, ngrok, webhook dan join peserta di `README.md`,
demo dianggap berhasil bila rangkaian berikut berjalan. Rencana ini bukan
klaim semua langkah sudah diuji:

1. Pemilik membuka permukaan S3, menjalankan aksi Hubungkan ke WhatsApp, dan
   nomor berubah berstatus terhubung.
2. Peserta Sandbox opt in mengirim teks dan voice note OGG; suara otomatis
   menjadi transkrip lalu orderan. Peserta mengirim foto bukti untuk satu
   orderan sendiri yang tidak ambigu.
3. Orderan dan bukti transfer itu otomatis muncul di dasbor dan di permukaan
   S3 setelah polling/muat ulang dengan status pencocokan yang benar, bukan
   klaim verifikasi bank. Confidence rendah tetap menunggu; nominal cocok
   dan confidence >= 0.7 tetap otomatis mencatat sesuai perilaku lama.
4. Pada orderan tersebut terlihat pesan asal pelanggan serta balasan otomatis
   agen, termasuk transkrip suara; peserta menerima balasan nyata via REST
   Twilio. Tidak ada tampilan obrolan, sesuai keputusan bagian 3.1.
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

Catatan historis: keputusan Fonnte gratis dahulu membatasi demo lampiran pada
simulasi. Keputusan itu diganti oleh persetujuan Twilio Sandbox 18 Oktober
2026; hasil simulasi/checkpoint lama tidak membuktikan teks, audio, foto atau
balasan Twilio nyata. Detail keamanan, respons segera, dan batas `after()`
ada di `docs/ARCHITECTURE.md` bagian 11. Tidak adanya balasan setelah server
berhenti ditangani dengan kirim ulang pesan baru untuk demo, bukan janji
antrean tahan restart atau retry provider setelah respons sukses.
