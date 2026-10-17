import {beforeAll,afterAll,it,expect} from "vitest";
import {createTestDatabase,type TestDatabase} from "../db/testing";
import {recordInboundMessage,listMessages} from "./conversations";
import {deleteCustomerData,findCustomer} from "./customers";
let test:TestDatabase;
beforeAll(async()=>{test=await createTestDatabase();});
afterAll(async()=>{await test.close();});
it("penghapusan identitas juga menghapus isi pesan dan lampiran pelanggan",async()=>{
 const incoming=await recordInboundMessage(test.db,test.business.id,{channel:"whatsapp",phoneNumber:"081200000999",customerName:"Bu Dewi",body:"Nama saya Dewi di Jalan Pasar",mediaUrl:"data:image/png;base64,YQ=="});
 await deleteCustomerData(test.db,test.business.id,incoming.customer.id);
 expect(await findCustomer(test.db,test.business.id,incoming.customer.id)).toBeUndefined();
 const messages=await listMessages(test.db,test.business.id,incoming.conversation.id);
 expect(messages[0]?.body).toBeNull();
 expect(messages[0]?.mediaUrl).toBeNull();
});