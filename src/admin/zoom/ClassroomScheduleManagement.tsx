import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BookOpen, CalendarDays, ChevronLeft, Clock3, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import { classroomRecordingsApi, type ClassroomSubjectOption } from "@/api/classroomRecordingsApi";
import { classroomZoomApi, type ClassroomScheduleEntry, type ClassroomZoomDetails } from "@/api/classroomZoomApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/layouts/DashboardLayout";
import Time12Input from "@/components/Time12Input";
import { usePortalAuth } from "@/portal/PortalAuthContext";
import { referenceName } from "./classroomZoomNormalization";
import { CLASSROOM_DAYS, CLASSROOM_DAY_NAMES, normalizeEgyptianSchedule, normalizeGulfSchedule } from "./classroomManagement";
import ScheduleTimeText from "@/components/ScheduleTimeText";

type Day = typeof CLASSROOM_DAYS[number];
type Row = ClassroomScheduleEntry & { key: string };

const subjectLabel = (subject: ClassroomSubjectOption) => subject.name || subject.subject?.name || "—";
const newRow = (day: Day, subjectId = ""): Row => ({ key: crypto.randomUUID(), day, startTime: "09:00", endTime: "10:00", classroomSubjectId: subjectId });
const errorMessage = (error: unknown) => {
  const apiError = error as ApiError;
  if (apiError.status === 403) return "ليس لديك صلاحية لتعديل جدول هذا الفصل.";
  if (apiError.status === 404) return "الفصل أو الجدول غير موجود.";
  if (apiError.status === 409) return "الموعد يتعارض مع حجز آخر. راجع الأوقات وحاول مجددًا.";
  return apiError.message || "تعذر إكمال الطلب. حاول مرة أخرى.";
};

