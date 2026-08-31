import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, CalendarDays, Loader2, RefreshCw, School, Video } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { ApiError } from "@/api/client";
import { zoomAccountsApi, type ZoomAccountClassroom, type ZoomAccountUsage } from "@/api/zoomAccountsApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildUsageTimeline, DAY_NAMES, filterUsageClassrooms, getMeetingStatus, type UsageFilter } from "./zoomAccountUsage";

const FILTERS: Array<{ value: UsageFilter; label: string }> = [
  { value: "all", label: "الكل" }, { value: "manual", label: "Manual" },
  { value: "grade_default", label: "ربط تلقائي" }, { value: "active", label: "نشط" },
  { value: "inactive", label: "غير نشط" },
];

const meetingLabels = {
  ready: { label: "Zoom جاهز", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  creating: { label: "جاري الإنشاء", className: "border-sky-200 bg-sky-50 text-sky-700" },
  failed: { label: "فشل الإنشاء", className: "border-red-200 bg-red-50 text-red-700" },
  not_ready: { label: "غير جاهز", className: "text-muted-foreground" },
};

const Schedule = ({ classroom }: { classroom: ZoomAccountClassroom }) => !classroom.schedule?.length ? (
  <span className="text-muted-foreground">لا يوجد جدول</span>
) : (
  <div className="space-y-2 text-xs">
    {classroom.schedule.map((entry, index) => (
      <div key={`${entry.day}-${entry.startTime}-${entry.subjectId}-${index}`} className="border-e-2 border-primary/20 pe-2">
        <p className="font-semibold">{DAY_NAMES[entry.day] || entry.day}</p>
        <p dir="ltr" className="w-fit text-muted-foreground">{entry.startTime}{entry.endTime ? ` - ${entry.endTime}` : ""}</p>
        {entry.subjectName && <p>{entry.subjectName}</p>}
      </div>
    ))}
  </div>
);

const ClassroomBadges = ({ classroom }: { classroom: ZoomAccountClassroom }) => {
  const meeting = meetingLabels[getMeetingStatus(classroom)];
  return <>
    <Badge variant="outline">{classroom.zoomAssignmentMode === "manual" ? "يدوي" : "ربط تلقائي"}</Badge>
    <Badge variant="outline" className={meeting.className}>{meeting.label}</Badge>
    <Badge variant={classroom.isActive ? "default" : "outline"} className={classroom.isActive ? "bg-emerald-600" : "text-muted-foreground"}>{classroom.isActive ? "نشط" : "غير نشط"}</Badge>
  </>;
};

const errorMessage = (error: ApiError) => {
  if (error.status === 404) return "حساب Zoom غير موجود";
  if (error.status === 403) return "ليس لديك صلاحية لعرض استخدام حساب Zoom هذا";
  return "تعذر تحميل استخدام حساب Zoom. حاول مرة أخرى.";
};

export default function ZoomAccountUsageAdmin() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<ZoomAccountUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<UsageFilter>("all");
  const [curriculumId, setCurriculumId] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await zoomAccountsApi.getZoomAccountClassrooms(id);
      setData({
        ...response.data,
        classrooms: Array.isArray(response.data?.classrooms) ? response.data.classrooms : [],
        summary: response.data?.summary || {
          totalClassrooms: 0,
          activeClassrooms: 0,
          readyMeetings: 0,
          manualClassrooms: 0,
          gradeDefaultClassrooms: 0,
        },
      });
    } catch (caught) {
      setData(null);
      setError(errorMessage(caught as ApiError));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const curricula = useMemo(() => Array.from(new Map((data?.classrooms || [])
    .filter((item) => item.curriculum?.id)
    .map((item) => [item.curriculum.id, item.curriculum])).values()), [data]);
  const visibleClassrooms = useMemo(() => filterUsageClassrooms(data?.classrooms || [], filter)
    .filter((item) => curriculumId === "all" || item.curriculum?.id === curriculumId), [curriculumId, data, filter]);
  const timeline = useMemo(() => buildUsageTimeline(data?.classrooms || []), [data]);

  return <DashboardLayout><div dir="rtl" className="mx-auto max-w-7xl space-y-6">
    <Button variant="ghost" className="gap-2 px-1" onClick={() => navigate("/admin?tab=zoom-accounts")}><ArrowRight className="h-4 w-4"/>العودة إلى حسابات Zoom</Button>

    {loading ? <div className="grid min-h-80 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div> : error ? (
      <Card><CardContent className="grid min-h-64 place-items-center text-center"><div><p className="font-semibold">{error}</p><Button className="mt-4 gap-2" onClick={load}><RefreshCw className="h-4 w-4"/>إعادة المحاولة</Button></div></CardContent></Card>
    ) : data && <>
      <header className="rounded-2xl border bg-gradient-to-l from-primary/[0.09] via-card to-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary"><Video className="h-4 w-4"/>استخدام حساب Zoom</p><h1 className="text-2xl font-bold sm:text-3xl">{data.account.name}</h1></div><div className="flex flex-wrap gap-2"><Badge variant={data.account.isActive ? "default" : "outline"} className={data.account.isActive ? "bg-emerald-600" : ""}>{data.account.isActive ? "مفعل" : "غير مفعل"}</Badge><Badge variant="outline" className={data.account.isConfigured ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>{data.account.isConfigured ? "جاهز للاستخدام" : "قيد الإعداد"}</Badge></div></div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[["إجمالي الفصول", data.summary.totalClassrooms], ["الفصول النشطة", data.summary.activeClassrooms], ["Zoom جاهز", data.summary.readyMeetings], ["Manual", data.summary.manualClassrooms], ["Grade Default", data.summary.gradeDefaultClassrooms]].map(([label, value]) => <Card key={label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>)}
      </section>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-xl"><CalendarDays className="h-5 w-5 text-primary"/>مواعيد استخدام الحساب</CardTitle><p className="text-sm text-muted-foreground">جميع المواعيد المرتبطة بهذا الحساب، مرتبة حسب اليوم والوقت.</p></CardHeader>
        <CardContent>{timeline.length === 0 ? <div className="rounded-xl border border-dashed py-10 text-center text-muted-foreground">لا توجد مواعيد استخدام</div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{timeline.map((group) => <section key={group.day} className="overflow-hidden rounded-xl border"><h3 className="bg-primary/10 px-4 py-3 font-bold text-primary">{DAY_NAMES[group.day] || group.day}</h3><div className="divide-y">{group.entries.map((entry, index) => <div key={`${entry.classroomId}-${entry.startTime}-${index}`} className="p-4"><p dir="ltr" className="w-fit font-mono font-bold">{entry.startTime}{entry.endTime ? ` - ${entry.endTime}` : ""}</p><p className="mt-1 font-semibold">{entry.classroomName} - {entry.gradeName}</p>{entry.subjectName && <p className="text-sm text-muted-foreground">{entry.subjectName}</p>}</div>)}</div></section>)}</div>}</CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-xl font-bold">الفصول المرتبطة</h2><p className="text-sm text-muted-foreground">تظهر الفصول غير النشطة أيضًا للاطلاع على الاستخدام السابق.</p></div><div className="flex flex-wrap gap-2">{FILTERS.map((item) => <Button key={item.value} size="sm" variant={filter === item.value ? "default" : "outline"} onClick={() => setFilter(item.value)}>{item.label}</Button>)}{curricula.length > 1 && <select aria-label="تصفية حسب المنهج" value={curriculumId} onChange={(event) => setCurriculumId(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="all">كل المناهج</option>{curricula.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</div></div>

        {data.classrooms.length === 0 ? <Card><CardContent className="grid min-h-48 place-items-center text-center text-muted-foreground"><div><School className="mx-auto mb-3 h-9 w-9 opacity-40"/><p>هذا الحساب غير مرتبط بأي فصل حاليًا</p></div></CardContent></Card> : visibleClassrooms.length === 0 ? <Card><CardContent className="grid min-h-32 place-items-center text-muted-foreground">لا توجد فصول تطابق عوامل التصفية</CardContent></Card> : <>
          <div className="hidden overflow-hidden rounded-xl border bg-card lg:block"><Table><TableHeader><TableRow><TableHead>الفصل</TableHead><TableHead>المنهج</TableHead><TableHead>الصف</TableHead><TableHead>نوع الربط</TableHead><TableHead>حالة Zoom</TableHead><TableHead>الجدول</TableHead><TableHead>الحالة</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader><TableBody>{visibleClassrooms.map((classroom) => { const meeting = meetingLabels[getMeetingStatus(classroom)]; return <TableRow key={classroom.id}><TableCell className="font-semibold">{classroom.name}</TableCell><TableCell><p>{classroom.curriculum?.name || "—"}</p>{classroom.curriculum?.registrationMode && <p className="text-xs text-muted-foreground">{classroom.curriculum.registrationMode === "egyptian" ? "مصري" : "خليجي"}</p>}</TableCell><TableCell>{classroom.grade?.name || "—"}</TableCell><TableCell>{classroom.zoomAssignmentMode === "manual" ? "يدوي" : "ربط تلقائي"}</TableCell><TableCell><Badge variant="outline" className={meeting.className}>{meeting.label}</Badge></TableCell><TableCell><Schedule classroom={classroom}/></TableCell><TableCell><Badge variant={classroom.isActive ? "default" : "outline"} className={classroom.isActive ? "bg-emerald-600" : "text-muted-foreground"}>{classroom.isActive ? "نشط" : "غير نشط"}</Badge></TableCell><TableCell>{classroom.zoomAssignmentMode === "manual" ? <Button asChild size="sm" variant="outline"><Link to={`/admin/classroom-zoom?classroomId=${encodeURIComponent(classroom.id)}`}>إدارة Zoom</Link></Button> : "—"}</TableCell></TableRow>;})}</TableBody></Table></div>
          <div className="grid gap-3 lg:hidden">{visibleClassrooms.map((classroom) => <Card key={classroom.id}><CardContent className="space-y-4 p-4"><div><h3 className="font-bold">{classroom.name}</h3><p className="text-sm text-muted-foreground">{classroom.curriculum?.name || "—"} · {classroom.grade?.name || "—"}</p></div><div className="flex flex-wrap gap-2"><ClassroomBadges classroom={classroom}/></div><Schedule classroom={classroom}/>{classroom.zoomAssignmentMode === "manual" && <Button asChild size="sm" variant="outline"><Link to={`/admin/classroom-zoom?classroomId=${encodeURIComponent(classroom.id)}`}>إدارة Zoom</Link></Button>}</CardContent></Card>)}</div>
        </>}
      </section>
    </>}
  </div></DashboardLayout>;
}
