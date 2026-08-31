import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, Loader2, RefreshCw, School } from "lucide-react";
import { ApiError } from "@/api/client";
import { classroomZoomApi } from "@/api/classroomZoomApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/layouts/DashboardLayout";
import { CLASSROOM_DAYS, CLASSROOM_DAY_NAMES, normalizeEgyptianSchedule, normalizeGulfSchedule } from "@/admin/zoom/classroomManagement";

interface SupervisorLesson {
  key: string;
  day: string;
  startTime: string;
  endTime?: string;
  subjectName?: string;
  classroomId: string;
  classroomName: string;
  curriculumName: string;
  gradeName: string;
  registrationMode: "egyptian" | "gulf";
}

const safeMessage = (error: ApiError) => error.status === 403
  ? "ليس لديك صلاحية لعرض جداول هذه الفصول."
  : "تعذر تحميل جدول الفصول. حاول مرة أخرى.";
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const parseDate = (value: string) => new Date(`${value}T12:00:00`);
const getSaturday = (date: Date) => { const result = new Date(date); result.setDate(result.getDate() - ((result.getDay() + 1) % 7)); return result; };
const calendarDays = (month: Date) => { const start = getSaturday(new Date(month.getFullYear(), month.getMonth(), 1)); return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; }); };
const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export default function SupervisorSchedule() {
  const [lessons, setLessons] = useState<SupervisorLesson[]>([]);
  const [classroomCount, setClassroomCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await classroomZoomApi.getMyClassrooms();
      const classrooms = Array.isArray(response.data) ? response.data : [];
      setClassroomCount(classrooms.length);
      const results = await Promise.all(classrooms.map(async (classroom) => {
        const mode = classroom.curriculum?.registrationMode;
        if (mode !== "egyptian" && mode !== "gulf") return [];
        try {
          const entries = mode === "egyptian"
            ? normalizeEgyptianSchedule((await classroomZoomApi.getEgyptianSchedule(classroom.id)).data)
            : normalizeGulfSchedule((await classroomZoomApi.getGulfSchedule(classroom.id)).data);
          return entries.map((entry, index): SupervisorLesson => ({
            key: `${classroom.id}-${entry.day}-${entry.startTime}-${index}`,
            day: entry.day.toLowerCase(), startTime: entry.startTime, endTime: entry.endTime,
            subjectName: entry.subjectName, classroomId: classroom.id, classroomName: classroom.name,
            curriculumName: classroom.curriculum?.name || "—", gradeName: classroom.grade?.name || "—",
            registrationMode: mode,
          }));
        } catch (caught) {
          if ((caught as ApiError).status === 404) return [];
          throw caught;
        }
      }));
      setLessons(results.flat());
    } catch (caught) { setError(safeMessage(caught as ApiError)); setLessons([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const grid = useMemo(() => calendarDays(month), [month]);
  const byDay = useMemo(() => new Map(CLASSROOM_DAYS.map((day) => [day, lessons.filter((lesson) => lesson.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime))])), [lessons]);
  const selectedObject = parseDate(selectedDate);
  const selectedDay = dayKeys[selectedObject.getDay()];
  const selectedLessons = byDay.get(selectedDay as typeof CLASSROOM_DAYS[number]) || [];
  const changeMonth = (amount: number) => { const next = new Date(month.getFullYear(), month.getMonth() + amount, 1); setMonth(next); setSelectedDate(dateKey(next)); };

  return <DashboardLayout><section dir="rtl" className="mx-auto max-w-7xl space-y-6"><header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="flex items-center gap-2 text-3xl font-bold"><CalendarDays className="text-primary"/>جدول الفصول</h1><p className="mt-1 text-muted-foreground">حصص الفصول المسندة إليك خلال الأسبوع.</p></div><Button variant="outline" onClick={load} disabled={loading} className="gap-2"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}/>تحديث</Button></header>
    <div className="flex flex-wrap gap-2"><Badge variant="outline">{classroomCount} فصل</Badge><Badge variant="outline">{lessons.length} حصة أسبوعية</Badge></div>
    {error && <div role="alert" className="rounded-xl bg-destructive/10 p-4 text-destructive">{error}</div>}
    {loading ? <div className="grid min-h-72 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div> : classroomCount === 0 ? <Card><CardContent className="grid min-h-56 place-items-center text-center text-muted-foreground"><div><School className="mx-auto mb-3 h-10 w-10 opacity-40"/><p>لا توجد فصول مسندة إليك</p></div></CardContent></Card> : lessons.length === 0 ? <Card><CardContent className="grid min-h-56 place-items-center text-center text-muted-foreground"><div><CalendarDays className="mx-auto mb-3 h-10 w-10 opacity-40"/><p>لم يتم تحديد جداول للفصول المسندة إليك</p></div></CardContent></Card> : <Card className="overflow-hidden shadow-elegant"><CardContent className="p-0"><div dir="ltr" className="portal-schedule-layout min-h-[590px]"><div dir="rtl" className="portal-calendar-panel p-5 md:p-8"><div className="mb-7 flex items-center justify-between"><Button size="icon" variant="outline" onClick={() => changeMonth(1)} aria-label="الشهر التالي"><ChevronRight className="h-4 w-4"/></Button><div className="text-center"><h2 className="text-lg font-bold">{month.toLocaleDateString("ar-EG-u-ca-gregory", { month: "long", year: "numeric" })}</h2><p className="mt-1 text-xs text-muted-foreground">{lessons.length} حصة أسبوعية</p></div><Button size="icon" variant="outline" onClick={() => changeMonth(-1)} aria-label="الشهر السابق"><ChevronLeft className="h-4 w-4"/></Button></div><div className="mb-2 grid grid-cols-7">{["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"].map((day) => <div key={day} className="py-2 text-center text-xs text-muted-foreground md:text-sm">{day}</div>)}</div><div className="grid grid-cols-7 gap-y-2">{grid.map((date) => { const key = dateKey(date); const count = byDay.get(dayKeys[date.getDay()] as typeof CLASSROOM_DAYS[number])?.length || 0; const outside = date.getMonth() !== month.getMonth(); const active = key === selectedDate; return <button key={key} onClick={() => setSelectedDate(key)} className="group relative grid h-12 cursor-pointer place-items-center md:h-14" aria-label={`${date.getDate()}، ${count} حصة`}><span className={`grid h-10 w-10 place-items-center rounded-full text-sm transition-all ${active ? "bg-primary text-primary-foreground shadow-sky" : outside ? "text-muted-foreground/35" : "hover:bg-secondary/25"}`}>{date.getDate()}</span>{count > 0 && <span aria-hidden="true" className={`absolute bottom-0 h-2 w-2 rounded-full ring-2 ring-card ${active ? "bg-secondary" : "bg-primary"}`}/>}</button>; })}</div></div><aside dir="rtl" className="portal-lessons-panel bg-card p-5 md:p-8"><div className="mb-5 flex items-center justify-between border-b pb-4"><div><h2 className="font-bold">حصص {selectedObject.toLocaleDateString("ar-EG-u-ca-gregory", { weekday: "long" })}</h2><p className="mt-1 text-sm text-muted-foreground">{selectedObject.toLocaleDateString("ar-EG-u-ca-gregory", { day: "numeric", month: "long", year: "numeric" })}</p></div><span className="rounded-full bg-muted px-3 py-1 text-xs">{selectedLessons.length} حصة</span></div>{selectedLessons.length === 0 ? <div className="grid h-80 place-items-center text-center text-muted-foreground"><div><CalendarDays className="mx-auto mb-3 h-9 w-9 opacity-40"/><p>لا توجد حصص في هذا اليوم</p></div></div> : <div className="space-y-3">{selectedLessons.map((lesson) => <article key={lesson.key} className="rounded-xl border p-4 transition-all hover:border-secondary hover:shadow-sky"><div className="flex justify-between gap-3"><div><h3 className="font-bold">{lesson.subjectName || "حصة"}</h3><p className="mt-1 text-sm text-muted-foreground">{lesson.classroomName}</p></div><span dir="ltr" className="font-semibold text-primary">{lesson.startTime}{lesson.endTime ? ` - ${lesson.endTime}` : ""}</span></div><p className="mt-2 text-sm">{lesson.gradeName} · {lesson.curriculumName}</p><div className="mt-3 flex items-center justify-between"><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><BookOpen className="h-3.5 w-3.5"/>{lesson.subjectName || "بدون مادة"}</span><Badge variant="outline" className="text-xs">{lesson.registrationMode === "egyptian" ? "مصري" : "خليجي"}</Badge></div></article>)}</div>}</aside></div></CardContent></Card>}
  </section></DashboardLayout>;
}
