import {test,expect,type Page} from "@playwright/test";

async function openSettings(page:Page){
  const send=page.getByRole("button",{name:"Kirim pesan simulasi"});
  if(!(await send.isVisible())){
    await page.getByText("Pengaturan koneksi, simulasi, dan data pelanggan").click();
  }
}

test("pesan simulasi muncul sebagai percakapan pelanggan tanpa balasan agen",async({page},testInfo)=>{
  const phone=testInfo.project.name==="layar-sempit"?"081200000101":"081200000102";
  const customer="Pelanggan Uji "+testInfo.project.name.replaceAll("-"," ");
  await page.goto("/whatsapp");
  await openSettings(page);
  await page.getByRole("button",{name:"Hubungkan simulasi"}).click();
  await expect(page.getByText("Simulasi pesan aktif",{exact:true})).toBeVisible();
  await openSettings(page);
  await page.getByLabel("Nomor pelanggan").fill(phone);
  await page.getByLabel("Nama pelanggan").fill(customer);
  await page.getByLabel("Pesan pelanggan").fill("Pesanan uji beras");
  await page.getByLabel("Jumlah pesanan").fill("1");
  const option=page.getByLabel("Produk pesanan").locator("option").first();
  await page.getByLabel("Produk pesanan").selectOption(await option.getAttribute("value") ?? "");
  await page.getByRole("button",{name:"Kirim pesan simulasi"}).click();
  await expect(page.getByRole("status").filter({hasText:"Pesan simulasi sudah dicatat."})).toBeVisible();
  const conversation=page.getByRole("link",{name:new RegExp(customer)}).first();
  await expect(conversation).toBeVisible();
  await conversation.click();
  await expect(page.getByRole("log",{name:new RegExp(customer)})).toContainText("Pesanan uji beras");
  await expect(page.getByText("Pesanan tercatat",{exact:false})).toHaveCount(0);
  await openSettings(page);
  await page.getByRole("button",{name:"Hapus data "+customer,exact:true}).click();
  await page.getByRole("button",{name:"Konfirmasi hapus",exact:true}).click();
  await expect(page.getByRole("status").filter({hasText:"Data pelanggan sudah dihapus"})).toBeVisible();
  await expect(page.getByText(customer,{exact:true})).toHaveCount(0);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
  expect(overflow).toBe(false);
});

test("pengaturan menjelaskan persetujuan dan privasi",async({page})=>{
 await page.goto("/pengaturan");
 await expect(page.getByRole("heading",{name:"Persetujuan pemrosesan pesan"})).toBeVisible();
 await expect(page.getByRole("heading",{name:"Privasi data pelanggan"})).toBeVisible();
});
