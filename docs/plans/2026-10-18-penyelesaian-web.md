# Rencana pelaksanaan penyelesaian web KedeAwak

Tanggal: 18 Oktober 2026
Status sesi: pengembangan dihentikan atas permintaan pemilik; status aktual
dan pekerjaan tersisa mengikuti PLAN.md. Tahap di bawah adalah rencana,
bukan klaim semua penerimaan sudah terpenuhi.

Untuk pelaksana: gunakan skill executing-plans atau subagent-driven-development
dan test-driven-development. PLAN.md adalah satu satunya pelacak status;
dokumen ini menjelaskan pelaksanaan, tanpa daftar status kedua.

## Tujuan dan acuan

Menyelesaikan fitur web dalam docs/SCOPE.md dan rancangan
docs/specs/2026-10-17-kasir-kelola-produk-design.md. Urutan pemilik:
Kasir, kelola produk, Persetujuan, lalu tool, AI, WhatsApp, dan pematangan.
Tidak menambah fitur di luar cakupan. docs/PRODUCT.md tidak diubah.

## Arsitektur dan batas bersama

Next.js 16 App Router, React, TypeScript strict, Drizzle, PGlite atau Postgres.
Baca panduan node_modules/next/dist/docs sebelum mengubah kode Next.js.
Semua baca dan tulis basis data lewat src/lib/data/. Semua pemanggilan
DeepSeek lewat src/lib/ai/. Semua mutasi antarmuka lewat Server Action
dengan revalidasi. Pemeriksaan masukan berjalan di server.
Data selalu terikat business_id. UI memakai token dan komponen yang ada,
bahasa Indonesia, SVG lucide-react, tanpa emoji atau dash pada teks pengguna.
Stok hanya berubah melalui stock_movements; transaksi rangkap dan aksi yang
sudah diputuskan tidak boleh menambah atau mengurangi stok dua kali.
Kunci DeepSeek tersedia lokal; nilainya tidak boleh dicetak atau masuk git.

## Tahap A: Kasir dan laporan pembayaran

Tugas PLAN.md: T5.33 sampai T5.40, T4.1, T4.2.

Berkas: src/lib/db/schema.ts dan migrasi, src/lib/data/sales.ts,
src/lib/data/reports.ts, src/lib/ai/provider.ts, src/lib/ai/transcript.ts,
src/lib/actions/penjualan.ts, src/components/kasir/, src/app/kasir/page.tsx,
src/components/reports/, src/components/shell/nav-items.ts,
e2e/kasir.spec.ts, serta berkas uji di samping modul masing masing.

Kontrak: createSale(db, businessId, input) menerima productId dan quantity
beserta method tunai, transfer, atau qris, serta cashReceived bila tunai.
Harga dan total diambil ulang dari produk, bukan dipercaya dari peramban.
Hasil memuat orderId dan total. Produk arsip atau stok kurang ditolak.
Daftar produk hanya produk aktif. Ringkasan pembayaran memakai periode
setengah terbuka yang sama dengan laporan keuangan.

Langkah: tulis uji gagal untuk penjualan dan penolakan stok kurang; jalankan
uji; tambahkan skema dan penyimpanan atomik; buktikan uji lulus; bangun UI
keranjang dan pembayaran; sambungkan Server Action; uji peramban pada 393
dan 1280 piksel sampai stok serta laporan berubah; jalankan pemeriksaan
lengkap; commit dan push dengan ID tugas yang tepat.

Pengenalan suara memakai Web Speech API dan memiliki jalur ketik. DeepSeek
menghasilkan usulan yang divalidasi terhadap produk aktif. Nama tidak dikenal
dilaporkan, tidak dipaksakan cocok. Tidak ada penafsir lokal pengganti pada
Kasir atau tambah produk; tanpa kunci atau jaringan, jelaskan kegagalan
dan biarkan formulir manual tetap bisa dipakai.

## Tahap B: Kelola produk

Tugas: T5.23, T5.25, T5.41 sampai T5.44.

Berkas: src/lib/data/products.ts, src/lib/data/stock.ts,
src/lib/actions/produk.ts, src/components/stock/, dan
e2e/kelola-produk.spec.ts.

Kontrak: simpan produk menerima name, unit, salePrice, purchasePrice,
minimumStock, stock, dan reason bila stok produk lama berubah.
Arsip tidak menghapus riwayat dan menyembunyikan produk di Kasir, daftar aktif,
pencarian, serta alert. Indeks unik nama hanya berlaku pada produk aktif.
Pengaktifan kembali harus menolak benturan nama dengan keterangan yang jelas.
Usulan asisten selalu tampil di dialog tinjau dan tidak langsung disimpan.

Langkah: uji gagal tambah dengan stok awal, ubah stok dengan alasan,
arsip dan aktifkan kembali; implementasi minimal lalu buktikan lulus;
bangun formulir dan dialog aksesibel; uji pada dua lebar layar; periksa
seluruh alur stok dan laporan; pemeriksaan lengkap, commit dan push.

## Tahap C: Persetujuan

Tugas: T5.27 sampai T5.30, T5.45, T5.46.

