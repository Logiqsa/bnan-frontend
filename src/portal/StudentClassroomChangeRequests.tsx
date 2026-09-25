import { useMemo, useRef, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, Loader2, RefreshCw, Repeat2 } from "lucide-react";
import {
  studentClassroomChangeRequestKeys,
  studentClassroomChangeRequestsApi,
  type StudentChangeRequestContextItem,
  type StudentClassroomChangeRequest,
  type StudentClassroomChangeRequestType,
} from "@/api/studentClassroomChangeRequestsApi";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useLanguage } from "@/i18n/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface RequestWithClassroom { request: StudentClassroomChangeRequest; classroom: { id: string; name: string } }
interface RequestTarget { item: StudentChangeRequestContextItem; type: StudentClassroomChangeRequestType }

const statusLabels: Record<string, string> = { pending: "قيد المراجعة", approved: "تمت الموافقة", rejected: "مرفوض", cancelled: "ملغي" };
const typeLabels: Record<string, string> = { change_teacher: "تغيير المعلم", cancel_subject: "إلغاء المادة" };

const requestId = (request: StudentClassroomChangeRequest) => request.id || request._id || "";
const subjectName = (request: StudentClassroomChangeRequest) => typeof request.subject === "object" ? request.subject?.name : undefined;
const teacherName = (teacher: StudentClassroomChangeRequest["currentTeacher"] | StudentClassroomChangeRequest["replacementTeacher"]) => {
  if (!teacher || typeof teacher === "string" || !teacher.user || typeof teacher.user === "string") return null;
  return teacher.user.fullName?.trim() || null;
};
const dateText = (value: string | null | undefined, locale: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
};

