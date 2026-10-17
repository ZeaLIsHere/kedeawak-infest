import { expect, test } from "@playwright/test";

for (const decision of ["Setujui", "Tolak"] as const) {
  test(`draft alert menerima keputusan ${decision} sekali dengan stok sesuai keputusan`, async ({
    page,
  }, info) => {
    const name = `Persediaan uji ${decision} ${info.project.name.replaceAll("-", " ")} ${Date.now()}`;
    await page.goto("/stok");
    await page.getByRole("button", { name: "Tambah produk", exact: true }).click();
    await page.getByRole("button", { name: "Isi sendiri", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nama produk", { exact: true }).fill(name);
    await dialog.getByLabel("Satuan", { exact: true }).fill("bungkus");
    await dialog.getByLabel("Harga jual", { exact: true }).fill("5000");
    await dialog.getByLabel("Harga beli", { exact: true }).fill("3000");
    await dialog.getByLabel("Stok", { exact: true }).fill("2");
    await dialog.getByLabel("Ambang minimum", { exact: true }).fill("5");
    await dialog.getByRole("button", { name: "Simpan produk", exact: true }).click();
    await expect(dialog).toBeHidden();
    const alert = page.getByTestId("stock-alert").filter({ hasText: name });
    await alert.getByRole("button", { name: "Buat draft pesanan", exact: true }).click();
    await expect(alert.getByRole("status")).toHaveText(
      "Draft pesanan tersedia di halaman Persetujuan.",
    );
    await alert.getByRole("button", { name: "Buat draft pesanan", exact: true }).click();
    await alert.getByRole("link", { name: "Periksa persetujuan" }).click();
    const approval = page.getByTestId("pending-approval").filter({ hasText: name });
    await expect(approval).toHaveCount(1);
    await approval.getByRole("button", { name: decision, exact: true }).click();
    await expect(approval).toHaveCount(0);
    const history = page.getByTestId("approval-history").filter({ hasText: name });
    await expect(history).toContainText(decision === "Setujui" ? "Disetujui" : "Ditolak");
    await expect(history.getByRole("button")).toHaveCount(0);
    await page.reload();
    await expect(history).toBeVisible();
    await page.goto("/stok");
    const row = page
      .getByTestId("product-row")
      .filter({ has: page.getByRole("heading", { name, exact: true }) });
    await expect(row.getByTestId("product-stock")).toHaveText(
      decision === "Setujui" ? "10" : "2",
    );
    await expect(alert).toHaveCount(decision === "Setujui" ? 0 : 1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}
