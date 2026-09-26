import { Link } from "react-router-dom";
import { School } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { studentClassroomsApi } from "@/api/studentClassroomsApi";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";

export default function StudentClassrooms() {
  const { pick, isArabic } = useLanguage();
  const query = useQuery({
    queryKey: ["student-classrooms"],
    queryFn: studentClassroomsApi.myEnrollments,
  });
  const classrooms = (query.data || []).filter((item) => item.status === "approved").map((item) => ({
    id: typeof item.classroom === "string" ? item.classroom : item.classroom.id,
    name: typeof item.classroom === "string" ? pick("الفصل", "Classroom") : item.classroom.name,
  }));

  return <DashboardLayout><main className="mx-auto max-w-6xl space-y-5" dir={isArabic ? "rtl" : "ltr"}>
    <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><School className="h-5 w-5" /></span><div><h1 className="text-2xl font-bold">{pick("الفصول", "Classrooms")}</h1><p className="mt-1 text-sm text-muted-foreground">{pick("فصولك والموارد المرتبطة بكل فصل.", "Your classrooms and their resources.")}</p></div></div>
    </header>
    {query.isPending ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map((item) => <Skeleton key={item} className="h-28 rounded-2xl" />)}</div>
      : query.isError ? <Card><CardContent className="p-8 text-center text-destructive">{pick("تعذر تحميل الفصول.", "Unable to load classrooms.")}</CardContent></Card>
      : classrooms.length === 0 ? <Card><CardContent className="p-10 text-center text-muted-foreground">{pick("لا توجد فصول مسجلة حاليًا.", "No enrolled classrooms currently.")}</CardContent></Card>
      : <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label={pick("الفصول", "Classrooms")}>{classrooms.map((classroom) => <Link key={classroom.id} to={`/portal/student/classrooms/${encodeURIComponent(classroom.id)}`} className="block"><Card className="h-full transition-colors hover:border-primary/50"><CardContent className="p-5"><h2 className="font-bold">{classroom.name}</h2><p className="mt-2 text-sm text-muted-foreground">{pick("عرض تفاصيل الفصل والموارد", "View classroom details and resources")}</p></CardContent></Card></Link>)}</section>}
  </main></DashboardLayout>;
}
