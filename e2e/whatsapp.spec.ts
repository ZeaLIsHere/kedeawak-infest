import { expect, test } from "@playwright/test";

test("halaman WhatsApp menampilkan koneksi Fonnte dan daftar pesanan", async ({
  page,
}) => {
  await page.goto("/whatsapp");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Integrasi WhatsApp");
  await expect(page.getByRole("heading", { name: "Koneksi WhatsApp" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Hubungkan WhatsApp|Periksa koneksi/u }),
  ).toBeVisible();

  const newOrder = page.getByText("Pesanan baru", { exact: true }).first();
  if (await newOrder.isVisible().catch(() => false)) {
    await expect(
      page.getByRole("button", { name: "Konfirmasi pesanan" }).first(),
    ).toBeVisible();
  }
  await expect(
    page
      .getByRole("heading", { name: "Pesanan dari WhatsApp" })
      .or(page.getByText("Belum ada data warung")),
  ).toBeVisible();

  await expect(page.getByRole("button", { name: "Kirim pesan simulasi" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Hubungkan simulasi" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Koneksi nomor" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Data pelanggan" })).toHaveCount(0);
  await expect(page.getByText("Pengaturan koneksi dan data pelanggan")).toHaveCount(0);
  await expect(page.getByRole("log")).toHaveCount(0);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );

  expect(overflow).toBe(false);
});

test("pengaturan menjelaskan persetujuan dan privasi", async ({ page }) => {
  await page.goto("/pengaturan");

  await expect(
    page.getByRole("heading", { name: "Persetujuan pemrosesan pesan" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Privasi data pelanggan" }),
  ).toBeVisible();
});