Berkas: src/lib/data/approvals.ts, src/lib/data/purchase-orders.ts,
src/lib/actions/persetujuan.ts, src/components/approvals/,
src/app/persetujuan/page.tsx, dan e2e/persetujuan.spec.ts.

Antrean memuat draft, pemasok, produk, jumlah, nilai, serta setujui dan tolak.
Hasil keputusan tetap tampil dalam riwayat. Draft dari alert mengusulkan stok
kembali ke dua kali ambang, paling sedikit satu ambang. Pemasok mengikuti
pesanan terakhir atau keterangan belum ditentukan. Draft menunggu tidak
dibuat rangkap untuk produk yang sama. Keputusan atomik dan idempoten:
setujui menambah stok sekali, tolak tidak mengubah stok. Alert baru ditutup
ketika stok mencapai ambang, bukan sekadar karena tombol setujui ditekan.
Sesi percakapan yang memakai draft terikat ke persetujuan dan dilepas
setelah keputusan, tanpa menganggap pesan lanjutan sebagai transaksi baru.

Langkah: uji gagal keputusan ulang, lintas warung, dan draft rangkap;
implementasikan lapisan data dan aksi; buat UI; buktikan setujui dan tolak
pada dua lebar layar; pemeriksaan lengkap, commit dan push.

## Tahap D: Tool dan AI

Tugas: seluruh Fase 3 dan Fase 4, serta T5.5 sampai T5.10 dan T5.26.

Berkas: src/lib/tools/, src/lib/ai/, src/lib/data/ untuk konteks bisnis
dan sesi, src/lib/actions/percakapan.ts, src/components/conversation/,
src/app/percakapan/page.tsx, serta uji integrasi dan peramban terkait.

Sepuluh tool sesuai scope memvalidasi argumen dan mencatat hasil maupun gagal
di tool_invocations. Tidak ada mutasi yang diam diam melewati jejak stok.
Orkestrator menerima teks atau foto, membatasi kuota harian, mengambil konteks
bisnis lewat query, dan mempertahankan context lock saat persetujuan menunggu.
Struk di bawah confidence 70 persen harus ditinjau; gambar tidak terbaca
meminta input manual. Pengganti lokal pada percakapan harus deterministik
dan menyatakan mode lokal; tidak menyamar sebagai DeepSeek.

Langkah: tulis uji perilaku untuk kesepuluh tool dan jalur gagal; buktikan
gagal lalu implementasikan; uji orkestrasi dengan penyedia yang disuntikkan
tanpa jaringan; uji context lock, kuota, konfirmasi struk, dan kegagalan
penyedia; bangun UI percakapan; uji browser; pemeriksaan lengkap dan commit.

## Tahap E: WhatsApp dan privasi

Tugas: T5.11 sampai T5.17, T5.31, T5.32.

Berkas: src/lib/channels/, src/lib/actions/whatsapp.ts,
src/app/api/channels/whatsapp/route.ts, src/app/whatsapp/page.tsx,
src/components/whatsapp/, src/app/pengaturan/page.tsx.

Panel pengirim tiruan dan webhook menulis ke satu jalur. Orderan, bukti
pembayaran, pesan asal, dan balasan tampil tanpa tampilan obrolan pelanggan.
Fonnte memeriksa koneksi dan menampilkan petunjuk, tanpa mengirim pesan
ke pelanggan asli. Jika token belum ada, simulasi tetap dapat digunakan
dengan status jujur. Hapus pelanggan memakai konfirmasi dan isolasi warung.
Pengaturan menjelaskan opt in serta pemrosesan pesan bisnis.

Langkah: uji payload tidak sah, isolasi, pesan rangkap, pemrosesan pesanan dan
bukti pembayaran; implementasi; uji panel sampai laporan dan stok berubah;
buktikan penghapusan data; pemeriksaan lengkap, commit dan push.

## Tahap F: Penerimaan dan bukti

Tugas: T6.1 sampai T6.7. Periksa sepuluh langkah docs/SCOPE.md bagian 7,
ditambah Kasir dan kelola produk. Uji dua lebar layar, papan ketik,
label, fokus dialog, dan tidak ada gulir mendatar. Jalankan format:check,
typecheck, lint, lint:ui, test, build, dan test:e2e; laporkan kegagalan nyata.
Jangan menjalankan db:seed pada basis data pemilik tanpa izin karena
menghapus data demo; gunakan direktori PGlite khusus pengujian.
Rekaman bukti dapat berupa jejak Playwright dan catatan hasil reproduksi;
jangan mengklaim pengenalan mikrofon atau API nyata diuji bila belum.

## Fokus peninjauan

- Kiriman ulang dan keputusan persetujuan berulang tidak menduplikasi stok.
- Harga dan persediaan berubah setelah keranjang dibuka: server memeriksa ulang.
- Produk diarsipkan tidak muncul pada rekomendasi atau pencocokan nama.
- Argumen model salah atau layanan gagal tidak mencatat transaksi sebagian.
- Context lock dan konfirmasi struk tidak bisa ditimpa pesan susulan.
- Token dan data pelanggan tidak masuk keluaran, git, atau pesan galat UI.
