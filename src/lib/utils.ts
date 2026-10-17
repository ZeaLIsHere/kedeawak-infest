import { createCn } from "cn/config";

/**
 * Penggabung nama kelas, sadar akan token ukuran huruf proyek ini.
 *
 * Mesin bawaan hanya mengenal ukuran huruf bawaan Tailwind. Ukuran huruf kita,
 * misalnya `text-body` dan `text-caption`, dianggapnya sebagai warna teks.
 * Akibatnya, saat digabung dengan kelas warna seperti `text-muted-foreground`,
 * salah satunya dibuang dan label memakai ukuran bawaan peramban, bukan token
 * di `src/styles/tokens/`.
 *
 * Daftar di bawah harus sejalan dengan pemetaan `--text-` pada
 * `src/app/globals.css`. Bila token ukuran huruf bertambah, tambahkan juga di
 * sini. Karena alasan ini pula seluruh komponen mengambil `cn` dari berkas ini,
 * bukan langsung dari paket `cn`.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "caption",
            "body",
            "section-title",
            "page-title",
            "metric-label",
            "metric",
          ],
        },
      ],
    },
  },
});
