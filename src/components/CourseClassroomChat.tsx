import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { chatApi } from "@/api/chatApi";
import { courseError } from "@/lib/courseUi";
import { usePortalAuth } from "@/portal/PortalAuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function CourseClassroomChat({ classroomId }: { classroomId: string }) {
  const { user }=usePortalAuth(); const cache=useQueryClient(); const [text,setText]=useState(""); const [sending,setSending]=useState(false); const end=useRef<HTMLDivElement>(null);
  const rooms=useQuery({queryKey:["course-chat-room",classroomId,user?.role],queryFn:async()=>{const list=user?.role==="admin"?await chatApi.adminRooms(classroomId):await chatApi.rooms();return list.find(room=>room.classroomId===classroomId)||null;}});
  const roomId=rooms.data?.id; const messages=useQuery({queryKey:["course-chat-messages",roomId],queryFn:()=>chatApi.messages(roomId!),enabled:!!roomId,refetchInterval:10000});
  useEffect(()=>{if(roomId)void chatApi.read(roomId).catch(()=>undefined)},[roomId,messages.data?.data.length]); useEffect(()=>end.current?.scrollIntoView({behavior:"smooth"}),[messages.data?.data.length]);
  const send=async()=>{const value=text.trim();if(!roomId||!value||sending)return;setSending(true);try{await chatApi.send(roomId,value);setText("");await cache.invalidateQueries({queryKey:["course-chat-messages",roomId]});}catch(e){toast.error(courseError(e))}finally{setSending(false)}};
  if(rooms.isLoading)return <div className="grid min-h-48 place-items-center"><Loader2 className="animate-spin"/></div>;
  if(rooms.error)return <p className="p-6 text-center text-destructive">{courseError(rooms.error)}</p>;
  if(!roomId)return <div className="p-10 text-center text-muted-foreground"><MessageCircle className="mx-auto mb-3 h-9 w-9"/><p>محادثة الفصل غير متاحة بعد. تُنشأ تلقائيًا عند تفعيل التسجيل والفصل.</p></div>;
  return <div className="flex min-h-[430px] flex-col overflow-hidden rounded-xl border"><div className="border-b bg-muted/30 p-3 font-semibold">{rooms.data?.displayName||"محادثة الدورة"}</div><div className="max-h-[55vh] min-h-72 flex-1 space-y-3 overflow-y-auto p-4">{messages.isLoading?<Loader2 className="mx-auto animate-spin"/>:messages.data?.data.length?messages.data.data.map(message=>{const mine=(message.sender?.id||message.sender?._id)===user?.id;return <div key={message.id} className={`flex ${mine?"justify-start":"justify-end"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-2 ${mine?"bg-primary text-primary-foreground":"bg-muted"}`}><p className="mb-1 text-xs opacity-70">{message.sender?.fullName||"مستخدم"}</p><p className="whitespace-pre-wrap break-words">{message.text}</p>{message.createdAt&&<p className="mt-1 text-[10px] opacity-60">{new Date(message.createdAt).toLocaleString("ar-EG")}</p>}</div></div>}):<p className="py-16 text-center text-muted-foreground">ابدأ المحادثة.</p>}<div ref={end}/></div><div className="flex items-end gap-2 border-t p-3"><Textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void send()}}} placeholder="اكتب رسالة..." rows={2}/><Button size="icon" disabled={!text.trim()||sending} onClick={send}>{sending?<Loader2 className="animate-spin"/>:<Send className="h-4 w-4"/>}</Button></div></div>;
}
