import { expect, test } from "@playwright/test";

for (const method of ["Tunai", "Transfer", "QRIS"] as const) {
  test(`Kasir mencatat dua produk dengan ${method} lalu memperbarui stok dan laporan`, async ({
    page,
  }) => {
    await page.goto("/laporan");
    const payments = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Uang masuk per jenis pembayaran" }),
      });
    const paymentAmount = payments
      .locator("dl > div")
      .filter({ has: page.getByText(method, { exact: true }) })
      .locator("dd");
    await expect(paymentAmount).toBeVisible();
    const before = Number((await paymentAmount.textContent())?.replace(/\D/gu, "") || 0);
    await page.goto("/kasir");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kasir");
    const products = page
      .getByTestId("cashier-product")
      .filter({ hasNot: page.getByText("Stok habis", { exact: true }) });
    await expect(products.first()).toBeVisible();
    const selected: { name: string; stock: number }[] = [];
    for (let index = 0; index < 2; index++) {
      const product = products.nth(index);
      selected.push({
        name: (await product.getAttribute("data-product-name"))!,
        stock: Number(await product.getAttribute("data-stock")),
      });
      await product.click();
    }
    await expect(page.getByTestId("cart-item")).toHaveCount(2);
    const total = Number(
      (
        await page.getByText("Total belanja", { exact: true }).locator("..").textContent()
      )?.replace(/\D/gu, ""),
    );
    await page.getByLabel(method, { exact: true }).check();
    if (method === "Tunai")
      await page.getByLabel("Uang diterima").fill(String(total + 10000));
    await page.getByRole("button", { name: "Catat penjualan", exact: true }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Penjualan berhasil dicatat" }),
    ).toBeVisible();
    await expect(page.getByTestId("cart-item")).toHaveCount(0);
    await expect(page.getByLabel("Uang diterima")).toHaveValue("");
    await page.goto("/stok");
    for (const product of selected)
      await expect(
        page
          .getByTestId("product-row")
          .filter({ has: page.getByRole("heading", { name: product.name, exact: true }) })
          .getByTestId("product-stock"),
      ).toHaveText((product.stock - 1).toLocaleString("id-ID"));
    await page.goto("/laporan");
    await expect(paymentAmount).toBeVisible();
    expect(
      Number((await paymentAmount.textContent())?.replace(/\D/gu, "") || 0),
    ).toBeGreaterThanOrEqual(before + total);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}

test("Kasir membatasi jumlah sesuai stok dan menghitung kembalian", async ({ page }) => {
  await page.goto("/kasir");
  const product = page
    .getByTestId("cashier-product")
    .filter({ hasNot: page.getByText("Stok habis", { exact: true }) })
    .first();
  await product.click();
  const item = page.getByTestId("cart-item").first();
  const quantity = item.getByRole("spinbutton");
  const max = Number(await quantity.getAttribute("max"));
  await quantity.fill(String(max));
  await expect(item.getByRole("button", { name: /^Tambah /u })).toBeDisabled();
  await expect(item.getByText("Stok habis", { exact: true })).toBeVisible();
  await page.getByLabel("Uang diterima").fill("99999999");
  await expect(page.getByText("Kembalian", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
});
