import { expect, test } from "@playwright/test";

test("profil pemilik dapat disimpan dan dipakai ulang", async ({ page }) => {
  await page.goto("/pengaturan");

  await expect(
    page.getByRole("heading", { name: "Profil pemilik dan usaha" }),
  ).toBeVisible();

  await page.getByLabel("Nama pemilik").fill("Rina Uji");
  await page.getByLabel("Jenis usaha").fill("Sembako");
  await page.getByLabel("Alamat").fill("Jalan Melati nomor 12");
  await page.getByLabel("Nomor telepon").fill("081234567890");
  await page.getByLabel("Deskripsi usaha").fill("Melayani pesanan WhatsApp.");

  await page.getByRole("button", { name: "Simpan profil" }).click();
  await expect(page.getByRole("status")).toContainText("Profil tersimpan");

  await page.reload();
  await expect(page.getByLabel("Nama pemilik")).toHaveValue("Rina Uji");
  await expect(page.getByLabel("Jenis usaha")).toHaveValue("Sembako");
  await expect(page.getByLabel("Alamat")).toHaveValue("Jalan Melati nomor 12");
});
