import { useEffect, useMemo, useState } from "react";
import { Check, Lightbulb, Loader2, Plus, UsersRound, X } from "lucide-react";
import { classroomRecordingsApi } from "@/api/classroomRecordingsApi";
import { catalogApi, type CurriculumOption, type GradeOption } from "@/api/catalogApi";
import { courseStaffApi, type CourseStaffOption } from "@/api/courseStaffApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type SharedTarget = { curriculum: string; curriculumName: string; grade: string; gradeName: string };

const streamWords = /(?:عرب[يى]|لغات|languages|language|arabic)/giu;
export const sharedGradeBaseName = (value: string) => value.replace(streamWords, "").replace(/[\s\-_–—]+/g, " ").trim();
const normalizedWords = (value: string) => new Set(sharedGradeBaseName(value).toLocaleLowerCase("ar").split(" ").filter(Boolean));
export const sharedTargetScore = (first: SharedTarget, candidate: SharedTarget) => {
  const firstBase = sharedGradeBaseName(first.gradeName).toLocaleLowerCase("ar");
  const candidateBase = sharedGradeBaseName(candidate.gradeName).toLocaleLowerCase("ar");
  if (firstBase && firstBase === candidateBase) return 100;
  const firstWords = normalizedWords(first.gradeName);
  const overlap = [...normalizedWords(candidate.gradeName)].filter((word) => firstWords.has(word)).length;
  return overlap * 10 + (first.curriculum === candidate.curriculum ? 1 : 0);
};

