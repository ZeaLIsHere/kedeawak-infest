# WORKFLOW.md

Alur kerja git dan verifikasi. Mengikat semua agent dan kontributor.

Aturan induk dari user: setiap perubahan kode atau penambahan fitur wajib
di commit dan di push.

---

## 1. Pengaturan awal yang belum selesai

Tiga hal ini harus dibereskan sebelum commit pertama bisa dikirim.

| Hal | Status | Yang dibutuhkan |
| --- | --- | --- |
| Remote `origin` | Belum diatur | Sudah ditentukan: https://github.com/ZeaLIsHere/kedeawak-infest.git |
| Identitas git: `user.name` dan `user.email` | Kosong | Nilai dari user |
| Autentikasi push | Belum ada | Kredensial GitHub, karena `gh` tidak terpasang dan helper kredensial kosong |

Perintah yang akan dijalankan setelah nilainya diberikan:

```bash
git remote add origin https://github.com/ZeaLIsHere/kedeawak-infest.git
git config user.name "<nama>"
git config user.email "<email>"
git branch -M main
```

Untuk autentikasi, pilihan yang tersedia di mesin ini:

1. **Personal access token disimpan di helper kredensial.** Sekali kirim,
   tersimpan permanen di Windows Credential Manager.
2. **Kredensial yang sudah ada.** Bila GitHub Desktop atau klien lain pernah
   dipakai, kredensialnya mungkin sudah tersimpan.
3. **SSH key.** Perlu mengubah remote menjadi bentuk SSH.

Kalau tidak ditemukan cara yang bersih, tanyakan ke user. Jangan menulis token
ke dalam file apa pun di dalam repo.

---

## 2. Siklus kerja satu tugas

Untuk setiap tugas di `PLAN.md`:

1. **Baca konteks.** `AGENTS.md`, `docs/PRODUCT.md`, `docs/SCOPE.md`, dan
   bagian `PLAN.md` yang relevan.
2. **Pastikan masuk scope.** Kalau tidak ada di `docs/SCOPE.md`, jangan kerjakan.
3. **Kerjakan.** Ikuti `docs/CONVENTIONS.md`.
4. **Verifikasi.** Jalankan perintah di bagian 4 di bawah.
5. **Commit.** Satu commit untuk satu perubahan bermakna.
6. **Push.** Langsung setelah commit, tanpa menumpuk beberapa commit lokal.
7. **Lapor.** Sebutkan apa yang berubah, bukti verifikasi, dan sisa masalah
   bila ada.

## 3. Cabang

Repo dikerjakan satu tim kecil dalam tempo lomba. Karena itu:

- **`main` adalah cabang kerja utama.**
- Cabang fitur dipakai hanya bila sebuah perubahan berisiko merusak `main`,
  misalnya penggantian skema basis data.
- Cabang fitur wajib digabung dalam waktu satu sesi kerja. Jangan dibiarkan
  menggantung.
- **Dilarang `git push --force` ke `main`.**
- **Dilarang menulis riwayat ulang `main`** dengan rebase atau amend pada
  commit yang sudah di push.

Penamaan cabang bila dipakai: `<tipe>/<id-tugas>-<ringkasan-singkat>`,
contohnya `feat/t2-1-kanal-whatsapp`.

## 4. Pemeriksaan sebelum commit

Urutan wajib. Semua harus lulus.

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run lint:ui       # larangan emoji dan tanda hubung pada teks UI
npm test              # vitest run
npm run build         # next build
```

Sebelum menyatakan sebuah fitur selesai, jalankan juga alur browser:

```bash
npm run test:e2e      # playwright
```

Aturan:

1. Kalau ada langkah yang gagal, perbaiki dulu. Jangan commit keadaan yang
   gagal, kecuali user secara eksplisit meminta commit sementara.
2. Kalau sebuah langkah tidak bisa dijalankan sama sekali, katakan terus
   terang dan jangan mengaku sudah diverifikasi.
3. Dilarang melaporkan "sudah lulus" tanpa melihat keluaran perintahnya.

## 5. Pesan commit

Bentuk:

```text
<tipe>(<area>): <ringkasan singkat>

<penjelasan opsional>

Refs: <ID tugas di PLAN.md>
```

Aturan penulisan:

1. Ringkasan ditulis dengan huruf kecil, tanpa titik di akhir, maksimal 72
   karakter.
2. Ringkasan memakai kata kerja: "tambah", "perbaiki", "ubah", "hapus".
3. Area memakai nama modul, contohnya `dasbor`, `percakapan`, `laporan`,
   `stok`, `persetujuan`, `whatsapp`, `db`, `ai`, `docs`, `chore`.
4. Tulis alasan pada badan pesan bila perubahan tidak jelas dari ringkasannya.
5. **Dilarang menulis emoji pada pesan commit.**
6. Bila ada perubahan yang mengubah perilaku, sebutkan bukti verifikasinya
   secara singkat.

Contoh yang benar:

```text
feat(stok): tambah alert stok menipis dan draft PO

