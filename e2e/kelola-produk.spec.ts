import { expect, test } from "@playwright/test";

test("produk dapat dibuat diubah diarsipkan dan diaktifkan kembali", async ({
  page,
}, info) => {
  const name = `Biskuit uji ${info.project.name.replaceAll("-", " ")} ${Date.now()}`;
  await page.goto("/stok");
  await page.getByRole("button", { name: "Tambah produk", exact: true }).click();
  await page.getByRole("button", { name: "Isi sendiri", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nama produk", { exact: true }).fill(name);
  await dialog.getByLabel("Satuan", { exact: true }).fill("bungkus");
  await dialog.getByLabel("Harga jual", { exact: true }).fill("5000");
  await dialog.getByLabel("Harga beli", { exact: true }).fill("3000");
  await dialog.getByLabel("Stok", { exact: true }).fill("7");
  await dialog.getByLabel("Ambang minimum", { exact: true }).fill("2");
  await dialog.getByRole("button", { name: "Simpan produk", exact: true }).click();
  await expect(dialog).toBeHidden();
  const row = page.getByTestId("product-row").filter({ hasText: name });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Ubah", exact: true }).click();
  await dialog.getByLabel("Stok", { exact: true }).fill("9");
  await dialog
    .getByLabel("Alasan perubahan stok", { exact: true })
    .fill("Penghitungan ulang persediaan");
  await dialog.getByRole("button", { name: "Simpan produk", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(row.getByTestId("product-stock")).toHaveText("9");
  await row.getByRole("button", { name: "Arsipkan", exact: true }).click();
  await dialog.getByRole("button", { name: "Arsipkan produk", exact: true }).click();
  await expect(row).toHaveCount(0);
  await page.getByText("Produk arsip", { exact: true }).click();
  const archived = page.getByTestId("archived-product").filter({ hasText: name });
  await archived.getByRole("button", { name: "Aktifkan kembali", exact: true }).click();
  await expect(row).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
});

test("dialog produk menjaga fokus papan ketik dan menutup dengan Escape", async ({
  page,
}) => {
  await page.goto("/stok");
  const trigger = page.getByRole("button", { name: "Tambah produk", exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Isi sendiri", exact: true }),
  ).toBeFocused();
  for (let index = 0; index < 6; index++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((element) => element.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
