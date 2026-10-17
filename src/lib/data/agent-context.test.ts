import {describe,it,expect,beforeAll,afterAll} from "vitest";
import {createTestDatabase,createSecondBusiness,type TestDatabase} from "../db/testing";
import {consumeDailyQuota,getOwnerConversation} from "./agent-context";
import {readQuotaUsage} from "./quota-usage";
let t:TestDatabase;beforeAll(async()=>{t=await createTestDatabase();},60000);afterAll(async()=>t.close());
describe("konteks agen",()=>{
 it("permintaan bersamaan tidak melampaui kuota",async()=>{const outcomes=await Promise.all(Array.from({length:6},()=>consumeDailyQuota(t.db,t.business.id,2)));expect(outcomes.filter(Boolean)).toHaveLength(2);expect(await readQuotaUsage(t.db,t.business.id)).toBe(2);});
 it("percakapan pemilik tetap satu meski dibuka bersama",async()=>{const [a,b]=await Promise.all([getOwnerConversation(t.db,t.business.id),getOwnerConversation(t.db,t.business.id)]);expect(a.id).toBe(b.id);const other=await createSecondBusiness(t.db);expect((await getOwnerConversation(t.db,other.id)).id).not.toBe(a.id);});
});