Menghitung stok terkini dari stock_movements, membandingkan dengan
ambang minimum, lalu membuat draft PO ke antrean persetujuan.

Verifikasi: npm run typecheck, npm run lint:ui, npm test lulus.
Refs: T2.2
```

## 6. Aturan berkas

Sebelum menambahkan berkas atau folder baru, lewati uji ini lebih dulu.

**Uji tiga pertanyaan:**

1. Ini karya tim, atau perkakas yang bisa dipasang ulang? Karya tim masuk repo.
   Perkakas yang bisa dipasang ulang tidak masuk, cukup dicatat cara
   memasangnya.
2. Ini sumber, atau hasil bangun? Sumber masuk repo. Hasil bangun tidak.
3. Ini berisi rahasia atau data pribadi? Kalau ya, tidak masuk repo, dalam
   bentuk apa pun.

Kalau ragu pada pertanyaan pertama, tanyakan ke user. Jangan menebak.

Contoh keputusan yang sudah diambil:

| Berkas | Masuk repo | Alasan |
| --- | --- | --- |
| `docs/`, `AGENTS.md`, `PLAN.md` | Ya | Sumber keputusan proyek, dipakai tim dan juri |
| `src/` | Ya | Karya tim |
| `.env.example` | Ya | Daftar nama variabel, tanpa nilai rahasia |
| `.env.local` | Tidak | Memuat rahasia |
| `node_modules/`, `.next/` | Tidak | Hasil pemasangan dan hasil bangun, dapat dibuat ulang dari `package.json` |
| `.pglite/`, `*.db` | Tidak | Berkas basis data lokal |
| `.claude/skills/` | Ya, sudah terlanjur | Perkakas pihak ketiga. Disetujui user untuk dibiarkan. Untuk perkakas baru sejenis, jangan ditambahkan, cukup catat di `docs/THIRD-PARTY-SKILLS.md` |

Yang **tidak boleh** masuk git:

- `.env` dan semua variannya kecuali `.env.example`
- kunci API, token, kata sandi, dan nomor telepon asli
- `node_modules`, `.next`, `coverage`, dan berkas hasil build
- berkas basis data lokal bila berbentuk berkas, misalnya `*.db`
- gambar dan media hasil unggahan pengguna

Yang **wajib** masuk git:

- seluruh kode sumber di `src/`
- migrasi basis data
- skrip seed
- berkas konfigurasi proyek
- seluruh dokumen di `docs/`, `AGENTS.md`, `DESIGN.md`, dan `PLAN.md`

`.env.example` harus memuat semua nama variabel yang dibutuhkan, dalam bentuk
kosong atau contoh, tanpa nilai rahasia.

## 7. Ketika push gagal

| Gejala | Tindakan |
| --- | --- |
| Menolak karena non fast forward | `git pull --rebase origin main`, selesaikan konflik, ulangi pemeriksaan, lalu push lagi |
| Diminta kredensial berulang | Hentikan. Tanyakan ke user cara autentikasi yang benar. Jangan menulis token ke berkas |
| Ditolak karena berkas besar | Kecilkan berkasnya. Jangan menambahkan Git LFS tanpa persetujuan user |
| Tidak ada jaringan | Sampaikan ke user. Commit lokal boleh dibuat, tetapi status "belum di push" harus dilaporkan apa adanya |

## 8. Penyelarasan dokumen

Setiap perubahan yang mengubah perilaku wajib ikut memperbarui dokumen yang
terkait, dalam commit yang sama:

| Perubahan | Dokumen yang ikut diubah |
| --- | --- |
| Menambah atau mengubah permukaan aplikasi | `docs/SCOPE.md`, `PLAN.md` |
| Mengubah tabel atau kolom | `docs/ARCHITECTURE.md` |
| Mengubah pilihan teknologi | `docs/ARCHITECTURE.md` |
| Mengubah aturan UI atau kode | `docs/CONVENTIONS.md` |
| Menyelesaikan tugas | `PLAN.md`, tandai selesai |

## 9. Ringkasan alur satu perubahan

```text
baca konteks  ->  pastikan masuk scope  ->  kerjakan
      ->  typecheck dan lint dan lint:ui dan test dan build
      ->  commit dengan format yang benar
      ->  push ke origin main
      ->  lapor apa adanya
```
