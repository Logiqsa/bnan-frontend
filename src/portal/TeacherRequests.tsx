import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ClipboardList,
  GraduationCap,
  Loader2,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  teacherPendingRequestsQueryKey,
  teacherPendingRequestsPageQueryKey,
  teacherRequestsApi,
  type PendingTeacherRequestsResponse,
} from "@/api/teacherRequestsApi";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const REQUESTS_PER_PAGE = 20;

const TeacherRequests = () => {
  const { language, pick } = useLanguage();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const requests = useQuery({
    queryKey: teacherPendingRequestsPageQueryKey(page, REQUESTS_PER_PAGE),
    queryFn: () => teacherRequestsApi.listPending({ page, limit: REQUESTS_PER_PAGE }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    const lastPage = requests.data?.pagination?.lastPage;
    if (typeof lastPage === "number" && lastPage > 0 && page > lastPage) {
      setPage(lastPage);
    }
  }, [page, requests.data?.pagination?.lastPage]);

  const acceptRequest = useMutation({
    mutationFn: teacherRequestsApi.accept,
    onMutate: (requestId) => setAcceptingId(requestId),
    onSuccess: async (_, requestId) => {
      let previousPageNeeded = false;
      queryClient.setQueryData<PendingTeacherRequestsResponse>(
        teacherPendingRequestsPageQueryKey(page, REQUESTS_PER_PAGE),
        (current) => {
          if (!current) return current;
          const data = current.data.filter((request) => request.requestId !== requestId);
          const pagination = current.pagination
            ? {
                ...current.pagination,
                total: Math.max(0, current.pagination.total - 1),
                lastPage: Math.ceil(
                  Math.max(0, current.pagination.total - 1) / current.pagination.perPage,
                ),
              }
            : undefined;
          previousPageNeeded = Boolean(
            pagination && page > 1 && page > Math.max(1, pagination.lastPage),
          );
          return { ...current, data, results: data.length, pagination };
        },
      );
      toast.success(pick("تم قبول الطلب بنجاح.", "Request accepted successfully."));
      await queryClient.invalidateQueries({
        queryKey: teacherPendingRequestsQueryKey,
      });
      if (previousPageNeeded) setPage((currentPage) => Math.max(1, currentPage - 1));
    },
    onError: () => {
      toast.error(
        pick(
          "تعذر قبول الطلب. حاول مرة أخرى.",
          "Unable to accept the request. Please try again.",
        ),
      );
    },
    onSettled: () => setAcceptingId(null),
  });

  const formatDate = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat(
      language === "ar" ? "ar-EG-u-ca-gregory" : "en-US",
      { dateStyle: "medium", timeStyle: "short" },
    ).format(date);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <ClipboardList className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {pick("طلباتي", "My requests")}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {pick(
                  "طلبات الطلاب المعلقة بانتظار قبولك.",
                  "Student requests waiting for your acceptance.",
                )}
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/portal/teacher">
              <ArrowRight className="me-2 h-4 w-4" />
              {pick("العودة للرئيسية", "Back to dashboard")}
            </Link>
          </Button>
        </header>

        {requests.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2" aria-label={pick("جاري تحميل الطلبات", "Loading requests")}>
            {[0, 1, 2, 3].map((item) => (
              <Card key={item}>
                <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-9 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : requests.isError ? (
          <Card>
            <CardContent className="flex min-h-64 flex-col items-center justify-center gap-4 p-6 text-center">
              <p className="text-destructive">
                {pick("تعذر تحميل الطلبات المعلقة.", "Unable to load pending requests.")}
              </p>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => void requests.refetch()}
                disabled={requests.isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${requests.isFetching ? "animate-spin" : ""}`} />
                {pick("إعادة المحاولة", "Try again")}
              </Button>
            </CardContent>
          </Card>
        ) : requests.data.data.length === 0 && requests.isFetching ? (
          <div
            className="grid gap-4 md:grid-cols-2"
            aria-label={pick("جاري تحديث الطلبات", "Updating requests")}
          >
            {[0, 1].map((item) => (
              <Card key={item}>
                <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-9 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : requests.data.data.length === 0 && requests.data.pagination?.total === 0 ? (
          <Card>
            <CardContent className="flex min-h-72 flex-col items-center justify-center p-6 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-muted text-muted-foreground">
                <Check className="h-8 w-8" />
              </span>
              <h2 className="mt-4 text-xl font-bold">
                {pick("لا توجد طلبات معلقة", "No pending requests")}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {pick(
                  "لا توجد طلبات طلاب تحتاج إلى المراجعة حاليًا.",
                  "There are currently no student requests awaiting review.",
                )}
              </p>
              <Button asChild className="mt-5">
                <Link to="/portal/teacher">
                  {pick("العودة للوحة المعلم", "Back to teacher dashboard")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : requests.data.data.length === 0 ? (
          <Card>
            <CardContent className="flex min-h-64 flex-col items-center justify-center gap-4 p-6 text-center">
              <p className="text-muted-foreground">
                {pick(
                  "تعذر تحديد طلبات هذه الصفحة حاليًا.",
                  "Requests for this page are currently unavailable.",
                )}
              </p>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => void requests.refetch()}
                disabled={requests.isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${requests.isFetching ? "animate-spin" : ""}`} />
                {pick("إعادة المحاولة", "Try again")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            <section
              className={`grid gap-4 transition-opacity md:grid-cols-2 ${requests.isFetching ? "opacity-60" : ""}`}
              aria-label={pick("الطلبات المعلقة", "Pending requests")}
              aria-busy={requests.isFetching}
            >
              {requests.data.data.map((request) => {
              const requestDate = formatDate(request.requestedAt);
              const isAccepting = acceptingId === request.requestId;
              return (
                <Card key={request.requestId} className="flex flex-col shadow-sm">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                          <UserRound className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <CardTitle className="truncate text-lg">
                            {request.studentName || pick("طالب", "Student")}
                          </CardTitle>
                          {request.subjectName && (
                            <p className="mt-1 truncate text-sm text-muted-foreground">
                              {request.subjectName}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {pick("معلق", "Pending")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-4">
                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      {request.curriculumName && (
                        <div className="rounded-xl bg-muted/50 p-3">
                          <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                            <BookOpen className="h-4 w-4" />
                            {pick("المنهج", "Curriculum")}
                          </dt>
                          <dd className="mt-1 font-semibold">{request.curriculumName}</dd>
                        </div>
                      )}
                      {request.gradeName && (
                        <div className="rounded-xl bg-muted/50 p-3">
                          <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                            <GraduationCap className="h-4 w-4" />
                            {pick("الصف", "Grade")}
                          </dt>
                          <dd className="mt-1 font-semibold">{request.gradeName}</dd>
                        </div>
                      )}
                    </dl>
                    {request.notes && (
                      <div className="rounded-xl border p-3 text-sm">
                        <p className="text-xs font-semibold text-muted-foreground">
                          {pick("ملاحظات الطالب", "Student notes")}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap break-words leading-6">
                          {request.notes}
                        </p>
                      </div>
                    )}
                    {requestDate && (
                      <p className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                        {pick("تاريخ الطلب:", "Requested:")} {requestDate}
                      </p>
                    )}
                    <Button
                      className="mt-auto w-full"
                      disabled={acceptRequest.isPending}
                      onClick={() => acceptRequest.mutate(request.requestId)}
                    >
                      {isAccepting ? (
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="me-2 h-4 w-4" />
                      )}
                      {isAccepting
                        ? pick("جاري قبول الطلب...", "Accepting request...")
                        : pick("قبول الطلب", "Accept request")}
                    </Button>
                  </CardContent>
                </Card>
              );
              })}
            </section>
            {requests.data.pagination && requests.data.pagination.lastPage > 1 && (
              <nav
                className="flex flex-col items-center justify-between gap-3 rounded-2xl border bg-card p-3 sm:flex-row"
                aria-label={pick("التنقل بين صفحات الطلبات", "Requests pagination")}
              >
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={page <= 1 || requests.isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                {pick("السابق", "Previous")}
              </Button>
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {pick("الصفحة", "Page")} {requests.data.pagination.currentPage}{" "}
                {pick("من", "of")} {requests.data.pagination.lastPage}
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={page >= requests.data.pagination.lastPage || requests.isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                {pick("التالي", "Next")}
              </Button>
              </nav>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherRequests;
