import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, GraduationCap, Link2, Loader2, School, Video } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import { catalogApi, type CurriculumOption } from "@/api/catalogApi";
import { zoomAccountsApi, ZOOM_ERROR_MESSAGES, type GradeZoomOption, type ZoomAccount } from "@/api/zoomAccountsApi";
import AssignZoomAccountDialog from "./AssignZoomAccountDialog";

const GradeZoomAssignmentAdmin = () => {
  const [curriculums, setCurriculums] = useState<CurriculumOption[]>([]);
  const [curriculumId, setCurriculumId] = useState<string>("");
  const [grades, setGrades] = useState<GradeZoomOption[]>([]);
  const [zoomAccounts, setZoomAccounts] = useState<ZoomAccount[]>([]);
  const [loadingCurriculums, setLoadingCurriculums] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<GradeZoomOption | null>(null);
  const selectedCurriculum = curriculums.find((curriculum) => curriculum.id === curriculumId);
  const curriculumIds = useMemo(() => curriculums.map((curriculum) => curriculum.id), [curriculums]);

  useEffect(() => {
    zoomAccountsApi.getZoomAccounts()
      .then(({ data }) => setZoomAccounts(data))
      .catch(() => setZoomAccounts([]));
    catalogApi
      .curriculums()
      .then(({ data }) => {
        const egyptianCurriculums = data.filter((curriculum) => curriculum.registrationMode === "egyptian");
        setCurriculums(egyptianCurriculums);
        if (egyptianCurriculums.length) setCurriculumId(egyptianCurriculums[0].id);
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
          <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">اربط كل صف بحساب Zoom المستخدم عند إنشاء الفصول الجديدة.</p>
        </div>
      </header>

      {loadingCurriculums ? (
        <div className="grid min-h-56 place-items-center"><div className="text-center text-muted-foreground"><Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-primary"/><p>جاري تحميل المناهج...</p></div></div>
      ) : curriculums.length === 0 ? (
        <Card><CardContent className="grid min-h-56 place-items-center text-center text-muted-foreground"><div><School className="mx-auto mb-3 h-10 w-10 opacity-40"/><p className="font-medium">لا توجد مناهج مصرية متاحة</p></div></CardContent></Card>
      ) : (
        <>
          {selectedCurriculum && (
            <section className="rounded-xl border border-primary/30 bg-primary/[0.06] p-4">
              <p className="text-xs text-muted-foreground">المنهج المحدد</p>
              <div className="mt-1 flex items-center gap-2 font-bold text-primary">
                <GraduationCap className="h-4 w-4" />
                {selectedCurriculum.name}
              </div>
            </section>
          )}

          {loadingGrades ? (
            <div className="grid min-h-48 place-items-center"><div className="text-center text-muted-foreground"><Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary"/><p>جاري تحميل الصفوف...</p></div></div>
          ) : grades.length === 0 ? (
            <Card><CardContent className="grid min-h-48 place-items-center text-center text-muted-foreground"><div><GraduationCap className="mx-auto mb-3 h-9 w-9 opacity-40"/><p className="font-medium">لا توجد صفوف لهذا المنهج</p></div></CardContent></Card>
          ) : (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span><div><h3 className="font-bold">ربط الصفوف</h3><p className="text-xs text-muted-foreground">{grades.length} صف</p></div></div><div className="flex items-center gap-2"><Badge variant="outline">{grades.length} إجمالي</Badge><Badge className="border border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{grades.filter((grade) => grade.zoomAccount).length} مربوط</Badge></div></div>
              <Card className="overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/60">
                    <TableRow>
                      <TableHead className="min-w-48 text-right font-bold">الصف</TableHead>
                      <TableHead className="min-w-36 text-right font-bold">حالة الربط</TableHead>
                      <TableHead className="min-w-56 text-right font-bold">حساب Zoom</TableHead>
                      <TableHead className="w-44 text-right font-bold">الإجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grades.map((grade) => {
                      const assignedAccountId = typeof grade.zoomAccount === "string" ? grade.zoomAccount : grade.zoomAccount?.id || grade.zoomAccount?._id || "";
                      const assignedAccountName = typeof grade.zoomAccount === "object" && grade.zoomAccount?.name
                        ? grade.zoomAccount.name
                        : zoomAccounts.find((account) => account.id === assignedAccountId)?.name;
                      const linked = Boolean(assignedAccountId);
                      return (
                        <TableRow key={grade.id} className={linked ? "bg-emerald-50/30" : "bg-amber-50/20"}>
                          <TableCell className="font-bold">{grade.name}</TableCell>
                          <TableCell>
                            {linked ? (
                              <Badge className="border border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100"><CheckCircle2 className="ml-1.5 h-3 w-3"/>مربوط</Badge>
                            ) : (
                              <Badge className="border border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-100"><Link2 className="ml-1.5 h-3 w-3"/>غير مربوط</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {linked ? <span className="flex items-center gap-2 font-semibold text-emerald-800"><Video className="h-4 w-4"/>{assignedAccountName || "حساب Zoom مرتبط"}</span> : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" className="min-w-32 gap-2" variant={linked ? "outline" : "default"} onClick={() => setSelectedGrade(grade)}>
                              <Link2 className="h-4 w-4"/>{linked ? "تغيير الحساب" : "ربط الحساب"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </section>
          )}
        </>
      )}

      <AssignZoomAccountDialog
        open={!!selectedGrade}
        onOpenChange={(open) => !open && setSelectedGrade(null)}
        grade={selectedGrade}
        curriculumIds={curriculumIds}
        onAssigned={loadGrades}
      />
    </div>
  );
};

export default GradeZoomAssignmentAdmin;
