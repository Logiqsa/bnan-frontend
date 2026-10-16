import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CalendarDays, CheckCircle2, ChevronLeft, ExternalLink, Loader2, Plus, RefreshCw, Save, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { coursesApi, type CourseScheduleSlot } from "@/api/coursesApi";
import { classroomZoomApi, type ZoomAvailability } from "@/api/classroomZoomApi";
import { courseError } from "@/lib/courseUi";
import { hasLegacyCourseScheduleSlots, newEditableCourseScheduleSlot, serializeCourseScheduleSlots, toEditableCourseScheduleSlots, type EditableCourseScheduleSlot } from "@/lib/courseScheduleEditor";
import { normalizeZoomState } from "@/admin/zoom/classroomZoomNormalization";
import DashboardLayout from "@/layouts/DashboardLayout";
import Time12Input from "@/components/Time12Input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePortalAuth } from "@/portal/PortalAuthContext";

const days: CourseScheduleSlot["day"][] = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"];
const dayNames: Record<CourseScheduleSlot["day"], string> = { saturday: "السبت", sunday: "الأحد", monday: "الاثنين", tuesday: "الثلاثاء", wednesday: "الأربعاء", thursday: "الخميس", friday: "الجمعة" };
type ScheduleRow = EditableCourseScheduleSlot;

