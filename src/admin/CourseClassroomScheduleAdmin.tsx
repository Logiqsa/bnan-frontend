import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarDays, ChevronLeft, Copy, Loader2, Plus, RefreshCw, Save, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { coursesApi, type CourseScheduleSlot } from "@/api/coursesApi";
import { courseError } from "@/lib/courseUi";
import { hasLegacyCourseScheduleSlots, newEditableCourseScheduleSlot, serializeCourseScheduleSlots, toEditableCourseScheduleSlots, type EditableCourseScheduleSlot } from "@/lib/courseScheduleEditor";
import DashboardLayout from "@/layouts/DashboardLayout";
import Time12Input from "@/components/Time12Input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePortalAuth } from "@/portal/PortalAuthContext";
import { zoomAccountsApi, type WeeklyZoomClassroomAssignments, type WeeklyZoomSlotStatus } from "@/api/zoomAccountsApi";

const days: CourseScheduleSlot["day"][] = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"];
const dayNames: Record<CourseScheduleSlot["day"], string> = { saturday: "السبت", sunday: "الأحد", monday: "الاثنين", tuesday: "الثلاثاء", wednesday: "الأربعاء", thursday: "الخميس", friday: "الجمعة" };
type ScheduleRow = EditableCourseScheduleSlot;

