import {expect,test} from "@playwright/test";
for(const width of [393,1280])test(`percakapan ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto("/percakapan");
 await expect(page.getByRole("heading",{name:"Percakapan dengan Agen AI"})).toBeVisible();
 await page.getByLabel("Pesan untuk agen").fill("laporan hari ini");
 await page.getByRole("button",{name:"Kirim pesan",exact:true}).click();
 await expect(page.getByRole("log")).toContainText("Penjualan",{timeout:90000});
 await expect(page.getByLabel("Pesan untuk agen")).toHaveValue("");
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