export default function SharedClassroomCreateCard({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [curricula, setCurricula] = useState<CurriculumOption[]>([]);
  const [grades, setGrades] = useState<Record<string, GradeOption[]>>({});
  const [supervisors, setSupervisors] = useState<CourseStaffOption[]>([]);
  const [supervisorId, setSupervisorId] = useState("");
  const [firstId, setFirstId] = useState("");
  const [secondId, setSecondId] = useState("");
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

  const targets = useMemo(() => curricula.flatMap((curriculum) => (grades[curriculum.id] || []).map((grade) => ({ curriculum: curriculum.id, curriculumName: curriculum.name, grade: grade.id, gradeName: grade.name }))), [curricula, grades]);
  const first = targets.find((item) => item.grade === firstId);
  const second = targets.find((item) => item.grade === secondId);
  const suggestion = useMemo(() => {
    if (!first) return undefined;
    const candidate = targets.filter((item) => item.grade !== first.grade).sort((left, right) => sharedTargetScore(first, right) - sharedTargetScore(first, left))[0];
    return candidate && sharedTargetScore(first, candidate) >= 20 ? candidate : undefined;
  }, [first, targets]);
  const availableSupervisors = useMemo(() => first ? supervisors.filter((item) => !item.curriculumIds?.length || item.curriculumIds.includes(first.curriculum)) : supervisors, [first, supervisors]);

  const chooseFirst = (gradeId: string) => {
    const target = targets.find((item) => item.grade === gradeId);
    setFirstId(gradeId); setSecondId(""); setSupervisorId(""); setError("");
    setName(target ? `${sharedGradeBaseName(target.gradeName)} - مشترك` : "");
  };
  const reset = () => { setOpen(false); setName(""); setFirstId(""); setSecondId(""); setSupervisorId(""); setError(""); };
  const submit = async () => {
    if (!name.trim() || !first || !second || !supervisorId) return setError("اختر الصفين، واكتب اسم الفصل، وحدد المشرف.");
    setSaving(true); setError("");
    try {
      await classroomRecordingsApi.createSharedClassroom({ name: name.trim(), curriculum: first.curriculum, grade: first.grade, supervisorId, classroomKind: "shared", sharedAcademicTargets: [first, second].map(({ curriculum, grade }) => ({ curriculum, grade })) });
      reset(); onCreated();
    } catch { setError("تعذر إنشاء الفصل المشترك. تأكد من إعداد حساب Zoom للصف الأساسي وصلاحية المشرف."); }
    finally { setSaving(false); }
  };

  if (!open) return <Button onClick={() => setOpen(true)}><Plus className="ml-2 h-4 w-4"/>إنشاء فصل مشترك</Button>;
  return <Card className="overflow-hidden border-primary/20 shadow-sm">
    <CardHeader className="border-b bg-gradient-to-l from-primary/10 via-primary/[0.04] to-transparent"><div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><UsersRound className="h-5 w-5"/></span>إنشاء فصل مشترك</CardTitle><p className="mt-2 text-sm text-muted-foreground">اربط صفين فقط، وسيُضاف طلابهما إلى الفصل تلقائيًا.</p></div><Button size="icon" variant="ghost" onClick={reset} aria-label="إغلاق"><X className="h-4 w-4"/></Button></div></CardHeader>
    <CardContent className="space-y-6 p-5 sm:p-6">
      {loading ? <div className="grid min-h-40 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary"/></div> : <>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="rounded-xl border bg-card p-4 text-sm font-semibold"><span className="mb-3 flex items-center gap-2"><Badge>1</Badge>الصف الأساسي</span><select className="h-11 w-full rounded-lg border bg-background px-3 font-normal" value={firstId} onChange={(event) => chooseFirst(event.target.value)}><option value="">اختر الصف الأول</option>{targets.map((item) => <option key={item.grade} value={item.grade}>{item.gradeName} · {item.curriculumName}</option>)}</select><p className="mt-2 text-xs font-normal text-muted-foreground">يُستخدم حساب Zoom والمشرف الخاصان بهذا الصف.</p></label>
          <label className="rounded-xl border bg-card p-4 text-sm font-semibold"><span className="mb-3 flex items-center gap-2"><Badge>2</Badge>الصف الثاني</span><select className="h-11 w-full rounded-lg border bg-background px-3 font-normal" value={secondId} disabled={!first} onChange={(event) => { setSecondId(event.target.value); setError(""); }}><option value="">اختر الصف الثاني</option>{targets.filter((item) => item.grade !== firstId).sort((left, right) => first ? sharedTargetScore(first, right) - sharedTargetScore(first, left) : 0).map((item) => <option key={item.grade} value={item.grade}>{item.gradeName} · {item.curriculumName}</option>)}</select>{first && suggestion && suggestion.grade !== secondId && <button type="button" onClick={() => setSecondId(suggestion.grade)} className="mt-3 flex w-full items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-start text-xs font-normal text-amber-900 transition hover:bg-amber-100"><Lightbulb className="h-4 w-4 shrink-0"/><span>المقترح حسب الاسم: <strong>{suggestion.gradeName}</strong></span></button>}{second && <p className="mt-3 flex items-center gap-1.5 text-xs font-normal text-emerald-700"><Check className="h-4 w-4"/>تم اختيار الصفين</p>}</label>
        </div>
        <div className="grid gap-4 lg:grid-cols-2"><label className="text-sm font-semibold">اسم الفصل<Input className="mt-2 h-11" value={name} onChange={(event) => setName(event.target.value)} placeholder="أولى ابتدائي - مشترك"/></label><label className="text-sm font-semibold">المشرف<select className="mt-2 h-11 w-full rounded-lg border bg-background px-3 font-normal" value={supervisorId} onChange={(event) => setSupervisorId(event.target.value)} disabled={!first}><option value="">اختر المشرف</option>{availableSupervisors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
      </>}
      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2 border-t pt-5"><Button onClick={submit} disabled={loading || saving || !first || !second}>{saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : <UsersRound className="ml-2 h-4 w-4"/>}إنشاء ومزامنة الطلاب</Button><Button variant="outline" onClick={reset} disabled={saving}>إلغاء</Button></div>
    </CardContent>
  </Card>;
}
