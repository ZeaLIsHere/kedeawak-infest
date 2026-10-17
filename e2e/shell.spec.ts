import { expect, test, type Page } from "@playwright/test";

/** Setiap tujuan beserta judul halaman yang harus tampil. */
const DESTINATIONS: readonly { path: string; heading: string }[] = [
  { path: "/", heading: "Dasbor" },
  { path: "/kasir", heading: "Kasir" },
  { path: "/percakapan", heading: "Percakapan dengan Agen AI" },
  { path: "/whatsapp", heading: "Integrasi WhatsApp" },
  { path: "/laporan", heading: "Laporan Keuangan" },
  { path: "/stok", heading: "Stok dan Produk" },
  { path: "/persetujuan", heading: "Persetujuan" },
  { path: "/pengaturan", heading: "Pengaturan" },
];

/** Tujuan yang tampil langsung pada batang bawah layar sempit. */
const BOTTOM_BAR_LABELS: readonly string[] = ["Dasbor", "Agen AI", "Kasir", "Laporan"];

/** Tujuan yang tersembunyi di dalam lembar menu Lainnya. */
const SHEET_LABELS: readonly string[] = ["WhatsApp", "Stok", "Persetujuan", "Pengaturan"];

const NARROW_PROJECT = "layar-sempit";

const sidebar = (page: Page) =>
  page.getByRole("navigation", { name: "Navigasi halaman" });
const bottomBar = (page: Page) =>
  page.getByRole("navigation", { name: "Navigasi bawah" });

test.describe("setiap tujuan dapat dibuka", () => {
  for (const destination of DESTINATIONS) {
    test(`${destination.path} menampilkan ${destination.heading}`, async ({ page }) => {
      const response = await page.goto(destination.path);

      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        destination.heading,
      );
      await expect(page).toHaveTitle("KedeAwak");
    });
  }

  test("tidak ada galat konsol saat seluruh tujuan dibuka", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(message.text());
      }
    });
    page.on("pageerror", (error) => errors.push(error.message));

    for (const destination of DESTINATIONS) {
      await page.goto(destination.path);
    }

    expect(errors).toEqual([]);
  });
});

test.describe("berpindah tujuan", () => {
  test("memilih tujuan dari batang bawah", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== NARROW_PROJECT, "batang bawah tersembunyi");

    await page.goto("/");
    await bottomBar(page).getByRole("link", { name: "Laporan" }).click();

    await expect(page).toHaveURL(/\/laporan$/u);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Laporan Keuangan");
  });

  test("memilih tujuan dari sisi navigasi", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === NARROW_PROJECT, "sisi navigasi tersembunyi");

    await page.goto("/");
    await sidebar(page).getByRole("link", { name: "Stok" }).click();

    await expect(page).toHaveURL(/\/stok$/u);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Stok dan Produk");
  });
});

test.describe("sisi navigasi pada layar 64rem ke atas", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === NARROW_PROJECT, "hanya untuk layar lebar");
    await page.goto("/");
  });

  test("menampilkan tujuh tujuan dan menyembunyikan batang bawah", async ({ page }) => {
    await expect(sidebar(page)).toBeVisible();
    await expect(sidebar(page).getByRole("link")).toHaveCount(DESTINATIONS.length);
    await expect(page.locator("aside")).toBeVisible();
    await expect(bottomBar(page)).toBeHidden();
  });

  test("menandai tepat satu tujuan sebagai halaman aktif", async ({ page }) => {
    await page.goto("/stok");

    const active = sidebar(page).locator('a[aria-current="page"]');
    await expect(active).toHaveCount(1);
    await expect(active).toHaveText("Stok");
  });

  test("sasaran sentuh setiap tujuan memadai", async ({ page }) => {
    const links = sidebar(page).getByRole("link");
    const count = await links.count();

    for (let index = 0; index < count; index += 1) {
      const box = await links.nth(index).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe("batang bawah pada layar di bawah 64rem", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== NARROW_PROJECT, "hanya untuk layar sempit");
    await page.goto("/");
  });

  test("menampilkan empat tujuan dan tombol Lainnya", async ({ page }) => {
    await expect(bottomBar(page)).toBeVisible();
    await expect(page.locator("aside")).toBeHidden();
    await expect(bottomBar(page).getByRole("link")).toHaveCount(BOTTOM_BAR_LABELS.length);

    for (const label of BOTTOM_BAR_LABELS) {
      await expect(bottomBar(page).getByRole("link", { name: label })).toBeVisible();
    }

    await expect(bottomBar(page).getByRole("button", { name: "Lainnya" })).toBeVisible();
  });

  test("sasaran sentuh setiap tujuan memadai", async ({ page }) => {
    const links = bottomBar(page).getByRole("link");
    const count = await links.count();

    for (let index = 0; index < count; index += 1) {
      const box = await links.nth(index).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });

  test("tombol Lainnya membuka lembar berisi tiga tujuan", async ({ page }) => {
    await bottomBar(page).getByRole("button", { name: "Lainnya" }).click();

    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("heading", { name: "Menu lainnya" })).toBeVisible();

    for (const label of SHEET_LABELS) {
      await expect(sheet.getByRole("link", { name: label })).toBeVisible();
    }
  });

  test("lembar menutup setelah tujuan di dalamnya dipilih", async ({ page }) => {
    await bottomBar(page).getByRole("button", { name: "Lainnya" }).click();

    const sheet = page.getByRole("dialog");
    await sheet.getByRole("link", { name: "Persetujuan" }).click();

    await expect(page).toHaveURL(/\/persetujuan$/u);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Persetujuan");
    await expect(sheet).toBeHidden();
  });
});
