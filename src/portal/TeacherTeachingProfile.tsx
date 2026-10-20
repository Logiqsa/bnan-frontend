import { BookOpen, GraduationCap, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useLanguage } from "@/i18n/LanguageContext";
import { teacherTeachingProfileApi } from "@/api/teacherTeachingProfileApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function TeacherTeachingProfile() {
  const { pick } = useLanguage();
  const query = useQuery({ queryKey: ["teacher-teaching-profile"], queryFn: teacherTeachingProfileApi.get, staleTime: 60_000, retry: 1 });
  return <DashboardLayout><main className="mx-auto w-full max-w-5xl space-y-6">
    <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><BookOpen className="h-5 w-5" /></span><div><h1 className="text-2xl font-bold">{pick("بيانات تدريسي", "My teaching profile")}</h1><p className="mt-1 text-sm text-muted-foreground">{pick("المناهج والصفوف والمواد المسندة إليك.", "Your assigned curriculums, grades, and subjects.")}</p></div></div></header>
    {query.isLoading ? <div className="space-y-4">{[1, 2].map((item) => <Skeleton key={item} className="h-36 rounded-2xl" />)}</div> : query.isError ? <Card><CardContent className="grid gap-4 p-10 text-center"><p className="text-destructive">{pick("تعذر تحميل بيانات التدريس.", "Unable to load teaching details.")}</p><Button variant="outline" onClick={() => void query.refetch()}><RefreshCw className="h-4 w-4" />{pick("إعادة المحاولة", "Retry")}</Button></CardContent></Card> : query.data.curriculums.length === 0 ? <Card><CardContent className="p-10 text-center text-muted-foreground">{pick("لا توجد مناهج مسندة لك حاليًا.", "No curriculums are assigned to you yet.")}</CardContent></Card> : <div className="grid gap-4">{query.data.curriculums.map((curriculum) => <Card key={curriculum.id}><CardHeader><CardTitle>{curriculum.name}</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{curriculum.grades.length === 0 ? <p className="text-sm text-muted-foreground">{pick("لا توجد صفوف محددة لهذا المنهج.", "No grades have been specified for this curriculum.")}</p> : curriculum.grades.map((grade) => <section key={grade.id} className="rounded-xl border p-4"><div className="flex items-center gap-2 font-semibold"><GraduationCap className="h-4 w-4 text-primary" />{grade.name}</div><div className="mt-3 flex flex-wrap gap-2">{grade.subjects.length ? grade.subjects.map((subject) => <Badge key={subject.id} variant="secondary">{subject.name}</Badge>) : <span className="text-sm text-muted-foreground">{pick("لا توجد مواد محددة", "No subjects specified")}</span>}</div></section>)}</CardContent></Card>)}</div>}
  </main></DashboardLayout>;
}
