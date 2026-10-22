import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, ChevronsUpDown, Loader2, Plus, UsersRound, X } from "lucide-react";
import { classroomRecordingsApi } from "@/api/classroomRecordingsApi";
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
  if (/اعداد/.test(normalized)) return "preparatory";
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

export default function SharedClassroomCreateCard({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [curricula, setCurricula] = useState<CurriculumOption[]>([]);
  const [grades, setGrades] = useState<Record<string, GradeOption[]>>({});
  const [supervisors, setSupervisors] = useState<CourseStaffOption[]>([]);
  const [usedGradeIds, setUsedGradeIds] = useState<Set<string>>(new Set());
  const [supervisorId, setSupervisorId] = useState("");
  const [firstId, setFirstId] = useState("");
  const [secondId, setSecondId] = useState("");
  const [stage, setStage] = useState<SchoolStage | "">("");
  const [gradePickerOpen, setGradePickerOpen] = useState(false);
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
        const egyptian = curriculumResponse.data.filter((item) => item.registrationMode === "egyptian");
        setCurricula(egyptian);
        setSupervisors(supervisorRows);
        setUsedGradeIds(new Set(classroomResponse.data
          .filter((item) => item.classroomKind === "shared" && item.isActive !== false)
          .flatMap((item) => item.sharedAcademicTargets || [])
          .map((target) => typeof target.grade === "string" ? target.grade : target.grade.id || target.grade._id || "")
          .filter(Boolean)));
        const gradeRows = await Promise.all(egyptian.map(async (item) => [item.id, (await catalogApi.grades(item.id)).data] as const));
        setGrades(Object.fromEntries(gradeRows));
      })
      .catch(() => setError("تعذر تحميل المناهج والصفوف."))
      .finally(() => setLoading(false));
  }, [open, curricula.length]);

  const targets = useMemo(() => curricula.flatMap((curriculum) => (grades[curriculum.id] || [])
    .filter((grade) => !usedGradeIds.has(grade.id))
    .map((grade) => ({ curriculum: curriculum.id, curriculumName: curriculum.name, grade: grade.id, gradeName: grade.name }))), [curricula, grades, usedGradeIds]);
  const pairs = useMemo(() => {
    const grouped = new Map<string, { id: string; name: string; curriculumName: string; targets: SharedTarget[] }>();
    targets.forEach((target) => {
      const name = sharedGradeBaseName(target.gradeName);
      const id = `${target.curriculum}:${name}`;
      const group = grouped.get(id) || { id, name, curriculumName: target.curriculumName, targets: [] };
      group.targets.push(target);
      grouped.set(id, group);
    });
    return [...grouped.values()].filter((group) => group.targets.length === 2).sort((left, right) => {
      const leftStage = schoolStageForGrade(left.name);
      const rightStage = schoolStageForGrade(right.name);
      const stageDifference = stageOptions.findIndex((item) => item.id === leftStage) - stageOptions.findIndex((item) => item.id === rightStage);
      return stageDifference || schoolGradeOrder(left.name) - schoolGradeOrder(right.name) || left.name.localeCompare(right.name, "ar");
    });
  }, [targets]);
  const visiblePairs = useMemo(() => pairs.filter((pair) => !stage || schoolStageForGrade(pair.name) === stage), [pairs, stage]);
  const first = targets.find((item) => item.grade === firstId);
  const second = targets.find((item) => item.grade === secondId);
  const selectedPair = pairs.find((pair) => pair.targets.some((item) => item.grade === firstId));
  const availableSupervisors = useMemo(() => first ? supervisors.filter((item) => !item.curriculumIds?.length || item.curriculumIds.includes(first.curriculum)) : supervisors, [first, supervisors]);

  const choosePair = async (pair: (typeof pairs)[number]) => {
    const ordered = [...pair.targets].sort((left, right) => left.gradeName.localeCompare(right.gradeName, "ar"));
    setFirstId(ordered[0].grade); setSecondId(ordered[1].grade); setSupervisorId(""); setError("");
    setName(`${pair.name} - مشترك`); setGradePickerOpen(false);
    setSelectedSubjectIds([]); setSubjectOptions([]); setSubjectsLoading(true);
    try {
      const responses = await Promise.all(pair.targets.map((target) => catalogApi.subjects(target.grade)));
      const byName = new Map<string, { id: string; name: string }>();
      responses.flatMap((response) => response.data).forEach((subject) => {
        const key = subject.name.trim().toLocaleLowerCase("ar");
        if (!byName.has(key)) byName.set(key, { id: subject.id, name: subject.name });
      });
      setSubjectOptions([...byName.values()].sort((left, right) => left.name.localeCompare(right.name, "ar")));
    } catch { setError("تعذر تحميل مواد الصفين."); }
    finally { setSubjectsLoading(false); }
  };
  const reset = () => { setOpen(false); setName(""); setFirstId(""); setSecondId(""); setStage(""); setSupervisorId(""); setSelectedSubjectIds([]); setSubjectOptions([]); setError(""); };
  const submit = async () => {
    if (!name.trim() || !first || !second || !supervisorId) return setError("اختر الصفين، واكتب اسم الفصل، وحدد المشرف.");
    setSaving(true); setError("");
    try {
      await classroomRecordingsApi.createSharedClassroom({ name: name.trim(), curriculum: first.curriculum, grade: first.grade, supervisorId, classroomKind: "shared", sharedAcademicTargets: [first, second].map(({ curriculum, grade }) => ({ curriculum, grade })), subjects: selectedSubjectIds });
      reset(); onCreated();
    } catch { setError("تعذر إنشاء الفصل المشترك. تأكد من إعداد حساب Zoom للصف الأساسي وصلاحية المشرف."); }
    finally { setSaving(false); }
  };

  if (!open) return <Button onClick={() => setOpen(true)}><Plus className="ml-2 h-4 w-4"/>إنشاء فصل مشترك</Button>;
  return <Card className="overflow-hidden border-primary/20 shadow-sm">
    <CardHeader className="border-b bg-gradient-to-l from-primary/10 via-primary/[0.04] to-transparent"><div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><UsersRound className="h-5 w-5"/></span>إنشاء فصل مشترك</CardTitle><p className="mt-2 text-sm text-muted-foreground">اربط صفين فقط، وسيُضاف طلابهما إلى الفصل تلقائيًا.</p></div><Button size="icon" variant="ghost" onClick={reset} aria-label="إغلاق"><X className="h-4 w-4"/></Button></div></CardHeader>
    <CardContent className="space-y-6 p-5 sm:p-6">
      {loading ? <div className="grid min-h-40 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary"/></div> : <>
        <div className="rounded-xl border bg-muted/20 p-4 sm:p-5"><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">اختر المرحلة<select className="mt-2 h-11 w-full rounded-lg border bg-background px-3 font-normal" value={stage} onChange={(event) => { setStage(event.target.value as SchoolStage); setGradePickerOpen(false); }}><option value="">كل المراحل</option>{stageOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div><label className="mb-2 block text-sm font-semibold">اختر الصف</label><Popover open={gradePickerOpen} onOpenChange={setGradePickerOpen}><PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" aria-expanded={gradePickerOpen} className="h-11 w-full justify-between gap-3 bg-background px-4 font-normal"><span className="truncate">{selectedPair ? `${selectedPair.name} · ${selectedPair.curriculumName}` : "ابحث واختر الصف"}</span><ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50"/></Button></PopoverTrigger><PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0" dir="rtl"><Command className="[&_[cmdk-input-wrapper]]:gap-2 [&_[cmdk-input-wrapper]_svg]:m-0"><CommandInput className="px-1" placeholder="ابحث باسم الصف..."/><CommandList className="p-1"><CommandEmpty>لا يوجد صف متاح مطابق.</CommandEmpty><CommandGroup className="space-y-1">{visiblePairs.map((pair) => <CommandItem className="min-h-11 gap-3 px-3 py-2.5" key={pair.id} value={`${pair.name} ${pair.curriculumName}`} onSelect={() => choosePair(pair)}><Check className={cn("h-4 w-4 shrink-0", selectedPair?.id === pair.id ? "opacity-100" : "opacity-0")}/><span className="flex min-w-0 flex-1 items-center justify-between gap-4"><strong className="truncate">{pair.name}</strong><span className="shrink-0 text-xs text-muted-foreground">{pair.curriculumName}</span></span></CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent></Popover></div></div><p className="mt-3 text-xs leading-5 text-muted-foreground">الصفوف مرتبة: ابتدائي ثم إعدادي ثم ثانوي، وتظهر فقط الصفوف غير المرتبطة بفصل مشترك سابق.</p></div>
        {selectedPair && <div className="grid gap-3 sm:grid-cols-2">{selectedPair.targets.map((target, index) => <div key={target.grade} className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4"><div className="flex items-center justify-between gap-2"><Badge variant="outline" className="border-emerald-300 bg-white">الصف {index + 1}</Badge><Check className="h-5 w-5 text-emerald-600"/></div><p className="mt-3 font-bold text-emerald-950">{target.gradeName}</p><p className="mt-1 text-xs text-emerald-700">{target.curriculumName}</p></div>)}</div>}
        {selectedPair && <div className="rounded-xl border p-4 sm:p-5"><div className="mb-3 flex items-center justify-between gap-3"><div><p className="flex items-center gap-2 font-semibold"><BookOpen className="h-4 w-4 text-primary"/>مواد الفصل</p><p className="mt-1 text-xs text-muted-foreground">مواد الصفين مجمعة بدون تكرار. اختر ما تريد إضافته للفصل.</p></div><Badge variant="secondary">{selectedSubjectIds.length} مختارة</Badge></div><Popover open={subjectPickerOpen} onOpenChange={setSubjectPickerOpen}><PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" className="h-11 w-full justify-between" disabled={subjectsLoading}>{subjectsLoading ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/>جاري تحميل المواد</span> : "ابحث واختر المواد"}<ChevronsUpDown className="h-4 w-4 opacity-50"/></Button></PopoverTrigger><PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0" dir="rtl"><Command><CommandInput placeholder="ابحث باسم المادة..."/><CommandList><CommandEmpty>لا توجد مادة مطابقة.</CommandEmpty><CommandGroup>{subjectOptions.map((subject) => { const checked = selectedSubjectIds.includes(subject.id); return <CommandItem key={subject.id} value={subject.name} onSelect={() => setSelectedSubjectIds((current) => checked ? current.filter((id) => id !== subject.id) : [...current, subject.id])}><Check className={cn("ml-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")}/>{subject.name}</CommandItem>; })}</CommandGroup></CommandList></Command></PopoverContent></Popover>{selectedSubjectIds.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{subjectOptions.filter((subject) => selectedSubjectIds.includes(subject.id)).map((subject) => <button type="button" key={subject.id} onClick={() => setSelectedSubjectIds((current) => current.filter((id) => id !== subject.id))} className="rounded-full border bg-muted/40 px-3 py-1.5 text-xs hover:bg-destructive/10">{subject.name} ×</button>)}</div>}</div>}
        <div className="grid gap-4 lg:grid-cols-2"><label className="text-sm font-semibold">اسم الفصل<Input className="mt-2 h-11" value={name} onChange={(event) => setName(event.target.value)} placeholder="أولى ابتدائي - مشترك"/></label><label className="text-sm font-semibold">المشرف<select className="mt-2 h-11 w-full rounded-lg border bg-background px-3 font-normal" value={supervisorId} onChange={(event) => setSupervisorId(event.target.value)} disabled={!first}><option value="">اختر المشرف</option>{availableSupervisors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
      </>}
      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2 border-t pt-5"><Button onClick={submit} disabled={loading || saving || !first || !second}>{saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : <UsersRound className="ml-2 h-4 w-4"/>}إنشاء ومزامنة الطلاب</Button><Button variant="outline" onClick={reset} disabled={saving}>إلغاء</Button></div>
    </CardContent>
  </Card>;
}
