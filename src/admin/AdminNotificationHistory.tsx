import { useState } from "react";
import { Bell, ChevronLeft, ChevronRight, Image as ImageIcon, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { adminNotificationHistoryApi, type AdminNotificationAudience, type AdminNotificationHistoryFilters, type AdminNotificationStatus } from "@/api/adminNotificationHistoryApi";
import { ApiError } from "@/api/client";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const audienceLabels: Record<string, string> = {
  all: "الجميع",
  student: "الطلاب",
  teacher: "المعلمين",
  parent: "أولياء الأمور",
};

const statusLabels: Record<string, string> = {
  processing: "قيد المعالجة",
  completed: "مكتمل",
  partial: "جزئي",
  failed: "فشل",
};

const dateLabel = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("ar-EG-u-ca-gregory", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const errorText = (error: unknown) => error instanceof ApiError ? error.message : "تعذر تحميل سجل الإشعارات.";
const audienceLabel = (value?: string) => audienceLabels[value || ""] || value || "غير محدد";
const statusLabel = (value?: string) => statusLabels[value || ""] || value || "غير محدد";

const HistoryState = ({ message, retry, fetching }: { message: string; retry: () => void; fetching: boolean }) => (
  <div role="alert" className="grid gap-3 p-10 text-center">
    <p className="text-destructive">{message}</p>
    <Button variant="outline" onClick={retry} disabled={fetching}>
      <RefreshCw className={fetching ? "animate-spin" : ""} />
      إعادة المحاولة
    </Button>
  </div>
);

const stat = (label: string, value: number) => (
  <div className="rounded-lg border bg-muted/20 p-2 text-center">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="mt-1 font-semibold">{value}</p>
  </div>
);

export default function AdminNotificationHistory() {
  const [filters, setFilters] = useState<AdminNotificationHistoryFilters>({ page: 1, limit: 20 });
  const query = useQuery({
    queryKey: ["admin-notification-history", filters],
    queryFn: () => adminNotificationHistoryApi.list(filters),
    retry: 1,
  });

  const change = (key: keyof AdminNotificationHistoryFilters, value?: string | number) => {
    setFilters((current) => ({
      ...current,
      [key]: value || undefined,
      page: key === "page" ? Number(value) : 1,
    }));
  };

  const resetFilters = () => setFilters({ page: 1, limit: filters.limit || 20 });
  const page = query.data?.pagination.current_page || filters.page || 1;
  const lastPage = query.data?.pagination.last_page || 1;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[96rem] space-y-5" dir="rtl">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold"><Bell className="h-7 w-7" />سجل الإشعارات</h1>
          <p className="mt-1 text-muted-foreground">عرض سجل الإشعارات العامة المرسلة من الإدارة.</p>
        </div>

        <Card>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <Label>الجمهور</Label>
              <Select value={filters.audience || "all"} onValueChange={(value) => change("audience", value === "all" ? undefined : value as AdminNotificationAudience)}>
              <SelectTrigger aria-label="الجمهور"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="student">الطلاب</SelectItem>
                  <SelectItem value="teacher">المعلمين</SelectItem>
                  <SelectItem value="parent">أولياء الأمور</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>الحالة</Label>
              <Select value={filters.status || "all"} onValueChange={(value) => change("status", value === "all" ? undefined : value as AdminNotificationStatus)}>
              <SelectTrigger aria-label="الحالة"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="processing">قيد المعالجة</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                  <SelectItem value="partial">جزئي</SelectItem>
                  <SelectItem value="failed">فشل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label htmlFor="notification-history-from">من</Label><Input id="notification-history-from" type="date" value={filters.from || ""} onChange={(event) => change("from", event.target.value || undefined)} /></div>
            <div className="space-y-1"><Label htmlFor="notification-history-to">إلى</Label><Input id="notification-history-to" type="date" value={filters.to || ""} onChange={(event) => change("to", event.target.value || undefined)} /></div>
            <div className="flex items-end"><Button type="button" variant="outline" className="w-full" onClick={resetFilters}>مسح الفلاتر</Button></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>سجل الإشعارات {query.data && <span className="text-sm font-normal text-muted-foreground">({query.data.pagination.total})</span>}</CardTitle>
            <Button aria-label="تحديث" variant="outline" size="sm" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw className={query.isFetching ? "animate-spin" : ""} /></Button>
          </CardHeader>
          <CardContent className="p-0">
            {query.isLoading ? <div role="status" aria-label="جاري التحميل" className="space-y-3 p-5">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-32" />)}</div>
              : query.isError ? <HistoryState message={errorText(query.error)} retry={() => void query.refetch()} fetching={query.isFetching} />
                : !query.data?.data.length ? <p className="p-10 text-center text-muted-foreground">{filters.audience || filters.status || filters.from || filters.to ? "لا توجد نتائج تطابق الفلاتر المحددة." : "لا توجد إشعارات مرسلة."}</p>
                  : <div className="overflow-x-auto"><Table><TableHeader><TableRow>
                    <TableHead>الإشعار</TableHead><TableHead>الجمهور</TableHead><TableHead>الحالة</TableHead><TableHead>الإحصاءات</TableHead><TableHead>تاريخ الإنشاء</TableHead><TableHead>آخر تحديث</TableHead>
                  </TableRow></TableHeader><TableBody>{query.data.data.map((notification) => <TableRow key={notification.broadcastId}>
                    <TableCell className="min-w-64"><div className="flex items-start gap-3">{notification.image ? <img src={notification.image} alt="" className="h-14 w-14 shrink-0 rounded-md border object-cover" /> : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-md border bg-muted/30"><ImageIcon className="h-5 w-5 text-muted-foreground" /></span>}<div className="min-w-0"><p className="font-semibold">{notification.title || "—"}</p><p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{notification.content || "—"}</p></div></div></TableCell>
                    <TableCell><Badge variant="outline">{audienceLabel(notification.audience)}</Badge></TableCell>
                    <TableCell><Badge variant={notification.status === "completed" ? "default" : "outline"}>{statusLabel(notification.status)}</Badge></TableCell>
                    <TableCell className="min-w-64"><div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">{stat("المستخدمون المستهدفون", notification.usersTargeted)}{stat("الإشعارات المنشأة", notification.notificationsCreated)}{stat("الرموز المستهدفة", notification.tokensTargeted)}{stat("نجاح Push", notification.pushSuccessCount)}{stat("فشل Push", notification.pushFailureCount)}</div></TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{dateLabel(notification.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{dateLabel(notification.updatedAt)}</TableCell>
                  </TableRow>)}</TableBody></Table></div>}
            {!query.isLoading && !query.isError && <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4"><Select value={String(filters.limit || 20)} onValueChange={(value) => change("limit", Number(value))}><SelectTrigger aria-label="عدد النتائج" className="w-24"><SelectValue /></SelectTrigger><SelectContent>{[20, 50, 100].map((value) => <SelectItem key={value} value={String(value)}>{value}</SelectItem>)}</SelectContent></Select><span className="text-sm">صفحة {page} من {lastPage}</span><div className="flex gap-2"><Button aria-label="الصفحة السابقة" size="icon" variant="outline" disabled={page <= 1} onClick={() => change("page", page - 1)}><ChevronRight /></Button><Button aria-label="الصفحة التالية" size="icon" variant="outline" disabled={page >= lastPage} onClick={() => change("page", page + 1)}><ChevronLeft /></Button></div></div>}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
