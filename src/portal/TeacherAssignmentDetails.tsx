import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/layouts/DashboardLayout";
import { teacherClassroomAssignmentsApi } from "@/api/teacherClassroomAssignmentsApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import AssignmentAttachmentPreview from "@/components/AssignmentAttachmentPreview";

const nameOf = (value: unknown) => typeof value === "string" ? value : value && typeof value === "object" ? (value as { name?: string }).name || "" : "";

export default function TeacherAssignmentDetails() {
  const { assignmentId = "" } = useParams<{ assignmentId: string }>();
  const [searchParams] = useSearchParams();
  const requestedSubmissionId = searchParams.get("submissionId");
  const queryClient = useQueryClient();
  const [scores, setScores] = useState<Record<string, string>>({});
  const assignment = useQuery({
    queryKey: ["teacher-assignment", assignmentId],
    queryFn: async () => (await teacherClassroomAssignmentsApi.get(assignmentId)).data,
    enabled: Boolean(assignmentId),
    retry: 1,
  });
  const submissions = useQuery({
    queryKey: ["teacher-assignment-submissions", assignmentId],
    queryFn: async () => (await teacherClassroomAssignmentsApi.listSubmissions(assignmentId)).data,
    enabled: Boolean(assignmentId),
    retry: 1,
  });
  const review = useMutation({
    mutationFn: ({ submissionId, score }: { submissionId: string; score: number }) => teacherClassroomAssignmentsApi.reviewSubmission(assignmentId, submissionId, score),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["teacher-assignment-submissions", assignmentId] });
      toast.success("تم حفظ درجة الطالب");
    },
    onError: (error: Error) => toast.error(error.message || "تعذر تصحيح التسليم"),
  });

  useEffect(() => {
    if (!requestedSubmissionId || !submissions.data) return;
    document.getElementById(`teacher-submission-${requestedSubmissionId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [requestedSubmissionId, submissions.data]);

  if (assignment.isPending) return <DashboardLayout><div className="mx-auto max-w-5xl p-6"><Skeleton className="h-72 rounded-2xl" /></div></DashboardLayout>;
  if (assignment.isError || !assignment.data) return <DashboardLayout><div className="mx-auto max-w-5xl p-6"><Card><CardContent className="p-10 text-center text-destructive">تعذر تحميل تفاصيل الواجب.</CardContent></Card></div></DashboardLayout>;

  const item = assignment.data;
  return <DashboardLayout><div className="mx-auto w-full max-w-5xl space-y-6" dir="rtl">
    <header className="rounded-2xl border bg-card p-5 shadow-sm">
      <Button asChild variant="outline"><Link to={item.classroomSubject?.classroom?.id || item.classroomSubject?.classroom?._id ? `/portal/teacher/classrooms/${item.classroomSubject.classroom.id || item.classroomSubject.classroom._id}` : "/portal/teacher/classrooms"}><ArrowRight className="me-2 h-4 w-4" />العودة للفصل</Link></Button>
      <div className="mt-5 flex items-start justify-between gap-4"><div><p className="text-sm text-primary">{nameOf(item.subject) || nameOf(item.classroomSubject?.subject)}</p><h1 className="mt-1 text-2xl font-bold">{item.title}</h1><p className="mt-2 whitespace-pre-wrap text-muted-foreground">{item.description || "لا يوجد وصف للواجب."}</p></div><FileText className="h-8 w-8 text-primary" /></div>
      <div className="mt-4 flex flex-wrap gap-2"><Badge variant="outline">الدرجة الكاملة: {item.totalPoints}</Badge><Badge variant="outline">موعد التسليم: {new Date(item.dueDate).toLocaleString("ar-EG")}</Badge>{item.attachment && <AssignmentAttachmentPreview url={item.attachment} label="معاينة مرفق الواجب" />}</div>
    </header>
    <Card><CardHeader><CardTitle>تسليمات الطلاب</CardTitle></CardHeader><CardContent>
      {submissions.isPending ? <Skeleton className="h-40 rounded-xl" /> : submissions.isError ? <div className="flex items-center justify-between"><p className="text-destructive">تعذر تحميل التسليمات.</p><Button variant="outline" onClick={() => void submissions.refetch()} disabled={submissions.isFetching}><RefreshCw className="me-2 h-4 w-4" />إعادة المحاولة</Button></div> : !submissions.data?.data.length ? <p className="text-muted-foreground">لا يوجد طلاب مرتبطون بهذا الواجب.</p> : <div className="space-y-3">{submissions.data.data.map((student) => {
        const existingScore = student.submission?.score;
        const score = scores[student.studentId] ?? (existingScore == null ? "" : String(existingScore));
        return <div id={`teacher-submission-${student.submission?.id || student.studentId}`} key={student.studentId} className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${student.submission?.id === requestedSubmissionId ? "ring-2 ring-primary" : ""}`}><div><p className="font-semibold">{student.fullName}</p><p className="text-sm text-muted-foreground">{student.hasSubmitted ? student.submissionStatus === "reviewed" ? `تمت المراجعة: ${existingScore ?? "—"}` : "تم التسليم" : "لم يتم التسليم"}</p>{student.submission?.attachment && <AssignmentAttachmentPreview url={student.submission.attachment} label="معاينة إجابة الطالب" />}</div>{student.submission?.id && <div className="flex items-center gap-2"><Input className="w-24" type="number" min="0" max={item.totalPoints} value={score} aria-label={`درجة ${student.fullName}`} onChange={(event) => setScores((current) => ({ ...current, [student.studentId]: event.target.value }))} /><Button disabled={review.isPending || score === ""} onClick={() => review.mutate({ submissionId: student.submission!.id, score: Number(score) })}>حفظ الدرجة</Button></div>}</div>;
      })}</div>}
    </CardContent></Card>
  </div></DashboardLayout>;
}
