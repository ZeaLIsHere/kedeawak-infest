# AGENTS.md

Aturan main kerja untuk repo ini. Wajib dibaca dan dipatuhi oleh setiap agent
(AI maupun manusia) sebelum menulis kode, dokumen, atau melakukan commit.

**Nama proyek:** KedeAwak
**Repo:** https://github.com/ZeaLIsHere/kedeawak-infest
**Konteks:** Lomba Informatics Festival XII, bidang Hackathon.

---

## 1. Sumber kebenaran

| Urutan | Sumber | Fungsi |
| --- | --- | --- |
| 1 | `docs/PRODUCT.md` | Kebenaran produk hasil ekstraksi proposal. Tidak boleh diubah tanpa persetujuan user. |
| 2 | `PLAN.md` | Rencana kerja induk. Satu satunya daftar pekerjaan yang dikerjakan. |
| 3 | `docs/SCOPE.md` | Batas fitur. Yang tidak ada di sini tidak dikerjakan. |
| 4 | `docs/ARCHITECTURE.md` | Keputusan teknis. |
| 5 | `docs/CONVENTIONS.md` | Aturan kode dan UI. |
| 6 | `docs/WORKFLOW.md` | Aturan git dan rilis. |
| 7 | Proposal asli | `Proposal_Infest_Hackathon_Tim_Raja_Ibelis_Aseli.pdf` (di luar repo). |

Jika dokumen di repo bertentangan dengan proposal, **dokumen di repo menang**,
karena sudah melalui proses keputusan. Jika dokumen bertentangan satu sama lain,
berhenti dan tanyakan ke user.

---

## 2. Aturan fokus (PALING PENTING)

> Semua fitur di web harus berjalan sesuai rencana di proposal.
> Fitur di luar web diabaikan.

Ini berarti:

1. **Kerjakan hanya yang ada di `PLAN.md`.** Tidak ada fitur bonus, tidak ada
   eksperimen, tidak ada penambahan di luar rencana.
2. **Fitur di luar web dikecualikan.** Yang tidak dibangun, dan tidak boleh
   ditambahkan kode, halaman, atau skema database untuk itu:
   - integrasi WhatsApp Business Cloud API ke nomor asli pelanggan
   - pembuatan akun dan verifikasi nomor oleh pelanggan warung
   - credit scoring dan penyaluran data ke bank atau koperasi
   - komisi B2B pemasok, billing, koin pintar, dan semua alur pembayaran
   - marketplace, rekonsiliasi bank, kampanye marketing
   - pembuatan dokumen bisnis (BMC, unit economics, pitch deck) di dalam app
3. **Tidak ada fitur setengah jadi yang tampil di UI.** Kalau tombol atau menu
   ada di layar, maka harus berfungsi. Kalau belum berfungsi, jangan tampilkan.
   Tidak ada menu "Coming soon". Tidak ada tombol mati.
4. **Data harus nyata dalam konteks demo.** Boleh memakai seed data, tetapi
   datanya harus mengalir lewat alur aplikasi yang sebenarnya (database, API,
   state), bukan angka hardcode yang ditempel di komponen.
5. **Kalau ragu apakah sesuatu masuk scope, tanyakan.** Jangan menebak dan
   jangan langsung membangun.

---

## 3. Larangan keras pada UI

Berlaku untuk **semua teks yang dilihat pengguna**: label, tombol, judul,
placeholder, pesan error, notifikasi, tooltip, dan isi seed data.

1. **Dilarang emoji.** Tidak ada emoji, symbol gambar, atau emoticon di UI,
   dalam bentuk apa pun. Ikon UI memakai ikon SVG dari library ikon
   (`lucide-react`), bukan emoji, bukan karakter unicode dekoratif.
2. **Dilarang tanda hubung `-` (hyphen/minus) dan semua varian dash**
   (`-`, `–`, `—`, `-`). Contoh yang salah: `Rp15.000-20.000`,
   `24 jam respons-otomatis`, `Belum-ada-data`.
   Cara penulisan yang benar:
   - rentang angka: `Rp15.000 sampai Rp20.000`
   - rentang tanggal: `1 sampai 7 Oktober 2026`
   - pemisah frasa: pakai spasi atau kata, bukan dash
   - nilai kosong: `Belum ada data`, bukan `-`
   - **Catatan penting:** pengganti karakter `-` tidak boleh diganti dengan
     karakter lain seperti `•`, `|`, atau `~` di dalam teks kalimat.
     Pemisah visual hanya boleh lewat elemen UI (border, divider, spacing).
3. **Dilarang lorem ipsum dan teks placeholder.** Semua teks harus teks asli
   berbahasa Indonesia yang relevan dengan warung dan UMKM.
4. **Dilarang bahasa Inggris di UI** kecuali istilah teknis yang tidak punya
   padanan lazim (misal `WhatsApp`, `OCR`, `stok`).
5. **Angka dan mata uang** memakai format Indonesia: `Rp150.000`,
   `1.250.000`, pemisah ribuan titik, pemisah desimal koma.

Pemeriksaan otomatis untuk aturan ini dijalankan lewat `npm run lint:ui`
(lihat `PLAN.md` fase 1). Commit yang melanggar aturan ini ditolak.

---

## 4. Skills yang wajib dipakai

Skills terpasang di `.claude/skills/` dan otomatis terdeteksi. Gunakan sesuai
kondisi:

