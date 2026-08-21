import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2 } from "lucide-react";
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
      <div>
        <h2 className="text-xl font-cairo font-bold">ربط الصفوف بحسابات Zoom</h2>
        <p className="text-muted-foreground font-tajawal text-sm">
          كل صف يُربط بحساب Zoom واحد يُستخدم تلقائيًا عند إنشاء فصول جديدة لهذا الصف.
        </p>
      </div>

      {loadingCurriculums ? (
        <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
      ) : curriculums.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">لا توجد مناهج</p>
      ) : (
        <>
          <div className="max-w-xs">
            <Select value={curriculumId} onValueChange={setCurriculumId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر المنهج" />
              </SelectTrigger>
              <SelectContent>
                {curriculums.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingGrades ? (
            <p className="text-center text-muted-foreground py-8">جاري تحميل الصفوف...</p>
          ) : grades.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد صفوف لهذا المنهج</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {grades.map((grade) => (
                <Card key={grade.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-cairo font-medium">{grade.name}</p>
                      {grade.zoomAccount ? (
                        <p className="text-sm text-muted-foreground font-tajawal">Zoom: {grade.zoomAccount.name}</p>
                      ) : (
                        <Badge variant="outline" className="mt-1 text-amber-700 border-amber-300">
                          حساب Zoom غير مربوط
                        </Badge>
                      )}
                    </div>
                    <Button size="sm" variant={grade.zoomAccount ? "outline" : "default"} onClick={() => setSelectedGrade(grade)} className="gap-1.5 shrink-0">
                      <Link2 className="w-4 h-4" />
                      {grade.zoomAccount ? "تغيير" : "ربط الآن"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
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
