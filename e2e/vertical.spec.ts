import { expect, test, type Page } from "@playwright/test";

/*
 * Uji peramban potongan vertikal: aliran dari data demo sampai ke layar.
 *
 * Uji ini memerlukan basis data lokal yang sudah diisi data demo
 * (`npm run db:migrate` lalu `npm run db:seed`). Kedua proyek lebar layar pada
 * `playwright.config.ts` ikut menjalankannya, sehingga tata letak tabel dan
 * daftar kartu sama sama diperiksa.
 */

/**
 * Teks yang benar benar tampil di layar.
 *
 * Daftar produk memuat dua bentuk sekaligus, yaitu tabel untuk layar lebar dan
 * daftar kartu untuk layar sempit. Yang tersembunyi oleh CSS tetap ada di dalam
 * dokumen, sehingga penyaring `visible` dipakai supaya yang diperiksa memang
 * bentuk yang sedang tampil.
 */
const visibleText = (page: Page, text: string) =>
  page.getByText(text, { exact: true }).filter({ visible: true });

/** Jumlah produk pada data demo, sesuai `DEMO_PRODUCTS` di `src/lib/db/seed.ts`. */
const JUMLAH_PRODUK_DEMO = 20;

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
    await expect(visibleText(page, "Laba").first()).toBeVisible();

    await expectNoClippedText(page, visibleRupiah(page));
    await expectNoHorizontalScroll(page);
  });

  test("menampilkan produk yang stoknya menipis", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Stok menipis" })).toBeVisible();
    await expect(visibleText(page, "Sarden Kaleng").first()).toBeVisible();
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
    await expect(visibleText(page, "Sarden Kaleng").first()).toBeVisible();

    /* Dua alert aktif dari data demo, sesuai isi seed. */
    await expect(kartuAlert.locator('[data-slot="badge"]')).toHaveCount(2);

    /* Kedua bentuk daftar memuat seluruh produk demo, yang tampil maupun tidak. */
    await expect(kartuProduk.locator("table tbody tr")).toHaveCount(JUMLAH_PRODUK_DEMO);
    await expect(kartuProduk.locator("ul > li")).toHaveCount(JUMLAH_PRODUK_DEMO);

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
