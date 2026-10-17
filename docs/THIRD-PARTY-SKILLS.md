# Third Party Skills

Catatan asal usul, lisensi, dan perubahan pada skills pihak ketiga yang
terpasang di `.claude/skills/`.

Skills ini adalah alat bantu kerja agent. Skills tidak dipanggil oleh kode
aplikasi, tidak ikut dibangun, dan tidak memengaruhi hasil build.

---

## 1. Daftar skills terpasang

| Skill | Sumber | Lisensi | Commit | Tanggal |
| --- | --- | --- | --- | --- |
| `ui-ux-pro-max` | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | MIT | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 2026-10-15 |
| `design-system` | sama dengan di atas | MIT | sama | sama |
| `ui-styling` | sama dengan di atas | MIT | sama | sama |
| `impeccable` | https://github.com/pbakaus/impeccable | Apache 2.0 | `6af45ac9a5eb8792f033d3242f52e99812fd91fa` | 2026-10-16 |
| `using-superpowers` | https://github.com/obra/superpowers | MIT | `bb92a77741419a4ab5f06e711a283343f1ada0c3` | 2026-10-09 |
| `brainstorming` | sama dengan di atas | MIT | sama | sama |
| `writing-plans` | sama dengan di atas | MIT | sama | sama |
| `executing-plans` | sama dengan di atas | MIT | sama | sama |
| `subagent-driven-development` | sama dengan di atas | MIT | sama | sama |
| `dispatching-parallel-agents` | sama dengan di atas | MIT | sama | sama |
| `test-driven-development` | sama dengan di atas | MIT | sama | sama |
| `systematic-debugging` | sama dengan di atas | MIT | sama | sama |
| `requesting-code-review` | sama dengan di atas | MIT | sama | sama |
| `receiving-code-review` | sama dengan di atas | MIT | sama | sama |
| `verification-before-completion` | sama dengan di atas | MIT | sama | sama |

Berkas lisensi asli disimpan di dalam repo:

- `.claude/skills/ui-ux-pro-max/LICENSE` (MIT, dari repo ui-ux-pro-max-skill)
- `.claude/skills/impeccable/LICENSE` (Apache 2.0, dari repo impeccable)
- `.claude/skills/LICENSE-superpowers-MIT.txt` (MIT, dari repo superpowers)

## 2. Alasan pemilihan

| Skill | Dipakai untuk |
| --- | --- |
| `ui-ux-pro-max` | Basis data gaya, palet, pasangan font, pedoman UX, dan arahan khusus stack Next.js saat merancang antarmuka |
| `design-system` | Menyusun token tiga lapis dan spesifikasi komponen |
| `ui-styling` | Membangun komponen dengan shadcn/ui dan Tailwind, termasuk tema dan mode gelap bila diperlukan |
| `impeccable` | Audit, critique, polish, dan perbaikan kualitas desain sebelum demo |
| `brainstorming` | Menggali maksud sebelum membangun fitur baru |
| `writing-plans` | Menyusun rencana multi langkah |
| `executing-plans` | Menjalankan rencana di sesi ini |
| `subagent-driven-development` | Menjalankan rencana memakai beberapa subagent |
| `dispatching-parallel-agents` | Menjalankan tugas yang saling bebas secara paralel |
| `test-driven-development` | Menulis uji sebelum kode implementasi |
| `systematic-debugging` | Menangani bug secara sistematis |
| `requesting-code-review` | Meninjau pekerjaan sebelum dinyatakan selesai |
| `receiving-code-review` | Menanggapi hasil tinjauan dengan benar |
| `verification-before-completion` | Memastikan klaim selesai didukung bukti |

## 3. Perubahan terhadap berkas asli

Perubahan ini dicatat agar dapat ditelusuri.

1. **`ui-styling` tanpa folder `canvas-fonts`.** Folder tersebut berisi sekitar
   90 berkas font dengan ukuran sekitar 5,8 MB yang hanya dipakai untuk fitur
   desain kanvas. Fitur itu tidak dipakai pada proyek web ini. Sisanya utuh.
2. **`ui-styling` tanpa dua berkas artefak.** Berkas `scripts/.coverage` dan
   `scripts/tests/coverage-ui.json` adalah hasil pengukuran cakupan uji dari
   repo asal, bukan bagian dari isi skill. Keduanya dibuang.
3. Selain butir 1 dan 2, tidak ada berkas skill yang diubah. Isi skill disimpan
   apa adanya.

## 4. Perbedaan yang perlu diketahui

1. **Penamaan skill.** Skills dari Superpowers memakai bentuk
   `superpowers:nama-skill` di dokumentasinya. Di OpenCode penamaan itu tidak
   berlaku, sehingga rujukan ditulis dengan nama skill langsung, contohnya
   `writing-plans`. Bila sebuah skill merujuk skill lain dengan awalan
   `superpowers:`, abaikan awalannya.
2. **Python.** Skill `ui-ux-pro-max` menjalankan pencarian lewat
   `scripts/search.py`. Python belum terpasang di mesin ini. Selama belum
   dipasang, data CSV di `.claude/skills/ui-ux-pro-max/data/` dibaca langsung
   dengan alat lain, dan hal itu dilaporkan apa adanya.
3. **Biner `impeccable`.** Skill `impeccable` memakai peluncur di
   `scripts/impeccable.cmd` yang mengunduh biner sekali saat pertama dipakai.
   Saat pertama dijalankan, jaringan dibutuhkan. Bila gagal, skill
   memerintahkan membaca `PRODUCT.md` dan `DESIGN.md` secara langsung, dan itu
   yang akan dilakukan.
4. **Peran skill terhadap aturan repo.** Bila instruksi sebuah skill
   bertentangan dengan `AGENTS.md`, `docs/SCOPE.md`, atau `docs/CONVENTIONS.md`,
   aturan repo yang menang.

## 5. Cara memperbarui

```bash
git clone --depth 1 --filter=blob:none --sparse <url-repo> <folder-sementara>
cd <folder-sementara>
git sparse-checkout set <folder-skill>
```

Lalu salin ulang ke `.claude/skills/`, dan perbarui tabel di bagian 1 dengan
commit dan tanggal terbaru.

Untuk repo `impeccable` yang berukuran sangat besar, wajib memakai
`--filter=blob:none --sparse` supaya sumber bahasa Rust yang tidak diperlukan
tidak ikut terunduh.

## 6. Pemakaian ulang oleh pihak lain

Repo ini memuat karya pihak ketiga di bawah lisensi MIT dan Apache 2.0. Bila
sebagian repo ini dipakai ulang, ketentuan lisensi masing masing tetap
melekat pada berkas skill tersebut, terpisah dari ketentuan proyek KedeAwak.
