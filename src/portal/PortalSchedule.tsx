import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, FileText, LogOut, RefreshCw, Video } from "lucide-react";
import { getSchedule, joinLesson, startLesson } from "@/api/scheduleApi";
import { ApiError } from "@/api/client";
import type { PortalLesson, RegistrationMode } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logo from "@/assets/logo-bnan.png";
import { usePortalAuth } from "./PortalAuthContext";

const dayNames = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
const days: Record<string,string> = { saturday:"السبت", sunday:"الأحد", monday:"الاثنين", tuesday:"الثلاثاء", wednesday:"الأربعاء", thursday:"الخميس", friday:"الجمعة" };
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const parseDate = (value: string) => new Date(`${value}T12:00:00`);
const getSaturday = (date: Date) => { const result=new Date(date); result.setDate(result.getDate()-((result.getDay()+1)%7)); return result; };
const calendarDays = (month: Date) => { const start=getSaturday(new Date(month.getFullYear(),month.getMonth(),1)); return Array.from({length:42},(_,i)=>{const date=new Date(start);date.setDate(start.getDate()+i);return date;}); };
const isLessonEnded=(lesson:PortalLesson)=>lesson.activeSession?.status==="ended";
const sessionRecording=(lesson:PortalLesson)=>lesson.activeSession?.recordingUrl||lesson.activeSession?.recording_url||null;
const sessionSummary=(lesson:PortalLesson)=>lesson.activeSession?.summaryUrl||lesson.activeSession?.summary_url||lesson.activeSession?.summary||lesson.activeSession?.aiReport||lesson.activeSession?.ai_report||null;
const isWebUrl=(value:string)=>/^https?:\/\//i.test(value);
const isLiveForTeacher=(lesson:PortalLesson)=>{const status=lesson.activeSession?.status;return status==="live"||status==="starting";};
const statusText=(lesson:PortalLesson,student:boolean)=>{const status=lesson.activeSession?.status;if(status==="live"||(status==="starting"&&!student))return "الحصة مباشرة الآن";if(status==="starting")return "يجري تجهيز الحصة";if(status==="awaiting_zoom_end")return "الحصة في انتظار الإنهاء";if(isLessonEnded(lesson))return "انتهت";return student?"لم تبدأ الحصة بعد":"موعد مجدول";};