export default function CourseClassroomScheduleAdmin() {
  const { classroomId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("courseId") || "";
  const groupId = searchParams.get("groupId") || "";
  const { user } = usePortalAuth();
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [timezone, setTimezone] = useState("Africa/Cairo");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [zoomAvailability, setZoomAvailability] = useState<ZoomAvailability | null>(null);
  const [zoomLoading, setZoomLoading] = useState(false);
  const [zoomError, setZoomError] = useState("");
  const [generatingAccountId, setGeneratingAccountId] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [zoomAccountName, setZoomAccountName] = useState("");
  const [recommendedAccountId, setRecommendedAccountId] = useState("");
  const [recommendedAccountName, setRecommendedAccountName] = useState("");
  const [scheduleSaved, setScheduleSaved] = useState(false);
  const [legacySchedule, setLegacySchedule] = useState(false);
  const [conflictNotice, setConflictNotice] = useState("");
  const editRevision = useRef(0);

  const findPreviousGroupAccount = useCallback(async () => {
    if (!courseId) return null;
    const groups = await coursesApi.listGroups(courseId);
    const currentIndex = groups.findIndex((group) => {
      const id = typeof group.classroom === "object" ? group.classroom?.id : group.classroom;
      return group.id === groupId || id === classroomId;
    });
    const earlierGroups = (currentIndex >= 0
      ? [...groups.slice(0, currentIndex).reverse(), ...groups.slice(currentIndex + 1)]
      : groups.filter((group) => (typeof group.classroom === "object" ? group.classroom?.id : group.classroom) !== classroomId)
    );
    for (const group of earlierGroups) {
      const previousClassroomId = typeof group.classroom === "object" ? group.classroom?.id : group.classroom;
      if (!previousClassroomId) continue;
      try {
        const response = await classroomZoomApi.getClassroom(previousClassroomId);
        const zoom = normalizeZoomState(response.data);
        if (zoom.accountId) return { id: zoom.accountId, name: zoom.accountName };
      } catch {
        // Try the next earlier group if this classroom is unavailable.
      }
    }
    return null;
  }, [classroomId, courseId, groupId]);

  const loadZoomAvailability = useCallback(async () => {
    setZoomLoading(true);
    setZoomError("");
    try {
      const response = await classroomZoomApi.getAvailability(classroomId);
      setZoomAvailability(response.data);
      const previousAccount = await findPreviousGroupAccount();
      const recommended = previousAccount && response.data.accounts.find((account) => account.id === previousAccount.id && account.available);
      setRecommendedAccountId(recommended?.id || "");
      setRecommendedAccountName(recommended?.name || previousAccount?.name || "");
    } catch (caught) {
      setZoomAvailability(null);
      setZoomError(courseError(caught));
    } finally {
      setZoomLoading(false);
    }
  }, [classroomId, findPreviousGroupAccount]);

  useEffect(() => {
    Promise.all([
      coursesApi.getSchedule(classroomId),
      classroomZoomApi.getClassroom(classroomId),
    ])
      .then(([schedule, classroomResponse]) => {
        setTimezone(schedule?.timezone || "Africa/Cairo");
        setRows(toEditableCourseScheduleSlots(schedule?.slots || []));
        setLegacySchedule(Boolean(schedule?.slots?.length && hasLegacyCourseScheduleSlots(schedule.slots)));
        setScheduleSaved(Boolean(schedule?.slots?.length));
        const zoom = normalizeZoomState(classroomResponse.data);
        setMeetingLink(zoom.meetingLink);
        setZoomAccountName(zoom.accountName);
      })
      .catch((caught) => setError(courseError(caught)))
      .finally(() => setLoading(false));
  }, [classroomId]);

  useEffect(() => {
    if (!loading && !error && rows.length && scheduleSaved) void loadZoomAvailability();
  }, [error, loadZoomAvailability, loading, rows.length, scheduleSaved]);

  const add = () => { editRevision.current += 1; setScheduleSaved(false); setRows((current) => [...current, newEditableCourseScheduleSlot({ day: "saturday", startTime: "09:00", endTime: "10:00" })]); };
  const update = (key: string, patch: Partial<CourseScheduleSlot>) => { editRevision.current += 1; setScheduleSaved(false); setRows((current) => current.map((row) => row.clientKey === key ? { ...row, ...patch } : row)); };
  const save = async () => {
    if (legacySchedule) return toast.error(courseError({ code: "COURSE_SCHEDULE_LEGACY_SLOT_IDS_REQUIRED" }));
    if (rows.some((row) => !row.startTime || (row.endTime && row.endTime <= row.startTime))) return toast.error("تأكد أن وقت النهاية بعد وقت البداية.");
    const revision = editRevision.current;
    setSaving(true);
    setConflictNotice("");
    try {
      await coursesApi.updateSchedule(classroomId, { timezone, slots: serializeCourseScheduleSlots(rows) });
      const latest = await coursesApi.getSchedule(classroomId);
      if (latest && editRevision.current === revision) {
        setTimezone(latest.timezone || "Africa/Cairo");
        setRows(toEditableCourseScheduleSlots(latest.slots || []));
        setLegacySchedule(Boolean(latest.slots?.length && hasLegacyCourseScheduleSlots(latest.slots)));
        setScheduleSaved(latest.slots.length > 0);
      }
      toast.success("تم حفظ جدول الدورة بنجاح.");
      if (rows.length) await loadZoomAvailability();
    } catch (caught) {
      const code = (caught as { code?: string })?.code || "";
      if (["COURSE_SCHEDULE_CONCURRENT_UPDATE", "COURSE_SCHEDULE_SLOT_ID_UNKNOWN", "COURSE_SCHEDULE_SLOT_ID_FOREIGN", "COURSE_SCHEDULE_SLOT_IDENTITY_AMBIGUOUS"].includes(code)) {
        await coursesApi.getSchedule(classroomId).catch(() => null);
        setConflictNotice("تم جلب أحدث نسخة من الخادم دون حذف تعديلاتك الحالية. راجع تغييراتك وأعد تحميل الصفحة قبل إعادة تطبيقها.");
      }
      toast.error(courseError(caught));
    }
    finally { setSaving(false); }
  };

  const createMeeting = async (zoomAccountId: string) => {
    if (!scheduleSaved) return;
    setGeneratingAccountId(zoomAccountId);
    setZoomError("");
    try {
      const response = await classroomZoomApi.generateMeeting(classroomId, zoomAccountId);
      setMeetingLink(response.data.meetingLink || "");
      setZoomAccountName(response.data.zoomAccount?.name || "");
      toast.success("تم ربط الفصل بحساب Zoom وإنشاء الرابط.");
    } catch (caught) {
      setZoomError(courseError(caught));
    } finally {
      setGeneratingAccountId("");
    }
  };

  return <DashboardLayout><div dir="rtl" className="mx-auto max-w-5xl space-y-5">
    <Link to={user?.role === "supervisor" ? "/portal/supervisor/schedule" : "/admin/courses"} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ChevronLeft className="h-4 w-4 rotate-180" />العودة</Link>
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5"><div><h1 className="text-2xl font-bold">جدول الدورة</h1><p className="mt-1 text-sm text-muted-foreground">حدد أيام ومواعيد حصص هذا الفصل.</p></div><Button onClick={() => void save()} disabled={saving || loading || legacySchedule}>{saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}حفظ الجدول</Button></header>
    {legacySchedule && <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">هذا جدول قديم متاح للعرض فقط. يلزم ترقية بيانات المواعيد بشكل منظّم قبل تعديله.</p>}
    {conflictNotice && <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{conflictNotice}</p>}
    {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin" /></div> : error ? <Card><CardContent className="py-16 text-center text-destructive">{error}</CardContent></Card> : <Card><CardHeader className="flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" />المواعيد الأسبوعية</CardTitle><Button variant="outline" onClick={add} disabled={legacySchedule || saving}><Plus className="me-2 h-4 w-4" />إضافة موعد</Button></CardHeader><CardContent className="space-y-3">{rows.length === 0 ? <button className="w-full rounded-xl border border-dashed py-14 text-muted-foreground" onClick={add} disabled={legacySchedule}>لا توجد مواعيد — أضف أول موعد</button> : rows.map((row) => <div key={row.clientKey} className="grid items-end gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_1fr_1fr_auto]"><label className="space-y-2"><Label>اليوم</Label><Select value={row.day} disabled={legacySchedule || saving} onValueChange={(day) => update(row.clientKey, { day: day as CourseScheduleSlot["day"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{days.map((day) => <SelectItem key={day} value={day}>{dayNames[day]}</SelectItem>)}</SelectContent></Select></label><label className="space-y-2"><Label>من</Label><Time12Input value={row.startTime} disabled={legacySchedule || saving} onChange={(startTime) => update(row.clientKey, { startTime })} /></label><label className="space-y-2"><Label>إلى</Label><Time12Input value={row.endTime || ""} allowEmpty disabled={legacySchedule || saving} onChange={(endTime) => update(row.clientKey, { endTime })} /></label><Button size="icon" variant="ghost" className="text-destructive" disabled={legacySchedule || saving} onClick={() => { editRevision.current += 1; setScheduleSaved(false); setRows((current) => current.filter((item) => item.clientKey !== row.clientKey)); }}><Trash2 className="h-4 w-4" /></Button></div>)}</CardContent></Card>}
    {!loading && !error && rows.length > 0 && !scheduleSaved && !meetingLink && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">احفظ الجدول أولًا ليتم فحص التعارض وإتاحة ربط حساب Zoom.</div>}
    {!loading && !error && rows.length > 0 && (scheduleSaved || Boolean(meetingLink)) && <Card><CardHeader className="flex-row items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><Video className="h-5 w-5" />ربط الدورة بحساب Zoom</CardTitle><p className="mt-2 text-sm text-muted-foreground">{meetingLink ? `هذه المجموعة مرتبطة بحساب Zoom${zoomAccountName ? `: ${zoomAccountName}` : ""} والرابط جاهز للاستخدام.` : "تُحسب الإتاحة من جميع مواعيد الجدول المحفوظ لمنع تعارض الحساب مع أي فصل آخر."}</p></div>{!meetingLink && <Button size="sm" variant="outline" onClick={() => void loadZoomAvailability()} disabled={zoomLoading}><RefreshCw className={`me-2 h-4 w-4 ${zoomLoading ? "animate-spin" : ""}`} />تحديث التوفر</Button>}</CardHeader><CardContent className="space-y-3">{meetingLink ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"><span className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" />تم ربط المجموعة{zoomAccountName ? ` بحساب ${zoomAccountName}` : ""} وإنشاء رابط Zoom</span><Button asChild size="sm"><a href={meetingLink} target="_blank" rel="noreferrer"><ExternalLink className="me-2 h-4 w-4" />فتح الرابط</a></Button></div> : <>{recommendedAccountName && <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-primary">حساب المجموعة السابقة: <strong>{recommendedAccountName}</strong>{recommendedAccountId ? " — متاح ومقترح لهذه المجموعة." : " — غير متاح للجدول الحالي."}</p>}{zoomError && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{zoomError}</p>}{zoomLoading ? <div className="grid min-h-28 place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : zoomAvailability?.accounts.length ? <div className="grid gap-3 md:grid-cols-2">{[...zoomAvailability.accounts].sort((a, b) => Number(b.id === recommendedAccountId) - Number(a.id === recommendedAccountId)).map((item) => <div key={item.id} className={`rounded-xl border p-4 ${item.available ? "border-emerald-200 bg-emerald-50/40" : "bg-muted/40"}`}><div className="flex items-center justify-between gap-3"><div><p className="font-bold">{item.name}</p><div className="flex flex-wrap gap-2"><Badge variant={item.available ? "default" : "secondary"} className={item.available ? "mt-2 bg-emerald-600" : "mt-2"}>{item.available ? "متاح لكل المواعيد" : "غير متاح"}</Badge>{item.id === recommendedAccountId && <Badge variant="outline" className="mt-2 border-sky-300 bg-sky-50 text-primary">مقترح</Badge>}</div></div><Button size="sm" disabled={!scheduleSaved || !item.available || Boolean(generatingAccountId)} onClick={() => void createMeeting(item.id)}>{generatingAccountId === item.id && <Loader2 className="me-2 h-4 w-4 animate-spin" />}ربط وإنشاء الرابط</Button></div>{!item.available && item.conflictsWithCurrentClassroom.length > 0 && <div className="mt-3 border-t pt-3 text-xs text-muted-foreground">{item.conflictsWithCurrentClassroom.slice(0, 3).map((conflict, index) => <p key={`${conflict.day}-${conflict.startTime}-${index}`}>{dayNames[conflict.day as CourseScheduleSlot["day"]] || conflict.day}: <span dir="ltr">{conflict.startTime} - {conflict.endTime}</span>{conflict.classroomName ? ` · ${conflict.classroomName}` : ""}</p>)}</div>}</div>)}</div> : zoomAvailability ? <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">لا توجد حسابات Zoom مجهزة ومتاحة.</p> : null}</>}</CardContent></Card>}
  </div></DashboardLayout>;
}
