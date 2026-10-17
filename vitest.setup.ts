import { randomBytes } from "node:crypto";

/*
 * Kunci enkripsi untuk pengujian.
 *
 * Lapisan data menyandikan nama dan nomor telepon pelanggan, sehingga
 * pengujiannya memerlukan `FIELD_ENCRYPTION_KEY`. Nilainya dibuat acak setiap
 * kali dijalankan, jadi tidak ada data uji yang dapat dibuka dengan kunci lain.
 * Lingkungan asli memakai kunci dari `.env.local`.
 */
process.env.FIELD_ENCRYPTION_KEY ??= randomBytes(32).toString("hex");
