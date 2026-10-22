import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, UsersRound } from "lucide-react";
import { classroomRecordingsApi } from "@/api/classroomRecordingsApi";
import { catalogApi, type CurriculumOption, type GradeOption } from "@/api/catalogApi";
import { courseStaffApi, type CourseStaffOption } from "@/api/courseStaffApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Target = { curriculum: string; curriculumName: string; grade: string; gradeName: string };

export default function SharedClassroomCreateCard({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [curricula, setCurricula] = useState<CurriculumOption[]>([]);
  const [grades, setGrades] = useState<Record<string, GradeOption[]>>({});
  const [supervisors, setSupervisors] = useState<CourseStaffOption[]>([]);
  const [supervisorId, setSupervisorId] = useState("");
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || curricula.length) return;
    setLoading(true);
    Promise.all([catalogApi.curriculums(), courseStaffApi.supervisors()])
      .then(async ([curriculumResponse, supervisorRows]) => {
        const egyptian = curriculumResponse.data.filter((item) => item.registrationMode === "egyptian");
        setCurricula(egyptian);
        setSupervisors(supervisorRows);
        const gradeRows = await Promise.all(egyptian.map(async (item) => [item.id, (await catalogApi.grades(item.id)).data] as const));
        setGrades(Object.fromEntries(gradeRows));
      })
      .catch(() => setError("تعذر تحميل المناهج والصفوف."))
      .finally(() => setLoading(false));
  }, [open, curricula.length]);

  const primary = targets[0];
  const availableSupervisors = useMemo(
    () => primary ? supervisors.filter((item) => !item.curriculumIds?.length || item.curriculumIds.includes(primary.curriculum)) : supervisors,
    [primary, supervisors],
  );

  useEffect(() => {
    if (supervisorId && !availableSupervisors.some((item) => item.id === supervisorId)) setSupervisorId("");
  }, [availableSupervisors, supervisorId]);

  const toggle = (target: Target) => setTargets((current) => {
    const exists = current.some((item) => item.curriculum === target.curriculum && item.grade === target.grade);
    return exists ? current.filter((item) => item.curriculum !== target.curriculum || item.grade !== target.grade) : [...current, target];
  });

  const submit = async () => {
    if (!name.trim() || targets.length < 2 || !supervisorId) {
      setError("اكتب اسم الفصل، واختر صفين على الأقل والمشرف.");
      return;
    }
    setSaving(true); setError("");
    try {
      await classroomRecordingsApi.createSharedClassroom({
        name: name.trim(), curriculum: primary.curriculum, grade: primary.grade,
        supervisorId, classroomKind: "shared",
        sharedAcademicTargets: targets.map(({ curriculum, grade }) => ({ curriculum, grade })),
      });
      setName(""); setTargets([]); setSupervisorId(""); setOpen(false); onCreated();
    } catch {
      setError("تعذر إنشاء الفصل المشترك. تأكد من إعداد حساب Zoom للصف الأساسي وصلاحية المشرف.");
    } finally { setSaving(false); }
  };

  if (!open) return <Button onClick={() => setOpen(true)}><Plus className="ml-2 h-4 w-4"/>إنشاء فصل مشترك</Button>;

  return <Card>
    <CardHeader><CardTitle className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-primary"/>إنشاء فصل مشترك</CardTitle><p className="text-sm text-muted-foreground">اختر الصفوف التي يشترك طلابها في هذا الفصل. أول صف تختاره هو الصف الأساسي لإعداد Zoom والمشرف.</p></CardHeader>
    <CardContent className="space-y-5">
      {loading ? <Loader2 className="h-6 w-6 animate-spin text-primary"/> : <>
        <label className="block text-sm font-semibold">اسم الفصل<Input className="mt-2" value={name} onChange={(event) => setName(event.target.value)} placeholder="مثال: أولى ابتدائي - مشترك"/></label>
        <div><p className="mb-2 text-sm font-semibold">الصفوف المشتركة (صفان على الأقل)</p><div className="grid gap-3 md:grid-cols-2">{curricula.map((curriculum) => <div key={curriculum.id} className="rounded-xl border p-3"><p className="mb-2 font-bold">{curriculum.name}</p><div className="space-y-2">{(grades[curriculum.id] || []).map((grade) => { const checked = targets.some((item) => item.curriculum === curriculum.id && item.grade === grade.id); return <label key={grade.id} className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={checked} onChange={() => toggle({ curriculum: curriculum.id, curriculumName: curriculum.name, grade: grade.id, gradeName: grade.name })}/><span>{grade.name}</span>{targets[0]?.curriculum === curriculum.id && targets[0]?.grade === grade.id && <span className="text-xs text-primary">(الأساسي)</span>}</label>; })}</div></div>)}</div></div>
        <label className="block text-sm font-semibold">المشرف<select className="mt-2 h-10 w-full rounded-md border bg-background px-3 font-normal" value={supervisorId} onChange={(event) => setSupervisorId(event.target.value)} disabled={!primary}><option value="">اختر المشرف</option>{availableSupervisors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </>}
      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <div className="flex gap-2"><Button onClick={submit} disabled={loading || saving}>{saving && <Loader2 className="ml-2 h-4 w-4 animate-spin"/>}إنشاء ومزامنة الطلاب</Button><Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>إلغاء</Button></div>
    </CardContent>
  </Card>;
}
