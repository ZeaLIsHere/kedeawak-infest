const DEFAULT_MODEL = "deepseek-flash"; // lint-ui-ignore: nama model API internal, bukan teks antarmuka
export type AIInput = { system: string; prompt: string; image?: string };
export interface AIProvider { complete(input: AIInput): Promise<unknown> }
function modelFor(image: boolean): string {
 const override=image?process.env.DEEPSEEK_VISION_MODEL:process.env.DEEPSEEK_CHAT_MODEL;
 return override?.trim()||process.env.DEEPSEEK_MODEL?.trim()||DEFAULT_MODEL;
}
export function getAIProvider(): AIProvider | undefined {
 const key=process.env.DEEPSEEK_API_KEY;
 if(!key?.trim()) return undefined;
 return { async complete(input) {
  for(let attempt=0;attempt<2;attempt++) {
   try {
    const response=await fetch(`${(process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/,"")}/chat/completions`,{
     method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`},
     signal:AbortSignal.timeout(30000),
     body:JSON.stringify({model:modelFor(input.image!==undefined),temperature:0,response_format:{type:"json_object"},messages:[{role:"system",content:input.system+" Kembalikan JSON yang sah tanpa markdown."},{role:"user",content:input.image?[{type:"text",text:input.prompt},{type:"image_url",image_url:{url:input.image}}]:input.prompt}]})
    });
    if(!response.ok) throw Error("Layanan pemrosesan belum tersedia");
    const body:unknown=await response.json();
    const content=(body as {choices?:{message?:{content?:unknown}}[]}).choices?.[0]?.message?.content;
    if(typeof content!=="string") throw Error("Jawaban tidak dapat dibaca");
    return JSON.parse(content) as unknown;
   } catch { if(attempt===1) throw Error("Pemrosesan belum berhasil. Silakan isi secara manual."); }
  }
  throw Error("Layanan belum tersedia");
 }};
}
export function object(value:unknown):Record<string,unknown> {
 if(typeof value!=="object"||value===null||Array.isArray(value)) throw Error("Masukan tidak sah");
 return value as Record<string,unknown>;
}
export function cleanText(value:unknown,max=500):string {
 if(typeof value!=="string"||!value.trim()||value.length>max||/[\p{Extended_Pictographic}\u2010-\u2015\u2212|~•-]/u.test(value)) throw Error("Teks belum sesuai");
 return value.trim();
}
export function integer(value:unknown,min=0,max=2147483647):number {
 if(typeof value!=="number"||!Number.isSafeInteger(value)||value<min||value>max) throw Error("Angka belum sesuai"); return value;
}