| Kondisi | Skill |
| --- | --- |
| Sebelum mengerjakan fitur baru atau mengubah perilaku | `brainstorming` |
| Menyusun rencana multi langkah sebelum menyentuh kode | `writing-plans` |
| Mengeksekusi rencana di sesi ini | `executing-plans` |
| Mengerjakan rencana dengan beberapa subagent | `subagent-driven-development` |
| Ada dua atau lebih tugas independen | `dispatching-parallel-agents` |
| Merancang, membangun, atau memperbaiki UI dan UX | `ui-ux-pro-max` |
| Audit, polish, critique, atau perbaikan kualitas desain | `impeccable` |
| Menyusun token dan spesifikasi komponen | `design-system` |
| Membangun komponen dengan shadcn/ui dan Tailwind | `ui-styling` |
| Menulis fitur atau perbaikan bug | `test-driven-development` |
| Menghadapi bug atau perilaku tak terduga | `systematic-debugging` |
| Sebelum mengklaim pekerjaan selesai | `verification-before-completion` |
| Sebelum menyatakan tugas besar selesai | `requesting-code-review` |

Skill itu alat bantu, bukan pengganti aturan. Kalau instruksi skill bertentangan
dengan `AGENTS.md` atau `docs/SCOPE.md`, **aturan repo yang menang**.

Catatan teknis: skill `ui-ux-pro-max` menjalankan pencarian data lewat Python di
`scripts/search.py`. Python belum terpasang di mesin ini (lihat `PLAN.md` fase 0).

---

## 5. Git: commit dan push

Setiap perubahan kode atau penambahan fitur wajib di commit dan di push.

- **Remote:** `origin` → https://github.com/ZeaLIsHere/kedeawak-infest.git
- **Branch kerja:** `main` untuk repo ini, karena dikerjakan satu tim kecil
  dalam tempo lomba. Branch fitur opsional, tetapi wajib merge cepat.
- **Satu commit, satu perubahan bermakna.** Commit harus bisa dibalik sendiri.
- **Dilarang commit yang berisi `.env` atau rahasia apa pun.** Cek
  `.gitignore` sebelum commit pertama pada file baru.
- **Dilarang force push ke `main`.**

Format pesan commit (Conventional Commits, bahasa Indonesia untuk deskripsi):

```text
<tipe>(<area>): <ringkasan singkat>

<penjelasan opsional: apa yang berubah dan mengapa>

Refs: <ID tugas di PLAN.md>
```

Tipe yang dipakai: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`,
`perf`, `build`, `ci`.

Contoh:

```text
feat(laporan): tambah ringkasan penjualan harian

Menghitung total penjualan, pengeluaran, dan laba dari transaksi
yang tercatat pada periode harian.

Refs: T2.3
```

Detail alur, urutan perintah, dan penanganan kegagalan push ada di
`docs/WORKFLOW.md`.

---

## 6. Verifikasi sebelum mengklaim selesai

Dilarang menyatakan pekerjaan selesai berdasarkan keyakinan. Wajib bukti:

1. `npm run typecheck` lulus tanpa error.
2. `npm run lint` dan `npm run lint:ui` lulus.
3. `npm run build` lulus.
4. `npm test` lulus untuk unit test yang relevan.
5. Fitur yang dikerjakan dibuka dan dipakai di browser, dan hasilnya
   dilaporkan apa adanya, termasuk bila ada sisa masalah.

Kalau ada langkah yang tidak bisa dijalankan, katakan terus terang beserta
alasannya. Jangan menyembunyikan kegagalan.

---

## 7. Definisi selesai (Definition of Done)

Sebuah tugas dianggap selesai hanya jika:

- [ ] Fungsinya berjalan dan sudah diuji di browser.
- [ ] Sesuai `docs/SCOPE.md` dan tidak menambah fitur di luar scope.
- [ ] Mematuhi semua larangan UI di bagian 3.
- [ ] `typecheck`, `lint`, `lint:ui`, `build`, dan `test` lulus.
- [ ] Tidak ada `TODO` yang menggantung pada alur yang dipakai pengguna.
- [ ] Sudah di commit dan di push ke `origin`.
- [ ] Ada catatan singkat bukti verifikasi di deskripsi commit atau di laporan
      ke user.

---

## 8. Aturan komunikasi

1. **Selalu tanya jika butuh konteks.** Lebih baik satu pertanyaan daripada
   salah membangun. Kumpulkan pertanyaan, jangan menyebar satu per satu.
2. **Jangan mengarang.** Kalau tidak tahu versi library, skema API, atau maksud
   proposal, cek sumbernya atau tanyakan.
3. **Laporkan apa adanya.** Kalau sebuah pendekatan gagal, sampaikan.
4. **Bahasa:** dokumen internal dan percakapan memakai bahasa Indonesia. Kode,
   nama variabel, nama file, dan nama tabel memakai bahasa Inggris. Komentar
   kode singkat, bahasa Indonesia boleh, seperlunya saja.
5. **Jangan mengubah file di luar area tugas** tanpa alasan yang dijelaskan.

---

## 9. Konvensi kode ringkas

Detail lengkap ada di `docs/CONVENTIONS.md`. Ringkasnya:

- TypeScript strict. Tidak ada `any` tanpa alasan yang ditulis di komentar.
- Semua komponen React adalah Server Component kecuali butuh interaktivitas.
- Tidak ada angka atau teks yang di-hardcode di komponen. Ambil dari data.
- Semua akses data lewat satu lapisan (`src/lib/data/`), bukan langsung dari
  komponen ke database.
- Semua penggunaan AI lewat satu lapisan (`src/lib/ai/`), bukan tersebar.
