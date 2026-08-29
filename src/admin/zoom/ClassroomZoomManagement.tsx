import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2, ExternalLink, GraduationCap, Loader2, RefreshCw, School, UserRound, Video } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import { classroomRecordingsApi, type ClassroomOption } from "@/api/classroomRecordingsApi";
import {
  classroomZoomApi,
  type AvailableZoomAccount,
  type ClassroomScheduleEntry,
  type ClassroomZoomDetails,
  type GeneratedZoomMeeting,
  type ZoomBooking,
  type ZoomAvailability,
} from "@/api/classroomZoomApi";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import DashboardLayout from "@/layouts/DashboardLayout";
import { usePortalAuth } from "@/portal/PortalAuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasZoomMeetingLink, normalizeZoomState, referenceId, referenceName, zoomDisplayState } from "./classroomZoomNormalization";
import ClassroomScheduleEditor from "./ClassroomScheduleEditor";

const dayAr: Record<string, string> = { saturday: "السبت", sunday: "الأحد", monday: "الاثنين", tuesday: "الثلاثاء", wednesday: "الأربعاء", thursday: "الخميس", friday: "الجمعة" };
const dayEn: Record<string, string> = { saturday: "Saturday", sunday: "Sunday", monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday" };

const getMeeting = (classroom?: ClassroomZoomDetails | null, generated?: GeneratedZoomMeeting | null) => {
  if (generated) return generated;
  const meeting = normalizeZoomState(classroom);
  if (!meeting.meetingLink) return null;
  return {
    meetingLink: meeting.meetingLink,
    zoomMeetingId: meeting.meetingId,
    zoomAccount: { id: meeting.accountId, name: meeting.accountName },
    provisioningStatus: "ready",
  };
};

const safeError = (error: unknown, pick: (ar: string, en: string) => string) => {
  const apiError = error as ApiError;
  const messages: Record<string, string> = {
    ZOOM_ACCOUNT_SCHEDULE_CONFLICT: pick("حساب Zoom المحدد لم يعد متاحًا لجدول هذا الفصل.", "The selected Zoom account is no longer available for this classroom schedule."),
    ZOOM_ACCOUNT_ALREADY_CLAIMED: pick("تم حجز حساب Zoom للتو. تم تحديث قائمة التوفر.", "This Zoom account was just claimed. Availability has been refreshed."),
    ZOOM_PROVISIONING_IN_PROGRESS: pick("إنشاء اجتماع Zoom قيد التنفيذ. انتظر قليلًا ثم حدّث الصفحة.", "Zoom meeting provisioning is in progress. Please wait, then refresh."),
    ZOOM_MANUAL_ASSIGNMENT_REQUIRED: pick("تعذر إنشاء الاجتماع لهذا الفصل. راجع إعدادات الفصل.", "The meeting could not be created for this classroom. Check its settings."),
  };
  return messages[apiError.code] || (apiError.status === 0 ? apiError.message : pick("تعذر إكمال العملية. حاول مرة أخرى.", "The operation could not be completed. Please try again."));
};

function Booking({ booking, conflict = false }: { booking: ZoomBooking; conflict?: boolean }) {
  const { isArabic } = useLanguage();
  const day = (isArabic ? dayAr : dayEn)[booking.day?.toLowerCase()] || booking.day;
  const title = booking.classroomName || booking.studentName || (isArabic ? "فصل محجوز" : "Booked classroom");
  return <div className={cn("rounded-lg border bg-background/80 p-2.5 text-xs", conflict && "border-amber-300 bg-amber-50/70")}>
    <div className="flex flex-wrap items-center justify-between gap-1.5 font-semibold"><span>{day}</span><span dir="ltr" className="rounded bg-muted px-1.5 py-0.5">{booking.startTime}–{booking.endTime}</span></div>
    <div className="mt-1.5 leading-5 text-muted-foreground">{[title, booking.subjectName, booking.teacherName].filter(Boolean).join(" — ")}</div>
  </div>;
}

function Schedule({ entries, timezone, action }: { entries: ClassroomScheduleEntry[]; timezone?: string; action?: ReactNode }) {
  const { isArabic, pick } = useLanguage();
  return <Card className="overflow-hidden shadow-elegant">
    <CardHeader className="border-b bg-muted/25 pb-4"><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="flex items-center gap-2 text-base"><span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10"><CalendarDays className="h-4.5 w-4.5 text-primary" /></span>{pick("جدول الفصل", "Classroom schedule")}</CardTitle><div className="flex items-center gap-2">{timezone && <Badge variant="outline" dir="ltr" className="font-normal">{timezone}</Badge>}{action}</div></div></CardHeader>
    <CardContent className="p-4 sm:p-5">
      {entries.length ? <div className="divide-y overflow-hidden rounded-xl border bg-background">{entries.map((entry, index) => <div key={`${entry.day}-${entry.startTime}-${index}`} className="grid gap-2 p-3.5 sm:grid-cols-[minmax(8rem,0.7fr)_minmax(0,1fr)_auto] sm:items-center sm:px-4">
        <div className="font-semibold">{(isArabic ? dayAr : dayEn)[entry.day?.toLowerCase()] || entry.day}</div>
        <div className="text-sm text-muted-foreground">{entry.subjectName || pick("موعد حصة", "Lesson time")}</div>
        <div dir="ltr" className="w-fit rounded-lg bg-primary/5 px-3 py-1.5 text-sm font-semibold text-primary">{entry.startTime}{entry.endTime ? ` – ${entry.endTime}` : ""}</div>
      </div>)}</div> : <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-5 text-center"><span className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-amber-100"><CalendarDays className="h-5 w-5 text-amber-700"/></span><h3 className="font-semibold text-amber-950">{pick("لم يتم تحديد جدول الفصل بعد", "The classroom schedule has not been set")}</h3><p className="mt-1 text-sm text-amber-800">{pick("حدد جدول الفصل أولًا قبل إنشاء رابط Zoom", "Set the classroom schedule before generating a Zoom link.")}</p></div>}
    </CardContent>
  </Card>;
}

function AccountCard({ account, selected, onSelect }: { account: AvailableZoomAccount; selected: boolean; onSelect: () => void }) {
  const { pick } = useLanguage();
  return <Card className={cn("overflow-hidden transition-all", account.available ? "border-emerald-200 bg-emerald-50/20" : "border-amber-200 bg-amber-50/20", selected && "border-primary ring-2 ring-primary/20 shadow-sky")}>
    <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 border-b bg-background/70 pb-4">
      <div><CardTitle className="break-words text-base">{account.name}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{pick("حساب Zoom", "Zoom account")}</p></div>
      <Badge className={account.available ? "border border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "border border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-100"}><span className={cn("me-1.5 h-2 w-2 rounded-full", account.available ? "bg-emerald-500" : "bg-amber-500")}/>{account.available ? pick("متاح", "Available") : pick("غير متاح", "Unavailable")}</Badge>
    </CardHeader>
    <CardContent className="space-y-4">
      <section><h4 className="mb-2 text-xs font-bold text-muted-foreground">{pick("الحجوزات الحالية", "Current bookings")} <span className="font-normal">({account.bookings?.length || 0})</span></h4><div className="max-h-48 space-y-2 overflow-y-auto pe-1">{account.bookings?.length ? account.bookings.map((booking, i) => <Booking key={`${booking.classroomId}-${booking.day}-${booking.startTime}-${i}`} booking={booking}/>) : <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">{pick("لا توجد حجوزات", "No bookings")}</p>}</div></section>
      <section><h4 className="mb-2 text-xs font-bold text-muted-foreground">{pick("التعارض مع هذا الفصل", "Conflicts with this classroom")}</h4><div className="space-y-2">{account.conflictsWithCurrentClassroom?.length ? account.conflictsWithCurrentClassroom.map((booking, i) => <Booking key={`${booking.classroomId}-${booking.day}-${booking.startTime}-${i}`} booking={booking} conflict/>) : <p className="flex items-center gap-1.5 rounded-lg bg-emerald-50 p-2.5 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4"/>{pick("لا يوجد تعارض", "No conflicts")}</p>}</div></section>
      <Button type="button" variant={selected ? "default" : "outline"} className="w-full" disabled={!account.available} onClick={onSelect}>{selected ? <><Check className="me-2 h-4 w-4"/>{pick("تم اختيار الحساب", "Account selected")}</> : pick("اختيار الحساب", "Select account")}</Button>
    </CardContent>
  </Card>;
}

function ZoomSection({ classroomId, classroom, registrationMode, scheduleEntries, scheduleTimezone, scheduleLoading, onRefreshClassroom, onScheduleSaved }: { classroomId: string; classroom: ClassroomZoomDetails | null; registrationMode: "egyptian" | "gulf"; scheduleEntries: ClassroomScheduleEntry[]; scheduleTimezone?: string; scheduleLoading: boolean; onRefreshClassroom: () => Promise<void>; onScheduleSaved: () => void }) {
  const { pick } = useLanguage();
  const [availability, setAvailability] = useState<ZoomAvailability | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [generated, setGenerated] = useState<GeneratedZoomMeeting | null>(null);
  const [meetingAlreadyExists, setMeetingAlreadyExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const generationLock = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const entries = scheduleEntries;
  const meeting = getMeeting(classroom, generated);
  const meetingReady = Boolean(meeting);
  const selected = availability?.accounts.find((account) => account.id === selectedId);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await classroomZoomApi.getAvailability(classroomId);
      setAvailability(response.data);
      setSelectedId((current) => response.data.accounts.some((account) => account.id === current && account.available) ? current : "");
    }
    catch (err) { setError(safeError(err, pick)); }
    finally { setLoading(false); }
  }, [classroomId, pick]);

  useEffect(() => { setSelectedId(""); setGenerated(null); setMeetingAlreadyExists(false); }, [classroomId]);

  useEffect(() => {
    if (scheduleLoading) return;
    if (meetingReady || entries.length === 0) { setLoading(false); return; }
    void load();
  }, [entries.length, load, meetingReady, scheduleLoading]);

  const generate = async () => {
    if (!selected || !selected.available || generationLock.current || !entries.length) return;
    generationLock.current = true;
    setConfirming(false); setGenerating(true); setError("");
    try {
      const response = await classroomZoomApi.generateMeeting(classroomId, selected.id);
      setGenerated(response.data); toast.success(pick("تم إنشاء رابط Zoom بنجاح", "Zoom link generated successfully"));
      await Promise.allSettled([load(), onRefreshClassroom()]);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.code === "ZOOM_MEETING_ALREADY_EXISTS" ? pick("تم إنشاء اجتماع Zoom لهذا الفصل بالفعل. تم تحديث بيانات الفصل.", "A Zoom meeting already exists for this classroom. Classroom data has been refreshed.") : safeError(err, pick));
      if (apiError.code === "ZOOM_MEETING_ALREADY_EXISTS") {
        setMeetingAlreadyExists(true);
        setAvailability(null);
        setSelectedId("");
        await onRefreshClassroom().catch(() => undefined);
      }
      if (["ZOOM_ACCOUNT_SCHEDULE_CONFLICT", "ZOOM_ACCOUNT_ALREADY_CLAIMED"].includes(apiError.code)) await load();
      if (apiError.code === "ZOOM_PROVISIONING_IN_PROGRESS") setSelectedId("");
    } finally { generationLock.current = false; setGenerating(false); }
  };

  if (classroom?.zoomAssignmentMode === "grade_default") return null;
  return <div className="space-y-5">
    <Schedule entries={entries} timezone={availability?.timezone || scheduleTimezone} action={<ClassroomScheduleEditor classroomId={classroomId} mode={registrationMode} entries={entries} onSaved={onScheduleSaved}/>}/>
    {meeting ? <Card className="overflow-hidden border-emerald-200 shadow-elegant"><CardContent className="flex flex-col gap-4 bg-emerald-50/60 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-100"><CheckCircle2 className="h-6 w-6 text-emerald-700"/></span><div><h2 className="font-bold text-emerald-950">{pick("Zoom جاهز", "Zoom Ready")}</h2><p className="mt-1 text-sm text-emerald-800">{pick("الحساب:", "Account:")} <strong>{meeting.zoomAccount?.name || selected?.name || "—"}</strong></p></div></div>
      {meeting.meetingLink && <Button asChild className="gap-2 bg-emerald-700 hover:bg-emerald-800"><a href={meeting.meetingLink} target="_blank" rel="noreferrer">{pick("فتح رابط الاجتماع", "Open meeting link")}<ExternalLink className="h-4 w-4"/></a></Button>}
    </CardContent></Card> : meetingAlreadyExists ? <Card className="overflow-hidden border-amber-200 shadow-elegant"><CardContent className="flex items-start gap-3 bg-amber-50/60 p-5"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-100"><RefreshCw className="h-5 w-5 text-amber-700"/></span><div><h2 className="font-bold text-amber-950">{pick("اجتماع Zoom موجود بالفعل", "A Zoom meeting already exists")}</h2><p className="mt-1 text-sm text-amber-800">{pick("تم إيقاف الإنشاء المتكرر وتحديث بيانات الفصل. حدّث الصفحة إذا لم تظهر بيانات الاجتماع بعد.", "Duplicate creation has been stopped and the classroom data refreshed. Refresh the page if the meeting details do not appear yet.")}</p></div></CardContent></Card> : <section className="space-y-4">
      {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>{pick("تعذر إكمال الطلب", "Request failed")}</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-elegant"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10"><Video className="h-5 w-5 text-primary"/></span><div><h2 className="text-lg font-bold">{pick("إدارة Zoom", "Zoom management")}</h2><p className="text-sm text-muted-foreground">{pick("اختر حسابًا متاحًا لا يتعارض مع جدول الفصل", "Choose an available account without schedule conflicts")}</p></div></div><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading || generating}><RefreshCw className={cn("me-2 h-4 w-4", loading && "animate-spin")}/>{pick("تحديث التوفر", "Refresh availability")}</Button></div>
      {loading ? <div className="grid min-h-48 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary"/></div> : availability?.accounts.length ? <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{availability.accounts.map((account) => <AccountCard key={account.id} account={account} selected={selectedId === account.id} onSelect={() => setSelectedId(account.id)}/>)}</div> : <Card><CardContent className="p-8 text-center text-muted-foreground">{pick("لا توجد حسابات Zoom متاحة للعرض.", "No Zoom accounts are available to display.")}</CardContent></Card>}
      <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-xl border bg-background/95 p-3.5 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-xs text-muted-foreground">{pick("الحساب المحدد", "Selected account")}</p><p className="truncate font-semibold">{selected?.name || pick("لم يتم اختيار حساب بعد", "No account selected yet")}</p></div><Button size="lg" className="shrink-0" disabled={!selected || !selected.available || !entries.length || loading || generating} onClick={() => setConfirming(true)}>{generating ? <><Loader2 className="me-2 h-4 w-4 animate-spin"/>{pick("جاري الإنشاء...", "Generating...")}</> : <><Video className="me-2 h-4 w-4"/>{pick("إنشاء رابط Zoom", "Generate Zoom Link")}</>}</Button></div>
    </section>}
    <AlertDialog open={confirming} onOpenChange={setConfirming}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{pick("تأكيد إنشاء الاجتماع", "Confirm meeting generation")}</AlertDialogTitle><AlertDialogDescription>{pick(`إنشاء اجتماع Zoom باستخدام ${selected?.name || ""}؟`, `Generate Zoom meeting using ${selected?.name || ""}?`)}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{pick("إلغاء", "Cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => void generate()}>{pick("إنشاء", "Generate")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

type ClassroomFilter = "all" | "unlinked" | "ready";

const valueName = (value: ClassroomOption["subject"] | ClassroomOption["teacher"] | ClassroomOption["student"]) =>
  typeof value === "string" ? value : value?.name || (value && "fullName" in value ? value.fullName : "") || "";

const localizedName = (value: string | { ar?: string; en?: string } | undefined, isArabic: boolean) =>
  typeof value === "string" ? value : (isArabic ? value?.ar : value?.en) || value?.ar || value?.en || "";

const formatClassroomDate = (value: string | undefined, isArabic: boolean) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(isArabic ? "ar-EG-u-ca-gregory" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
};

function ClassroomStatusBadge({ item }: { item: ClassroomOption }) {
  const { pick } = useLanguage();
  const state = zoomDisplayState(item);
  if (state === "creating") return <Badge className="border border-sky-200 bg-sky-100 text-primary hover:bg-sky-100"><Loader2 className="me-1.5 h-3 w-3 animate-spin"/>{pick("جاري إنشاء Zoom", "Creating Zoom")}</Badge>;
  if (state === "failed") return <Badge className="border border-rose-200 bg-rose-100 text-rose-800 hover:bg-rose-100"><AlertCircle className="me-1.5 h-3 w-3"/>{pick("فشل إنشاء Zoom", "Zoom creation failed")}</Badge>;
  if (state === "ready") return <Badge className="border border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100"><CheckCircle2 className="me-1.5 h-3 w-3"/>{pick("مربوط برابط Zoom", "Zoom link connected")}</Badge>;
  return <Badge className="border border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-100"><AlertCircle className="me-1.5 h-3 w-3"/>{pick("لم يتم ربط Zoom", "Zoom not linked")}</Badge>;
}

function ClassroomCard({ item, onOpen }: { item: ClassroomOption; onOpen: () => void }) {
  const { isArabic, pick } = useLanguage();
  const subject = valueName(item.subject);
  const teacher = valueName(item.teacher);
  const student = valueName(item.student) || item.students?.[0]?.name || item.students?.[0]?.fullName || "";
  const meeting = normalizeZoomState(item);
  const ready = hasZoomMeetingLink(item);
  const displayState = zoomDisplayState(item);
  const createdAt = formatClassroomDate(item.createdAt, isArabic);
  const gradeName = referenceName(item.grade);
  return <Card className={cn("group relative flex h-full flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-sky", ready ? "border-emerald-200" : displayState === "failed" ? "border-rose-200" : displayState === "creating" ? "border-sky-200" : "border-amber-200 bg-amber-50/20")}>
    <div className={cn("absolute inset-y-0 start-0 w-1", ready ? "bg-emerald-400" : displayState === "failed" ? "bg-rose-400" : displayState === "creating" ? "bg-sky-400" : "bg-amber-400")}/>
    <CardHeader className="space-y-2.5 p-4 pb-2 ps-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><ClassroomStatusBadge item={item}/>{createdAt && <span className="text-xs text-muted-foreground">{createdAt}</span>}</div>
      <div><CardTitle className="break-words text-base leading-6">{item.name}</CardTitle>{gradeName && <p className="mt-0.5 text-xs text-muted-foreground">{gradeName}</p>}</div>
      {meeting.accountName && ready && <p className="inline-flex w-fit items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><Video className="h-3.5 w-3.5"/>{pick("Zoom:", "Zoom:")} {meeting.accountName}</p>}
    </CardHeader>
    <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-1">
      {(subject || teacher || student) && <div className="space-y-1.5 text-xs text-muted-foreground">
        {subject && <p className="flex items-center gap-2"><BookOpen className="h-4 w-4 shrink-0 text-primary/65"/><span className="break-words">{subject}</span></p>}
        {teacher && <p className="flex items-center gap-2"><GraduationCap className="h-4 w-4 shrink-0 text-primary/65"/><span className="break-words">{teacher}</span></p>}
        {student && <p className="flex items-center gap-2"><UserRound className="h-4 w-4 shrink-0 text-primary/65"/><span className="break-words">{student}</span></p>}
      </div>}
      <div className="mt-auto border-t pt-3">
        <Button size="sm" variant={ready ? "outline" : "default"} className="h-9 w-full gap-2" onClick={onOpen}>{ready ? <ExternalLink className="h-4 w-4"/> : <Video className="h-4 w-4"/>}{ready ? pick("عرض رابط Zoom", "View Zoom link") : pick("إدارة Zoom", "Manage Zoom")}</Button>
      </div>
    </CardContent>
  </Card>;
}

function ClassroomDetailHeader({ item }: { item: ClassroomOption }) {
  const { pick } = useLanguage();
  const subject = valueName(item.subject);
  return <Card className="overflow-hidden shadow-elegant"><CardContent className="flex flex-col gap-4 bg-gradient-to-l from-primary/[0.06] to-transparent p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><ClassroomStatusBadge item={item}/><Badge variant="outline">{referenceName(item.grade)}</Badge></div><h2 className="break-words text-xl font-bold sm:text-2xl">{item.name}</h2>{subject && <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="h-4 w-4"/>{subject}</p>}</div><div className="rounded-xl border bg-background/80 px-4 py-3 text-sm"><p className="text-xs text-muted-foreground">{pick("القسم الحالي", "Current section")}</p><p className="mt-1 flex items-center gap-2 font-semibold"><Video className="h-4 w-4 text-primary"/>{pick("إدارة رابط Zoom", "Zoom link management")}</p></div></CardContent></Card>;
}

export default function ClassroomZoomManagement() {
  const { isArabic, pick } = useLanguage();
  const { user } = usePortalAuth();
  const [params, setParams] = useSearchParams();
  const classroomId = params.get("classroomId") || "";
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [classroom, setClassroom] = useState<ClassroomZoomDetails | null>(null);
  const [scheduleEntries, setScheduleEntries] = useState<ClassroomScheduleEntry[]>([]);
  const [scheduleTimezone, setScheduleTimezone] = useState<string>();
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduleRevision, setScheduleRevision] = useState(0);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [curriculumId, setCurriculumId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [filter, setFilter] = useState<ClassroomFilter>("all");
  const manualClassrooms = useMemo(() => classrooms.filter((item) => item.zoomAssignmentMode === "manual"), [classrooms]);
  const selected = useMemo(() => manualClassrooms.find((item) => item.id === classroomId), [manualClassrooms, classroomId]);
  const curricula = useMemo(() => Array.from(new Map(manualClassrooms.map((item) => {
    const id = referenceId(item.curriculum);
    return id ? [id, { id, name: referenceName(item.curriculum), registrationMode: typeof item.curriculum === "string" ? undefined : item.curriculum?.registrationMode }] as const : null;
  }).filter(Boolean)).values()), [manualClassrooms]);
  const grades = useMemo(() => Array.from(new Map(manualClassrooms.filter((item) => referenceId(item.curriculum) === curriculumId).map((item) => {
    const id = referenceId(item.grade);
    return id ? [id, { id, name: referenceName(item.grade) }] as const : null;
  }).filter(Boolean)).values()), [manualClassrooms, curriculumId]);
  const gradeClassrooms = useMemo(() => manualClassrooms
    .filter((item) => referenceId(item.curriculum) === curriculumId && referenceId(item.grade) === gradeId)
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aTime = a.item.createdAt ? Date.parse(a.item.createdAt) : Number.NaN;
      const bTime = b.item.createdAt ? Date.parse(b.item.createdAt) : Number.NaN;
      if (Number.isNaN(aTime) && Number.isNaN(bTime)) return a.index - b.index;
      if (Number.isNaN(aTime)) return 1;
      if (Number.isNaN(bTime)) return -1;
      return bTime - aTime;
    })
    .map(({ item }) => item), [manualClassrooms, curriculumId, gradeId]);
  const visibleClassrooms = useMemo(() => gradeClassrooms.filter((item) => filter === "all" || (filter === "ready" ? hasZoomMeetingLink(item) : !hasZoomMeetingLink(item))), [filter, gradeClassrooms]);
  const readyCount = gradeClassrooms.filter(hasZoomMeetingLink).length;
  const unlinkedCount = gradeClassrooms.filter((item) => !hasZoomMeetingLink(item)).length;
  const selectedCurriculum = curricula.find((item) => item.id === curriculumId);
  const selectedGrade = grades.find((item) => item.id === gradeId);

  const loadClassroom = useCallback(async () => {
    if (!classroomId) return;
    const response = await classroomZoomApi.getClassroom(classroomId);
    setClassroom({ ...selected, ...response.data } as ClassroomZoomDetails);
  }, [classroomId, selected]);

  useEffect(() => {
    const request = user?.role === "supervisor"
      ? classroomZoomApi.getMyClassrooms()
      : classroomRecordingsApi.listClassrooms();
    request.then((r) => setClassrooms(r.data || [])).catch((e) => toast.error(safeError(e, pick))).finally(() => setLoadingClassrooms(false));
  }, [pick, user?.role]);
  useEffect(() => {
    if (!selected) return;
    setCurriculumId(referenceId(selected.curriculum));
    setGradeId(referenceId(selected.grade));
  }, [selected]);
  useEffect(() => {
    setClassroom(null);
    setScheduleEntries([]);
    setScheduleTimezone(undefined);
    if (!classroomId || loadingClassrooms) return;
    if (!selected) { setParams({}); return; }
    setLoadingDetails(true);
    loadClassroom().catch((e) => toast.error(safeError(e, pick))).finally(() => setLoadingDetails(false));
  }, [classroomId, loadClassroom, loadingClassrooms, pick, selected, setParams]);

  useEffect(() => {
    if (!classroomId || !classroom || classroom.zoomAssignmentMode !== "manual") return;
    const curriculum = typeof classroom.curriculum === "string" ? selected?.curriculum : classroom.curriculum;
    const mode = typeof curriculum === "string" ? undefined : curriculum?.registrationMode;
    if (mode !== "egyptian" && mode !== "gulf") return;
    let active = true;
    setLoadingSchedule(true);
    const request = mode === "egyptian" ? classroomZoomApi.getEgyptianSchedule(classroomId) : classroomZoomApi.getGulfSchedule(classroomId);
    request.then((response) => {
      if (!active) return;
      if (mode === "egyptian") {
        const data = response.data as { timezone?: string; days?: Array<{ dayName: string; lessons?: Array<{ startTime: string; endTime?: string; classroomSubjectId?: string; classroomSubject?: string | { id?: string; _id?: string }; subject?: { name?: string | { ar?: string; en?: string } } }> }> };
        setScheduleTimezone(data.timezone);
        setScheduleEntries((data.days || []).flatMap((day) => (day.lessons || []).map((lesson) => ({ day: day.dayName, startTime: lesson.startTime, ...(lesson.endTime ? { endTime: lesson.endTime } : {}), classroomSubjectId: lesson.classroomSubjectId || referenceId(lesson.classroomSubject), subjectName: localizedName(lesson.subject?.name, isArabic) }))));
      } else {
        const data = response.data as { timezone?: string; classroomSubject?: string | { id?: string; _id?: string }; subject?: { name?: string | { ar?: string; en?: string } }; schedule?: { entries?: ClassroomScheduleEntry[] } | ClassroomScheduleEntry[] };
        const entries = Array.isArray(data.schedule) ? data.schedule : data.schedule?.entries || [];
        const subjectName = localizedName(data.subject?.name, isArabic);
        setScheduleTimezone(data.timezone);
        setScheduleEntries(entries.map((entry) => ({ ...entry, classroomSubjectId: entry.classroomSubjectId || referenceId(data.classroomSubject), subjectName: entry.subjectName || subjectName })));
      }
    }).catch((error: ApiError) => {
      if (!active) return;
      if (error.status !== 404 && !["CLASSROOM_SCHEDULE_NOT_FOUND", "EGYPTIAN_SCHEDULE_NOT_FOUND"].includes(error.code)) toast.error(safeError(error, pick));
      setScheduleEntries([]);
    }).finally(() => { if (active) setLoadingSchedule(false); });
    return () => { active = false; };
  }, [classroom, classroomId, isArabic, pick, scheduleRevision, selected?.curriculum]);

  const chooseCurriculum = (id: string) => {
    setCurriculumId(id); setGradeId(""); setFilter("all"); setClassroom(null); setParams({});
  };
  const chooseGrade = (id: string) => {
    setGradeId(id); setFilter("all"); setClassroom(null); setParams({});
  };
  const openClassroom = (id: string) => setParams({ classroomId: id });
  const backToClassrooms = () => { setClassroom(null); setParams({}); };
  const BackArrow = isArabic ? ArrowRight : ArrowLeft;

  return <DashboardLayout><div className="mx-auto max-w-7xl space-y-5">
    <header className="relative overflow-hidden rounded-2xl border bg-gradient-to-l from-primary/[0.09] via-card to-card p-5 shadow-sm sm:p-6"><div className="absolute -start-10 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl"/><div className="relative"><div className="mb-2 flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-background/70 px-3 py-1 text-xs font-semibold text-primary"><Video className="h-3.5 w-3.5"/>{pick("الفصول الخاصة", "Private classrooms")}</div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{pick("إدارة روابط Zoom للفصول الخاصة", "Private classroom Zoom links")}</h1><p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{pick("اختر المنهج والصف، ثم افتح الفصل لإدارة رابط Zoom الخاص به.", "Choose a curriculum and grade, then open a classroom to manage its Zoom link.")}</p></div></header>
    {(curriculumId || gradeId || classroomId) && <nav aria-label={pick("مسار التنقل", "Breadcrumb")} className="flex flex-wrap items-center gap-1.5 rounded-xl border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
      {selectedCurriculum && <button onClick={() => chooseCurriculum(selectedCurriculum.id)} className="rounded-md px-2 py-1 font-medium transition-colors hover:bg-muted hover:text-primary">{selectedCurriculum.name}</button>}
      {selectedGrade && <><span dir="ltr" aria-hidden="true" className="px-1 text-base font-bold text-primary/45">&gt;</span><button onClick={() => chooseGrade(selectedGrade.id)} className="rounded-md px-2 py-1 font-medium transition-colors hover:bg-muted hover:text-primary">{selectedGrade.name}</button></>}
      {gradeId && <><span dir="ltr" aria-hidden="true" className="px-1 text-base font-bold text-primary/45">&gt;</span><button onClick={backToClassrooms} className={cn("rounded-md px-2 py-1 font-medium", !classroomId ? "bg-primary/10 text-primary" : "hover:bg-muted hover:text-primary")}>{pick("الفصول الخاصة", "Private classrooms")}</button></>}
      {selected && classroomId && <><span dir="ltr" aria-hidden="true" className="px-1 text-base font-bold text-primary/45">&gt;</span><span className="font-semibold text-foreground">{selected.name}</span></>}
    </nav>}

    {loadingClassrooms ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div> : manualClassrooms.length === 0 || curricula.length === 0 ? <Card><CardContent className="grid min-h-64 place-items-center text-center text-muted-foreground"><div><School className="mx-auto mb-3 h-10 w-10 opacity-40"/><p>{pick("لا توجد فصول خاصة متاحة", "No private classrooms available")}</p></div></CardContent></Card> : <>
      {!classroomId && <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm sm:p-5"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">1</span><div><h2 className="font-bold">{pick("اختر المنهج", "Choose curriculum")}</h2><p className="text-xs text-muted-foreground">{pick("ابدأ بتحديد المنهج", "Start by selecting a curriculum")}</p></div></div><div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">{curricula.map((item) => { const count = manualClassrooms.filter((classroomItem) => referenceId(classroomItem.curriculum) === item.id).length; const active = curriculumId === item.id; return <button key={item.id} className={cn("flex items-center justify-between gap-3 rounded-xl border bg-background p-3.5 text-start transition-all hover:border-primary/40 hover:bg-primary/[0.03]", active && "border-primary bg-primary/[0.07] ring-1 ring-primary/20")} onClick={() => chooseCurriculum(item.id)}><span className="flex min-w-0 items-center gap-3"><span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}><BookOpen className="h-4 w-4"/></span><span className="truncate font-bold">{item.name}</span></span><Badge variant={active ? "default" : "secondary"} className="shrink-0">{count} {pick("فصل", "classes")}</Badge></button>})}</div></section>}

      {!classroomId && curriculumId && <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm sm:p-5"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">2</span><div><h2 className="font-bold">{pick("اختر الصف", "Choose grade")}</h2><p className="text-xs text-muted-foreground">{selectedCurriculum?.name}</p></div></div>{grades.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{grades.map((item) => { const active = gradeId === item.id; return <button key={item.id} className={cn("flex items-center gap-2.5 rounded-xl border bg-background px-3.5 py-3 text-start text-sm font-semibold transition-colors hover:border-primary/40", active && "border-primary bg-primary text-primary-foreground shadow-sm")} onClick={() => chooseGrade(item.id)}><GraduationCap className="h-4 w-4 shrink-0"/><span className="truncate">{item.name}</span>{active && <Check className="ms-auto h-4 w-4"/>}</button>})}</div> : <div className="rounded-xl border border-dashed py-7 text-center text-sm text-muted-foreground">{pick("لا توجد صفوف متاحة", "No grades available")}</div>}</section>}

      {!classroomId && gradeId && <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">3</span><div><h2 className="font-bold">{pick("اختر الفصل الخاص", "Choose private classroom")}</h2><p className="text-xs text-muted-foreground">{pick("مرتبة حسب الأحدث أولًا", "Newest first")} · {selectedGrade?.name}</p></div></div>
          <div className="grid grid-cols-3 rounded-xl bg-muted p-1">{(["all", "unlinked", "ready"] as ClassroomFilter[]).map((value) => <Button key={value} size="sm" variant={filter === value ? "secondary" : "ghost"} className={cn("h-8 rounded-lg px-3 text-xs shadow-none", filter === value && "bg-background shadow-sm")} onClick={() => setFilter(value)}>{value === "all" ? pick("الكل", "All") : value === "unlinked" ? pick("بدون Zoom", "Without Zoom") : pick("مربوط", "Linked")}</Button>)}</div>
        </div>
        <div className="flex flex-wrap gap-2 border-y py-3"><div className="flex min-w-32 items-center gap-2 rounded-lg bg-muted/60 px-3 py-2"><span className="text-xl font-bold">{gradeClassrooms.length}</span><span className="text-xs text-muted-foreground">{pick("إجمالي الفصول", "Total")}</span></div><div className="flex min-w-32 items-center gap-2 rounded-lg bg-amber-50 px-3 py-2"><span className="text-xl font-bold text-amber-800">{unlinkedCount}</span><span className="text-xs text-amber-800/75">{pick("بدون Zoom", "Without Zoom")}</span></div><div className="flex min-w-32 items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2"><span className="text-xl font-bold text-emerald-700">{readyCount}</span><span className="text-xs text-emerald-700/75">{pick("مربوط", "Linked")}</span></div></div>
        {gradeClassrooms.length === 0 ? <div className="grid min-h-40 place-items-center rounded-xl border border-dashed text-sm text-muted-foreground">{pick("لا توجد فصول في هذا الصف", "No classrooms in this grade")}</div> : visibleClassrooms.length === 0 ? <div className="grid min-h-32 place-items-center rounded-xl border border-dashed text-sm text-muted-foreground">{pick("لا توجد فصول تطابق هذا الفلتر", "No classrooms match this filter")}</div> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{visibleClassrooms.map((item) => <ClassroomCard key={item.id} item={item} onOpen={() => openClassroom(item.id)}/>)}</div>}
      </section>}

      {classroomId && <section className="space-y-5"><Button variant="ghost" className="gap-2 px-1 hover:bg-transparent hover:text-primary" onClick={backToClassrooms}><BackArrow className="h-4 w-4"/>{pick("العودة إلى الفصول الخاصة", "Back to private classrooms")}</Button>{selected && <ClassroomDetailHeader item={{ ...selected, ...classroom } as ClassroomOption}/>} {loadingDetails || loadingSchedule ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div> : classroom?.zoomAssignmentMode === "manual" && (typeof classroom.curriculum !== "string" ? classroom.curriculum?.registrationMode : selected?.curriculum?.registrationMode) ? <ZoomSection key={classroomId} classroomId={classroomId} classroom={classroom} registrationMode={(typeof classroom.curriculum !== "string" ? classroom.curriculum?.registrationMode : selected?.curriculum?.registrationMode) as "egyptian" | "gulf"} scheduleEntries={scheduleEntries} scheduleTimezone={scheduleTimezone} scheduleLoading={loadingSchedule} onRefreshClassroom={loadClassroom} onScheduleSaved={() => setScheduleRevision((value) => value + 1)}/> : null}</section>}
    </>}
  </div></DashboardLayout>;
}
