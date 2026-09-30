import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileText, Loader2, Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { classroomPlansApi, type ClassroomPlanSubject } from "@/api/classroomPlansApi";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = { classroomId: string; canEdit?: boolean };

export default function ClassroomPlansPanel({ classroomId, canEdit = false }: Props) {
  const { pick } = useLanguage();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"day" | "term">("day");
  const [showForm, setShowForm] = useState(false);
  const [week, setWeek] = useState<number | undefined>();
  const [form, setForm] = useState({ subjectId: "", day: "", sessionContent: "", sessionAssignment: "", attachment: null as File | null });
  const [attachmentPreview, setAttachmentPreview] = useState("");
  useEffect(() => {
    if (!form.attachment) {
      setAttachmentPreview("");
      return;
    }
    const url = URL.createObjectURL(form.attachment);
    setAttachmentPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [form.attachment]);
  const weeks = useQuery({ queryKey: ["classroom-plan-weeks", classroomId], queryFn: () => classroomPlansApi.getWeeks(classroomId), enabled: Boolean(classroomId), retry: 1 });
  const selectedWeek = week ?? weeks.data?.data.currentWeek;
  const weekly = useQuery({ queryKey: ["classroom-plans", classroomId, selectedWeek], queryFn: () => classroomPlansApi.getWeekly(classroomId, selectedWeek), enabled: Boolean(classroomId && selectedWeek && mode === "day"), retry: 1 });
  const term = useQuery({ queryKey: ["classroom-term-plans", classroomId], queryFn: () => classroomPlansApi.getTerm(classroomId), enabled: Boolean(classroomId && mode === "term"), retry: 1 });
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
      setShowForm(false);
      toast.success(pick("تم حفظ الخطة بنجاح.", "Plan saved successfully."));
    },
    onError: (error: Error) => toast.error(error.message || pick("تعذر حفظ الخطة.", "Unable to save the plan.")),
  });
  const activeQuery = mode === "day" ? weekly : term;
  const activeError = activeQuery.error instanceof Error ? activeQuery.error.message : null;
  const renderSubjects = (items: ClassroomPlanSubject[]) => items.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{pick("لا توجد خطط مسجلة لهذا الاختيار.", "No plans found for this selection.")}</p> : <div className="space-y-4">{items.map((subject) => <Card key={subject.id} className="overflow-hidden"><CardHeader className="border-b bg-muted/20 py-4"><CardTitle className="text-base">{subject.name}</CardTitle></CardHeader><CardContent className="p-0">{mode === "day" ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead className="bg-muted/40"><tr><th className="px-4 py-3 text-start font-semibold">{pick("اليوم", "Day")}</th><th className="px-4 py-3 text-start font-semibold">{pick("محتوى الحصة", "Session content")}</th><th className="px-4 py-3 text-start font-semibold">{pick("الواجب", "Assignment")}</th></tr></thead><tbody className="divide-y">{subject.plans.map((plan, index) => <tr key={`${subject.id}-${plan.id || index}`} className="align-top"><td className="px-4 py-4 font-medium whitespace-nowrap">{plan.day || "—"}</td><td className="px-4 py-4">{plan.sessionContent || "—"}</td><td className="px-4 py-4">{plan.sessionAssignment || "—"}</td></tr>)}</tbody></table></div> : <div className="space-y-3 p-4">{subject.plans.map((plan, index) => <div key={`${subject.id}-${plan.id || index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 p-3 text-sm"> <span>{pick("ملف خطة الترم", "Term plan file")}</span>{plan.attachment && <a className="inline-flex items-center gap-1 text-primary underline" href={plan.attachment} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />{pick("فتح الخطة", "Open plan")}</a>}</div>)}</div>}</CardContent></Card>)}</div>;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{pick("الخطط الدراسية", "Study plans")}</h2><p className="mt-1 text-sm text-muted-foreground">{pick("الخطة الأسبوعية اليومية وخطة الترم.", "Weekly daily plans and term plans.")}</p></div><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant={mode === "day" ? "default" : "outline"} onClick={() => setMode("day")}>{pick("الأسبوعية", "Weekly")}</Button><Button type="button" size="sm" variant={mode === "term" ? "default" : "outline"} onClick={() => setMode("term")}>{pick("خطة الترم", "Term plan")}</Button>{canEdit && <Button type="button" size="sm" variant="outline" onClick={() => setShowForm((current) => !current)}>{showForm ? <><X className="me-1 h-4 w-4" />{pick("إلغاء", "Cancel")}</> : <><Plus className="me-1 h-4 w-4" />{pick("إضافة خطة", "Add plan")}</>}</Button>}</div></div>
    {mode === "day" && <label className="grid gap-1 text-sm"><span>{pick("الأسبوع", "Week")}</span><select className="h-10 rounded-md border bg-background px-3" value={selectedWeek || ""} onChange={(event) => setWeek(Number(event.target.value))}>{weekOptions.map((item) => <option key={item} value={item}>{pick(`الأسبوع ${item}`, `Week ${item}`)}</option>)}</select></label>}
    {canEdit && showForm && <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Upload className="h-4 w-4" />{pick("رفع خطة", "Upload plan")}</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2"><label className="grid gap-1 text-sm"><span>{pick("المادة", "Subject")}</span><select className="h-10 rounded-md border bg-background px-3" value={form.subjectId} onChange={(event) => setForm((current) => ({ ...current, subjectId: event.target.value }))}><option value="">{pick("اختر المادة", "Choose subject")}</option>{subjectOptions.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>{mode === "day" ? <><label className="grid gap-1 text-sm"><span>{pick("تاريخ اليوم", "Date")}</span><Input type="date" value={form.day} onChange={(event) => setForm((current) => ({ ...current, day: event.target.value }))} /></label><label className="grid gap-1 text-sm md:col-span-2"><span>{pick("محتوى الحصة", "Session content")}</span><Textarea value={form.sessionContent} onChange={(event) => setForm((current) => ({ ...current, sessionContent: event.target.value }))} /></label><label className="grid gap-1 text-sm md:col-span-2"><span>{pick("الواجب", "Assignment")}</span><Textarea value={form.sessionAssignment} onChange={(event) => setForm((current) => ({ ...current, sessionAssignment: event.target.value }))} /></label></> : <><label className="grid gap-1 text-sm"><span>{pick("ملف الخطة", "Plan file")}</span><Input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(event) => setForm((current) => ({ ...current, attachment: event.target.files?.[0] || null }))} /></label>{form.attachment && attachmentPreview && <div className="space-y-2 rounded-xl border bg-muted/20 p-3 text-sm md:col-span-2"><p className="font-medium">{form.attachment.name} <span className="text-muted-foreground">({Math.ceil(form.attachment.size / 1024)} KB)</span></p>{form.attachment.type.startsWith("image/") ? <img src={attachmentPreview} alt={pick("معاينة خطة الترم", "Term plan preview")} className="max-h-72 w-full rounded-lg object-contain" /> : form.attachment.type === "application/pdf" ? <iframe title={pick("معاينة خطة الترم", "Term plan preview")} src={attachmentPreview} className="h-72 w-full rounded-lg border" /> : <p className="text-muted-foreground">{pick("هذا النوع سيظهر بعد فتحه بعد الرفع.", "This file type will be available to open after upload.")}</p>}</div>}</>}<Button className="md:col-span-2" disabled={upload.isPending || !form.subjectId || (mode === "day" ? !form.day : !form.attachment)} onClick={() => upload.mutate()}>{upload.isPending ? <><Loader2 className="me-2 h-4 w-4 animate-spin" />{pick("جارٍ الحفظ...", "Saving...")}</> : <><FileText className="me-2 h-4 w-4" />{pick("حفظ الخطة", "Save plan")}</>}</Button></CardContent></Card>}
    {weeks.isError || activeQuery.isError ? <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><p>{pick("تعذر تحميل الخطط.", "Unable to load plans.")}</p>{activeError && <p className="mt-1 break-words text-xs opacity-80">{activeError}</p>}</div> : activeQuery.isPending ? <p className="text-sm text-muted-foreground">{pick("جارٍ تحميل الخطط...", "Loading plans...")}</p> : renderSubjects(subjects)}
  </div>;
}
