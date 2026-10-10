import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { BarChart3, CalendarDays, Loader2, MessageSquare, Play, RefreshCw, School, Video } from "lucide-react";
import { ApiError } from "@/api/client";
import { classroomRecordingsApi } from "@/api/classroomRecordingsApi";
import { classroomZoomApi } from "@/api/classroomZoomApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/layouts/DashboardLayout";
import ClassroomEvaluations from "@/portal/ClassroomEvaluations";
import ClassroomScheduleManagement from "@/admin/zoom/ClassroomScheduleManagement";
import ClassroomZoomManagement from "@/admin/zoom/ClassroomZoomManagement";
import TeacherMessages from "@/portal/TeacherMessages";
import { referenceName } from "@/admin/zoom/classroomZoomNormalization";

const tabs = [
  ["overview", "نظرة عامة"],
  ["schedule", "الجدول"],
  ["recordings", "التسجيلات"],
  ["evaluations", "التقييمات"],
  ["chat", "المحادثات"],
  ["zoom", "Zoom"],
] as const;

const errorText = (error: unknown) => error instanceof ApiError && error.status === 403
  ? "ليس لديك صلاحية لعرض هذا الفصل."
  : "تعذر تحميل بيانات الفصل.";

export default function SupervisorClassroomDetails() {
  const { classroomId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const [recording, setRecording] = useState<string | null>(null);
  const activeTab = tabs.some(([value]) => value === params.get("tab")) ? params.get("tab")! : "overview";
  const details = useQuery({ queryKey: ["supervisor-classroom-details", classroomId], queryFn: () => classroomZoomApi.getClassroom(classroomId), enabled: Boolean(classroomId), retry: 1 });
  const subjects = useQuery({ queryKey: ["supervisor-classroom-subjects", classroomId], queryFn: () => classroomRecordingsApi.listSubjects(classroomId), enabled: Boolean(classroomId), retry: 1 });
  const students = useQuery({ queryKey: ["supervisor-classroom-students", classroomId], queryFn: () => classroomRecordingsApi.listStudents(classroomId), enabled: Boolean(classroomId), retry: 1 });
  const recordings = useQuery({ queryKey: ["supervisor-classroom-recordings", classroomId], queryFn: () => classroomRecordingsApi.listRecordings(classroomId), enabled: Boolean(classroomId) && activeTab === "recordings", retry: 1 });

  if (details.isPending) return <DashboardLayout><div className="mx-auto max-w-7xl space-y-5" dir="rtl"><Skeleton className="h-32" /><Skeleton className="h-64" /></div></DashboardLayout>;
  if (details.isError || !details.data?.data) return <DashboardLayout><div className="mx-auto max-w-3xl" dir="rtl"><Card><CardContent className="grid gap-3 py-12 text-center"><p className="text-destructive">{errorText(details.error)}</p><Button variant="outline" onClick={() => void details.refetch()}><RefreshCw className="ml-2 h-4 w-4" />إعادة المحاولة</Button></CardContent></Card></div></DashboardLayout>;

  const classroom = details.data.data;
  const recordingItems = Array.isArray(recordings.data?.data) ? recordings.data.data : recordings.data?.data?.recordings || [];
  const changeTab = (value: string) => { const next = new URLSearchParams(params); next.set("tab", value); setParams(next); };

  return <DashboardLayout><main dir="rtl" className="mx-auto max-w-7xl space-y-5">
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem><BreadcrumbLink asChild><Link to="/portal/supervisor/classrooms">فصولي</Link></BreadcrumbLink></BreadcrumbItem>
        <BreadcrumbSeparator className="rotate-180" />
        <BreadcrumbItem><BreadcrumbPage>{classroom.name || "تفاصيل الفصل"}</BreadcrumbPage></BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
    <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><School className="h-6 w-6" /></span><div><h1 className="text-2xl font-bold sm:text-3xl">تفاصيل الفصل</h1><p className="mt-1 text-sm text-muted-foreground">{classroom.name}</p></div></div><Badge variant={classroom.isActive === false ? "outline" : "default"}>{classroom.isActive === false ? "غير نشط" : "نشط"}</Badge></div></header>
    <Card><CardContent className="grid gap-4 p-5 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">المنهج</p><p className="mt-1 font-semibold">{referenceName(classroom.curriculum) || "—"}</p></div><div><p className="text-xs text-muted-foreground">الصف</p><p className="mt-1 font-semibold">{referenceName(classroom.grade) || "—"}</p></div><div><p className="text-xs text-muted-foreground">الطلاب</p><p className="mt-1 font-semibold">{students.data?.data?.length ?? "—"}</p></div></CardContent></Card>
    <Tabs value={activeTab} onValueChange={changeTab} dir="rtl"><div className="overflow-x-auto"><TabsList className="grid h-auto min-w-[760px] grid-cols-6"><TabsTrigger value="overview"><School className="ml-2 h-4 w-4" />نظرة عامة</TabsTrigger><TabsTrigger value="schedule"><CalendarDays className="ml-2 h-4 w-4" />الجدول</TabsTrigger><TabsTrigger value="recordings"><Play className="ml-2 h-4 w-4" />التسجيلات</TabsTrigger><TabsTrigger value="evaluations"><BarChart3 className="ml-2 h-4 w-4" />التقييمات</TabsTrigger><TabsTrigger value="chat"><MessageSquare className="ml-2 h-4 w-4" />المحادثات</TabsTrigger><TabsTrigger value="zoom"><Video className="ml-2 h-4 w-4" />Zoom</TabsTrigger></TabsList></div>
      <TabsContent value="overview" className="mt-5 grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle>المواد والمعلمون</CardTitle></CardHeader><CardContent>{subjects.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : subjects.isError ? <p className="text-destructive">تعذر تحميل المواد.</p> : !subjects.data?.data.subjects.length ? <p className="text-muted-foreground">لا توجد مواد مرتبطة بهذا الفصل.</p> : <div className="space-y-2">{subjects.data.data.subjects.map((subject) => <div key={subject.classroomSubjectId} className="flex justify-between gap-3 rounded-lg border p-3"><span className="font-medium">{subject.name}</span><span className="text-sm text-muted-foreground">{subject.teacher?.name || "—"}</span></div>)}</div>}</CardContent></Card><Card><CardHeader><CardTitle>الطلاب</CardTitle></CardHeader><CardContent>{students.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : students.isError ? <p className="text-destructive">تعذر تحميل الطلاب.</p> : !students.data?.data.length ? <p className="text-muted-foreground">لا يوجد طلاب مرتبطون بهذا الفصل.</p> : <div className="space-y-2">{students.data.data.map((student) => <div key={student.studentId} className="rounded-lg border p-3">{student.fullName}</div>)}</div>}</CardContent></Card></TabsContent>
      <TabsContent value="schedule" className="mt-5"><ClassroomScheduleManagement classroomId={classroomId} embedded /></TabsContent>
      <TabsContent value="recordings" className="mt-5"><Card><CardHeader><CardTitle>تسجيلات الفصل</CardTitle></CardHeader><CardContent>{recordings.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : recordings.isError ? <p className="text-destructive">تعذر تحميل التسجيلات.</p> : !recordingItems.length ? <p className="text-muted-foreground">لا توجد تسجيلات جاهزة.</p> : <div className="space-y-2">{recordingItems.map((item: any) => <div key={item.sessionId || item.recordingLink} className="flex items-center justify-between gap-3 rounded-lg border p-3"><span>{item.sessionName}</span>{(item.localUrl || item.shareUrl || item.recordingLink) && <Button variant="link" onClick={() => setRecording(item.localUrl || item.shareUrl || item.recordingLink)}>تشغيل</Button>}</div>)}</div>}{recording && <video controls className="mt-4 max-h-96 w-full rounded-xl" src={recording} />}</CardContent></Card></TabsContent>
      <TabsContent value="evaluations" className="mt-5"><ClassroomEvaluations classroomId={classroomId} embedded /></TabsContent>
      <TabsContent value="chat" className="mt-5"><TeacherMessages mode="supervisor" embedded classroomId={classroomId} /></TabsContent>
      <TabsContent value="zoom" className="mt-5"><ClassroomZoomManagement classroomId={classroomId} embedded /></TabsContent>
    </Tabs>
  </main></DashboardLayout>;
}
