import type {Database} from "../db/client";
import {findBusiness} from "../data/business";
import {listProducts} from "../data/products";
import {listKnowledgeChunks} from "../data/knowledge";
import {summarizeDay,summarizeWeek} from "../data/reports";
export async function getBusinessContext(db:Database,businessId:string){
 const [business,products,knowledge,day,week]=await Promise.all([findBusiness(db,businessId),listProducts(db,businessId),listKnowledgeChunks(db,businessId),summarizeDay(db,businessId),summarizeWeek(db,businessId)]);
 if(!business)throw Error("Warung belum tersedia");
 return {business:{name:business.name,opensAt:business.opensAt,closesAt:business.closesAt},products:products.map(p=>({id:p.id,name:p.name,stock:p.stock,unit:p.unit,salePrice:p.salePrice,minimumStock:p.minimumStock})),knowledge:knowledge.map(k=>k.content),day,week};
}
