import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, ClipboardList, ExternalLink, FileUp, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  studentAssignmentsApi,
  studentAssignmentsQueryKey,
  type StudentAssignment,
} from "@/api/studentAssignmentsApi";
import { useLanguage } from "@/i18n/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const formatDate = (value: string | null, locale: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
};

function AssignmentCard({ assignment }: { assignment: StudentAssignment }) {
  const { isArabic, pick } = useLanguage();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const submittingRef = useRef(false);
  const mutation = useMutation({
    mutationFn: (selectedFile: File) => studentAssignmentsApi.submitAssignment(assignment.id, selectedFile),
    onSuccess: async () => {
      setFile(null);
      toast.success(pick("تم تسليم الواجب بنجاح", "Assignment submitted successfully"));
      await queryClient.invalidateQueries({ queryKey: studentAssignmentsQueryKey });
    },
    onError: (error: Error) => toast.error(error.message || pick("تعذر تسليم الواجب", "Unable to submit assignment")),
    onSettled: () => { submittingRef.current = false; },
  });
  const locale = isArabic ? "ar-EG-u-ca-gregory" : "en-US-u-ca-gregory";
  const dueDate = formatDate(assignment.dueDate, locale);
  const submittedAt = formatDate(assignment.submittedAt, locale);
  const reviewed = assignment.status === "reviewed";

  return (
    <Card className="min-w-0 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {assignment.subject?.name && <p className="mb-1 break-words text-sm font-medium text-primary">{assignment.subject.name}</p>}
            <CardTitle className="break-words text-lg">{assignment.title}</CardTitle>
          </div>
          <Badge variant={reviewed ? "default" : assignment.submitted ? "secondary" : "outline"}>
            {reviewed ? pick("تمت المراجعة", "Reviewed") : assignment.submitted ? pick("تم التسليم", "Submitted") : pick("لم يتم التسليم", "Not submitted")}
          </Badge>
        </div>
        {assignment.description && <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{assignment.description}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-2">
          {dueDate && <div className="min-w-0"><dt className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="h-4 w-4" />{pick("موعد التسليم", "Due date")}</dt><dd className="mt-1 break-words font-semibold">{dueDate}</dd></div>}
          <div><dt className="text-xs text-muted-foreground">{pick("الدرجة الكاملة", "Total points")}</dt><dd className="mt-1 font-semibold tabular-nums">{assignment.totalPoints}</dd></div>
          {submittedAt && <div><dt className="text-xs text-muted-foreground">{pick("تاريخ التسليم", "Submitted at")}</dt><dd className="mt-1 break-words font-semibold">{submittedAt}</dd></div>}
          {reviewed && assignment.grade !== null && <div><dt className="text-xs text-muted-foreground">{pick("الدرجة", "Grade")}</dt><dd className="mt-1 font-semibold tabular-nums">{assignment.grade}</dd></div>}
        </dl>

        <div className="flex flex-wrap gap-2">
          {assignment.attachment && <Button asChild variant="outline" size="sm"><a href={assignment.attachment} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />{pick("فتح مرفق الواجب", "Open assignment attachment")}</a></Button>}
        </div>

        {!assignment.submitted && (
          <div className="space-y-3 rounded-xl border border-dashed p-4">
            <label className="block text-sm font-semibold" htmlFor={`assignment-file-${assignment.id}`}>{pick("ملف الإجابة", "Answer file")}</label>
            <Input
              id={`assignment-file-${assignment.id}`}
              type="file"
              disabled={mutation.isPending}
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            {file && <p className="break-all text-xs text-muted-foreground">{file.name}</p>}
            <Button
              type="button"
              disabled={!file || mutation.isPending}
              onClick={() => {
                if (!file || mutation.isPending || submittingRef.current) return;
                submittingRef.current = true;
                mutation.mutate(file);
              }}
            >
              {mutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              {mutation.isPending ? pick("جاري التسليم...", "Submitting...") : pick("تسليم الواجب", "Submit assignment")}
            </Button>
          </div>
        )}

        {assignment.submitted && <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{pick("تم استلام تسليمك، ولا تتوفر إعادة التسليم.", "Your submission was received; resubmission is unavailable.")}</p>}
      </CardContent>
    </Card>
  );
}

export default function StudentAssignments() {
  const { pick } = useLanguage();
  const query = useQuery({
    queryKey: studentAssignmentsQueryKey,
    queryFn: studentAssignmentsApi.list,
    staleTime: 30_000,
    retry: 1,
    refetchOnMount: "always",
  });

  return <DashboardLayout><div className="mx-auto w-full max-w-6xl space-y-6">
    <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6"><div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><ClipboardList className="h-5 w-5" /></span><div className="min-w-0"><h1 className="text-2xl font-bold">{pick("الواجبات", "Assignments")}</h1><p className="mt-1 break-words text-sm text-muted-foreground">{pick("كل الواجبات المتاحة لك في مكان واحد.", "All assignments available to you in one place.")}</p></div></div></header>

    {query.isLoading ? <div className="grid gap-4 md:grid-cols-2" aria-label={pick("جاري تحميل الواجبات", "Loading assignments")}>{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-80 rounded-2xl" />)}</div>
      : query.isError ? <Card><CardContent className="flex flex-col items-center gap-4 p-10 text-center"><p className="text-destructive">{pick("تعذر تحميل الواجبات", "Unable to load assignments")}</p><Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />{pick("إعادة المحاولة", "Retry")}</Button></CardContent></Card>
      : !query.data?.length ? <Card><CardContent className="p-12 text-center text-muted-foreground"><ClipboardList className="mx-auto mb-3 h-9 w-9 opacity-50" /><p>{pick("لا توجد واجبات متاحة حاليًا", "No assignments are currently available")}</p></CardContent></Card>
      : <section className="grid gap-4 md:grid-cols-2" aria-label={pick("قائمة الواجبات", "Assignment list")}>{query.data.map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} />)}</section>}
  </div></DashboardLayout>;
}
