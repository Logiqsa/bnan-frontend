import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { classroomRecordingsApi, type ClassroomSubjectOption } from "@/api/classroomRecordingsApi";
import { classroomZoomApi, type ClassroomScheduleEntry } from "@/api/classroomZoomApi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/i18n/LanguageContext";

const DAYS = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"] as const;
const DAY_AR: Record<string, string> = { saturday: "السبت", sunday: "الأحد", monday: "الاثنين", tuesday: "الثلاثاء", wednesday: "الأربعاء", thursday: "الخميس", friday: "الجمعة" };
type Row = ClassroomScheduleEntry & { key: string };

const subjectLabel = (subject: ClassroomSubjectOption) => subject.name || subject.subject?.name || "—";

export default function ClassroomScheduleEditor({ classroomId, mode, entries, onSaved }: { classroomId: string; mode: "egyptian" | "gulf"; entries: ClassroomScheduleEntry[]; onSaved: () => void }) {
  const { isArabic, pick } = useLanguage();
  const [open, setOpen] = useState(false);
  const [subjects, setSubjects] = useState<ClassroomSubjectOption[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [gulfSubjectId, setGulfSubjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const originalDays = useMemo(() => new Set(entries.map((entry) => entry.day.toLowerCase())), [entries]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    classroomRecordingsApi.listSubjects(classroomId).then((response) => {
      const active = (response.data.subjects || []).filter((item) => item.isActive !== false);
      setSubjects(active);
      const normalized = entries.map((entry, index) => ({
        ...entry,
        day: entry.day.toLowerCase(),
        classroomSubjectId: entry.classroomSubjectId || active.find((item) => subjectLabel(item) === entry.subjectName)?.classroomSubjectId || active[0]?.classroomSubjectId || "",
        key: `${entry.day}-${entry.startTime}-${index}`,
      }));
      setRows(normalized);
      setGulfSubjectId(normalized[0]?.classroomSubjectId || active[0]?.classroomSubjectId || "");
    }).catch(() => toast.error(pick("تعذر تحميل مواد الفصل", "Unable to load classroom subjects"))).finally(() => setLoading(false));
  }, [classroomId, entries, open, pick]);

  const addRow = () => setRows((current) => [...current, { key: crypto.randomUUID(), day: DAYS.find((day) => mode === "egyptian" || !current.some((row) => row.day === day)) || "saturday", startTime: "09:00", endTime: "10:00", classroomSubjectId: mode === "gulf" ? gulfSubjectId : subjects[0]?.classroomSubjectId || "" }]);
  const updateRow = (key: string, patch: Partial<Row>) => setRows((current) => current.map((row) => row.key === key ? { ...row, ...patch } : row));

  const save = async () => {
    if (!subjects.length) return toast.error(pick("لا توجد مواد مكلّفة داخل الفصل", "No assigned subjects are available"));
    if (mode === "gulf" && !gulfSubjectId) return toast.error(pick("اختر المادة", "Select a subject"));
    if (rows.some((row) => !DAYS.includes(row.day as typeof DAYS[number]) || !row.startTime || (row.endTime && row.endTime <= row.startTime))) return toast.error(pick("راجع الأيام والأوقات؛ وقت النهاية يجب أن يكون بعد البداية", "Check days and times; end time must be after start time"));
    if (mode === "gulf" && new Set(rows.map((row) => row.day)).size !== rows.length) return toast.error(pick("الجدول السعودي يسمح بموعد واحد فقط لكل يوم", "The Gulf schedule allows only one entry per day"));
    if (mode === "egyptian") {
      const signatures = rows.map((row) => `${row.day}-${row.startTime}`);
      const assignments = rows.map((row) => `${row.day}-${row.classroomSubjectId}`);
      if (new Set(signatures).size !== signatures.length || new Set(assignments).size !== assignments.length) return toast.error(pick("لا يمكن تكرار نفس الوقت أو المادة داخل اليوم", "The same time or subject cannot be repeated within a day"));
      if (rows.some((row) => !row.classroomSubjectId)) return toast.error(pick("اختر مادة لكل حصة", "Select a subject for every lesson"));
    }
    setSaving(true);
    try {
      if (mode === "gulf") {
        if (rows.length) await classroomZoomApi.saveGulfSchedule(classroomId, gulfSubjectId, rows.map(({ day, startTime, endTime }) => ({ day, startTime, ...(endTime ? { endTime } : {}) })));
        else await classroomZoomApi.deleteGulfSchedule(classroomId);
      } else {
        const grouped = new Map<string, Row[]>();
        rows.forEach((row) => grouped.set(row.day, [...(grouped.get(row.day) || []), row]));
        await Promise.all(DAYS.map((day) => {
          const lessons = grouped.get(day);
          if (lessons?.length) return classroomZoomApi.saveEgyptianDay(classroomId, day, lessons.map((row) => ({ classroomSubject: row.classroomSubjectId || "", startTime: row.startTime, ...(row.endTime ? { endTime: row.endTime } : {}) })));
          return originalDays.has(day) ? classroomZoomApi.deleteEgyptianDay(classroomId, day) : Promise.resolve();
        }));
      }
      toast.success(pick("تم حفظ جدول الفصل", "Classroom schedule saved"));
      setOpen(false);
      onSaved();
    } catch (error) {
      toast.error((error as Error).message || pick("تعذر حفظ الجدول", "Unable to save schedule"));
    } finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-2"><CalendarDays className="h-4 w-4"/>{entries.length ? pick("تعديل الجدول", "Edit schedule") : pick("تحديد الجدول", "Set schedule")}</Button></DialogTrigger>
    <DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{pick("تحديد جدول الفصل", "Set classroom schedule")}</DialogTitle><DialogDescription>{mode === "egyptian" ? pick("يمكن إضافة أكثر من حصة في اليوم مع اختيار مادة كل حصة.", "You can add multiple lessons per day and select a subject for each.") : pick("اختر المادة ثم أضف موعدًا واحدًا لكل يوم.", "Choose the subject, then add one time slot per day.")}</DialogDescription></DialogHeader>
      {loading ? <div className="grid min-h-48 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div> : <div className="space-y-4">
        {mode === "gulf" && <div className="space-y-2"><Label>{pick("المادة", "Subject")}</Label><Select value={gulfSubjectId} onValueChange={setGulfSubjectId}><SelectTrigger><SelectValue placeholder={pick("اختر المادة", "Select subject")}/></SelectTrigger><SelectContent>{subjects.map((subject) => <SelectItem key={subject.classroomSubjectId} value={subject.classroomSubjectId}>{subjectLabel(subject)}</SelectItem>)}</SelectContent></Select></div>}
        <div className="space-y-2">{rows.map((row) => <div key={row.key} className="grid gap-2 rounded-xl border bg-muted/20 p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5"><Label>{pick("اليوم", "Day")}</Label><Select value={row.day} onValueChange={(day) => updateRow(row.key, { day })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{DAYS.map((day) => <SelectItem key={day} value={day}>{isArabic ? DAY_AR[day] : day[0].toUpperCase() + day.slice(1)}</SelectItem>)}</SelectContent></Select></div>
          {mode === "egyptian" && <div className="space-y-1.5"><Label>{pick("المادة", "Subject")}</Label><Select value={row.classroomSubjectId} onValueChange={(classroomSubjectId) => updateRow(row.key, { classroomSubjectId })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{subjects.map((subject) => <SelectItem key={subject.classroomSubjectId} value={subject.classroomSubjectId}>{subjectLabel(subject)}</SelectItem>)}</SelectContent></Select></div>}
          <div className="space-y-1.5"><Label>{pick("من", "From")}</Label><Input type="time" value={row.startTime} onChange={(event) => updateRow(row.key, { startTime: event.target.value })}/></div>
          <div className="space-y-1.5"><Label>{pick("إلى", "To")}</Label><Input type="time" value={row.endTime || ""} onChange={(event) => updateRow(row.key, { endTime: event.target.value })}/></div>
          <Button type="button" size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}><Trash2 className="h-4 w-4"/></Button>
        </div>)}</div>
        <Button type="button" variant="outline" className="w-full border-dashed" onClick={addRow} disabled={mode === "gulf" && rows.length >= DAYS.length}><Plus className="me-2 h-4 w-4"/>{pick("إضافة موعد", "Add time slot")}</Button>
      </div>}
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>{pick("إلغاء", "Cancel")}</Button><Button onClick={() => void save()} disabled={loading || saving || !subjects.length}>{saving && <Loader2 className="me-2 h-4 w-4 animate-spin"/>}{pick("حفظ الجدول", "Save schedule")}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
