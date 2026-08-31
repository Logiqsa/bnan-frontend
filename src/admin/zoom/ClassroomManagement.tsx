import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronLeft, Loader2, RefreshCw, School, Search, Video } from "lucide-react";
import { ApiError } from "@/api/client";
import { classroomRecordingsApi, type ClassroomOption } from "@/api/classroomRecordingsApi";
import { classroomZoomApi, type ClassroomScheduleEntry, type ZoomScheduleAvailability, type ZoomScheduleAvailabilityAccount, type ZoomScheduleWindow } from "@/api/classroomZoomApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/layouts/DashboardLayout";
import { usePortalAuth } from "@/portal/PortalAuthContext";
import { normalizeZoomState, referenceId, referenceName } from "./classroomZoomNormalization";
import { CLASSROOM_DAYS, CLASSROOM_DAY_NAMES, classroomZoomLabel, normalizeEgyptianSchedule, normalizeGulfSchedule, sortClassroomsNewestFirst } from "./classroomManagement";

const safeError = (error: ApiError) => {
  if (error.status === 400) return "تحقق من اليوم ومدة الحصة ثم حاول مرة أخرى.";
  if (error.status === 403) return "ليس لديك صلاحية لعرض هذه البيانات.";
  if (error.status === 404) return "الفصل أو بياناته غير موجودة.";
  if (error.status === 409) return "تعذر عرض التوافر بسبب تعارض حالي. حدّث البيانات وحاول مرة أخرى.";
  return "تعذر تحميل البيانات. تحقق من الاتصال وحاول مرة أخرى.";
};

const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString("ar-EG-u-ca-gregory") : "—";
const formatWindow = (window: ZoomScheduleWindow) => `${window.startTime}${window.endTime ? ` ← ${window.endTime === "24:00" ? "نهاية اليوم / 24:00" : window.endTime}` : ""}`;
const windowKey = (window: ZoomScheduleWindow) => `${window.startTime}-${window.endTime || ""}`;

function CurrentSchedule({ entries, loading }: { entries: ClassroomScheduleEntry[]; loading: boolean }) {
  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-primary"/>;
  if (!entries.length) return <p className="rounded-xl border border-dashed py-8 text-center text-muted-foreground">لم يتم تحديد جدول الفصل</p>;
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{entries.map((entry, index) => <div key={`${entry.day}-${entry.startTime}-${index}`} className="rounded-xl border p-3"><p className="font-bold">{CLASSROOM_DAY_NAMES[entry.day] || entry.day}</p><p dir="ltr" className="mt-1 w-fit font-mono">{entry.startTime}{entry.endTime ? ` - ${entry.endTime}` : ""}</p>{entry.subjectName && <p className="mt-1 text-sm text-muted-foreground">{entry.subjectName}</p>}</div>)}</div>;
}

