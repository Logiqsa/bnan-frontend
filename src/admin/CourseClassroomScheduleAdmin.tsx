import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarDays, ChevronLeft, Loader2, Plus, RefreshCw, Save, Trash2, Video } from "lucide-react";
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
  const editRevision = useRef(0);

  const load = useCallback(async ({ statusRefresh = false } = {}) => {
    if (statusRefresh) setRefreshing(true); else setLoading(true);
    try {
      const schedule = await coursesApi.getSchedule(classroomId);
      if (!statusRefresh || editRevision.current === 0) {
        setTimezone(schedule?.timezone || "Africa/Cairo");
        setRows(toEditableCourseScheduleSlots(schedule?.slots || []));
        setLegacySchedule(Boolean(schedule?.slots?.length && hasLegacyCourseScheduleSlots(schedule.slots)));
      }
      setError("");
    } catch (caught) { setError(courseError(caught)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [classroomId]);

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
      const latest = await coursesApi.getSchedule(classroomId);
      if (latest && editRevision.current === revision) {
        setTimezone(latest.timezone || "Africa/Cairo");
        setRows(toEditableCourseScheduleSlots(latest.slots || []));
        setLegacySchedule(Boolean(latest.slots?.length && hasLegacyCourseScheduleSlots(latest.slots)));
        setAutomationPending(latest.slots.length > 0);
      }
      toast.success("تم حفظ جدول الدورة. يجري تجهيز Zoom تلقائيًا لكل موعد.");
    } catch (caught) {
      const code = (caught as { code?: string })?.code || "";
      if (["COURSE_SCHEDULE_CONCURRENT_UPDATE", "COURSE_SCHEDULE_SLOT_ID_UNKNOWN", "COURSE_SCHEDULE_SLOT_ID_FOREIGN", "COURSE_SCHEDULE_SLOT_IDENTITY_AMBIGUOUS"].includes(code)) {
        setConflictNotice("تم جلب أحدث نسخة من الخادم دون حذف تعديلاتك الحالية. راجع تغييراتك وأعد تحميل الصفحة قبل إعادة تطبيقها.");
      }
      toast.error(courseError(caught));
    } finally { setSaving(false); }
  };

  return <DashboardLayout><div dir="rtl" className="mx-auto max-w-5xl space-y-5">
    <Link to={user?.role === "supervisor" ? "/portal/supervisor/schedule" : "/admin/courses"} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ChevronLeft className="h-4 w-4 rotate-180" />العودة</Link>
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5"><div><h1 className="text-2xl font-bold">جدول الدورة</h1><p className="mt-1 text-sm text-muted-foreground">حدد أيام ومواعيد حصص هذا الفصل. يوزّع Bnan حساب Zoom والاجتماع تلقائيًا.</p></div><Button onClick={() => void save()} disabled={saving || loading || legacySchedule}>{saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}حفظ الجدول</Button></header>
    {legacySchedule && <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">هذا جدول قديم متاح للعرض فقط. يلزم ترقية بيانات المواعيد بشكل منظّم قبل تعديله.</p>}
    {conflictNotice && <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{conflictNotice}</p>}
    {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin" /></div> : error ? <Card><CardContent className="py-16 text-center text-destructive">{error}</CardContent></Card> : <Card><CardHeader className="flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" />المواعيد الأسبوعية</CardTitle><Button variant="outline" onClick={add} disabled={legacySchedule || saving}><Plus className="me-2 h-4 w-4" />إضافة موعد</Button></CardHeader><CardContent className="space-y-3">{rows.length === 0 ? <button className="w-full rounded-xl border border-dashed py-14 text-muted-foreground" onClick={add} disabled={legacySchedule}>لا توجد مواعيد — أضف أول موعد</button> : rows.map((row) => <div key={row.clientKey} className="grid items-end gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_1fr_1fr_auto]"><label className="space-y-2"><Label>اليوم</Label><Select value={row.day} disabled={legacySchedule || saving} onValueChange={(day) => update(row.clientKey, { day: day as CourseScheduleSlot["day"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{days.map((day) => <SelectItem key={day} value={day}>{dayNames[day]}</SelectItem>)}</SelectContent></Select></label><label className="space-y-2"><Label>من</Label><Time12Input value={row.startTime} disabled={legacySchedule || saving} onChange={(startTime) => update(row.clientKey, { startTime })} /></label><label className="space-y-2"><Label>إلى</Label><Time12Input value={row.endTime || ""} allowEmpty disabled={legacySchedule || saving} onChange={(endTime) => update(row.clientKey, { endTime })} /></label><Button size="icon" variant="ghost" className="text-destructive" disabled={legacySchedule || saving} onClick={() => { editRevision.current += 1; setAutomationPending(false); setRows((current) => current.filter((item) => item.clientKey !== row.clientKey)); }}><Trash2 className="h-4 w-4" /></Button></div>)}</CardContent></Card>}
    {!loading && !error && rows.length > 0 && <Card><CardHeader className="flex-row items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><Video className="h-5 w-5" />تجهيز Zoom تلقائيًا</CardTitle><p className="mt-2 text-sm text-muted-foreground">لا تختَر حسابًا أو تنشئ رابطًا يدويًا. بعد الحفظ يخصص الخادم حسابًا واجتماع Type‑3 ثابتًا لكل موعد، ويعرض الدخول فقط للمستخدم المصرح له عند بدء الحصة.</p></div><Button size="sm" variant="outline" onClick={() => void load({ statusRefresh: true })} disabled={refreshing || saving}><RefreshCw className={`me-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />تحديث الجدول</Button></CardHeader><CardContent>{automationPending ? <p className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">تم حفظ المواعيد. جارٍ تخصيص حساب Zoom وتجهيز الاجتماع؛ إعادة تحميل الجدول لا تنشئ اجتماعًا إضافيًا.</p> : <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">لا يعيد عقد قراءة الجدول الحالي حالة تخصيص كل موعد. ستظهر حالة التجهيز أو السعة الموثوقة عند البدء أو الدخول، وتبقى أزرار البدء والدخول مقيدة بالحصة الفعلية والمستخدم المصرح له.</p>}</CardContent></Card>}
  </div></DashboardLayout>;
}