export default function CourseClassroomScheduleAdmin() {
  const { classroomId = "" } = useParams();
  const { user } = usePortalAuth();
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [timezone, setTimezone] = useState("Africa/Cairo");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [legacySchedule, setLegacySchedule] = useState(false);
  const [conflictNotice, setConflictNotice] = useState("");
  const [automationPending, setAutomationPending] = useState(false);
  const [weeklyZoom, setWeeklyZoom] = useState<WeeklyZoomClassroomAssignments | null>(null);
  const editRevision = useRef(0);
  const isAdmin = user?.role === "admin";

  const load = useCallback(async ({ statusRefresh = false } = {}) => {
    if (statusRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [schedule, assignments] = await Promise.all([
        coursesApi.getSchedule(classroomId),
        isAdmin ? zoomAccountsApi.getClassroomWeeklyAssignments(classroomId).then((response) => response.data).catch(() => null) : Promise.resolve(null),
      ]);
      if (!statusRefresh || editRevision.current === 0) {
        setTimezone(schedule?.timezone || "Africa/Cairo");
        setRows(toEditableCourseScheduleSlots(schedule?.slots || []));
        setLegacySchedule(Boolean(schedule?.slots?.length && hasLegacyCourseScheduleSlots(schedule.slots)));
      }
      setWeeklyZoom(assignments);
      setError("");
    } catch (caught) { setError(courseError(caught)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [classroomId, isAdmin]);

  useEffect(() => { void load(); }, [load]);

  const add = () => { editRevision.current += 1; setAutomationPending(false); setRows((current) => [...current, newEditableCourseScheduleSlot({ day: "saturday", startTime: "09:00", endTime: "10:00" })]); };
  const update = (key: string, patch: Partial<CourseScheduleSlot>) => { editRevision.current += 1; setAutomationPending(false); setRows((current) => current.map((row) => row.clientKey === key ? { ...row, ...patch } : row)); };
  const save = async () => {
    if (legacySchedule) return toast.error(courseError({ code: "COURSE_SCHEDULE_LEGACY_SLOT_IDS_REQUIRED" }));
    if (rows.some((row) => !row.startTime || (row.endTime && row.endTime <= row.startTime))) return toast.error("تأكد أن وقت النهاية بعد وقت البداية.");
    const revision = editRevision.current;
    setSaving(true); setConflictNotice("");
    try {
      await coursesApi.updateSchedule(classroomId, { timezone, slots: serializeCourseScheduleSlots(rows) });
      const [latest, assignments] = await Promise.all([
        coursesApi.getSchedule(classroomId),
        isAdmin ? zoomAccountsApi.getClassroomWeeklyAssignments(classroomId).then((response) => response.data).catch(() => null) : Promise.resolve(null),
      ]);
      if (latest && editRevision.current === revision) {
        setTimezone(latest.timezone || "Africa/Cairo");
        setRows(toEditableCourseScheduleSlots(latest.slots || []));
        setLegacySchedule(Boolean(latest.slots?.length && hasLegacyCourseScheduleSlots(latest.slots)));
        setAutomationPending(latest.slots.length > 0);
      }
      setWeeklyZoom(assignments);
      toast.success("تم حفظ جدول الدورة. يجري تجهيز Zoom تلقائيًا لكل موعد.");
    } catch (caught) {
      const code = (caught as { code?: string })?.code || "";
      if (["COURSE_SCHEDULE_CONCURRENT_UPDATE", "COURSE_SCHEDULE_SLOT_ID_UNKNOWN", "COURSE_SCHEDULE_SLOT_ID_FOREIGN", "COURSE_SCHEDULE_SLOT_IDENTITY_AMBIGUOUS"].includes(code)) {
        setConflictNotice("تم جلب أحدث نسخة من الخادم دون حذف تعديلاتك الحالية. راجع تغييراتك وأعد تحميل الصفحة قبل إعادة تطبيقها.");
      }
      toast.error(courseError(caught));
    } finally { setSaving(false); }
  };

  const statusLabel: Record<WeeklyZoomSlotStatus, string> = { ready: "جاهز", cutover_pending: "بانتظار التفعيل", allocating: "جارٍ تخصيص الحساب", provisioning: "جارٍ تجهيز اجتماع Zoom", pending: "بانتظار التخصيص", quarantined: "متوقف للتحقق", failed: "فشل التجهيز", cancelled: "ملغي" };
  const retryZoom = async () => {
    setRefreshing(true);
    try {
      const response = await zoomAccountsApi.retryClassroomWeeklyAssignments(classroomId);
      const assignments = await zoomAccountsApi.getClassroomWeeklyAssignments(classroomId);
      setWeeklyZoom(assignments.data);
      setAutomationPending(response.data.unresolvedCount > 0);
      if (response.data.readyCount > 0) toast.success(`تم تجهيز ${response.data.readyCount} موعد Zoom بنجاح.`);
      else if (response.data.attemptedCount === 0) toast.success("كل مواعيد Zoom جاهزة بالفعل.");
      else toast.error("لم يكتمل تجهيز Zoom بعد؛ راجع حالة الموعد الظاهرة.");
    } catch (caught) { toast.error(courseError(caught)); }
    finally { setRefreshing(false); }
  };
  const copyLink = async (value: string) => { try { await navigator.clipboard.writeText(value); toast.success("تم نسخ رابط Zoom للمشاركين."); } catch { toast.error("تعذر نسخ الرابط. انسخه يدويًا."); } };
  return <DashboardLayout><div dir="rtl" className="mx-auto max-w-5xl space-y-5">
    <Link to={user?.role === "supervisor" ? "/portal/supervisor/schedule" : "/admin/courses"} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ChevronLeft className="h-4 w-4 rotate-180" />العودة</Link>
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5"><div><h1 className="text-2xl font-bold">جدول الدورة</h1><p className="mt-1 text-sm text-muted-foreground">حدد أيام ومواعيد حصص هذا الفصل. يوزّع Bnan حساب Zoom والاجتماع تلقائيًا.</p></div><Button onClick={() => void save()} disabled={saving || loading || legacySchedule}>{saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}حفظ الجدول</Button></header>
    {legacySchedule && <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">هذا جدول قديم متاح للعرض فقط. يلزم ترقية بيانات المواعيد بشكل منظّم قبل تعديله.</p>}
    {conflictNotice && <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{conflictNotice}</p>}
    {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin" /></div> : error ? <Card><CardContent className="py-16 text-center text-destructive">{error}</CardContent></Card> : <Card><CardHeader className="flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" />المواعيد الأسبوعية</CardTitle><Button variant="outline" onClick={add} disabled={legacySchedule || saving}><Plus className="me-2 h-4 w-4" />إضافة موعد</Button></CardHeader><CardContent className="space-y-3">{rows.length === 0 ? <button className="w-full rounded-xl border border-dashed py-14 text-muted-foreground" onClick={add} disabled={legacySchedule}>لا توجد مواعيد — أضف أول موعد</button> : rows.map((row) => <div key={row.clientKey} className="grid items-end gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_1fr_1fr_auto]"><label className="space-y-2"><Label>اليوم</Label><Select value={row.day} disabled={legacySchedule || saving} onValueChange={(day) => update(row.clientKey, { day: day as CourseScheduleSlot["day"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{days.map((day) => <SelectItem key={day} value={day}>{dayNames[day]}</SelectItem>)}</SelectContent></Select></label><label className="space-y-2"><Label>من</Label><Time12Input value={row.startTime} disabled={legacySchedule || saving} onChange={(startTime) => update(row.clientKey, { startTime })} /></label><label className="space-y-2"><Label>إلى</Label><Time12Input value={row.endTime || ""} allowEmpty disabled={legacySchedule || saving} onChange={(endTime) => update(row.clientKey, { endTime })} /></label><Button size="icon" variant="ghost" className="text-destructive" disabled={legacySchedule || saving} onClick={() => { editRevision.current += 1; setAutomationPending(false); setRows((current) => current.filter((item) => item.clientKey !== row.clientKey)); }}><Trash2 className="h-4 w-4" /></Button></div>)}</CardContent></Card>}
    {!loading && !error && rows.length > 0 && <Card><CardHeader className="flex-row items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><Video className="h-5 w-5" />تجهيز Zoom تلقائيًا</CardTitle><p className="mt-2 text-sm text-muted-foreground">لا تختَر حسابًا أو تنشئ رابطًا يدويًا. لكل موعد حساب واجتماع Type‑3 ثابتان، وتظهر حالتهما هنا للمدير.</p></div><Button size="sm" variant="outline" onClick={() => void retryZoom()} disabled={refreshing || saving || !isAdmin}><RefreshCw className={`me-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />تحديث وتجهيز Zoom</Button></CardHeader><CardContent className="space-y-3">{automationPending && <p className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">تم حفظ المواعيد. جارٍ تخصيص حساب Zoom وتجهيز الاجتماع؛ إعادة المحاولة تتحقق من Zoom أولًا ولا تنشئ اجتماعًا مكررًا.</p>}{user?.role === "admin" && weeklyZoom?.slots?.length ? weeklyZoom.slots.map((slot) => <section key={slot.assignmentId} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{dayNames[slot.day as CourseScheduleSlot["day"]] || slot.day} <span dir="ltr">{slot.startTime} – {slot.endTime || ""}</span></p><p className="mt-1 text-sm text-muted-foreground">الحالة: {statusLabel[slot.status]}{slot.account ? ` · الحساب: ${slot.account.name}` : ""}</p></div><span className="rounded-full border px-3 py-1 text-xs">{slot.status}</span></div>{slot.meeting ? <div className="mt-3 flex flex-wrap items-center gap-2"><a href={slot.meeting.participantUrl} target="_blank" rel="noreferrer" className="max-w-full break-all text-sm text-primary underline" dir="ltr">{slot.meeting.participantUrl}</a><Button size="sm" variant="outline" onClick={() => void copyLink(slot.meeting!.participantUrl)}><Copy className="me-2 h-4 w-4" />نسخ الرابط</Button></div> : <p className="mt-3 text-sm text-muted-foreground">{slot.reason || "لم يصبح رابط المشاركين جاهزًا بعد."}</p>}</section>) : <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">{user?.role === "admin" ? "لا توجد حالة Zoom محفوظة لهذه المواعيد بعد." : "تظهر حالة التجهيز أو السعة الموثوقة عند البدء أو الدخول، وتبقى أزرار البدء والدخول مقيدة بالحصة الفعلية والمستخدم المصرح له."}</p>}</CardContent></Card>}
  </div></DashboardLayout>;
}