function AccountAvailability({ value, duration }: { value: ZoomScheduleAvailabilityAccount; duration?: number }) {
  const eligible = new Set((value.eligibleWindows || []).map(windowKey));
  const allDay = value.freeWindows?.length === 1 && value.freeWindows[0].startTime === "00:00" && value.freeWindows[0].endTime === "24:00";
  return <Card className={!value.account.isSelectable ? "opacity-70" : ""}><CardHeader className="pb-3"><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="text-lg">{value.account.name}</CardTitle><div className="flex gap-2"><Badge variant={value.account.isActive ? "default" : "outline"}>{value.account.isActive ? "مفعل" : "غير مفعل"}</Badge>{!value.account.isSelectable && <Badge variant="outline">غير متاح للاختيار</Badge>}</div></div></CardHeader><CardContent className="space-y-5">
    <section><h4 className="mb-2 font-semibold text-red-700">المواعيد المحجوزة</h4>{!value.busyBookings?.length ? <p className="text-sm text-muted-foreground">لا توجد حجوزات أخرى على الحساب في هذا اليوم</p> : <div className="grid gap-2 sm:grid-cols-2">{value.busyBookings.map((booking, index) => <div key={`${booking.classroomId}-${booking.startTime}-${index}`} className="rounded-lg border border-red-100 bg-red-50/60 p-3 text-sm"><p dir="ltr" className="w-fit font-mono font-bold">{formatWindow(booking)}</p><p className="font-semibold">{booking.classroomName || "فصل محجوز"}{booking.gradeName ? ` - ${booking.gradeName}` : ""}</p>{booking.subjectName && <p className="text-muted-foreground">{booking.subjectName}</p>}{booking.registrationMode && <Badge variant="outline" className="mt-2 text-xs">{booking.registrationMode === "egyptian" ? "مصري" : "خليجي"}</Badge>}</div>)}</div>}</section>
    {!!value.mergedBusyWindows?.length && <section><h4 className="mb-2 text-sm font-semibold">ملخص الفترات المشغولة</h4><div className="flex flex-wrap gap-2">{value.mergedBusyWindows.map((window) => <Badge key={windowKey(window)} variant="outline" className="border-red-200 bg-red-50 text-red-700" dir="ltr">{formatWindow(window)}</Badge>)}</div></section>}
    <section><h4 className="mb-2 font-semibold text-emerald-700">المواعيد المتاحة</h4>{allDay ? <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">الحساب متاح طوال اليوم</p> : !value.freeWindows?.length ? <p className="text-sm text-muted-foreground">لا توجد مواعيد متاحة</p> : <div className="flex flex-wrap gap-2">{value.freeWindows.map((window) => { const suitable = !duration || eligible.has(windowKey(window)); return <span key={windowKey(window)} dir="ltr" className={`rounded-lg border px-3 py-2 font-mono text-sm ${suitable ? "border-emerald-300 bg-emerald-50 font-bold text-emerald-800" : "bg-muted/40 text-muted-foreground"}`}>{formatWindow(window)}</span>; })}</div>}</section>
    {duration && <section><h4 className="mb-2 font-semibold text-primary">مناسبة لمدة الحصة ({duration} دقيقة)</h4>{!value.eligibleWindows?.length ? <p className="text-sm text-muted-foreground">لا توجد فترة متاحة تكفي مدة الحصة المطلوبة</p> : <div className="flex flex-wrap gap-2">{value.eligibleWindows.map((window) => <Badge key={windowKey(window)} className="px-3 py-2" dir="ltr">{formatWindow(window)}</Badge>)}</div>}</section>}
  </CardContent></Card>;
}

export default function ClassroomManagement() {
  const { user } = usePortalAuth();
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [curriculumId, setCurriculumId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [selected, setSelected] = useState<ClassroomOption | null>(null);
  const [details, setDetails] = useState<ClassroomOption | null>(null);
  const [schedule, setSchedule] = useState<ClassroomScheduleEntry[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [day, setDay] = useState<string>("sunday");
  const [duration, setDuration] = useState("");
  const [availability, setAvailability] = useState<ZoomScheduleAvailability | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  const loadClassrooms = () => {
    setLoading(true); setError("");
    const request = user?.role === "supervisor" ? classroomZoomApi.getMyClassrooms() : classroomRecordingsApi.listAllClassrooms();
    request.then((response) => setClassrooms(sortClassroomsNewestFirst(Array.isArray(response.data) ? response.data : []))).catch((caught) => setError(safeError(caught as ApiError))).finally(() => setLoading(false));
  };
  useEffect(loadClassrooms, [user?.role]);

  const curricula = useMemo(() => Array.from(new Map(classrooms.map((item) => [referenceId(item.curriculum), item.curriculum]).filter(([id]) => id)).values()), [classrooms]);
  const grades = useMemo(() => Array.from(new Map(classrooms.filter((item) => referenceId(item.curriculum) === curriculumId).map((item) => [referenceId(item.grade), item.grade]).filter(([id]) => id)).values()), [classrooms, curriculumId]);
  const visible = useMemo(() => classrooms.filter((item) => referenceId(item.curriculum) === curriculumId && referenceId(item.grade) === gradeId), [classrooms, curriculumId, gradeId]);

  const openClassroom = async (item: ClassroomOption) => {
    setSelected(item); setDetails(item); setSchedule([]); setAvailability(null); setAvailabilityError(""); setError(""); setScheduleLoading(true);
    try {
      const response = await classroomZoomApi.getClassroom(item.id);
      const merged = { ...item, ...response.data } as ClassroomOption;
      setDetails(merged);
      const mode = merged.curriculum?.registrationMode || item.curriculum?.registrationMode;
      try {
        if (mode === "egyptian") {
          const scheduleResponse = await classroomZoomApi.getEgyptianSchedule(item.id);
          setSchedule(normalizeEgyptianSchedule(scheduleResponse.data));
        } else if (mode === "gulf") {
          const scheduleResponse = await classroomZoomApi.getGulfSchedule(item.id);
          setSchedule(normalizeGulfSchedule(scheduleResponse.data));
        }
      } catch (caught) {
        const scheduleError = caught as ApiError;
        if (scheduleError.status !== 404) setError(safeError(scheduleError));
      }
    } catch (caught) { setError(safeError(caught as ApiError)); } finally { setScheduleLoading(false); }
  };

  const loadAvailability = async () => {
    if (!selected) return;
    const parsedDuration = duration ? Number(duration) : undefined;
    setAvailabilityLoading(true); setAvailabilityError("");
    try { const response = await classroomZoomApi.getScheduleAvailability(selected.id, day, parsedDuration); setAvailability(response.data); }
    catch (caught) { setAvailability(null); setAvailabilityError(safeError(caught as ApiError)); }
    finally { setAvailabilityLoading(false); }
  };

  const zoom = normalizeZoomState(details);
  return <DashboardLayout><div dir="rtl" className="mx-auto max-w-7xl space-y-5">
    <header className="rounded-2xl border bg-gradient-to-l from-primary/[0.09] via-card to-card p-5 sm:p-6"><h1 className="text-2xl font-bold sm:text-3xl">إدارة الفصول والمواعيد</h1><p className="mt-2 text-sm text-muted-foreground">عرض الفصول والجداول ومعرفة المواعيد المتاحة على حساب Zoom.</p></header>
    {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div> : error && !selected ? <Card><CardContent className="grid min-h-48 place-items-center text-center"><div><p>{error}</p><Button className="mt-3" onClick={loadClassrooms}>إعادة المحاولة</Button></div></CardContent></Card> : classrooms.length === 0 ? <Card><CardContent className="grid min-h-48 place-items-center text-muted-foreground"><div><School className="mx-auto mb-3 h-9 w-9"/><p>لا توجد فصول متاحة</p></div></CardContent></Card> : !selected ? <>
      <Card><CardContent className="grid gap-4 p-4 sm:grid-cols-2"><label className="text-sm font-semibold">المنهج<select value={curriculumId} onChange={(event) => { setCurriculumId(event.target.value); setGradeId(""); }} className="mt-2 h-10 w-full rounded-md border bg-background px-3"><option value="">اختر المنهج</option>{curricula.map((value) => <option key={referenceId(value)} value={referenceId(value)}>{referenceName(value)}</option>)}</select></label><label className="text-sm font-semibold">الصف<select value={gradeId} disabled={!curriculumId} onChange={(event) => setGradeId(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3"><option value="">اختر الصف</option>{grades.map((value) => <option key={referenceId(value)} value={referenceId(value)}>{referenceName(value)}</option>)}</select></label></CardContent></Card>
      {gradeId && <section><h2 className="mb-3 text-lg font-bold">الفصول</h2>{visible.length === 0 ? <Card><CardContent className="py-10 text-center text-muted-foreground">لا توجد فصول متاحة</CardContent></Card> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visible.map((item) => <button key={item.id} onClick={() => openClassroom(item)} className="text-start"><Card className="h-full transition hover:border-primary/40 hover:shadow-md"><CardContent className="space-y-3 p-4"><div className="flex justify-between gap-3"><h3 className="font-bold">{item.name}</h3><ChevronLeft className="h-4 w-4 text-muted-foreground"/></div><p className="text-sm text-muted-foreground">{referenceName(item.curriculum)} · {referenceName(item.grade)}</p><div className="flex flex-wrap gap-2"><Badge variant="outline">{item.zoomAssignmentMode === "manual" ? "يدوي" : "ربط تلقائي"}</Badge><Badge variant="outline">{classroomZoomLabel(item)}</Badge></div><p className="text-xs text-muted-foreground">تاريخ الإنشاء: {formatDate(item.createdAt)}</p></CardContent></Card></button>)}</div>}</section>}
    </> : <>
      <Button variant="ghost" className="px-1" onClick={() => { setSelected(null); setDetails(null); setAvailability(null); setError(""); }}><ChevronLeft className="ml-2 h-4 w-4 rotate-180"/>العودة إلى الفصول</Button>
      {error && <div role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      <Card><CardHeader><CardTitle>بيانات الفصل</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs text-muted-foreground">الفصل</p><p className="font-semibold">{details?.name}</p></div><div><p className="text-xs text-muted-foreground">المنهج</p><p className="font-semibold">{referenceName(details?.curriculum)}</p></div><div><p className="text-xs text-muted-foreground">الصف</p><p className="font-semibold">{referenceName(details?.grade)}</p></div><div><p className="text-xs text-muted-foreground">نوع الربط</p><p className="font-semibold">{details?.zoomAssignmentMode === "manual" ? "يدوي" : "ربط تلقائي"}</p></div></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary"/>جدول الفصل</CardTitle></CardHeader><CardContent><CurrentSchedule entries={schedule} loading={scheduleLoading}/></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-primary"/>المواعيد المتاحة</CardTitle><p className="text-sm text-muted-foreground">اختر اليوم ومدة الحصة الاختيارية لمعرفة توافر حساب Zoom.</p></CardHeader><CardContent className="space-y-5"><div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="text-sm font-semibold">اليوم<select value={day} onChange={(event) => setDay(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3">{CLASSROOM_DAYS.map((value) => <option key={value} value={value}>{CLASSROOM_DAY_NAMES[value]}</option>)}</select></label><label className="text-sm font-semibold">مدة الحصة بالدقائق (اختياري)<Input className="mt-2" type="number" min="1" value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="مثال: 120"/></label><Button onClick={loadAvailability} disabled={availabilityLoading}>{availabilityLoading ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : <Search className="ml-2 h-4 w-4"/>}معرفة المواعيد المتاحة</Button></div>{availabilityError && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{availabilityError}<Button variant="link" className="mr-2 h-auto p-0" onClick={loadAvailability}><RefreshCw className="ml-1 h-3 w-3"/>تحديث</Button></div>}{availability && <div className="space-y-4"><div className="rounded-lg bg-muted/50 p-3 text-sm"><p>{availability.mode === "current_account" ? `الحساب الحالي: ${availability.accounts[0]?.account.name || "—"}` : "خيارات حسابات Zoom المتاحة"}</p><p className="mt-1 text-muted-foreground">اليوم: {CLASSROOM_DAY_NAMES[availability.day] || availability.day}</p></div>{availability.accounts.map((account) => <AccountAvailability key={account.account.id} value={account} duration={availability.durationMinutes || undefined}/>)}<p className="text-xs text-muted-foreground">المواعيد المعروضة استرشادية ويتم التحقق مرة أخرى عند حفظ الجدول.</p></div>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Video className="h-5 w-5 text-primary"/>تفاصيل Zoom</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap gap-2"><Badge variant="outline">{details ? classroomZoomLabel(details) : "—"}</Badge>{zoom.accountName && <Badge variant="outline">{zoom.accountName}</Badge>}</div>{zoom.meetingLink && <a href={zoom.meetingLink} target="_blank" rel="noreferrer" className="block break-all text-sm text-primary underline" dir="ltr">{zoom.meetingLink}</a>}{details?.zoomAssignmentMode === "manual" && <Button asChild variant="outline"><Link to={`${user?.role === "supervisor" ? "/portal/supervisor/classrooms/zoom" : "/admin/classroom-zoom"}?classroomId=${encodeURIComponent(details.id)}`}>إدارة Zoom</Link></Button>}</CardContent></Card>
    </>}
  </div></DashboardLayout>;
}
