import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { teacherAttendanceApi, type AttendanceStatus, type TeacherAttendanceRecord, type TeacherClassroomStudent } from "@/api/teacherAttendanceApi";
import { classroomRecordingsApi } from "@/api/classroomRecordingsApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";

const referenceId = (value: string | { id?: string; _id?: string }) => typeof value === "string" ? value : value.id || value._id || "";
const statuses: AttendanceStatus[] = ["present", "absent", "late"];
const statusLabels: Record<AttendanceStatus, { ar: string; en: string }> = {
  present: { ar: "حاضر", en: "Present" }, absent: { ar: "غائب", en: "Absent" }, late: { ar: "متأخر", en: "Late" },
};
interface AttendanceRow { student: TeacherClassroomStudent; attendance?: TeacherAttendanceRecord }

export default function TeacherSessionAttendance({ sessionId, classroomId, readOnly, onClose, embedded = false }: { sessionId: string; classroomId: string; readOnly: boolean; onClose?: () => void; embedded?: boolean }) {
  const { isArabic, pick } = useLanguage();
  const isAdmin = useLocation().pathname.startsWith("/admin/");
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});
  const [editing, setEditing] = useState(false);
  const students = useQuery({ queryKey: [isAdmin ? "admin-classroom-students" : "teacher-classroom-students", classroomId], queryFn: async () => isAdmin ? (await classroomRecordingsApi.listStudents(classroomId)).data.map((student) => ({ id: student.studentId, studentId: student.studentId, fullName: student.fullName })) : teacherAttendanceApi.listClassroomStudents(classroomId), staleTime: 30_000, retry: 1 });
  const attendance = useQuery({ queryKey: ["teacher-attendance-all"], queryFn: teacherAttendanceApi.list, staleTime: 30_000, retry: 1 });
  useEffect(() => {
    setDraft({});
    setEditing(false);
  }, [sessionId]);
  const rows = useMemo<AttendanceRow[]>(() => {
    if (!students.data || !attendance.data) return [];
    const records = new Map(attendance.data.filter((record) => referenceId(record.session) === sessionId).map((record) => [referenceId(record.student), record]));
    return students.data.map((student) => ({ student, attendance: records.get(student.studentId) }));
  }, [attendance.data, sessionId, students.data]);
  useEffect(() => {
    if (rows.length) setDraft((current) => Object.fromEntries(rows.map((row) => [row.student.studentId, current[row.student.studentId] || row.attendance?.status || "present"] as const)));
  }, [rows]);
  const savedCount = rows.filter((row) => Boolean(row.attendance?.id || row.attendance?._id)).length;
  const missingCount = Math.max(0, rows.length - savedCount);
  const hasSavedAttendance = savedCount > 0;
  const attendanceComplete = rows.length > 0 && rows.every((row) => Boolean(row.attendance?.id || row.attendance?._id));
  useEffect(() => {
    setEditing(!hasSavedAttendance);
  }, [hasSavedAttendance, sessionId]);
  const saveAll = useMutation({
    mutationFn: async () => {
      if (readOnly) throw new Error(pick("لا يمكنك تعديل حضور هذه الحصة.", "You cannot edit attendance for this session."));
      await Promise.all(rows.map((row) => {
        const value = draft[row.student.studentId] || row.attendance?.status || "present";
        const attendanceId = row.attendance?.id || row.attendance?._id;
        if (attendanceId && row.attendance?.status === value) return Promise.resolve();
        return attendanceId ? teacherAttendanceApi.update(attendanceId, value) : teacherAttendanceApi.create(sessionId, row.student.studentId, value);
      }));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["teacher-attendance-all"] });
      await queryClient.refetchQueries({ queryKey: ["teacher-attendance-all"] });
      setEditing(false);
      toast.success(pick("تم حفظ حالات حضور الطلاب بنجاح", "Student attendance statuses saved successfully"));
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : pick("تعذر حفظ الحضور", "Could not save attendance")),
  });
  const loading = students.isPending || attendance.isPending;
  const hasError = students.isError || attendance.isError;
  const title = pick("حضور الطلاب", "Student attendance");
  const description = readOnly
    ? pick("يمكنك عرض نتيجة حضور هذه الحصة دون تعديلها.", "You can view this session's attendance result without editing it.")
    : hasSavedAttendance && !editing
      ? attendanceComplete
        ? pick("تم تسجيل حضور جميع الطلاب. اضغط تعديل الحضور لتغيير أي حالة.", "Attendance has been saved for all students. Select Edit attendance to change a status.")
        : pick("تم حفظ الحضور المسجل. اضغط تعديل الحضور لإكمال الطلاب المتبقين أو تغيير أي حالة.", "Saved attendance is shown. Select Edit attendance to complete remaining students or change a status.")
      : hasSavedAttendance
        ? pick("عدّل الحالة المطلوبة ثم اضغط حفظ التعديلات.", "Change the needed status, then save your changes.")
        : pick("حدد حالة كل طالب ثم اضغط تسجيل الحضور.", "Select a status for each student, then save attendance.");
  const content = <>
    {embedded ? <div><h2 className="text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div> : <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>}
    {loading ? <div className="space-y-3" aria-busy="true"><p className="text-sm text-muted-foreground">{pick("جاري تحميل بيانات الحضور...", "Loading attendance data...")}</p>{[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-lg bg-muted" />)}</div>
      : hasError ? <div role="alert" className="space-y-3 rounded-lg border border-destructive/30 p-4 text-sm"><p>{pick("تعذر تحميل بيانات الحضور.", "Could not load attendance data.")}</p><Button variant="outline" onClick={() => void Promise.all([students.refetch(), attendance.refetch()])} disabled={students.isFetching || attendance.isFetching}>{pick("إعادة المحاولة", "Retry")}</Button></div>
        : !rows.length ? <p className="rounded-lg border bg-muted/40 p-5 text-center text-sm text-muted-foreground">{pick("لا يوجد طلاب في هذا الفصل.", "There are no students in this classroom.")}</p>
          : <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{pick(`تم حفظ ${savedCount} من ${rows.length}`, `${savedCount} of ${rows.length} saved`)}</Badge>
              {missingCount > 0 && <span>{pick(`متبقي ${missingCount} بدون تسجيل`, `${missingCount} not recorded yet`)}</span>}
              {attendanceComplete && <span>{pick("اكتمل تسجيل الحضور", "Attendance is complete")}</span>}
            </div>
            <div className="overflow-hidden rounded-xl border"><table className="w-full min-w-0 table-fixed text-xs sm:min-w-[620px] sm:text-sm"><colgroup><col className="w-[40%] sm:w-auto" />{statuses.map((status) => <col key={status} className="w-[20%] sm:w-auto" />)}</colgroup><thead className="bg-muted/50"><tr><th className="break-words px-1 py-3 text-start font-semibold sm:px-4">{pick("الطالب", "Student")}</th>{statuses.map((status) => <th key={status} className="break-words px-1 py-3 text-center font-semibold sm:px-3">{statusLabels[status][isArabic ? "ar" : "en"]}</th>)}</tr></thead><tbody className="divide-y">{rows.map((row) => { const selected = draft[row.student.studentId] || row.attendance?.status || "present"; const persisted = row.attendance?.status; return <tr key={row.student.studentId} className="hover:bg-muted/20"><td className="px-1 py-3 sm:px-4"><div className="flex flex-wrap items-center gap-2"><span className="break-words font-medium">{row.student.fullName}</span>{persisted ? <Badge variant="outline" className="whitespace-nowrap text-emerald-700">{pick(`تم الحفظ: ${statusLabels[persisted][isArabic ? "ar" : "en"]}`, `Saved: ${statusLabels[persisted][isArabic ? "ar" : "en"]}`)}</Badge> : <Badge variant="outline" className="whitespace-nowrap text-amber-700">{pick("لم يسجل بعد", "Not recorded")}</Badge>}</div></td>{statuses.map((status) => <td key={status} className="px-1 py-3 text-center sm:px-3"><label className={`inline-flex items-center justify-center ${readOnly || !editing || saveAll.isPending ? "cursor-default" : "cursor-pointer"}`}><input type="radio" name={`attendance-${row.student.studentId}`} value={status} checked={selected === status} disabled={readOnly || !editing || saveAll.isPending} onChange={() => setDraft((current) => ({ ...current, [row.student.studentId]: status }))} className="h-4 w-4 accent-primary" /><span className="sr-only">{statusLabels[status][isArabic ? "ar" : "en"]}</span></label></td>)}</tr>; })}</tbody></table></div>{!readOnly && (hasSavedAttendance && !editing ? <Button className="w-full sm:w-auto" onClick={() => setEditing(true)}>{pick("تعديل الحضور", "Edit attendance")}</Button> : <Button className="w-full sm:w-auto" disabled={saveAll.isPending} onClick={() => saveAll.mutate()}>{saveAll.isPending ? pick("جاري حفظ الحضور...", "Saving attendance...") : hasSavedAttendance ? pick("حفظ التعديلات", "Save changes") : pick("تسجيل الحضور", "Save attendance")}</Button>)}</div>}
    {!embedded && onClose && <DialogFooter><Button variant="outline" disabled={saveAll.isPending} onClick={onClose}>{pick("إغلاق", "Close")}</Button></DialogFooter>}
  </>;
  if (embedded) return <div dir={isArabic ? "rtl" : "ltr"} className="space-y-4">{content}</div>;
  return <Dialog open onOpenChange={(open) => { if (!open && !saveAll.isPending) onClose?.(); }}><DialogContent dir={isArabic ? "rtl" : "ltr"} className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-4xl overflow-y-auto">{content}</DialogContent></Dialog>;
}
