import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/layouts/DashboardLayout";
import AdminSearchableSelect from "@/components/admin/AdminSearchableSelect";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { adminTeacherAssignmentApi, type AdminAssignmentClassroom, type AdminAssignmentSubject } from "@/api/adminTeacherAssignmentApi";
import { ApiError } from "@/api/client";

const idOf = (value: unknown) => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const item = value as { id?: unknown; _id?: unknown };
  return String(item.id ?? item._id ?? "");
};

const nameOf = (value: unknown) => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "—";
  const item = value as { name?: unknown; fullName?: unknown };
  return String(item.name ?? item.fullName ?? "—");
};

const errorMessage = (error: unknown) => error instanceof ApiError && error.message
  ? error.message
  : "تعذر تنفيذ التعيين. حاول مرة أخرى.";

export default function AdminTeacherAssignment() {
  const queryClient = useQueryClient();
  const [curriculumId, setCurriculumId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [confirming, setConfirming] = useState(false);

  const curriculums = useQuery({ queryKey: ["admin-teacher-assignment-curriculums"], queryFn: adminTeacherAssignmentApi.listCurriculums });
  const grades = useQuery({
    queryKey: ["admin-teacher-assignment-grades", curriculumId],
    queryFn: () => adminTeacherAssignmentApi.listGrades(curriculumId),
    enabled: Boolean(curriculumId),
  });
  const classrooms = useQuery({
    queryKey: ["admin-teacher-assignment-classrooms", curriculumId, gradeId],
    queryFn: () => adminTeacherAssignmentApi.listClassrooms(curriculumId, gradeId),
    enabled: Boolean(curriculumId && gradeId),
  });
  const subjects = useQuery({
    queryKey: ["admin-teacher-assignment-subjects", classroomId],
    queryFn: () => adminTeacherAssignmentApi.listSubjects(classroomId),
    enabled: Boolean(classroomId),
  });
  const teachers = useQuery({
    queryKey: ["admin-teacher-assignment-teachers"],
    queryFn: adminTeacherAssignmentApi.listTeachers,
    enabled: Boolean(classroomId),
    staleTime: 5 * 60_000,
  });

  const classroom = classrooms.data?.data.find((item) => idOf(item) === classroomId);
  const subject = subjects.data?.data.subjects.find((item) => item.subjectId === subjectId);
  const eligibleTeachers = useMemo(() => (teachers.data || []).filter((teacher) =>
    teacher.teacherStatus === "approved"
    && teacher.teacherId
    && teacher.curriculums?.some((curriculum) => idOf(curriculum) === curriculumId),
  ), [curriculumId, teachers.data]);
  const selectedTeacher = eligibleTeachers.find((teacher) => teacher.teacherId === teacherId);

  const assignment = useMutation({
    mutationFn: () => adminTeacherAssignmentApi.assign(classroomId, subjectId, teacherId),
    onSuccess: async () => {
      setConfirming(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-teacher-assignment-subjects", classroomId] });
      toast.success("تم تعيين المعلم للفصل بنجاح.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const resetFromCurriculum = (value: string) => {
    setCurriculumId(value);
    setGradeId("");
    setClassroomId("");
    setSubjectId("");
    setTeacherId("");
  };
  const resetFromGrade = (value: string) => {
    setGradeId(value);
    setClassroomId("");
    setSubjectId("");
    setTeacherId("");
  };
  const resetFromClassroom = (value: string) => {
    setClassroomId(value);
    setSubjectId("");
    setTeacherId("");
  };

  return <DashboardLayout>
    <div className="mx-auto max-w-5xl space-y-5" dir="rtl">
      <div><h1 className="text-3xl font-bold">تعيين معلم للفصل</h1><p className="mt-1 text-muted-foreground">تغيير معلم مادة محددة داخل فصل دراسي مباشرة.</p></div>
      <Card><CardHeader><CardTitle>بيانات التعيين</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
        <AdminSearchableSelect label="المنهج" value={curriculumId} placeholder="اختر المنهج" options={(curriculums.data?.data || []).map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => resetFromCurriculum(value || "")} loading={curriculums.isLoading} noOptionsLabel="لا توجد مناهج متاحة." />
        <AdminSearchableSelect label="الصف" value={gradeId} placeholder="اختر الصف" options={(grades.data?.data || []).map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => resetFromGrade(value || "")} disabled={!curriculumId} loading={grades.isLoading} noOptionsLabel="لا توجد صفوف لهذا المنهج." />
        <AdminSearchableSelect label="الفصل" value={classroomId} placeholder="اختر الفصل" options={(classrooms.data?.data || []).map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => resetFromClassroom(value || "")} disabled={!gradeId} loading={classrooms.isLoading} noOptionsLabel="لا توجد فصول لهذا المنهج والصف." />
        <AdminSearchableSelect label="المادة" value={subjectId} placeholder="اختر المادة" options={(subjects.data?.data.subjects || []).filter((item) => item.isActive).map((item) => ({ value: item.subjectId, label: item.name }))} onChange={(value) => { setSubjectId(value || ""); setTeacherId(""); }} disabled={!classroomId} loading={subjects.isLoading} noOptionsLabel="لا توجد مواد نشطة في هذا الفصل." />
        <div className="md:col-span-2"><AdminSearchableSelect label="المعلم الجديد" value={teacherId} placeholder="اختر المعلم" options={eligibleTeachers.filter((teacher) => teacher.teacherId !== subject?.teacher?.id).map((teacher) => ({ value: teacher.teacherId!, label: teacher.fullName || teacher.email || teacher.teacherId!, searchText: teacher.email }))} onChange={(value) => setTeacherId(value || "")} disabled={!subjectId} loading={teachers.isLoading} noOptionsLabel="لا يوجد معلمون مؤهلون لهذا المنهج." /></div>
      </CardContent></Card>
      {classroom && subject && <Card><CardHeader><CardTitle>ملخص التعيين</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p><strong>الفصل:</strong> {classroom.name}</p><p><strong>المنهج:</strong> {nameOf(classroom.curriculum)}</p><p><strong>الصف:</strong> {nameOf(classroom.grade)}</p><p><strong>المادة:</strong> {subject.name}</p><p><strong>المعلم الحالي:</strong> {subject.teacher?.name || "غير معين"}</p><p><strong>المعلم الجديد:</strong> {selectedTeacher?.fullName || selectedTeacher?.email || "—"}</p><Button className="mt-2" disabled={!teacherId || assignment.isPending} onClick={() => setConfirming(true)}><Check className="ml-1 h-4 w-4" />تأكيد التعيين</Button></CardContent></Card>}
      {classroom && subjects.data && !subjects.data.data.subjects.length && <Alert><AlertTriangle className="h-4 w-4" /><AlertDescription>لا توجد مواد نشطة يمكن تعيين معلم لها في هذا الفصل.</AlertDescription></Alert>}
    </div>
    <AlertDialog open={confirming} onOpenChange={(open) => !open && !assignment.isPending && setConfirming(false)}><AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>تأكيد تعيين المعلم</AlertDialogTitle><AlertDialogDescription>سيتم تعيين {selectedTeacher?.fullName || selectedTeacher?.email} لمادة {subject?.name} في فصل {classroom?.name}. هل تريد المتابعة؟</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={assignment.isPending}>إلغاء</AlertDialogCancel><AlertDialogAction disabled={assignment.isPending} onClick={(event) => { event.preventDefault(); assignment.mutate(); }}>{assignment.isPending && <Loader2 className="ml-1 h-4 w-4 animate-spin" />}تأكيد التعيين</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </DashboardLayout>;
}
