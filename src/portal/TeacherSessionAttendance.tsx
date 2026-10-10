import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { teacherAttendanceApi, type AttendanceStatus, type TeacherAttendanceRecord, type TeacherClassroomStudent } from "@/api/teacherAttendanceApi";
import { classroomRecordingsApi } from "@/api/classroomRecordingsApi";
import { Button } from "@/components/ui/button";
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
  const students = useQuery({ queryKey: [isAdmin ? "admin-classroom-students" : "teacher-classroom-students", classroomId], queryFn: async () => isAdmin ? (await classroomRecordingsApi.listStudents(classroomId)).data.map((student) => ({ id: student.studentId, studentId: student.studentId, fullName: student.fullName })) : teacherAttendanceApi.listClassroomStudents(classroomId), staleTime: 30_000, retry: 1 });
  const attendance = useQuery({ queryKey: ["teacher-attendance-all"], queryFn: teacherAttendanceApi.list, staleTime: 30_000, retry: 1 });
  const rows = useMemo<AttendanceRow[]>(() => {
    if (!students.data || !attendance.data) return [];
    const records = new Map(attendance.data.filter((record) => referenceId(record.session) === sessionId).map((record) => [referenceId(record.student), record]));
    return students.data.map((student) => ({ student, attendance: records.get(student.studentId) }));
  }, [attendance.data, sessionId, students.data]);
  useEffect(() => {
    if (rows.length) setDraft((current) => Object.fromEntries(rows.map((row) => [row.student.studentId, current[row.student.studentId] || row.attendance?.status || "present"] as const)));
  }, [rows]);
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
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["teacher-attendance-all"] }); toast.success(pick("تم تسجيل حضور الطلاب بنجاح", "Student attendance saved successfully")); },
    onError: (error) => toast.error(error instanceof Error ? error.message : pick("تعذر حفظ الحضور", "Could not save attendance")),
  });
  const loading = students.isPending || attendance.isPending;
  const hasError = students.isError || attendance.isError;
  const title = pick("حضور الطلاب", "Student attendance");
  const description = readOnly ? pick("يمكنك عرض نتيجة حضور هذه الحصة دون تعديلها.", "You can view this session's attendance result without editing it.") : pick("حدد حالة كل طالب ثم اضغط تسجيل الحضور.", "Select a status for each student, then save attendance.");
  const content = <>
    {embedded ? <div><h2 className="text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div> : <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>}
    {loading ? <div className="space-y-3" aria-busy="true"><p className="text-sm text-muted-foreground">{pick("جاري تحميل بيانات الحضور...", "Loading attendance data...")}</p>{[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-lg bg-muted" />)}</div>
      : hasError ? <div role="alert" className="space-y-3 rounded-lg border border-destructive/30 p-4 text-sm"><p>{pick("تعذر تحميل بيانات الحضور.", "Could not load attendance data.")}</p><Button variant="outline" onClick={() => void Promise.all([students.refetch(), attendance.refetch()])} disabled={students.isFetching || attendance.isFetching}>{pick("إعادة المحاولة", "Retry")}</Button></div>
        : !rows.length ? <p className="rounded-lg border bg-muted/40 p-5 text-center text-sm text-muted-foreground">{pick("لا يوجد طلاب في هذا الفصل.", "There are no students in this classroom.")}</p>
          : <div className="space-y-4"><div className="overflow-hidden rounded-xl border"><table className="w-full min-w-0 table-fixed text-xs sm:min-w-[620px] sm:text-sm"><colgroup><col className="w-[40%] sm:w-auto" />{statuses.map((status) => <col key={status} className="w-[20%] sm:w-auto" />)}</colgroup><thead className="bg-muted/50"><tr><th className="break-words px-1 py-3 text-start font-semibold sm:px-4">{pick("الطالب", "Student")}</th>{statuses.map((status) => <th key={status} className="break-words px-1 py-3 text-center font-semibold sm:px-3">{statusLabels[status][isArabic ? "ar" : "en"]}</th>)}</tr></thead><tbody className="divide-y">{rows.map((row) => { const selected = draft[row.student.studentId] || row.attendance?.status || "present"; return <tr key={row.student.studentId} className="hover:bg-muted/20"><td className="break-words px-1 py-3 font-medium sm:px-4">{row.student.fullName}</td>{statuses.map((status) => <td key={status} className="px-1 py-3 text-center sm:px-3"><label className="inline-flex cursor-pointer items-center justify-center"><input type="radio" name={`attendance-${row.student.studentId}`} value={status} checked={selected === status} disabled={readOnly || saveAll.isPending} onChange={() => setDraft((current) => ({ ...current, [row.student.studentId]: status }))} className="h-4 w-4 accent-primary" /><span className="sr-only">{statusLabels[status][isArabic ? "ar" : "en"]}</span></label></td>)}</tr>; })}</tbody></table></div>{!readOnly && <Button className="w-full sm:w-auto" disabled={saveAll.isPending} onClick={() => saveAll.mutate()}>{saveAll.isPending ? pick("جاري تسجيل الحضور...", "Saving attendance...") : pick("تسجيل الحضور", "Save attendance")}</Button>}</div>}
    {!embedded && onClose && <DialogFooter><Button variant="outline" disabled={saveAll.isPending} onClick={onClose}>{pick("إغلاق", "Close")}</Button></DialogFooter>}
  </>;
  if (embedded) return <div dir={isArabic ? "rtl" : "ltr"} className="space-y-4">{content}</div>;
  return <Dialog open onOpenChange={(open) => { if (!open && !saveAll.isPending) onClose?.(); }}><DialogContent dir={isArabic ? "rtl" : "ltr"} className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-4xl overflow-y-auto">{content}</DialogContent></Dialog>;
}