function HistoryCard({ item }: { item: RequestWithClassroom }) {
  const { isArabic, pick } = useLanguage();
  const { request, classroom } = item;
  const locale = isArabic ? "ar-EG-u-ca-gregory" : "en-US-u-ca-gregory";
  const currentTeacher = teacherName(request.currentTeacher);
  const replacementTeacher = teacherName(request.replacementTeacher);
  const createdAt = dateText(request.createdAt, locale);
  const reviewedAt = dateText(request.reviewedAt, locale);
  return <Card className="min-w-0 shadow-sm"><CardHeader className="space-y-3"><div className="flex flex-wrap items-start justify-between gap-3"><CardTitle className="break-words text-lg">{typeLabels[request.requestType] || pick("نوع طلب غير معروف", "Unknown request type")}</CardTitle><Badge variant={request.status === "rejected" ? "destructive" : request.status === "approved" ? "default" : "secondary"}>{statusLabels[request.status] || pick("حالة غير معروفة", "Unknown status")}</Badge></div><div className="flex flex-wrap gap-2 text-sm text-muted-foreground"><span>{classroom.name || pick("فصل", "Classroom")}</span>{subjectName(request) && <span>• {subjectName(request)}</span>}</div></CardHeader><CardContent className="space-y-4">
    <div className="rounded-xl bg-muted/40 p-4"><p className="text-xs text-muted-foreground">{pick("سبب الطلب", "Request notes")}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{request.notes}</p></div>
    {(currentTeacher || replacementTeacher) && <dl className="grid gap-3 sm:grid-cols-2">{currentTeacher && <div><dt className="text-xs text-muted-foreground">{pick("المعلم الحالي", "Current teacher")}</dt><dd className="mt-1 break-words text-sm font-semibold">{currentTeacher}</dd></div>}{replacementTeacher && <div><dt className="text-xs text-muted-foreground">{pick("المعلم البديل", "Replacement teacher")}</dt><dd className="mt-1 break-words text-sm font-semibold">{replacementTeacher}</dd></div>}</dl>}
    {request.adminNotes?.trim() && <div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">{pick("ملاحظات الإدارة", "Admin notes")}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{request.adminNotes}</p></div>}
    {request.rejectionReason?.trim() && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4"><p className="text-xs text-muted-foreground">{pick("سبب الرفض", "Rejection reason")}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{request.rejectionReason}</p></div>}
    {(createdAt || reviewedAt) && <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"><CalendarDays className="h-4 w-4" />{createdAt && <span>{pick("تاريخ الطلب", "Requested at")}: {createdAt}</span>}{reviewedAt && <span>{pick("تاريخ المراجعة", "Reviewed at")}: {reviewedAt}</span>}</div>}
  </CardContent></Card>;
}

export default function StudentClassroomChangeRequests() {
  const { pick } = useLanguage();
  const client = useQueryClient();
  const context = useQuery({ queryKey: ["student-change-request-context"], queryFn: studentClassroomChangeRequestsApi.getContext, staleTime: 60_000, retry: 1 });
  const [target, setTarget] = useState<RequestTarget | null>(null);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [submitted, setSubmitted] = useState<StudentClassroomChangeRequest | null>(null);
  const submittingRef = useRef(false);
  const classrooms = useMemo(() => {
    const values = new Map<string, { id: string; name: string }>();
    (context.data || []).forEach((item) => values.set(item.classroomId, { id: item.classroomId, name: item.classroomName }));
    return [...values.values()];
  }, [context.data]);
  const historyQueries = useQueries({ queries: classrooms.map((classroom) => ({ queryKey: studentClassroomChangeRequestKeys.classroom(classroom.id), queryFn: () => studentClassroomChangeRequestsApi.listChangeRequests(classroom.id), retry: false })) });
  const history = useMemo(() => {
    const values = new Map<string, RequestWithClassroom>();
    classrooms.forEach((classroom, index) => (historyQueries[index]?.data || []).forEach((request, requestIndex) => {
      const key = requestId(request) || `${classroom.id}-${requestIndex}`;
      if (!values.has(key)) values.set(key, { request, classroom });
    }));
    return [...values.values()];
  }, [classrooms, historyQueries]);
  const historyLoading = historyQueries.some((query) => query.isLoading);
  const failed = historyQueries.map((query, index) => ({ query, classroom: classrooms[index] })).filter((item) => item.query.isError);
  const createRequest = useMutation({
    mutationFn: async () => {
      if (!target) throw new Error("REQUEST_TARGET_REQUIRED");
      return studentClassroomChangeRequestsApi.createChangeRequest({ classroomId: target.item.classroomId, classroomSubjectId: target.item.classroomSubjectId, requestType: target.type, notes: notes.trim() });
    },
    onSuccess: async (request) => {
      setSubmitted(request);
      setTarget(null);
      setNotes("");
      setFormError("");
      await client.invalidateQueries({ queryKey: studentClassroomChangeRequestKeys.all });
    },
    onError: (error: Error & { message?: string }) => setFormError(error.message || pick("تعذر إرسال الطلب.", "Unable to submit the request.")),
    onSettled: () => { submittingRef.current = false; },
  });
  const openRequest = (item: StudentChangeRequestContextItem, type: StudentClassroomChangeRequestType) => {
    setSubmitted(null); setFormError(""); setNotes(""); setTarget({ item, type });
  };
  const submitRequest = () => {
    if (submittingRef.current || createRequest.isPending) return;
    if (notes.trim().length < 5) { setFormError(pick("اكتب سببًا لا يقل عن 5 أحرف.", "Enter at least 5 characters explaining the request.")); return; }
    if (notes.trim().length > 2000) { setFormError(pick("السبب لا يمكن أن يتجاوز 2000 حرف.", "The request notes cannot exceed 2000 characters.")); return; }
    submittingRef.current = true;
    createRequest.mutate();
  };

  return <DashboardLayout><div className="mx-auto w-full max-w-6xl space-y-6">
    <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6"><div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Repeat2 className="h-5 w-5" /></span><div className="min-w-0"><h1 className="break-words text-2xl font-bold">{pick("طلبات تغيير المعلم وإلغاء المواد", "Teacher change and subject cancellation requests")}</h1><p className="mt-1 break-words text-sm text-muted-foreground">{pick("يمكنك إرسال طلب، وسيقوم فريق الإدارة بمراجعته.", "You can submit a request for the administration team to review.")}</p></div></div></header>

    <Card><CardHeader><CardTitle>{pick("المواد المؤهلة للطلب", "Eligible classroom subjects")}</CardTitle></CardHeader><CardContent className="space-y-4">
      {context.isLoading ? <div className="grid gap-4 md:grid-cols-2" aria-label={pick("جاري تحميل المواد والفصول", "Loading eligible subjects")}>{[0, 1].map((item) => <Skeleton key={item} className="h-44 rounded-2xl" />)}</div>
        : context.isError ? <div className="flex flex-col items-center gap-4 p-8 text-center"><p className="text-destructive">{pick("تعذر تحميل المواد المؤهلة للطلبات.", "Unable to load eligible request subjects.")}</p><Button variant="outline" onClick={() => void context.refetch()} disabled={context.isFetching}><RefreshCw className="h-4 w-4" />{pick("إعادة المحاولة", "Retry")}</Button></div>
        : !context.data?.length ? <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><p>{pick("لا توجد مواد نشطة مؤهلة حاليًا لتقديم طلب.", "There are no active classroom subjects eligible for a request right now.")}</p></div>
        : <div className="grid gap-4 md:grid-cols-2">{context.data.map((item) => <Card key={item.classroomSubjectId} className="border-muted shadow-none"><CardContent className="space-y-4 p-4"><div><h3 className="font-semibold">{item.classroomName}</h3><p className="text-sm text-muted-foreground">{item.subject.name}</p><p className="mt-1 text-sm">{pick("المعلم الحالي", "Current teacher")}: {item.teacher?.name || pick("غير محدد", "Not assigned")}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => openRequest(item, "change_teacher")}>{pick("طلب تغيير المعلم", "Request teacher change")}</Button><Button size="sm" variant="outline" onClick={() => openRequest(item, "cancel_subject")}>{pick("طلب إلغاء المادة", "Request subject cancellation")}</Button></div></CardContent></Card>)}</div>}
      {submitted && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{pick(`تم إرسال ${typeLabels[submitted.requestType] || "الطلب"} وحالته الآن: ${statusLabels[submitted.status] || submitted.status}.`, `The request was submitted with status: ${statusLabels[submitted.status] || submitted.status}.`)}</p>}
    </CardContent></Card>

    <section className="space-y-4" aria-labelledby="student-change-request-history"><h2 id="student-change-request-history" className="text-xl font-bold">{pick("الطلبات السابقة", "Existing requests")}</h2>
      {historyLoading && history.length === 0 ? <div className="grid gap-4 md:grid-cols-2" aria-label={pick("جاري تحميل الطلبات", "Loading requests")}>{[0, 1].map((item) => <Skeleton key={item} className="h-64 rounded-2xl" />)}</div>
        : failed.length > 0 && history.length === 0 ? <div className="space-y-3">{failed.map(({ query, classroom }) => <div key={classroom.id} role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"><span>{pick(`تعذر تحميل طلبات فصل ${classroom.name}`, `Unable to load requests for ${classroom.name}`)}</span><Button size="sm" variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw className="h-4 w-4" />{pick("إعادة المحاولة", "Retry")}</Button></div>)}</div>
        : history.length === 0 ? <Card><CardContent className="p-10 text-center text-muted-foreground">{pick("لا توجد طلبات تغيير أو إلغاء حتى الآن.", "No change or cancellation requests yet.")}</CardContent></Card>
        : <>{failed.map(({ query, classroom }) => <div key={classroom.id} role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"><span>{pick(`تعذر تحميل طلبات فصل ${classroom.name}`, `Unable to load requests for ${classroom.name}`)}</span><Button size="sm" variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw className="h-4 w-4" />{pick("إعادة المحاولة", "Retry")}</Button></div>)}<div className="grid gap-4 md:grid-cols-2">{history.map((item) => <HistoryCard key={requestId(item.request) || `${item.classroom.id}-${item.request.createdAt}`} item={item} />)}</div></>}
    </section>

    <Dialog open={Boolean(target)} onOpenChange={(open) => { if (!open && !createRequest.isPending) { setTarget(null); setFormError(""); } }}><DialogContent dir="rtl"><DialogHeader><DialogTitle>{target ? typeLabels[target.type] : ""}</DialogTitle><DialogDescription>{target && `${target.item.classroomName} — ${target.item.subject.name}`}</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="change-request-notes">{pick("سبب الطلب", "Request notes")}</Label><Input id="change-request-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} placeholder={pick("اكتب سبب الطلب", "Explain the request")} /></div>{formError && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{formError}</p>}<p className="text-xs text-muted-foreground">{pick("هذا طلب مراجعة فقط، ولن يتم تغيير المعلم أو إلغاء المادة قبل مراجعة الإدارة.", "This is a review request. No teacher or subject will change before Admin review.")}</p><DialogFooter><Button variant="outline" onClick={() => setTarget(null)} disabled={createRequest.isPending}>{pick("إلغاء", "Cancel")}</Button><Button onClick={submitRequest} disabled={createRequest.isPending}>{createRequest.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{pick("إرسال الطلب", "Submit request")}</Button></DialogFooter></DialogContent></Dialog>
  </div></DashboardLayout>;
}
