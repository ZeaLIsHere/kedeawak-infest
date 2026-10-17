import {Suspense} from "react";
import {PageHeader} from "@/components/shell/page-header";
import {ConversationPanel} from "@/components/conversation/conversation-panel";
import {withCurrentBusiness} from "@/lib/data/server";
import {getOwnerConversation} from "@/lib/data/agent-context";
import {listMessages} from "@/lib/data/conversations";
import {findLatestSession} from "@/lib/data/agent-sessions";
import type {Receipt} from "@/lib/ai/receipt";
async function Conversation(){
 const data=await withCurrentBusiness(async(db,id)=>{const conversation=await getOwnerConversation(db,id);const [messages,session]=await Promise.all([listMessages(db,id,conversation.id),findLatestSession(db,id,conversation.id)]);return {messages:messages.map(m=>({id:m.id,sender:m.sender,body:m.body??"",createdAt:m.createdAt.toISOString()})),context:session?.context};});
 if(!data)return <p className="text-muted-foreground">Data warung belum tersedia. Siapkan data warung terlebih dahulu.</p>;
 const context=typeof data.context==="object"&&data.context!==null?data.context as {pendingReceipt?:Receipt}:{};
 return <ConversationPanel initialMessages={data.messages} available={!!process.env.DEEPSEEK_API_KEY?.trim()} initialReceipt={context.pendingReceipt}/>;
}
export default function PercakapanPage(){return <><PageHeader title="Percakapan dengan Agen AI" description="Tanya keadaan warung dan catat transaksi melalui percakapan."/><div className="mx-auto w-full max-w-content p-page"><Suspense fallback={<p role="status" className="text-muted-foreground">Memuat percakapan warung...</p>}><Conversation/></Suspense></div></>;}
