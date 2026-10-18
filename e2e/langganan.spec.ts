import { expect, test } from "@playwright/test";

/*
 * Alur langganan memakai data warung yang sama dengan halaman lain. Uji ini
 * mengembalikan warung ke paket Free di akhir, sehingga uji berikutnya tetap
 * melihat keadaan awal.
 */
test("membeli paket Gold lalu menghapus langganan", async ({ page }) => {
  await page.goto("/pengaturan");
  await expect(page.getByRole("heading", { name: "Langganan" })).toBeVisible();

  const remove = page.getByRole("button", { name: "Hapus langganan" });
  if ((await remove.count()) > 0) {
    await remove.click();
    await page.getByRole("button", { name: "Ya, hapus langganan" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  }

  await expect(page.getByText("Free", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Langganan Gold" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Yakin ingin membeli langganan ini?",
  );
  await page.getByRole("button", { name: "Ya, beli langganan" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText(/Berlaku sampai/u)).toBeVisible();
  await expect(page.getByRole("button", { name: "Hapus langganan" })).toBeVisible();

  await page.goto("/percakapan");
  await expect(page.getByRole("button", { name: "Pilih foto struk" })).toBeVisible();
  await expect(
    page.getByText(/Fitur suara dan foto struk tersedia pada paket Gold/u),
  ).toHaveCount(0);

  await page.goto("/whatsapp");
  await expect(page.getByText("Paket Gold aktif", { exact: true })).toBeVisible();
  await expect(page.getByText(/Pesanan WhatsApp tanpa batas/u)).toBeVisible();

  await page.goto("/pengaturan");
  await page.getByRole("button", { name: "Hapus langganan" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Yakin ingin menghapus langganan?",
  );
  await page.getByRole("button", { name: "Ya, hapus langganan" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("button", { name: "Langganan Gold" })).toBeVisible();

  await page.goto("/percakapan");
  await expect(
    page.getByText(/Fitur suara dan foto struk tersedia pada paket Gold/u),
  ).toBeVisible();
});
