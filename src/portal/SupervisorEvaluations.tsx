import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, RefreshCw, School } from "lucide-react";
import { classroomZoomApi } from "@/api/classroomZoomApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/layouts/DashboardLayout";
import ClassroomEvaluations from "@/portal/ClassroomEvaluations";

export default function SupervisorEvaluations() {
  const [selectedClassroomId, setSelectedClassroomId] = useState("");
  const classrooms = useQuery({
    queryKey: ["supervisor-evaluation-classrooms"],
    queryFn: classroomZoomApi.getMyClassrooms,
    retry: 1,
  });
  const items = classrooms.data?.data || [];
  const selected = items.find((classroom) => classroom.id === selectedClassroomId);

  return <DashboardLayout><main dir="rtl" className="mx-auto max-w-7xl space-y-5">
    <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><BarChart3 className="h-6 w-6" /></span>
          <div><h1 className="text-2xl font-bold sm:text-3xl">تقييمات الطلاب</h1><p className="mt-1 text-sm text-muted-foreground">إضافة ومراجعة ونشر تقييمات طلاب الفصول المسندة إليك.</p></div>
        </div>
        <Button variant="outline" onClick={() => void classrooms.refetch()} disabled={classrooms.isFetching}><RefreshCw className={classrooms.isFetching ? "animate-spin" : ""} />تحديث الفصول</Button>
      </div>
    </header>

    <Card><CardHeader><CardTitle>اختر فصلًا</CardTitle></CardHeader><CardContent>
      {classrooms.isLoading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-24 rounded-xl" />)}</div>
        : classrooms.isError ? <div className="grid gap-3 py-8 text-center"><p className="text-destructive">تعذر تحميل الفصول المسندة إليك.</p><Button variant="outline" onClick={() => void classrooms.refetch()}><RefreshCw className="ml-1 h-4 w-4" />إعادة المحاولة</Button></div>
        : !items.length ? <div className="grid min-h-36 place-items-center text-center text-muted-foreground"><div><School className="mx-auto mb-2 h-9 w-9 opacity-40" /><p>لا توجد فصول مسندة إليك حاليًا.</p></div></div>
        : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((classroom) => <button key={classroom.id} type="button" onClick={() => setSelectedClassroomId(classroom.id)} className={`rounded-xl border p-4 text-right transition hover:border-primary/50 hover:shadow-sm ${selectedClassroomId === classroom.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{classroom.name}</p><p className="mt-1 truncate text-sm text-muted-foreground">{typeof classroom.curriculum === "object" ? classroom.curriculum?.name : "—"} {typeof classroom.grade === "object" && classroom.grade?.name ? `· ${classroom.grade.name}` : ""}</p></div><Badge variant={classroom.isActive === false ? "outline" : "secondary"}>{classroom.isActive === false ? "غير نشط" : "نشط"}</Badge></div></button>)}</div>}
    </CardContent></Card>

    {selected && <Card><CardHeader><CardTitle>{selected.name}</CardTitle></CardHeader><CardContent><ClassroomEvaluations classroomId={selected.id} embedded /></CardContent></Card>}
  </main></DashboardLayout>;
}
