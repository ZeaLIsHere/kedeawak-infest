import {and,eq,sql} from "drizzle-orm";
import type {Database} from "../db/client";
import {agentSessions,businesses,conversations,quotaUsage} from "../db/schema";
import {findConversation} from "./conversations";
import {startOfDay} from "./period";
export async function getOwnerConversation(db:Database,businessId:string){
 return db.transaction(async tx=>{
  await tx.select({id:businesses.id}).from(businesses).where(eq(businesses.id,businessId)).for("update");
  const [existing]=await tx.select().from(conversations).where(and(eq(conversations.businessId,businessId),eq(conversations.channel,"app"))).limit(1);
  if(existing)return existing;
  const [created]=await tx.insert(conversations).values({businessId,channel:"app",customerPhoneHash:"owner"}).returning();if(!created)throw Error("Percakapan belum dapat dibuka");return created;
 });
}
export async function setSessionContext(db:Database,businessId:string,id:string,context:unknown){await db.update(agentSessions).set({context,updatedAt:new Date()}).where(and(eq(agentSessions.businessId,businessId),eq(agentSessions.id,id)));}
export async function consumeDailyQuota(db:Database,businessId:string,limit:number,at=new Date()):Promise<boolean>{
 if(!Number.isSafeInteger(limit)||limit<1)return false;
 const rows=await db.insert(quotaUsage).values({businessId,usageDate:startOfDay(at),count:1}).onConflictDoUpdate({target:[quotaUsage.businessId,quotaUsage.usageDate],set:{count:sql`${quotaUsage.count}+1`,updatedAt:new Date()},setWhere:sql`${quotaUsage.count}<${limit}`}).returning();return rows.length===1;
}
export async function withConversationLock<T>(db:Database,businessId:string,conversationId:string,work:(db:Database)=>Promise<T>):Promise<T>{
 if(!await findConversation(db,businessId,conversationId))throw Error("Percakapan tidak ditemukan");
 return db.transaction(async tx=>{await tx.select({id:conversations.id}).from(conversations).where(and(eq(conversations.businessId,businessId),eq(conversations.id,conversationId))).for("update");return work(tx as unknown as Database);});
}

