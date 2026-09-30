import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { classroomPlansApi, type ClassroomPlanSubject } from "@/api/classroomPlansApi";
import { useLanguage } from "@/i18n/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = { classroomId: string; canEdit?: boolean };

export default function ClassroomPlansPanel({ classroomId, canEdit = false }: Props) {
  const { pick, isArabic } = useLanguage();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"day" | "term">("day");
  const [week, setWeek] = useState<number | undefined>();
  const [form, setForm] = useState({ subjectId: "", day: "", sessionContent: "", sessionAssignment: "", attachment: null as File | null });
  const weeks = useQuery({ queryKey: ["classroom-plan-weeks", classroomId], queryFn: () => classroomPlansApi.getWeeks(classroomId), enabled: Boolean(classroomId), retry: 1 });
  const selectedWeek = week ?? weeks.data?.data.currentWeek;
  const weekly = useQuery({ queryKey: ["classroom-plans", classroomId, selectedWeek], queryFn: () => classroomPlansApi.getWeekly(classroomId, selectedWeek), enabled: Boolean(classroomId && selectedWeek), retry: 1 });
  const term = useQuery({ queryKey: ["classroom-term-plans", classroomId], queryFn: () => classroomPlansApi.getTerm(classroomId), enabled: Boolean(classroomId), retry: 1 });
  const subjects = (mode === "day" ? weekly.data?.data.subjects : term.data?.data.subjects) || [];
  const subjectOptions = weekly.data?.data.subjects || term.data?.data.subjects || [];
  const weekOptions = useMemo(() => Array.from({ length: weeks.data?.data.weeksCount || 0 }, (_, index) => index + 1).reverse(), [weeks.data?.data.weeksCount]);
  const upload = useMutation({
    mutationFn: () => classroomPlansApi.upload(classroomId, { type: mode, subjectId: form.subjectId, day: mode === "day" ? form.day : undefined, sessionContent: mode === "day" ? form.sessionContent : undefined, sessionAssignment: mode === "day" ? form.sessionAssignment : undefined, attachment: mode === "term" ? form.attachment : null }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["classroom-plans", classroomId] }),
        queryClient.invalidateQueries({ queryKey: ["classroom-term-plans", classroomId] }),
      ]);
      setForm({ subjectId: "", day: "", sessionContent: "", sessionAssignment: "", attachment: null });
      toast.success(pick("تم حفظ الخطة بنجاح.", "Plan saved successfully."));
    },
    onError: (error: Error) => toast.error(error.message || pick("تعذر حفظ الخطة.", "Unable to save the plan.")),
  });
  const planError = weekly.isError || term.isError || weeks.isError;
  const renderSubjects = (items: ClassroomPlanSubject[]) => items.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{pick("لا توجد خطط مسجلة لهذا الاختيار.", "No plans found for this selection.")}</p> : <div className="grid gap-4 md:grid-cols-2">{items.map((subject) => <Card key={subject.id}><CardHeader className="pb-3"><CardTitle className="text-base">{subject.name}</CardTitle></CardHeader><CardContent className="space-y-3">{subject.plans.map((plan, index) => <div key={`${subject.id}-${plan.id || index}`} className="rounded-xl bg-muted/50 p-3 text-sm">{plan.day && <Badge variant="outline">{plan.day}</Badge>}{plan.sessionContent && <p className="mt-2"><span className="font-semibold">{pick("محتوى الحصة:", "Content:")}</span> {plan.sessionContent}</p>}{plan.sessionAssignment && <p className="mt-1"><span className="font-semibold">{pick("الواجب:", "Assignment:")}</span> {plan.sessionAssignment}</p>}{plan.attachment && <a className="mt-2 inline-flex items-center gap-1 text-primary underline" href={plan.attachment} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />{pick("فتح خطة الترم", "Open term plan")}</a>}</div>)}</CardContent></Card>)}</div>;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{pick("الخطط الدراسية", "Study plans")}</h2><p className="mt-1 text-sm text-muted-foreground">{pick("الخطة الأسبوعية اليومية وخطة الترم.", "Weekly daily plans and term plans.")}</p></div><div className="flex gap-2"><Button type="button" size="sm" variant={mode === "day" ? "default" : "outline"} onClick={() => setMode("day")}>{pick("الأسبوعية", "Weekly")}</Button><Button type="button" size="sm" variant={mode === "term" ? "default" : "outline"} onClick={() => setMode("term")}>{pick("خطة الترم", "Term plan")}</Button></div></div>
    {mode === "day" && <label className="grid gap-1 text-sm"><span>{pick("الأسبوع", "Week")}</span><select className="h-10 rounded-md border bg-background px-3" value={selectedWeek || ""} onChange={(event) => setWeek(Number(event.target.value))}>{weekOptions.map((item) => <option key={item} value={item}>{pick(`الأسبوع ${item}`, `Week ${item}`)}</option>)}</select></label>}
    {canEdit && <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Upload className="h-4 w-4" />{pick("رفع خطة", "Upload plan")}</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2"><label className="grid gap-1 text-sm"><span>{pick("المادة", "Subject")}</span><select className="h-10 rounded-md border bg-background px-3" value={form.subjectId} onChange={(event) => setForm((current) => ({ ...current, subjectId: event.target.value }))}><option value="">{pick("اختر المادة", "Choose subject")}</option>{subjectOptions.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>{mode === "day" ? <><label className="grid gap-1 text-sm"><span>{pick("تاريخ اليوم", "Date")}</span><Input type="date" value={form.day} onChange={(event) => setForm((current) => ({ ...current, day: event.target.value }))} /></label><label className="grid gap-1 text-sm md:col-span-2"><span>{pick("محتوى الحصة", "Session content")}</span><Textarea value={form.sessionContent} onChange={(event) => setForm((current) => ({ ...current, sessionContent: event.target.value }))} /></label><label className="grid gap-1 text-sm md:col-span-2"><span>{pick("الواجب", "Assignment")}</span><Textarea value={form.sessionAssignment} onChange={(event) => setForm((current) => ({ ...current, sessionAssignment: event.target.value }))} /></label></> : <label className="grid gap-1 text-sm"><span>{pick("ملف الخطة", "Plan file")}</span><Input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(event) => setForm((current) => ({ ...current, attachment: event.target.files?.[0] || null }))} /></label>}<Button className="md:col-span-2" disabled={upload.isPending || !form.subjectId || (mode === "day" ? !form.day : !form.attachment)} onClick={() => upload.mutate()}>{upload.isPending ? <><Loader2 className="me-2 h-4 w-4 animate-spin" />{pick("جارٍ الحفظ...", "Saving...")}</> : <><FileText className="me-2 h-4 w-4" />{pick("حفظ الخطة", "Save plan")}</>}</Button></CardContent></Card>}
    {planError ? <p className="text-sm text-destructive">{pick("تعذر تحميل الخطط.", "Unable to load plans.")}</p> : (weekly.isPending || term.isPending) ? <p className="text-sm text-muted-foreground">{pick("جارٍ تحميل الخطط...", "Loading plans...")}</p> : renderSubjects(subjects)}
  </div>;
}
