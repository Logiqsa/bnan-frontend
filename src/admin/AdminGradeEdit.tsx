import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import { catalogApi, type GradeOption } from "@/api/catalogApi";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const idOf = (value: unknown) => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const item = value as { id?: string; _id?: string };
  return item.id || item._id || "";
};

const errorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : "حدث خطأ غير متوقع. حاول مرة أخرى.";

export default function AdminGradeEdit() {
  const { gradeId = "" } = useParams<{ gradeId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const curriculumId = searchParams.get("curriculumId") || "";
  const studyLanguage = searchParams.get("studyLanguage") || "";
  const [name, setName] = useState("");
  const [subjectIds, setSubjectIds] = useState<string[]>([]);

  const gradeQuery = useQuery({
    queryKey: ["admin-catalog", "grade-edit", gradeId, curriculumId],
    queryFn: async () => {
      const result = curriculumId
        ? await catalogApi.grades(curriculumId)
        : await catalogApi.allGrades();
      return result.data.find((item) => item.id === gradeId) || null;
    },
    enabled: Boolean(gradeId),
  });
  const subjectQuery = useQuery({
    queryKey: ["admin-catalog", "grade-edit-subjects", gradeId],
    queryFn: () => catalogApi.subjects(gradeId),
    enabled: Boolean(gradeId),
  });
  const allSubjectsQuery = useQuery({
    queryKey: ["admin-catalog", "grade-edit-curriculum-subjects", curriculumId],
    queryFn: () => catalogApi.subjectsByCurriculum(curriculumId),
    enabled: Boolean(curriculumId),
  });

  const grade = gradeQuery.data;
  const currentSubjectIds = useMemo(
    () => new Set((subjectQuery.data?.data || []).map((subject) => idOf(subject))),
    [subjectQuery.data?.data],
  );
  const save = useMutation({
    mutationFn: async () => {
      await catalogApi.updateGrade(gradeId, { name: name.trim() });
      if (subjectIds.length) {
        await catalogApi.addSubjectsToGrade(gradeId, subjectIds);
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-catalog"] });
      toast.success("تم حفظ الصف.");
      navigate(`/admin/catalog/grades?curriculumId=${encodeURIComponent(curriculumId)}`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  useEffect(() => {
    if (grade) setName((current) => current || grade.name);
  }, [grade]);

  const backQuery = new URLSearchParams();
  if (curriculumId) backQuery.set("curriculumId", curriculumId);
  if (studyLanguage) backQuery.set("studyLanguage", studyLanguage);
  const backPath = `/admin/catalog/grades${backQuery.toString() ? `?${backQuery.toString()}` : ""}`;
  const loading = gradeQuery.isLoading || subjectQuery.isLoading || allSubjectsQuery.isLoading;
  const failed = gradeQuery.isError || subjectQuery.isError || allSubjectsQuery.isError;

  return (
    <DashboardLayout>
      <main className="mx-auto max-w-4xl space-y-5" dir="rtl">
        <Button asChild variant="ghost">
          <Link to={backPath}><ArrowRight className="ml-1 h-4 w-4" />العودة إلى الصفوف</Link>
        </Button>
        <header>
          <h1 className="text-3xl font-bold">تعديل الصف</h1>
          <p className="mt-1 text-muted-foreground">عدّل بيانات الصف والمواد المرتبطة به.</p>
        </header>
        {loading ? (
          <Card><CardContent className="grid min-h-48 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></CardContent></Card>
        ) : failed || !grade ? (
          <Card><CardContent className="grid gap-3 p-10 text-center"><p className="text-destructive">تعذر تحميل بيانات الصف.</p><Button variant="outline" onClick={() => void Promise.all([gradeQuery.refetch(), subjectQuery.refetch(), allSubjectsQuery.refetch()])}><RefreshCw className="ml-1 h-4 w-4" />إعادة المحاولة</Button></CardContent></Card>
        ) : (
          <Card>
            <CardHeader><CardTitle>{grade.name}</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="grade-name">اسم الصف</Label>
                <Input id="grade-name" className="mt-1 max-w-md" value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="space-y-2 border-t pt-5">
                <div><Label>إضافة مواد للصف</Label><p className="text-sm text-muted-foreground">اختر المواد الجديدة التي تريد ربطها بهذا الصف.</p></div>
                <div className="flex flex-wrap gap-2">
                  {(allSubjectsQuery.data?.data || []).filter((subject) => !currentSubjectIds.has(idOf(subject))).map((subject) => (
                    <label key={subject.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                      <input type="checkbox" checked={subjectIds.includes(subject.id)} onChange={(event) => setSubjectIds((ids) => event.target.checked ? [...ids, subject.id] : ids.filter((id) => id !== subject.id))} />
                      {subject.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button disabled={save.isPending || !name.trim()} onClick={() => save.mutate()}>{save.isPending && <Loader2 className="ml-1 h-4 w-4 animate-spin" />}حفظ التعديلات</Button>
                <Button asChild variant="outline"><Link to={backPath}>إلغاء</Link></Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </DashboardLayout>
  );
}
