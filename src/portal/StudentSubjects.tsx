import { useQuery } from "@tanstack/react-query";
import { BookOpen, BookPlus, Plus, RefreshCw, Repeat2 } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { studentSubjectsApi, studentSubjectsQueryKey } from "@/api/studentSubjectsApi";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentSubjects() {
  const { pick } = useLanguage();
  const query = useQuery({
    queryKey: studentSubjectsQueryKey,
    queryFn: studentSubjectsApi.list,
    staleTime: 60_000,
    retry: 1,
    refetchOnMount: "always",
  });

  return <DashboardLayout><div className="mx-auto w-full max-w-6xl space-y-6">
    <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><BookOpen className="h-5 w-5" /></span><div className="min-w-0"><h1 className="text-2xl font-bold">{pick("موادي", "My subjects")}</h1><p className="mt-1 text-sm text-muted-foreground">{pick("المواد المسجلة حاليًا في حسابك.", "Subjects currently registered to your account.")}</p></div></div><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/portal/student/change-requests"><Repeat2 className="h-4 w-4" />{pick("طلبات التغيير", "Change requests")}</Link></Button><Button asChild variant="outline"><Link to="/portal/student/subject-requests"><BookPlus className="h-4 w-4" />{pick("طلبات المواد", "Subject requests")}</Link></Button><Button asChild><Link to="/portal/student/subjects/add"><Plus className="h-4 w-4" />{pick("إضافة مادة", "Add subject")}</Link></Button></div></div></header>
    {query.isLoading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label={pick("جاري تحميل المواد", "Loading subjects")}>{[0, 1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="h-32 rounded-2xl" />)}</div>
      : query.isError ? <Card><CardContent className="flex flex-col items-center gap-4 p-10 text-center"><p className="text-destructive">{pick("تعذر تحميل المواد", "Unable to load subjects")}</p><Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />{pick("إعادة المحاولة", "Retry")}</Button></CardContent></Card>
      : !query.data?.length ? <Card><CardContent className="p-12 text-center text-muted-foreground"><BookOpen className="mx-auto mb-3 h-9 w-9 opacity-50" /><p>{pick("لا توجد مواد مسجلة حاليًا", "No subjects are currently registered")}</p></CardContent></Card>
      : <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label={pick("قائمة المواد", "Subject list")}>{query.data.map((subject) => <Card key={subject.id || subject.name} className="min-w-0 shadow-sm"><CardHeader className="flex-row items-center gap-3 space-y-0"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><BookOpen className="h-5 w-5" /></span><CardTitle className="min-w-0 break-words text-base">{subject.name}</CardTitle></CardHeader></Card>)}</section>}
  </div></DashboardLayout>;
}
