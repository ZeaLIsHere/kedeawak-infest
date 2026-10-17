import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createSecondBusiness,
  createTestDatabase,
  type TestDatabase,
} from "../db/testing";
import {
  countApprovals,
  createApproval,
  decideApproval,
  findApproval,
  listApprovals,
  readPurchaseOrderId,
} from "./approvals";
import { createProduct, findProduct } from "./products";
import { createPurchaseOrder, findPurchaseOrder } from "./purchase-orders";

let test: TestDatabase;
let otherBusinessId: string;
let otherPurchaseOrderId: string;
let berasId: string;

beforeAll(async () => {
  test = await createTestDatabase();
  otherBusinessId = (await createSecondBusiness(test.db)).id;

  const beras = await createProduct(test.db, test.business.id, {
    name: "Beras",
    unit: "kilogram",
    salePrice: 15000,
    purchasePrice: 12000,
    minimumStock: 10,
  });
  const otherProduct = await createProduct(test.db, otherBusinessId, {
    name: "Beras",
    unit: "kilogram",
    salePrice: 15000,
    purchasePrice: 12000,
    minimumStock: 10,
  });
  const otherDraft = await createPurchaseOrder(test.db, otherBusinessId, {
    supplierName: "Pasar Induk",
    items: [{ productId: otherProduct.id, quantity: 5, estimatedPrice: 12000 }],
  });

  berasId = beras.id;
  otherPurchaseOrderId = otherDraft.order.id;
}, 60_000);

afterAll(async () => {
  await test.close();
});

/** Membuat satu draft baru beserta pengajuannya pada antrean persetujuan. */
const submitDraft = async (summary: string) => {
  const draft = await createPurchaseOrder(test.db, test.business.id, {
    supplierName: "Pasar Induk",
    items: [{ productId: berasId, quantity: 20, estimatedPrice: 12000 }],
  });
  const approval = await createApproval(test.db, test.business.id, {
    purchaseOrderId: draft.order.id,
    summary,
  });

  return { draftId: draft.order.id, approval };
};

/** Mencari aksi yang masih menunggu untuk sebuah draft. */
const findPendingApproval = async (purchaseOrderId: string) => {
  const pending = await listApprovals(test.db, test.business.id, "menunggu");

  return pending.find(
    (approval) => readPurchaseOrderId(approval.payload) === purchaseOrderId,
  );
};

describe("antrean persetujuan", () => {
  it("membaca kunci draft dari muatan aksi", () => {
    expect(readPurchaseOrderId({ purchaseOrderId: "abc" })).toBe("abc");
    expect(readPurchaseOrderId({})).toBeUndefined();
    expect(readPurchaseOrderId(null)).toBeUndefined();
    expect(readPurchaseOrderId("abc")).toBeUndefined();
  });

  it("mengajukan draft ke antrean dengan muatan yang benar", async () => {
    const { draftId, approval } = await submitDraft("Tambah stok beras 20 kilogram");

    expect(approval.kind).toBe("purchase_order");
    expect(approval.status).toBe("menunggu");
    expect(approval.decidedAt).toBeNull();
    expect(readPurchaseOrderId(approval.payload)).toBe(draftId);
    expect(approval.summary).toBe("Tambah stok beras 20 kilogram");
  });

  it("menolak pengajuan untuk draft warung lain", async () => {
    await expect(
      createApproval(test.db, test.business.id, {
        purchaseOrderId: otherPurchaseOrderId,
        summary: "Tambah stok dari warung tetangga",
      }),
    ).rejects.toThrow("Draft pesanan pembelian tidak ditemukan pada warung ini");
  });

  it("menghitung aksi yang masih menunggu", async () => {
    const pending = await listApprovals(test.db, test.business.id, "menunggu");

    expect(pending).toHaveLength(1);
    expect(await countApprovals(test.db, test.business.id)).toBe(1);
    expect(await countApprovals(test.db, test.business.id, "disetujui")).toBe(0);
    expect(await countApprovals(test.db, otherBusinessId)).toBe(0);
  });

  it("memberlakukan draft begitu aksinya disetujui", async () => {
    const before = await countApprovals(test.db, test.business.id);
    const stockBefore =
      (await findProduct(test.db, test.business.id, berasId))?.stock ?? 0;
    const { draftId } = await submitDraft("Tambah stok beras 20 kilogram");
    const approval = await findPendingApproval(draftId);

    expect(await countApprovals(test.db, test.business.id)).toBe(before + 1);

    const decided = await decideApproval(
      test.db,
      test.business.id,
      approval?.id ?? "",
      "disetujui",
    );

    expect(decided?.status).toBe("disetujui");
    expect(decided?.decidedAt).not.toBeNull();
    expect((await findPurchaseOrder(test.db, test.business.id, draftId))?.status).toBe(
      "disetujui",
    );
    expect(await countApprovals(test.db, test.business.id)).toBe(before);
    expect((await findProduct(test.db, test.business.id, berasId))?.stock).toBe(
      stockBefore + 20,
    );
  });

  it("membatalkan draft begitu aksinya ditolak", async () => {
    const stockBefore =
      (await findProduct(test.db, test.business.id, berasId))?.stock ?? 0;
    const { draftId } = await submitDraft("Tambah stok beras 20 kilogram");
    const pending = await findPendingApproval(draftId);
    const decided = await decideApproval(
      test.db,
      test.business.id,
      pending?.id ?? "",
      "ditolak",
    );

    expect(decided?.status).toBe("ditolak");
    expect((await findPurchaseOrder(test.db, test.business.id, draftId))?.status).toBe(
      "ditolak",
    );
    expect((await findProduct(test.db, test.business.id, berasId))?.stock).toBe(
      stockBefore,
    );
  });

  it("tidak memutuskan aksi dua kali", async () => {
    const { draftId } = await submitDraft("Tambah stok beras 20 kilogram");
    const approvalId = (await findPendingApproval(draftId))?.id ?? "";

    expect(
      (await decideApproval(test.db, test.business.id, approvalId, "disetujui"))?.status,
    ).toBe("disetujui");
    expect(
      await decideApproval(test.db, test.business.id, approvalId, "ditolak"),
    ).toBeUndefined();
    expect((await findApproval(test.db, test.business.id, approvalId))?.status).toBe(
      "disetujui",
    );
    expect((await findPurchaseOrder(test.db, test.business.id, draftId))?.status).toBe(
      "disetujui",
    );
  });

  it("tidak memutuskan aksi warung lain maupun aksi yang tidak ada", async () => {
    const pending = await listApprovals(test.db, test.business.id, "menunggu");

    if (pending.length > 0) {
      expect(
        await decideApproval(test.db, otherBusinessId, pending[0].id, "disetujui"),
      ).toBeUndefined();
    }

    expect(
      await decideApproval(test.db, test.business.id, "bukan kunci", "disetujui"),
    ).toBeUndefined();
    expect(
      await decideApproval(
        test.db,
        test.business.id,
        "00000000-0000-0000-0000-000000000000",
        "disetujui",
      ),
    ).toBeUndefined();
  });
});
