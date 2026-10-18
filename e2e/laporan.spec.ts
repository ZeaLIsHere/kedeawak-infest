import { expect, test } from "@playwright/test";

test("pengeluaran manual tersimpan dan tampil di laporan", async ({ page }) => {
  const description = `Beli gas uji ${Date.now()}`;

  await page.goto("/laporan");
  await page.getByLabel("Keterangan").fill(description);
  await page.getByLabel("Nominal").fill("50000");
  await page.getByRole("button", { name: "Simpan pengeluaran" }).click();

  await expect(page.getByRole("status")).toContainText("Pengeluaran tersimpan");

  await page.reload();
  await expect(page.getByText(description)).toBeVisible();

  await page.getByRole("button").filter({ hasText: description }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Rincian transaksi" })).toBeVisible();
  await expect(dialog.getByText(/tidak memiliki rincian item/u)).toBeVisible();
  await expect(dialog.getByText("Total transaksi")).toBeVisible();
});
