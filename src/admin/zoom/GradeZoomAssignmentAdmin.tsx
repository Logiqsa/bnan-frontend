import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, GraduationCap, Link2, Loader2, School, Video } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import { catalogApi, type CurriculumOption } from "@/api/catalogApi";
import { zoomAccountsApi, ZOOM_ERROR_MESSAGES, type GradeZoomOption } from "@/api/zoomAccountsApi";
import AssignZoomAccountDialog from "./AssignZoomAccountDialog";

const GradeZoomAssignmentAdmin = () => {
  const [curriculums, setCurriculums] = useState<CurriculumOption[]>([]);
  const [curriculumId, setCurriculumId] = useState<string>("");
  const [grades, setGrades] = useState<GradeZoomOption[]>([]);
  const [loadingCurriculums, setLoadingCurriculums] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<GradeZoomOption | null>(null);

  useEffect(() => {
    catalogApi
      .curriculums()
      .then(({ data }) => {
        setCurriculums(data);
        if (data.length) setCurriculumId(data[0].id);
      })
      .catch((error) => toast.error((error as ApiError).message || "فشل تحميل المناهج"))
      .finally(() => setLoadingCurriculums(false));
  }, []);

  const loadGrades = () => {
    if (!curriculumId) return;
    setLoadingGrades(true);
    zoomAccountsApi
      .getGradesForZoomAssignment(curriculumId)
      .then(({ data }) => setGrades(data))
      .catch((error) => {
        const apiError = error as ApiError;
        toast.error(ZOOM_ERROR_MESSAGES[apiError.code] || apiError.message || "فشل تحميل الصفوف");
      })
      .finally(() => setLoadingGrades(false));
  };

  useEffect(() => {
    loadGrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curriculumId]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary/70"><Video className="h-4 w-4" />إعدادات Zoom التلقائية</div>
          <h2 className="text-2xl font-bold sm:text-3xl">ربط الصفوف بحسابات Zoom</h2>
          <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">اختر المنهج ثم اربط كل صف بحساب Zoom المستخدم عند إنشاء الفصول الجديدة.</p>
        </div>
      </header>

      {loadingCurriculums ? (
        <div className="grid min-h-56 place-items-center"><div className="text-center text-muted-foreground"><Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-primary"/><p>جاري تحميل المناهج...</p></div></div>
      ) : curriculums.length === 0 ? (
        <Card><CardContent className="grid min-h-56 place-items-center text-center text-muted-foreground"><div><School className="mx-auto mb-3 h-10 w-10 opacity-40"/><p className="font-medium">لا توجد مناهج متاحة</p></div></CardContent></Card>
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span><h3 className="font-bold">اختر المنهج</h3></div>
            <div className="flex snap-x gap-3 overflow-x-auto pb-2">
              {curriculums.map((curriculum) => {
                const active = curriculumId === curriculum.id;
                return <button key={curriculum.id} type="button" onClick={() => setCurriculumId(curriculum.id)} className={`min-w-52 snap-start rounded-xl border bg-card p-4 text-right transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sky ${active ? "border-primary bg-primary text-primary-foreground shadow-sky" : ""}`}>
                  <span className="block font-bold">{curriculum.name}</span>
                  <span className={`mt-1 block text-xs ${active ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{active ? "المنهج المحدد" : "عرض الصفوف"}</span>
                </button>;
              })}
            </div>
          </section>

          {loadingGrades ? (
            <div className="grid min-h-48 place-items-center"><div className="text-center text-muted-foreground"><Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary"/><p>جاري تحميل الصفوف...</p></div></div>
          ) : grades.length === 0 ? (
            <Card><CardContent className="grid min-h-48 place-items-center text-center text-muted-foreground"><div><GraduationCap className="mx-auto mb-3 h-9 w-9 opacity-40"/><p className="font-medium">لا توجد صفوف لهذا المنهج</p></div></CardContent></Card>
          ) : (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span><div><h3 className="font-bold">ربط الصفوف</h3><p className="text-xs text-muted-foreground">{grades.length} صف في المنهج المحدد</p></div></div><div className="flex items-center gap-2"><Badge variant="outline">{grades.length} إجمالي</Badge><Badge className="border border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{grades.filter((grade) => grade.zoomAccount).length} مربوط</Badge></div></div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {grades.map((grade) => {
                  const linked = Boolean(grade.zoomAccount);
                  return <Card key={grade.id} className={`relative flex h-full flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-sky ${linked ? "border-emerald-200" : "border-amber-200 bg-amber-50/20"}`}>
                    <div className={`absolute inset-y-0 right-0 w-1 ${linked ? "bg-emerald-400" : "bg-amber-400"}`}/>
                    <CardHeader className="space-y-3 pb-3 pr-5"><div className="flex flex-wrap items-center justify-between gap-2">{linked ? <Badge className="border border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100"><CheckCircle2 className="ml-1.5 h-3 w-3"/>Zoom مربوط</Badge> : <Badge className="border border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-100"><Link2 className="ml-1.5 h-3 w-3"/>غير مربوط</Badge>}</div><CardTitle className="break-words text-lg leading-7">{grade.name}</CardTitle></CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-4 pr-5">{linked ? <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-3"><p className="text-xs text-emerald-700/70">حساب Zoom الحالي</p><p className="mt-1 flex items-center gap-2 font-semibold text-emerald-800"><Video className="h-4 w-4"/>{grade.zoomAccount!.name}</p></div> : <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/60 p-3 text-sm text-amber-900">يحتاج هذا الصف إلى اختيار حساب Zoom.</div>}<div className="mt-auto border-t pt-4"><Button className="w-full gap-2" variant={linked ? "outline" : "default"} onClick={() => setSelectedGrade(grade)}><Link2 className="h-4 w-4"/>{linked ? "تغيير حساب Zoom" : "ربط حساب Zoom"}</Button></div></CardContent>
                  </Card>;
                })}
              </div>
            </section>
          )}
        </>
      )}

      <AssignZoomAccountDialog
        open={!!selectedGrade}
        onOpenChange={(open) => !open && setSelectedGrade(null)}
        grade={selectedGrade}
        onAssigned={loadGrades}
      />
    </div>
  );
};

export default GradeZoomAssignmentAdmin;