export default function ClassroomScheduleManagement() {
  const { classroomId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = usePortalAuth();
  const [classroom, setClassroom] = useState<ClassroomZoomDetails | null>(null);
  const [subjects, setSubjects] = useState<ClassroomSubjectOption[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [originalDays, setOriginalDays] = useState<Set<string>>(new Set());
  const [activeDay, setActiveDay] = useState<Day>("saturday");
  const [gulfSubjectId, setGulfSubjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const mode = classroom && typeof classroom.curriculum !== "string" ? classroom.curriculum?.registrationMode : undefined;
  const backPath = user?.role === "supervisor" ? "/portal/supervisor/classrooms" : "/admin/classrooms";

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [classroomResponse, subjectsResponse] = await Promise.all([
          classroomZoomApi.getClassroom(classroomId),
          classroomRecordingsApi.listSubjects(classroomId),
        ]);
        if (!active) return;
        const details = classroomResponse.data;
        const activeSubjects = (subjectsResponse.data.subjects || []).filter((item) => item.isActive !== false);
        const registrationMode = typeof details.curriculum !== "string" ? details.curriculum?.registrationMode : undefined;
        if (!registrationMode) throw new Error("تعذر تحديد نوع جدول الفصل.");
        let entries: ClassroomScheduleEntry[] = [];
        try {
          if (registrationMode === "egyptian") entries = normalizeEgyptianSchedule((await classroomZoomApi.getEgyptianSchedule(classroomId)).data);
          else entries = normalizeGulfSchedule((await classroomZoomApi.getGulfSchedule(classroomId)).data);
        } catch (error) {
          if ((error as ApiError).status !== 404) throw error;
        }
        if (!active) return;
        const normalized = entries.map((entry, index) => ({
          ...entry,
          day: entry.day.toLowerCase(),
          classroomSubjectId: entry.classroomSubjectId || activeSubjects.find((subject) => subjectLabel(subject) === entry.subjectName)?.classroomSubjectId || activeSubjects[0]?.classroomSubjectId || "",
          key: `${entry.day}-${entry.startTime}-${index}`,
        }));
        setClassroom(details);
        setSubjects(activeSubjects);
        setRows(normalized);
        setOriginalDays(new Set(normalized.map((entry) => entry.day)));
        setGulfSubjectId(normalized[0]?.classroomSubjectId || activeSubjects[0]?.classroomSubjectId || "");
        setActiveDay((normalized[0]?.day as Day) || "saturday");
      } catch (error) {
        if (active) toast.error(errorMessage(error));
      } finally {
        if (active) setLoading(false);
      }
    };
    if (classroomId) void load();
    return () => { active = false; };
  }, [classroomId]);

  const rowsByDay = useMemo(() => new Map(CLASSROOM_DAYS.map((day) => [day, rows.filter((row) => row.day === day)])), [rows]);
  const updateRow = (key: string, patch: Partial<Row>) => setRows((current) => current.map((row) => row.key === key ? { ...row, ...patch } : row));
  const addLesson = (day: Day) => setRows((current) => [...current, newRow(day, mode === "gulf" ? gulfSubjectId : subjects[0]?.classroomSubjectId)]);

  const save = async () => {
    if (!mode || !subjects.length) return toast.error("لا توجد مواد مكلّفة داخل الفصل.");
    if (rows.some((row) => !row.startTime || (row.endTime && row.endTime <= row.startTime))) return toast.error("وقت النهاية يجب أن يكون بعد وقت البداية.");
    if (mode === "gulf" && (!gulfSubjectId || CLASSROOM_DAYS.some((day) => (rowsByDay.get(day)?.length || 0) > 1))) return toast.error("اختر المادة، وتأكد من وجود موعد واحد فقط لكل يوم.");
    if (mode === "egyptian") {
      if (rows.some((row) => !row.classroomSubjectId)) return toast.error("اختر مادة لكل حصة.");
      for (const day of CLASSROOM_DAYS) {
        const dayRows = rowsByDay.get(day) || [];
        if (new Set(dayRows.map((row) => row.startTime)).size !== dayRows.length) return toast.error(`لا يمكن تكرار نفس الموعد يوم ${CLASSROOM_DAY_NAMES[day]}.`);
      }
    }
    setSaving(true);
    try {
      if (mode === "gulf") {
        if (rows.length) await classroomZoomApi.saveGulfSchedule(
          classroomId,
          gulfSubjectId,
          rows.map(({ day, startTime, endTime }) => ({ day, startTime, ...(endTime ? { endTime } : {}) })),
        );
        else await classroomZoomApi.deleteGulfSchedule(classroomId);
      } else {
        await Promise.all(CLASSROOM_DAYS.map((day) => {
          const lessons = rowsByDay.get(day) || [];
          if (lessons.length) return classroomZoomApi.saveEgyptianDay(
            classroomId,
            day,
            lessons.map((row) => ({ classroomSubject: row.classroomSubjectId || "", startTime: row.startTime, ...(row.endTime ? { endTime: row.endTime } : {}) })),
          );
          return originalDays.has(day) ? classroomZoomApi.deleteEgyptianDay(classroomId, day) : Promise.resolve();
        }));
      }
      setOriginalDays(new Set(rows.map((row) => row.day)));
      toast.success("تم حفظ جدول الفصل بنجاح.");
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setSaving(false); }
  };

  return <DashboardLayout><div dir="rtl" className="mx-auto max-w-6xl space-y-5">
    <nav aria-label="مسار التنقل" className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><Link to={backPath} className="hover:text-primary">إدارة الفصول والمواعيد</Link><ChevronLeft className="h-4 w-4"/><span className="text-foreground">{classroom?.name || "تعديل الجدول"}</span></nav>
    {loading ? <div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div> : !classroom || !mode ? <Card><CardContent className="py-16 text-center"><p>تعذر تحميل بيانات جدول الفصل.</p><Button className="mt-4" variant="outline" onClick={() => navigate(backPath)}>العودة إلى الفصول</Button></CardContent></Card> : <>
      <header className="rounded-2xl border bg-gradient-to-l from-primary/[0.09] via-card to-card p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="mb-2 flex flex-wrap gap-2"><Badge variant="outline">{mode === "egyptian" ? "منهج مصري" : "منهج سعودي"}</Badge><Badge variant="outline">{referenceName(classroom.grade)}</Badge></div><h1 className="text-2xl font-bold sm:text-3xl">تعديل جدول {classroom.name}</h1><p className="mt-2 text-sm text-muted-foreground">اختر اليوم، ثم أضف المادة وحدد موعد كل حصة.</p></div><Button onClick={() => void save()} disabled={saving} size="lg" className="shrink-0 gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}حفظ الجدول</Button></div></header>
      <Tabs value={activeDay} onValueChange={(value) => setActiveDay(value as Day)} dir="rtl">
        <div className="schedule-day-tabs-scroll w-full max-w-full touch-pan-x overflow-x-auto overscroll-x-contain pb-2 [-webkit-overflow-scrolling:touch]"><TabsList className="h-auto w-max min-w-full justify-start gap-1 p-1.5 sm:justify-center">{CLASSROOM_DAYS.map((day) => <TabsTrigger key={day} value={day} className="shrink-0 snap-start gap-2 px-4 py-2.5"><span>{CLASSROOM_DAY_NAMES[day]}</span>{(rowsByDay.get(day)?.length || 0) > 0 && <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5">{rowsByDay.get(day)?.length}</Badge>}</TabsTrigger>)}</TabsList></div>
        {CLASSROOM_DAYS.map((day) => { const dayRows = rowsByDay.get(day) || []; return <TabsContent key={day} value={day} className="mt-3"><Card><CardHeader className="flex-row items-center justify-between gap-3 border-b"><div><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary"/>حصص يوم {CLASSROOM_DAY_NAMES[day]}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{dayRows.length ? `${dayRows.length} حصة` : "لا توجد حصص في هذا اليوم"}</p></div><Button variant="outline" onClick={() => addLesson(day)} disabled={mode === "gulf" && dayRows.length > 0} className="gap-2"><Plus className="h-4 w-4"/>إضافة حصة</Button></CardHeader><CardContent className="space-y-3 p-4 sm:p-6">
          {!dayRows.length ? <button type="button" onClick={() => addLesson(day)} className="grid min-h-48 w-full place-items-center rounded-xl border border-dashed text-center text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/[0.02]"><span><CalendarDays className="mx-auto mb-3 h-9 w-9 opacity-40"/>اضغط لإضافة أول حصة في هذا اليوم</span></button> : dayRows.map((row, index) => <div key={row.key} className="rounded-xl border bg-muted/15 p-4"><div className="mb-4 flex items-center justify-between"><h3 className="font-bold">الحصة {index + 1}</h3><Button type="button" size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))} aria-label="حذف الحصة"><Trash2 className="h-4 w-4"/></Button></div><div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2"><Label className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary"/>المادة</Label><Select value={mode === "gulf" ? gulfSubjectId : row.classroomSubjectId} onValueChange={(classroomSubjectId) => mode === "gulf" ? setGulfSubjectId(classroomSubjectId) : updateRow(row.key, { classroomSubjectId })}><SelectTrigger><SelectValue placeholder="اختر المادة"/></SelectTrigger><SelectContent>{subjects.map((subject) => <SelectItem key={subject.classroomSubjectId} value={subject.classroomSubjectId}>{subjectLabel(subject)}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary"/>من</Label><Time12Input value={row.startTime} onChange={(startTime) => updateRow(row.key, { startTime })}/></div>
            <div className="space-y-2"><Label className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary"/>إلى</Label><Time12Input value={row.endTime || ""} allowEmpty onChange={(endTime) => updateRow(row.key, { endTime })}/></div>
          </div><p className="mt-3 flex flex-wrap items-center gap-1 rounded-lg bg-primary/5 px-3 py-2 text-sm font-medium text-primary">الموعد: من <ScheduleTimeText value={row.startTime}/>{row.endTime && <> إلى <ScheduleTimeText value={row.endTime}/></>}</p></div>)}
        </CardContent></Card></TabsContent>; })}
      </Tabs>
      <div className="sticky bottom-3 z-20 flex items-center justify-between gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur"><p className="hidden text-sm text-muted-foreground sm:block">راجع المواد والمواعيد في كل الأيام قبل الحفظ.</p><Button onClick={() => void save()} disabled={saving} className="w-full gap-2 sm:w-auto">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}حفظ الجدول</Button></div>
    </>}
  </div></DashboardLayout>;
}
