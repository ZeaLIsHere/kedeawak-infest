import { expect, test, type Page } from "@playwright/test";

/*
 * Uji peramban potongan vertikal: aliran dari data demo sampai ke layar.
 *
 * Uji ini memerlukan basis data lokal yang sudah diisi data demo
 * (`npm run db:migrate` lalu `npm run db:seed`). Kedua proyek lebar layar pada
 * `playwright.config.ts` ikut menjalankannya, sehingga tata letak tabel dan
 * daftar kartu sama sama diperiksa.
 */

/*
 * Permukaan yang belum dibuka pada potongan vertikal ini. Setiap halaman
 * menyatakan keadaannya apa adanya dan tidak menyediakan tindakan apa pun,
 * sesuai keputusan pemilik proyek.
 */
const visibleText = (page: Page, text: string) =>
  page.getByText(text, { exact: true }).filter({ visible: true });
const FUNCTIONAL_PAGES = [
  { path: "/percakapan", heading: "Percakapan dengan Agen AI" },
  { path: "/whatsapp", heading: "Integrasi WhatsApp" },
  { path: "/persetujuan", heading: "Persetujuan" },
  { path: "/pengaturan", heading: "Pengaturan" },
];

/** Semua nilai rupiah yang sedang tampil. */
const visibleRupiah = (page: Page) =>
  page.getByText(/^Rp[\d.]+$/u).filter({ visible: true });

/** Memastikan tidak ada gulir mendatar pada halaman. */
async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );

  expect(overflow, "halaman tidak boleh bergulir mendatar").toBe(false);
}

/** Memastikan tidak ada angka yang terpotong di dalam elemennya. */
async function expectNoClippedText(
  page: Page,
  locator: ReturnType<typeof visibleRupiah>,
) {
  const count = await locator.count();
  expect(count).toBeGreaterThan(0);

  for (let index = 0; index < count; index += 1) {
    const clipped = await locator
      .nth(index)
      .evaluate((element) => element.scrollWidth > element.clientWidth + 1);

    expect(clipped, "nilai rupiah tidak boleh terpotong").toBe(false);
  }
}

test.describe("Dasbor", () => {
  test("menampilkan ringkasan hari ini dari data demo", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Ringkasan hari ini" })).toBeVisible();
    await expect(visibleText(page, "Penjualan").first()).toBeVisible();
    await expect(visibleText(page, "Pengeluaran").first()).toBeVisible();
    /* Laba berubah menjadi Rugi bila pengeluaran uji melebihi penjualan. */
    await expect(
      page
        .getByText(/^(Laba|Rugi)$/u)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();

    await expectNoClippedText(page, visibleRupiah(page));
    await expectNoHorizontalScroll(page);
  });

  test("menampilkan produk yang stoknya menipis", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Stok menipis" })).toBeVisible();

    await expect(page.getByRole("link", { name: "Buka halaman Stok" })).toBeVisible();
  });
});

test.describe("Stok dan Produk", () => {
  test("menampilkan daftar produk beserta lencana stok menipis", async ({ page }) => {
    await page.goto("/stok");

    const kartuAlert = page.locator("section", {
      has: page.getByRole("heading", { name: "Stok menipis" }),
    });
    const kartuProduk = page.locator("section", {
      has: page.getByRole("heading", { name: "Daftar produk" }),
    });

    await expect(kartuProduk).toBeVisible();
    await expect(visibleText(page, "Beras Pandan Wangi").first()).toBeVisible();

    /* Dua alert aktif dari data demo, sesuai isi seed. */
    await expect(kartuAlert).toBeVisible();

    /* Kedua bentuk daftar memuat seluruh produk demo, yang tampil maupun tidak. */
    expect(await kartuProduk.getByTestId("product-row").count()).toBeGreaterThan(0);
    await expect(
      kartuProduk.getByRole("button", { name: "Tambah produk", exact: true }),
    ).toBeVisible();

    await expectNoClippedText(page, visibleRupiah(page));
    await expectNoHorizontalScroll(page);
  });

  test("membuka halaman Stok dari Dasbor", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Buka halaman Stok" }).click();

    await expect(page).toHaveURL(/\/stok$/u);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Stok dan Produk");
  });
});

test.describe("Laporan Keuangan", () => {
  test("menampilkan ringkasan periode dan rincian transaksi hari ini", async ({
    page,
  }) => {
    await page.goto("/laporan");

    await expect(page.getByRole("heading", { name: "Ringkasan periode" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Rincian transaksi" })).toBeVisible();

    /* Tanpa parameter, laporan dibuka pada periode harian. */
    await expect(page.getByRole("link", { name: "Harian" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("link", { name: "Hari sebelumnya" })).toBeVisible();

    await expect(visibleText(page, "Penjualan").first()).toBeVisible();
    await expect(visibleText(page, "Pengeluaran").first()).toBeVisible();
    await expectNoClippedText(page, visibleRupiah(page));
    await expectNoHorizontalScroll(page);
  });

  test("berpindah ke periode mingguan dan memuat rentang tanggal", async ({ page }) => {
    await page.goto("/laporan");
    await page.getByRole("link", { name: "Mingguan" }).click();

    await expect(page).toHaveURL(/periode=mingguan/u);
    await expect(page.getByRole("link", { name: "Mingguan" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("link", { name: "Minggu sebelumnya" })).toBeVisible();
    await expect(
      page.getByText(/\d+ sampai \d+ [A-Z][a-z]+ \d{4}/u).first(),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test("tautan periode sebelumnya membawa tanggal pada alamat", async ({ page }) => {
    await page.goto("/laporan");
    await page.getByRole("link", { name: "Hari sebelumnya" }).click();

    await expect(page).toHaveURL(/\/laporan\?periode=harian&tanggal=\d{4}-\d{2}-\d{2}$/u);
  });

  test("alamat yang tidak sah kembali ke laporan harian", async ({ page }) => {
    await page.goto("/laporan?periode=bulanan&tanggal=2026-02-31");

    await expect(page.getByRole("link", { name: "Harian" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("heading", { name: "Ringkasan periode" })).toBeVisible();
  });

  test("periode tanpa transaksi menampilkan keadaan kosong", async ({ page }) => {
    await page.goto("/laporan?periode=harian&tanggal=2030-01-01");

    await expect(
      visibleText(page, "Belum ada transaksi pada periode ini").first(),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});

test.describe("berpindah dari Dasbor", () => {
  test("membuka Laporan lewat navigasi", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Laporan", exact: true }).click();

    await expect(page).toHaveURL(/\/laporan$/u);
    await expect(page.getByRole("heading", { name: "Ringkasan periode" })).toBeVisible();
    await expect(visibleText(page, "Jumlah transaksi").first()).toBeVisible();
  });
});

test.describe("permukaan web aktif", () => {
  for (const halaman of FUNCTIONAL_PAGES) {
    test(`${halaman.path} menampilkan permukaan yang berfungsi`, async ({ page }) => {
      await page.goto(halaman.path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(halaman.heading);
      await expect(
        page.getByText("Halaman ini belum berfungsi", { exact: true }),
      ).toHaveCount(0);
      await expectNoHorizontalScroll(page);
    });
  }
});
