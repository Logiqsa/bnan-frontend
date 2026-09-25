import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { teacherAttendanceApi, type AttendanceStatus, type TeacherAttendanceRecord, type TeacherClassroomStudent } from "@/api/teacherAttendanceApi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/i18n/LanguageContext";

const referenceId = (value: string | { id?: string; _id?: string }) =>
  typeof value === "string" ? value : value.id || value._id || "";

const statusLabels: Record<AttendanceStatus, { ar: string; en: string }> = {
  present: { ar: "حاضر", en: "Present" },
  absent: { ar: "غائب", en: "Absent" },
  late: { ar: "متأخر", en: "Late" },
};

interface AttendanceRow {
  student: TeacherClassroomStudent;
  attendance?: TeacherAttendanceRecord;
}

export default function TeacherSessionAttendance({ sessionId, classroomId, readOnly, onClose, embedded = false }: {
  sessionId: string;
  classroomId: string;
  readOnly: boolean;
  onClose?: () => void;
  embedded?: boolean;
}) {
  const { isArabic, pick } = useLanguage();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AttendanceRow | null>(null);
  const [status, setStatus] = useState<AttendanceStatus>("present");
  const students = useQuery({
    queryKey: ["teacher-classroom-students", classroomId],
    queryFn: () => teacherAttendanceApi.listClassroomStudents(classroomId),
    staleTime: 30_000,
    retry: 1,
  });
  const attendance = useQuery({
    queryKey: ["teacher-attendance-all"],
    queryFn: teacherAttendanceApi.list,
    staleTime: 30_000,
    retry: 1,
  });
  const rows = useMemo<AttendanceRow[]>(() => {
    if (!students.data || !attendance.data) return [];
    const records = new Map(
      attendance.data
        .filter((record) => referenceId(record.session) === sessionId)
        .map((record) => [referenceId(record.student), record]),
    );
    return students.data.map((student) => ({ student, attendance: records.get(student.studentId) }));
  }, [attendance.data, sessionId, students.data]);
  const save = useMutation({
    mutationFn: ({ row, value }: { row: AttendanceRow; value: AttendanceStatus }) => {
      if (readOnly) return Promise.reject(new Error(pick("لا يمكنك تعديل حضور هذه الحصة.", "You cannot edit attendance for this session.")));
      const attendanceId = row.attendance?.id || row.attendance?._id;
      return attendanceId
        ? teacherAttendanceApi.update(attendanceId, value)
        : teacherAttendanceApi.create(sessionId, row.student.studentId, value);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["teacher-attendance-all"] });
      toast.success(pick("تم حفظ الحضور", "Attendance saved"));
      setEditing(null);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : pick("تعذر حفظ الحضور", "Could not save attendance")),
  });
  const formatDate = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleString(isArabic ? "ar-EG" : "en-US");
  };
  const openEditor = (row: AttendanceRow) => {
    if (readOnly) return;
    setEditing(row);
    setStatus(row.attendance?.status || "present");
  };
  const loading = students.isPending || attendance.isPending;
  const hasError = students.isError || attendance.isError;

  const content = (
    <>
        {embedded ? (
          <div>
            <h2 className="text-xl font-bold">{pick("حضور الطلاب", "Student attendance")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {readOnly
                ? pick("يمكنك عرض نتيجة حضور هذه الحصة دون تعديلها.", "You can view this session's attendance result without editing it.")
                : pick("سجّل أو عدّل حالة حضور طلاب هذا الفصل.", "Record or edit attendance for this classroom's students.")}
            </p>
          </div>
        ) : (
          <DialogHeader>
            <DialogTitle>{pick("حضور الطلاب", "Student attendance")}</DialogTitle>
            <DialogDescription>
              {readOnly
                ? pick("يمكنك عرض نتيجة حضور هذه الحصة دون تعديلها.", "You can view this session's attendance result without editing it.")
                : pick("سجّل أو عدّل حالة حضور طلاب هذا الفصل.", "Record or edit attendance for this classroom's students.")}
            </DialogDescription>
          </DialogHeader>
        )}
        {loading ? (
          <div className="space-y-3" aria-busy="true">
            <p className="text-sm text-muted-foreground">{students.isPending ? pick("جاري تحميل طلاب الفصل...", "Loading classroom students...") : pick("جاري تحميل سجلات الحضور...", "Loading attendance records...")}</p>
            {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-lg bg-muted" />)}
          </div>
        ) : hasError ? (
          <div role="alert" className="space-y-3 rounded-lg border border-destructive/30 p-4 text-sm">
            <p>{pick("تعذر تحميل بيانات الحضور.", "Could not load attendance data.")}</p>
            <Button variant="outline" onClick={() => void Promise.all([students.refetch(), attendance.refetch()])} disabled={students.isFetching || attendance.isFetching}>{pick("إعادة المحاولة", "Retry")}</Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="rounded-lg border bg-muted/40 p-5 text-center text-sm text-muted-foreground">{pick("لا يوجد طلاب في هذا الفصل.", "There are no students in this classroom.")}</p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const record = row.attendance;
              const joined = formatDate(record?.joinedAt);
              const left = formatDate(record?.leftAt);
              return (
                <div key={row.student.studentId} className="min-w-0 rounded-lg border p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-medium">{row.student.fullName}</p>
                      <p className={`mt-1 text-sm ${record ? "text-foreground" : "text-muted-foreground"}`}>
                        {record ? statusLabels[record.status]?.[isArabic ? "ar" : "en"] || record.status : pick("لم يتم تسجيل الحضور", "Attendance not recorded")}
                      </p>
                    </div>
                    {!readOnly && <Button size="sm" variant="outline" onClick={() => openEditor(row)}>{record ? pick("تعديل", "Edit") : pick("تسجيل", "Record")}</Button>}
                  </div>
                  {record && (joined || left || record.duration != null) && (
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                      {joined && <span>{pick("الدخول", "Joined")}: {joined}</span>}
                      {left && <span>{pick("الخروج", "Left")}: {left}</span>}
                      {record.duration != null && <span>{pick("المدة", "Duration")}: {record.duration} {pick("دقيقة", "minutes")}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {!readOnly && editing && (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">{editing.attendance ? pick("تعديل حضور", "Edit attendance") : pick("تسجيل حضور", "Record attendance")} {editing.student.fullName}</p>
            <Select value={status} onValueChange={(value: AttendanceStatus) => setStatus(value)} disabled={save.isPending}>
              <SelectTrigger aria-label={pick("حالة الحضور", "Attendance status")}><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(statusLabels) as AttendanceStatus[]).map((value) => <SelectItem key={value} value={value}>{statusLabels[value][isArabic ? "ar" : "en"]}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2">
              <Button disabled={save.isPending || (Boolean(editing.attendance) && status === editing.attendance?.status)} onClick={() => save.mutate({ row: editing, value: status })}>{save.isPending ? pick("جارٍ الحفظ...", "Saving...") : pick("حفظ", "Save")}</Button>
              <Button variant="outline" disabled={save.isPending} onClick={() => setEditing(null)}>{pick("إلغاء", "Cancel")}</Button>
            </div>
          </div>
        )}
        {!embedded && onClose && <DialogFooter><Button variant="outline" disabled={save.isPending} onClick={onClose}>{pick("إغلاق", "Close")}</Button></DialogFooter>}
    </>
  );

  if (embedded) {
    return <div dir={isArabic ? "rtl" : "ltr"} className="space-y-4">{content}</div>;
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !save.isPending) onClose?.(); }}>
      <DialogContent dir={isArabic ? "rtl" : "ltr"} className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto">
        {content}
      </DialogContent>
    </Dialog>
  );
}
