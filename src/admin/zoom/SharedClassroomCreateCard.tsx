import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, ChevronsUpDown, Loader2, Plus, UsersRound, X } from "lucide-react";
import { classroomRecordingsApi } from "@/api/classroomRecordingsApi";
import { ApiError } from "@/api/client";
import { catalogApi, type CurriculumOption, type GradeOption } from "@/api/catalogApi";
import { courseStaffApi, type CourseStaffOption } from "@/api/courseStaffApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SharedTarget = { curriculum: string; curriculumName: string; grade: string; gradeName: string };
export type SchoolStage = "primary" | "preparatory" | "secondary";

const stageOptions: Array<{ id: SchoolStage; name: string }> = [
  { id: "primary", name: "المرحلة الابتدائية" },
  { id: "preparatory", name: "المرحلة الإعدادية" },
  { id: "secondary", name: "المرحلة الثانوية" },
];
const gradeOrdinalWords = ["اولى", "اول", "ثانية", "ثاني", "ثالثة", "ثالث", "رابعة", "رابع", "خامسة", "خامس", "سادسة", "سادس"];
const normalizeArabic = (value: string) => value.normalize("NFKD").replace(/[\u064B-\u065F\u0670]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").toLocaleLowerCase("ar");
export const schoolStageForGrade = (value: string): SchoolStage | null => {
  const normalized = normalizeArabic(value);
  if (/ابتدا/.test(normalized)) return "primary";
  if (/(?:اعداد|متوسط)/.test(normalized)) return "preparatory";
  if (/ثانو/.test(normalized)) return "secondary";
  return null;
};
export const schoolGradeOrder = (value: string) => {
  const normalized = normalizeArabic(value);
  const index = gradeOrdinalWords.findIndex((word) => normalized.includes(word));
  return index < 0 ? 99 : Math.floor(index / 2) + 1;
};

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

const sharedClassroomErrorMessage = (error: unknown) => {
  if (!(error instanceof ApiError)) return "تعذر إنشاء الفصل المشترك. حاول مرة أخرى.";
  const messages: Record<string, string> = {
    GRADE_ZOOM_ACCOUNT_NOT_CONFIGURED: "لا يوجد حساب Zoom مربوط بأيٍ من الصفين. اربط حساب Zoom بأحدهما أولًا.",
    ZOOM_ACCOUNT_INACTIVE: "حساب Zoom المرتبط بالصفين غير مفعّل.",
    ZOOM_MEETING_CREATION_FAILED: "تعذر إنشاء اجتماع Zoom حاليًا. راجع بيانات حساب Zoom وحاول مجددًا.",
    ZOOM_MEETING_SETTINGS_REJECTED: "رفض Zoom إعدادات الاجتماع. راجع إعدادات الحساب وحاول مجددًا.",
    GRADE_ALREADY_IN_SHARED_CLASSROOM: "أحد الصفين مرتبط بالفعل بفصل مشترك.",
    SUPERVISOR_NOT_FOUND: "المشرف المختار غير متاح.",
    SUPERVISOR_NOT_IN_CURRICULUM: "المشرف المختار غير مرتبط بهذا المنهج.",
  };
  return messages[error.code] || error.message || "تعذر إنشاء الفصل المشترك.";
};

export default function SharedClassroomCreateCard({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [classroomKind, setClassroomKind] = useState<"general" | "private" | "shared">("general");
  const [name, setName] = useState("");
  const [curricula, setCurricula] = useState<CurriculumOption[]>([]);
  const [grades, setGrades] = useState<Record<string, GradeOption[]>>({});
  const [supervisors, setSupervisors] = useState<CourseStaffOption[]>([]);
  const [usedGradeIds, setUsedGradeIds] = useState<Set<string>>(new Set());
  const [supervisorId, setSupervisorId] = useState("");
  const [curriculumId, setCurriculumId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [firstId, setFirstId] = useState("");
  const [secondId, setSecondId] = useState("");
  const [stage, setStage] = useState<SchoolStage | "">("");
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [subjectOptions, setSubjectOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || curricula.length) return;
    setLoading(true);
    Promise.all([catalogApi.curriculums(), courseStaffApi.supervisors(), classroomRecordingsApi.listAllClassrooms()])
      .then(async ([curriculumResponse, supervisorRows, classroomResponse]) => {
        const curriculumRows = curriculumResponse.data;
        setCurricula(curriculumRows);
        setSupervisors(supervisorRows);
        setUsedGradeIds(new Set(classroomResponse.data
          .filter((item) => item.classroomKind === "shared" && item.isActive !== false)
          .flatMap((item) => item.sharedAcademicTargets || [])
          .map((target) => typeof target.grade === "string" ? target.grade : target.grade.id || target.grade._id || "")
          .filter(Boolean)));
        const gradeRows = await Promise.all(curriculumRows.map(async (item) => [item.id, (await catalogApi.grades(item.id)).data] as const));
        setGrades(Object.fromEntries(gradeRows));
      })
      .catch(() => setError("تعذر تحميل المناهج والصفوف."))
      .finally(() => setLoading(false));
  }, [open, curricula.length]);

  const targets = useMemo(() => curricula.filter((curriculum) => curriculum.registrationMode === "egyptian").flatMap((curriculum) => (grades[curriculum.id] || [])
    .filter((grade) => !usedGradeIds.has(grade.id))
    .map((grade) => ({ curriculum: curriculum.id, curriculumName: curriculum.name, grade: grade.id, gradeName: grade.name }))), [curricula, grades, usedGradeIds]);
  const visibleTargets = useMemo(() => targets
    .filter((target) => !stage || schoolStageForGrade(target.gradeName) === stage)
    .sort((left, right) => schoolGradeOrder(left.gradeName) - schoolGradeOrder(right.gradeName) || left.gradeName.localeCompare(right.gradeName, "ar")), [targets, stage]);
  const first = targets.find((item) => item.grade === firstId);
  const second = targets.find((item) => item.grade === secondId);
  const availableSupervisors = useMemo(() => first ? supervisors.filter((item) => !item.curriculumIds?.length || item.curriculumIds.includes(first.curriculum)) : supervisors, [first, supervisors]);
  const simpleSupervisors = useMemo(() => curriculumId ? supervisors.filter((item) => !item.curriculumIds?.length || item.curriculumIds.includes(curriculumId)) : supervisors, [curriculumId, supervisors]);

  useEffect(() => {
    if (!first || !second || first.grade === second.grade) {
      setSubjectOptions([]); setSelectedSubjectIds([]);
      return;
    }
    let active = true;
    setName((current) => current || `${sharedGradeBaseName(first.gradeName)} - مشترك`);
    setSelectedSubjectIds([]); setSubjectOptions([]); setSubjectsLoading(true);
    Promise.all([catalogApi.subjects(first.grade), catalogApi.subjects(second.grade)]).then((responses) => {
      const byName = new Map<string, { id: string; name: string }>();
      responses.flatMap((response) => response.data).forEach((subject) => {
        const key = subject.name.trim().toLocaleLowerCase("ar");
        if (!byName.has(key)) byName.set(key, { id: subject.id, name: subject.name });
      });
      if (active) setSubjectOptions([...byName.values()].sort((left, right) => left.name.localeCompare(right.name, "ar")));
    }).catch(() => { if (active) setError("تعذر تحميل مواد الصفين."); })
      .finally(() => { if (active) setSubjectsLoading(false); });
    return () => { active = false; };
  }, [firstId, secondId]);
  const reset = () => { setOpen(false); setClassroomKind("general"); setName(""); setCurriculumId(""); setGradeId(""); setFirstId(""); setSecondId(""); setStage(""); setSupervisorId(""); setSelectedSubjectIds([]); setSubjectOptions([]); setError(""); };
  const submit = async () => {
    if (!name.trim() || !supervisorId) return setError("اكتب اسم الفصل وحدد المشرف.");
    if (classroomKind === "shared" && (!first || !second)) return setError("اختر الصفين المطلوب دمجهما.");
    if (classroomKind !== "shared" && (!curriculumId || !gradeId)) return setError("اختر المنهج والصف.");
    setSaving(true); setError("");
    try {
      if (classroomKind === "shared" && first && second) {
        await classroomRecordingsApi.createSharedClassroom({ name: name.trim(), curriculum: first.curriculum, grade: first.grade, supervisorId, classroomKind: "shared", sharedAcademicTargets: [first, second].map(({ curriculum, grade }) => ({ curriculum, grade })), subjects: selectedSubjectIds });
      } else if (classroomKind !== "shared") {
        await classroomRecordingsApi.createClassroom({ name: name.trim(), curriculum: curriculumId, grade: gradeId, supervisorId, classroomKind });
      }
      reset(); onCreated();
    } catch (requestError) { setError(sharedClassroomErrorMessage(requestError)); }
    finally { setSaving(false); }
  };

  if (!open) return <Button onClick={() => setOpen(true)}><Plus className="ml-2 h-4 w-4"/>إنشاء فصل</Button>;
  return <Card className="overflow-hidden border-primary/20 shadow-sm">
    <CardHeader className="border-b bg-gradient-to-l from-primary/10 via-primary/[0.04] to-transparent"><div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><UsersRound className="h-5 w-5"/></span>إنشاء فصل</CardTitle><p className="mt-2 text-sm text-muted-foreground">أنشئ فصلًا عامًا أو خاصًا أو مشتركًا من مكان واحد.</p></div><Button size="icon" variant="ghost" onClick={reset} aria-label="إغلاق"><X className="h-4 w-4"/></Button></div></CardHeader>
    <CardContent className="space-y-6 p-5 sm:p-6">
      {loading ? <div className="grid min-h-40 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary"/></div> : <>
        <div><p className="mb-2 text-sm font-semibold">نوع الفصل</p><div className="grid grid-cols-3 gap-2 rounded-xl bg-muted p-1">{([{"id":"general","name":"عام"},{"id":"private","name":"خاص"},{"id":"shared","name":"مشترك"}] as const).map((item) => <button key={item.id} type="button" onClick={() => { setClassroomKind(item.id); setSupervisorId(""); setError(""); }} className={`h-10 rounded-lg text-sm font-semibold transition ${classroomKind === item.id ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{item.name}</button>)}</div></div>
        {classroomKind !== "shared" && <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2 sm:p-5"><label className="text-sm font-semibold">المنهج<select className="mt-2 h-11 w-full rounded-lg border bg-background px-3 font-normal" value={curriculumId} onChange={(event) => { setCurriculumId(event.target.value); setGradeId(""); setSupervisorId(""); }}><option value="">اختر المنهج</option>{curricula.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-sm font-semibold">الصف<select className="mt-2 h-11 w-full rounded-lg border bg-background px-3 font-normal" value={gradeId} onChange={(event) => setGradeId(event.target.value)} disabled={!curriculumId}><option value="">اختر الصف</option>{(grades[curriculumId] || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>}
        {classroomKind === "shared" && <><div className="space-y-4 rounded-xl border bg-muted/20 p-4 sm:p-5"><label className="block text-sm font-semibold">المرحلة<select className="mt-2 h-11 w-full rounded-lg border bg-background px-3 font-normal" value={stage} onChange={(event) => { setStage(event.target.value as SchoolStage); setFirstId(""); setSecondId(""); setSupervisorId(""); }}><option value="">كل المراحل</option>{stageOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">الفصل الأول<select className="mt-2 h-11 w-full rounded-lg border bg-background px-3 font-normal" value={firstId} onChange={(event) => { setFirstId(event.target.value); if (event.target.value === secondId) setSecondId(""); setSupervisorId(""); setError(""); }}><option value="">اختر الفصل الأول</option>{visibleTargets.filter((target) => target.grade !== secondId).map((target) => <option key={`${target.curriculum}:${target.grade}`} value={target.grade}>{target.gradeName} · {target.curriculumName}</option>)}</select></label><label className="text-sm font-semibold">الفصل الثاني<select className="mt-2 h-11 w-full rounded-lg border bg-background px-3 font-normal" value={secondId} onChange={(event) => { setSecondId(event.target.value); setError(""); }} disabled={!firstId}><option value="">اختر الفصل الثاني</option>{visibleTargets.filter((target) => target.grade !== firstId).map((target) => <option key={`${target.curriculum}:${target.grade}`} value={target.grade}>{target.gradeName} · {target.curriculumName}</option>)}</select></label></div><p className="text-xs text-muted-foreground">اختر فصلين مختلفين، وسيتم جمع موادهما ومزامنة طلابهما تلقائيًا.</p></div>{first && second && <div className="grid gap-3 sm:grid-cols-2">{[first, second].map((target, index) => <div key={target.grade} className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4"><Badge variant="outline">الفصل {index + 1}</Badge><p className="mt-3 font-bold">{target.gradeName}</p><p className="mt-1 text-xs">{target.curriculumName}</p></div>)}</div>}{first && second && <div className="rounded-xl border p-4"><p className="mb-3 flex items-center gap-2 font-semibold"><BookOpen className="h-4 w-4 text-primary"/>مواد الفصل</p><Popover open={subjectPickerOpen} onOpenChange={setSubjectPickerOpen}><PopoverTrigger asChild><Button type="button" variant="outline" className="w-full justify-between" disabled={subjectsLoading}>{subjectsLoading ? "جاري تحميل المواد" : `${selectedSubjectIds.length} مواد مختارة`}<ChevronsUpDown className="h-4 w-4"/></Button></PopoverTrigger><PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" dir="rtl"><Command><CommandInput placeholder="ابحث باسم المادة..."/><CommandList><CommandEmpty>لا توجد مادة مطابقة.</CommandEmpty><CommandGroup>{subjectOptions.map((subject) => { const checked = selectedSubjectIds.includes(subject.id); return <CommandItem key={subject.id} value={subject.name} onSelect={() => setSelectedSubjectIds((current) => checked ? current.filter((id) => id !== subject.id) : [...current, subject.id])}><Check className={cn("ml-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")}/>{subject.name}</CommandItem>; })}</CommandGroup></CommandList></Command></PopoverContent></Popover></div>}</>}
        <div className="grid gap-4 lg:grid-cols-2"><label className="text-sm font-semibold">اسم الفصل<Input className="mt-2 h-11" value={name} onChange={(event) => setName(event.target.value)} placeholder={classroomKind === "shared" ? "أولى ابتدائي - مشترك" : "اسم الفصل"}/></label><label className="text-sm font-semibold">المشرف<select className="mt-2 h-11 w-full rounded-lg border bg-background px-3 font-normal" value={supervisorId} onChange={(event) => setSupervisorId(event.target.value)} disabled={classroomKind === "shared" ? !first : !curriculumId}><option value="">اختر المشرف</option>{(classroomKind === "shared" ? availableSupervisors : simpleSupervisors).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
      </>}
      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2 border-t pt-5"><Button onClick={submit} disabled={loading || saving}>{saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : <UsersRound className="ml-2 h-4 w-4"/>}{classroomKind === "shared" ? "إنشاء ومزامنة الطلاب" : "إنشاء الفصل"}</Button><Button variant="outline" onClick={reset} disabled={saving}>إلغاء</Button></div>
    </CardContent>
  </Card>;
}