export default function PortalSchedule({role}:{role:"teacher"|"student"}) {
  const {user,logout}=usePortalAuth();
  const modeKey=role==="student"?"egyptian":(user?.registrationModes?.length?user.registrationModes.join(","):"egyptian");
  const today=dateKey(new Date());
  const [month,setMonth]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1));
  const [selectedDate,setSelectedDate]=useState(today);
  const [lessons,setLessons]=useState<PortalLesson[]>([]);
  const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  const [filter,setFilter]=useState<"all"|RegistrationMode>("all");
  const [selected,setSelected]=useState<PortalLesson|null>(null); const [joining,setJoining]=useState(false); const [starting,setStarting]=useState(false); const [startError,setStartError]=useState("");
  const [summaryText,setSummaryText]=useState<string|null>(null);
  const grid=useMemo(()=>calendarDays(month),[month]);
  const weekKey=useMemo(()=>Array.from(new Set(grid.map(date=>dateKey(getSaturday(date))))).join(","),[grid]);

  const load=useCallback(async()=>{setError("");try{const modes=modeKey.split(",") as RegistrationMode[];const weeks=weekKey.split(",");const groups=await Promise.all(weeks.flatMap(week=>modes.map(mode=>getSchedule(mode,week))));const unique=new Map<string,PortalLesson>();groups.flat().forEach(lesson=>unique.set(lesson.key,lesson));setLessons([...unique.values()]);}catch(value){setError((value as ApiError).message||"تعذر تحميل الجدول.");}finally{setLoading(false)}},[modeKey,weekKey]);
  useEffect(()=>{setLoading(true);void load();const onFocus=()=>void load();window.addEventListener("focus",onFocus);const timer=window.setInterval(()=>void load(),60000);return()=>{window.removeEventListener("focus",onFocus);window.clearInterval(timer);}},[load]);

  const visible=useMemo(()=>filter==="all"?lessons:lessons.filter(lesson=>lesson.registrationMode===filter),[lessons,filter]);
  const byDate=useMemo(()=>{const result=new Map<string,PortalLesson[]>();visible.forEach(lesson=>{if(!lesson.date)return;const list=result.get(lesson.date)||[];list.push(lesson);result.set(lesson.date,list);});return result;},[visible]);
  const selectedLessons=byDate.get(selectedDate)||[];
  const selectedObject=parseDate(selectedDate);
  const changeMonth=(amount:number)=>{const next=new Date(month.getFullYear(),month.getMonth()+amount,1);setMonth(next);setSelectedDate(dateKey(next));};
  const join=async()=>{if(!selected||selected.activeSession?.status!=="live")return;setJoining(true);try{const result=await joinLesson(selected.classroom.id);const url=result.data?.meetingLink;if(url)window.open(url,"_blank","noopener,noreferrer");else setError("لم ترجع الخدمة رابط دخول صالحًا.");}catch(value){setError((value as ApiError).message||"تعذر دخول الحصة.");}finally{setJoining(false);setSelected(null);}};
  const start=async()=>{if(!selected||starting||isLessonEnded(selected))return;setStarting(true);setStartError("");try{const result=await startLesson(selected);const url=result.data.teacherStartUrl||result.data.meetingLink;if(!url){setStartError("بدأت الحصة، لكن الخدمة لم تُرجع رابط Zoom صالحًا.");await load();return;}window.open(url,"_blank","noopener,noreferrer");if(!result.data.teacherStartUrl)setError("بدأت الحصة، لكن Zoom لم يُرجع رابط المضيف؛ تم فتح رابط الانضمام العادي.");setSelected(null);await load();}catch(value){const apiError=value as ApiError;const timestamp=apiError.code==="TOO_EARLY_TO_START"?apiError.data?.allowedStartAt:apiError.code==="START_WINDOW_CLOSED"?apiError.data?.windowClosesAt:null;const time=typeof timestamp==="string"?new Date(timestamp).toLocaleTimeString("ar-EG",{hour:"numeric",minute:"2-digit",timeZone:"Africa/Cairo"}):"";const messages:Record<string,string>={TOO_EARLY_TO_START:`لم يحن موعد بدء الحصة بعد${time?`؛ يمكنك البدء الساعة ${time}`:""}.`,START_WINDOW_CLOSED:`انتهت نافذة بدء الحصة${time?` الساعة ${time}`:""}.`,SCHEDULE_OCCURRENCE_NOT_FOUND:"لم يتم العثور على هذه الحصة في الجدول.",CLASSROOM_SESSION_ALREADY_ACTIVE:"هناك حصة مباشرة بالفعل لهذا الفصل.",TEACHER_NOT_APPROVED:"حساب المعلم غير معتمد بعد.",TEACHER_NOT_ASSIGNED_TO_SUBJECT:"أنت غير مكلّف بهذه المادة."};setStartError(messages[apiError.code]||apiError.message||"تعذر بدء الحصة.");}finally{setStarting(false);}};
  const openRecording=()=>{if(!selected)return;const value=sessionRecording(selected);if(value)window.open(value,"_blank","noopener,noreferrer");};
  const openSummary=()=>{if(!selected)return;const value=sessionSummary(selected);if(!value)return;if(isWebUrl(value))window.open(value,"_blank","noopener,noreferrer");else setSummaryText(value);};

  return <main className="min-h-screen bg-muted/40" dir="rtl">
    <header className="bg-card border-b shadow-elegant"><div className="container h-20 flex items-center justify-between"><Link to="/"><img src={logo} alt="بنان" className="h-16"/></Link><div className="flex items-center gap-3"><span className="hidden sm:block text-sm">{user?.fullName}</span><Button variant="ghost" onClick={logout} asChild><Link to="/portal/login"><LogOut className="h-4 w-4 ml-2"/>تسجيل الخروج</Link></Button></div></div></header>
    <section className="container py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5"><div><h1 className="text-3xl font-bold flex items-center gap-2"><CalendarDays className="text-secondary"/>جدول الحصص</h1><p className="text-muted-foreground mt-1">متابعة حصصك خلال الشهر — بتوقيت Africa/Cairo</p></div><Button variant="outline" onClick={()=>void load()}><RefreshCw className="h-4 w-4 ml-2"/>تحديث</Button></div>
      {modeKey.includes(",")&&<Tabs value={filter} onValueChange={value=>setFilter(value as "all"|RegistrationMode)} className="mb-5"><TabsList><TabsTrigger value="all">الكل</TabsTrigger><TabsTrigger value="egyptian">المنهج المصري</TabsTrigger><TabsTrigger value="gulf">المنهج السعودي/الخليجي</TabsTrigger></TabsList></Tabs>}
      {error&&<div role="alert" className="mb-5 rounded-xl bg-destructive/10 text-destructive p-4">{error}</div>}
      <Card className="shadow-elegant overflow-hidden"><CardContent className="p-0"><div dir="ltr" className="portal-schedule-layout min-h-[590px]">
        <div dir="rtl" className="portal-calendar-panel p-5 md:p-8">
          <div className="flex items-center justify-between mb-7"><Button size="icon" variant="outline" onClick={()=>changeMonth(1)} aria-label="الشهر التالي"><ChevronRight className="h-4 w-4"/></Button><div className="text-center"><h2 className="font-bold text-lg">{month.toLocaleDateString("ar-EG",{month:"long",year:"numeric"})}</h2><p className="text-xs text-muted-foreground mt-1">{visible.length} حصة</p></div><Button size="icon" variant="outline" onClick={()=>changeMonth(-1)} aria-label="الشهر السابق"><ChevronLeft className="h-4 w-4"/></Button></div>
          <div className="grid grid-cols-7 mb-2">{dayNames.map(day=><div key={day} className="text-center text-xs md:text-sm text-muted-foreground py-2">{day}</div>)}</div>
          {loading?<div className="h-80 rounded-xl bg-muted animate-pulse"/>:<div className="grid grid-cols-7 gap-y-2">{grid.map(date=>{const key=dateKey(date);const count=byDate.get(key)?.length||0;const outside=date.getMonth()!==month.getMonth();const active=key===selectedDate;return <button key={key} onClick={()=>setSelectedDate(key)} className="relative h-12 md:h-14 grid place-items-center group" aria-label={`${date.getDate()}، ${count} حصة`}><span className={`h-10 w-10 rounded-full grid place-items-center text-sm transition-all ${active?"bg-primary text-primary-foreground shadow-sky":outside?"text-muted-foreground/35":"hover:bg-secondary/25"}`}>{date.getDate()}</span>{count>0&&<span aria-hidden="true" className={`absolute bottom-0 h-2 w-2 rounded-full ring-2 ring-card ${active?"bg-secondary":"bg-primary"}`}/>}</button>;})}</div>}
        </div>
        <aside dir="rtl" className="portal-lessons-panel p-5 md:p-8 bg-card"><div className="flex items-center justify-between border-b pb-4 mb-5"><div><h2 className="font-bold">حصص {selectedObject.toLocaleDateString("ar-EG",{weekday:"long"})}</h2><p className="text-sm text-muted-foreground mt-1">{selectedObject.toLocaleDateString("ar-EG",{day:"numeric",month:"long",year:"numeric"})}</p></div><span className="text-xs bg-muted rounded-full px-3 py-1">{selectedLessons.length} حصة</span></div>
          {selectedLessons.length===0?<div className="h-80 grid place-items-center text-center text-muted-foreground"><div><CalendarDays className="h-9 w-9 mx-auto mb-3 opacity-40"/><p>لا توجد حصص في هذا اليوم</p></div></div>:<div className="space-y-3">{selectedLessons.sort((a,b)=>a.startTime.localeCompare(b.startTime)).map(lesson=>{const ended=isLessonEnded(lesson);return <button key={lesson.key} onClick={()=>setSelected(lesson)} className={`w-full text-right rounded-xl border p-4 transition-all ${ended?"bg-muted/50 hover:border-secondary hover:shadow-sky":"hover:border-secondary hover:shadow-sky"}`}><div className="flex justify-between gap-3"><div><h3 className="font-bold">{lesson.subject.name}</h3><p className="text-sm text-muted-foreground mt-1">{lesson.classroom.name}</p></div><span dir="ltr" className="font-semibold text-primary">{lesson.startTime}</span></div>{role==="student"&&<p className="text-sm mt-2">المعلم: {lesson.teacher?.name||lesson.teacher?.fullName||"غير متاح"}</p>}<div className="flex items-center justify-between mt-3"><span className={`text-xs font-semibold ${lesson.activeSession?.status==="live"||(role==="teacher"&&isLiveForTeacher(lesson))?"text-green-600":ended?"text-destructive":"text-muted-foreground"}`}>{statusText(lesson,role==="student")}</span><span className="text-xs rounded-full bg-secondary/20 px-2 py-1">{lesson.registrationMode==="egyptian"?"مصري":"سعودي/خليجي"}</span></div></button>;})}</div>}
        </aside>
      </div></CardContent></Card>
    </section>
    <Dialog open={!!selected} onOpenChange={open=>{if(!open&&!starting){setSelected(null);setStartError("");}}}><DialogContent dir="rtl"><DialogHeader><DialogTitle>{selected&&isLessonEnded(selected)?"الحصة انتهت":role==="teacher"&&selected&&isLiveForTeacher(selected)?"الحصة مباشرة الآن":role==="teacher"?"هل تريد بدء الحصة الآن؟":"تفاصيل الحصة"}</DialogTitle><DialogDescription>{selected?.subject.name} — {selected?.classroom.name} — {selected&&days[selected.day]}، الساعة <span dir="ltr">{selected?.startTime}</span></DialogDescription></DialogHeader>{selected&&isLessonEnded(selected)?<div className="grid gap-3 sm:grid-cols-2"><Button className="h-20 gap-2" variant="outline" disabled={!sessionRecording(selected)} onClick={openRecording}><Video className="h-5 w-5"/>فتح الريكورد</Button><Button className="h-20 gap-2" variant="outline" disabled={!sessionSummary(selected)} onClick={openSummary}><FileText className="h-5 w-5"/>فتح الـ Summary</Button></div>:<>{role==="teacher"&&startError&&<div role="alert" className="rounded-xl bg-destructive/10 text-destructive p-3 text-sm">{startError}</div>}{role==="student"&&selected?.activeSession?.status!=="live"&&<div className="rounded-xl bg-muted p-3 text-sm">لا يمكن الدخول إلا بعد بداية الحصة من قبل المعلم.</div>}<DialogFooter><Button variant="outline" disabled={starting} onClick={()=>{setSelected(null);setStartError("");}}>إلغاء</Button>{role==="teacher"?<Button disabled={starting} onClick={start}>{starting?"جاري بدء الحصة...":selected&&isLiveForTeacher(selected)?"دخول الحصة":"بدء الحصة"}</Button>:<Button disabled={selected?.activeSession?.status!=="live"||joining} onClick={join}><ExternalLink className="h-4 w-4 ml-2"/>{joining?"جاري التجهيز...":"دخول الحصة"}</Button>}</DialogFooter></>}</DialogContent></Dialog>
    <Dialog open={!!summaryText} onOpenChange={open=>{if(!open)setSummaryText(null);}}><DialogContent dir="rtl"><DialogHeader><DialogTitle>ملخص الحصة</DialogTitle></DialogHeader><div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-xl bg-muted p-4 text-sm leading-7">{summaryText}</div><DialogFooter><Button onClick={()=>setSummaryText(null)}>إغلاق</Button></DialogFooter></DialogContent></Dialog>
  </main>;
}
