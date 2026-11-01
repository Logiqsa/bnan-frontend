import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, ChevronDown, GraduationCap, Loader2, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { catalogApi } from "@/api/catalogApi";
import { ApiError } from "@/api/client";
import { teacherTeachingProfileApi, type TeachingProfile } from "@/api/teacherTeachingProfileApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLanguage } from "@/i18n/LanguageContext";
import { schoolGradeOrder, schoolStageForGrade } from "@/admin/zoom/SharedClassroomCreateCard";

const stageOrder = ["primary", "preparatory", "secondary", null];
const compareGrades = (left:{name:string}, right:{name:string}) =>
  stageOrder.indexOf(schoolStageForGrade(left.name)) - stageOrder.indexOf(schoolStageForGrade(right.name)) ||
  schoolGradeOrder(left.name) - schoolGradeOrder(right.name) ||
  left.name.localeCompare(right.name, "ar");

export default function TeachingProfileEditor({ teacherId, title }: { teacherId?:string; title?:string }) {
  const { pick } = useLanguage();
  const client = useQueryClient();
  const key = ["teaching-profile", teacherId || "me"];
  const profile = useQuery({ queryKey:key, queryFn:() => teacherTeachingProfileApi.get(teacherId), retry:1 });
  const catalog = useQuery({ queryKey:["catalog-curriculums", "teaching-profile"], queryFn:catalogApi.curriculums, staleTime:300_000 });
  const [editing, setEditing] = useState(false);
  const [curriculums, setCurriculums] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Record<string,string[]>>({});

  const gradeQueries = useQueries({ queries:curriculums.map((id) => ({ queryKey:["catalog-grades", id], queryFn:() => catalogApi.grades(id), staleTime:300_000 })) });
  const grades = useMemo(() => gradeQueries.flatMap((query) => query.data?.data || []), [gradeQueries]);
  const gradeIds = Object.keys(assignments);
  const subjectQueries = useQueries({ queries:gradeIds.map((id) => ({ queryKey:["catalog-subjects", id], queryFn:() => catalogApi.subjects(id), staleTime:300_000 })) });
  const subjectsByGrade = useMemo(() => Object.fromEntries(gradeIds.map((id, index) => [id, subjectQueries[index]?.data?.data || []])), [gradeIds, subjectQueries]);

  const startEditing = (data:TeachingProfile) => {
    setCurriculums(data.curriculums.map((item) => item.id));
    setAssignments(Object.fromEntries(data.curriculums.flatMap((item) => item.grades.map((grade) => [grade.id, grade.subjects.map((subject) => subject.id)]))));
    setEditing(true);
  };
  const save = useMutation({
    mutationFn:() => teacherTeachingProfileApi.replace({ curriculums, assignments:Object.entries(assignments).map(([grade, subjects]) => ({ grade, subjects })) }, teacherId),
    onSuccess:(data) => { client.setQueryData(key, data); setEditing(false); toast.success(pick("تم حفظ بيانات التدريس", "Teaching profile saved")); },
    onError:(error:ApiError) => toast.error(error.message || pick("تعذر حفظ بيانات التدريس", "Unable to save teaching profile")),
  });
  const toggleCurriculum = (id:string) => {
    if (curriculums.includes(id)) {
      const profileGradeIds = profile.data?.curriculums.find((item) => item.id === id)?.grades.map((item) => item.id) || [];
      const loadedGradeIds = (gradeQueries[curriculums.indexOf(id)]?.data?.data || []).map((grade) => grade.id);
      const removed = new Set([...profileGradeIds, ...loadedGradeIds]);
      setAssignments((current) => Object.fromEntries(Object.entries(current).filter(([gradeId]) => !removed.has(gradeId))));
      setCurriculums((current) => current.filter((item) => item !== id));
    } else setCurriculums((current) => [...current, id]);
  };

  if (profile.isLoading) return <section className="space-y-4"><h2 className="flex items-center gap-2 text-lg font-bold"><BookOpen className="h-5 w-5 text-primary" />{title || pick("بيانات التدريس", "Teaching profile")}</h2><Card><CardContent className="grid min-h-36 place-items-center gap-3 p-8 text-center text-muted-foreground"><Loader2 className="h-7 w-7 animate-spin text-primary" /><p>{pick("جاري تحميل بيانات التدريس...", "Loading teaching profile...")}</p></CardContent></Card></section>;
  if (profile.isError || !profile.data) return <Card><CardContent className="p-8 text-center text-destructive">{pick("تعذر تحميل بيانات التدريس.", "Unable to load teaching details.")}</CardContent></Card>;

  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-bold"><BookOpen className="h-5 w-5 text-primary" />{title || pick("المناهج والصفوف والمواد", "Curriculums, grades and subjects")}</h2><p className="mt-1 text-sm text-muted-foreground">{pick("هذه بيانات التدريس، ولا تغيّر تعيينات الفصول الحالية.", "These teaching details do not change current classroom assignments.")}</p></div>{!editing ? <Button type="button" variant="outline" onClick={() => startEditing(profile.data)}><Pencil className="h-4 w-4" />{pick("تعديل", "Edit")}</Button> : <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={save.isPending}><X className="h-4 w-4" />{pick("إلغاء", "Cancel")}</Button><Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{pick("حفظ", "Save")}</Button></div>}</div>
    {!editing ? (profile.data.curriculums.length ? <div className="grid gap-4">{profile.data.curriculums.map((curriculum) => <Collapsible key={curriculum.id} defaultOpen className="group"><Card><CollapsibleTrigger asChild><button type="button" className="w-full text-start"><CardHeader className="flex-row items-center justify-between"><CardTitle>{curriculum.name}</CardTitle><ChevronDown className="h-5 w-5 transition-transform group-data-[state=open]:rotate-180" /></CardHeader></button></CollapsibleTrigger><CollapsibleContent><CardContent className="grid gap-3 md:grid-cols-2">{curriculum.grades.length ? [...curriculum.grades].sort(compareGrades).map((grade) => <div key={grade.id} className="rounded-xl border p-4"><p className="flex items-center gap-2 font-semibold"><GraduationCap className="h-4 w-4 text-primary" />{grade.name}</p><div className="mt-3 flex flex-wrap gap-2">{grade.subjects.map((subject) => <Badge key={subject.id} variant="secondary">{subject.name}</Badge>)}</div></div>) : <p className="text-sm text-muted-foreground">{pick("لا توجد صفوف محددة.", "No grades selected.")}</p>}</CardContent></CollapsibleContent></Card></Collapsible>)}</div> : <Card><CardContent className="p-8 text-center text-muted-foreground">{pick("لا توجد اختيارات تدريس حتى الآن.", "No teaching choices yet.")}</CardContent></Card>) : <Card><CardContent className="space-y-5 p-5">
      <div><p className="mb-2 font-semibold">{pick("1. اختر المناهج", "1. Choose curriculums")}</p><div className="flex flex-wrap gap-2">{catalog.data?.data.map((item) => <Button key={item.id} type="button" size="sm" variant={curriculums.includes(item.id) ? "default" : "outline"} onClick={() => toggleCurriculum(item.id)}>{item.name}</Button>)}</div></div>
      {curriculums.map((curriculumId, index) => { const curriculum = catalog.data?.data.find((item) => item.id === curriculumId); const options = gradeQueries[index]?.data?.data || []; return <Collapsible key={curriculumId} defaultOpen className="group rounded-xl border"><CollapsibleTrigger asChild><button type="button" className="flex w-full items-center justify-between p-4 text-start font-semibold"><span>{curriculum?.name}</span><ChevronDown className="h-5 w-5 transition-transform group-data-[state=open]:rotate-180" /></button></CollapsibleTrigger><CollapsibleContent className="px-4 pb-4">{gradeQueries[index]?.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <div className="space-y-3">{[...options].sort(compareGrades).map((grade) => <div key={grade.id} className="rounded-lg bg-muted/30 p-3"><label className="flex cursor-pointer items-center gap-2 font-medium"><input type="checkbox" checked={grade.id in assignments} onChange={(event) => setAssignments((current) => event.target.checked ? { ...current, [grade.id]:[] } : Object.fromEntries(Object.entries(current).filter(([id]) => id !== grade.id)))} />{grade.name}</label>{grade.id in assignments && <div className="mt-3 flex flex-wrap gap-2">{subjectQueries[gradeIds.indexOf(grade.id)]?.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (subjectsByGrade[grade.id] || []).map((subject) => <label key={subject.id} className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm"><input type="checkbox" checked={assignments[grade.id]?.includes(subject.id)} onChange={(event) => setAssignments((current) => ({ ...current, [grade.id]:event.target.checked ? [...current[grade.id], subject.id] : current[grade.id].filter((id) => id !== subject.id) }))} />{subject.name}</label>)}</div>}</div>)}</div>}</CollapsibleContent></Collapsible>; })}
    </CardContent></Card>}
  </section>;
}
