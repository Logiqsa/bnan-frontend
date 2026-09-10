import { apiRequest } from "./client";
export type ClientErrorStatus = "new" | "resolved" | "ignored";
export interface AdminClientError { id:string; name?:string; email?:string; phone?:string; source?:string; platform?:string; phase?:string; errorCode?:string; message?:string; durationMs?:number; browser?:string; os?:string; filesCount?:number; totalSizeMB?:number; lastStep?:number|string; status:ClientErrorStatus; createdAt?:string; resolvedAt?:string; resolvedBy?:string|{id?:string;fullName?:string;email?:string} }
export interface ClientErrorListParams { page:number; limit:number; search?:string; source?:string; phase?:string; errorCode?:string; status?:ClientErrorStatus; from?:string; to?:string }
export interface ClientErrorListResult { data:AdminClientError[]; page:number; limit:number; total?:number; totalPages?:number; hasNextPage:boolean }
type RawError=Partial<AdminClientError>&{_id?:string};
type RawList={data?:RawError[]|{items?:RawError[];errors?:RawError[]};items?:RawError[];errors?:RawError[];page?:number;currentPage?:number;limit?:number;total?:number;totalCount?:number;totalPages?:number;hasNextPage?:boolean};
const normalize=(r:RawError):AdminClientError=>({id:r.id||r._id||"",name:r.name,email:r.email,phone:r.phone,source:r.source,platform:r.platform,phase:r.phase,errorCode:r.errorCode,message:r.message,durationMs:r.durationMs,browser:r.browser,os:r.os,filesCount:r.filesCount,totalSizeMB:r.totalSizeMB,lastStep:r.lastStep,status:r.status==="resolved"||r.status==="ignored"?r.status:"new",createdAt:r.createdAt,resolvedAt:r.resolvedAt,resolvedBy:r.resolvedBy});
const items=(r:RawList)=>Array.isArray(r.data)?r.data:r.data?.items||r.data?.errors||r.items||r.errors||[];
export const clientErrorsAdminApi={
 list:async(p:ClientErrorListParams):Promise<ClientErrorListResult>=>{const q=new URLSearchParams({page:String(p.page),limit:String(p.limit)});(["search","source","phase","errorCode","status","from","to"] as const).forEach(k=>{if(p[k])q.set(k,String(p[k]))});const r=await apiRequest<RawList>(`/admin/client-errors?${q}`);const data=items(r).map(normalize),page=r.page??r.currentPage??p.page,total=r.total??r.totalCount,totalPages=r.totalPages??(total===undefined?undefined:Math.ceil(total/p.limit));return{data,page,limit:r.limit??p.limit,total,totalPages,hasNextPage:r.hasNextPage??(totalPages?page<totalPages:data.length===p.limit)}} ,
 get:async(id:string)=>{const r=await apiRequest<{data?:RawError}&RawError>(`/admin/client-errors/${encodeURIComponent(id)}`);return normalize(r.data||r)},
 updateStatus:async(id:string,status:ClientErrorStatus)=>{const r=await apiRequest<{data?:RawError}&RawError>(`/admin/client-errors/${encodeURIComponent(id)}/status`,{method:"PATCH",body:JSON.stringify({status})});return normalize(r.data||r)}
};
