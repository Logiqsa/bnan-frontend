import { useQuery } from "@tanstack/react-query";
import { BookPlus, CalendarDays, FileText, Package, Plus, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import {
  studentSubjectRequestHistoryApi,
  studentSubjectRequestHistoryQueryKey,
  type StudentSubjectRequestHistoryItem,
} from "@/api/studentSubjectRequestHistoryApi";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useLanguage } from "@/i18n/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const statusLabels: Record<string, string> = {
  awaiting_admin_approval: "في انتظار موافقة الإدارة",
  pending: "قيد الانتظار",
  assigned: "تم إسناد الطلب",
  rejected: "مرفوض",
  cancelled: "ملغي",
};

const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  if (status === "assigned") return "default";
  if (status === "rejected") return "destructive";
  if (status === "cancelled") return "outline";
  return "secondary";
};

const formatRequestedAt = (value: string | undefined, locale: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
};

function RequestCard({ request }: { request: StudentSubjectRequestHistoryItem }) {
  const { isArabic, pick } = useLanguage();
  const requestedAt = formatRequestedAt(request.requestedAt, isArabic ? "ar-EG-u-ca-gregory" : "en-US-u-ca-gregory");
  return <Card className="min-w-0 shadow-sm">
    <CardHeader className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardTitle className="min-w-0 break-words text-lg">{request.subject?.name?.trim() || pick("المادة غير متاحة", "Subject unavailable")}</CardTitle>
        <Badge variant={statusVariant(request.status)}>{statusLabels[request.status] || pick("حالة غير معروفة", "Unknown status")}</Badge>
      </div>
      {request.curriculum?.name && <p className="break-words text-sm text-muted-foreground">{request.curriculum.name}</p>}
    </CardHeader>
    <CardContent className="space-y-4">
      <dl className="grid gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-2">
        {requestedAt && <div><dt className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="h-4 w-4" />{pick("تاريخ الطلب", "Requested at")}</dt><dd className="mt-1 text-sm font-semibold">{requestedAt}</dd></div>}
        {request.package?.name && <div><dt className="flex items-center gap-2 text-xs text-muted-foreground"><Package className="h-4 w-4" />{pick("الباقة", "Package")}</dt><dd className="mt-1 break-words text-sm font-semibold">{request.package.name}</dd></div>}
      </dl>
      <div className="rounded-xl border p-4"><p className="flex items-center gap-2 text-xs text-muted-foreground"><FileText className="h-4 w-4" />{pick("الملاحظات", "Notes")}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{request.notes?.trim() || pick("لا توجد ملاحظات", "No notes")}</p></div>
    </CardContent>
  </Card>;
}

export default function StudentSubjectRequestHistory() {
  const { pick } = useLanguage();
  const query = useQuery({
    queryKey: studentSubjectRequestHistoryQueryKey,
    queryFn: studentSubjectRequestHistoryApi.list,
    staleTime: 60_000,
    retry: 1,
  });

  return <DashboardLayout><div className="mx-auto w-full max-w-6xl space-y-6">
    <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><BookPlus className="h-5 w-5" /></span><div className="min-w-0"><h1 className="text-2xl font-bold">{pick("طلبات المواد", "Subject requests")}</h1><p className="mt-1 break-words text-sm text-muted-foreground">{pick("سجل طلبات إضافة المواد وحالتها", "Your additional-subject requests and their status")}</p></div></div><Button asChild><Link to="/portal/student/subjects/add"><Plus className="h-4 w-4" />{pick("إضافة مادة", "Add subject")}</Link></Button></div></header>

    {query.isLoading ? <div className="grid gap-4 md:grid-cols-2" aria-label={pick("جاري تحميل طلبات المواد", "Loading subject requests")}>{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-64 rounded-2xl" />)}</div>
      : query.isError ? <Card><CardContent className="flex flex-col items-center gap-4 p-10 text-center"><p className="font-semibold text-destructive">{pick("تعذر تحميل طلبات المواد", "Unable to load subject requests")}</p><Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />{pick("إعادة المحاولة", "Retry")}</Button></CardContent></Card>
      : !query.data?.length ? <Card><CardContent className="flex flex-col items-center gap-4 p-10 text-center"><BookPlus className="h-10 w-10 text-muted-foreground/50" /><p className="text-muted-foreground">{pick("لا توجد طلبات مواد حتى الآن", "No subject requests yet")}</p><Button asChild><Link to="/portal/student/subjects/add"><Plus className="h-4 w-4" />{pick("إضافة مادة", "Add subject")}</Link></Button></CardContent></Card>
      : <section className="grid gap-4 md:grid-cols-2" aria-label={pick("سجل طلبات المواد", "Subject request history")}>{query.data.map((request) => <RequestCard key={request.subjectRequestId} request={request} />)}</section>}
  </div></DashboardLayout>;
}
