import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Eye, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { listAdminParents, type AdminParentFilters } from "@/api/adminParentsApi";
import DashboardLayout from "@/layouts/DashboardLayout";
import { dateLabel, display, entityName } from "@/admin/adminFinancialUi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const statusLabels: Record<string, string> = { active: "نشط", inactive: "غير نشط", blocked: "محظور" };

export default function AdminParents() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<AdminParentFilters>({ page: 1, limit: 20 });
  const query = useQuery({ queryKey: ["admin-parents", filters], queryFn: () => listAdminParents(filters), retry: 1 });
  const change = (key: keyof AdminParentFilters, value?: string | number) => setFilters((current) => ({ ...current, [key]: value || undefined, page: key === "page" ? Number(value) : 1 }));
  const page = query.data?.pagination.current_page || filters.page || 1;
  const lastPage = query.data?.pagination.last_page || 1;

  return <DashboardLayout><div className="mx-auto max-w-7xl space-y-5" dir="rtl">
    <div><h1 className="text-3xl font-bold">أولياء الأمور</h1><p className="mt-1 text-muted-foreground">عرض بيانات أولياء الأمور للمتابعة الإدارية فقط.</p></div>
    <Card><CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"><div className="space-y-1"><Label htmlFor="admin-parent-search">بحث</Label><Input id="admin-parent-search" placeholder="الاسم أو البريد الإلكتروني" value={filters.search || ""} onChange={(event) => change("search", event.target.value)} /></div><div className="space-y-1"><Label>حالة الحساب</Label><Select value={filters.status || "all"} onValueChange={(value) => change("status", value === "all" ? undefined : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الحالات</SelectItem>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label htmlFor="admin-parent-phone">الهاتف</Label><Input id="admin-parent-phone" value={filters.phone || ""} onChange={(event) => change("phone", event.target.value)} /></div><div className="space-y-1"><Label htmlFor="admin-parent-whatsapp">واتساب</Label><Input id="admin-parent-whatsapp" value={filters.whatsappNumber || ""} onChange={(event) => change("whatsappNumber", event.target.value)} /></div><div className="space-y-1"><Label htmlFor="admin-parent-from">من</Label><Input id="admin-parent-from" type="date" value={filters.from || ""} onChange={(event) => change("from", event.target.value)} /></div><div className="space-y-1"><Label htmlFor="admin-parent-to">إلى</Label><Input id="admin-parent-to" type="date" value={filters.to || ""} onChange={(event) => change("to", event.target.value)} /></div></CardContent></Card>
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>قائمة أولياء الأمور {query.data && <span className="text-sm font-normal text-muted-foreground">({query.data.pagination.total})</span>}</CardTitle><Button aria-label="تحديث" variant="outline" size="sm" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw className={query.isFetching ? "animate-spin" : ""} /></Button></CardHeader><CardContent className="p-0">{query.isLoading ? <div className="space-y-3 p-5">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-12" />)}</div> : query.isError ? <div role="alert" className="grid gap-3 p-10 text-center"><p>تعذر تحميل قائمة أولياء الأمور.</p><Button variant="outline" onClick={() => void query.refetch()}>إعادة المحاولة</Button></div> : !query.data?.data.length ? <p className="p-10 text-center text-muted-foreground">لا يوجد أولياء أمور.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>ولي الأمر</TableHead><TableHead>البريد الإلكتروني</TableHead><TableHead>الهاتف</TableHead><TableHead>واتساب</TableHead><TableHead>الحالة</TableHead><TableHead>عدد الطلاب</TableHead><TableHead>تاريخ الإنشاء</TableHead><TableHead /></TableRow></TableHeader><TableBody>{query.data.data.map((parent) => <TableRow key={parent.id}><TableCell>{entityName(parent.user)}</TableCell><TableCell>{display(parent.user?.email)}</TableCell><TableCell>{display(parent.phone)}</TableCell><TableCell>{display(parent.whatsappNumber)}</TableCell><TableCell>{statusLabels[parent.user?.status || ""] || display(parent.user?.status)}</TableCell><TableCell>{parent.children?.length || 0}</TableCell><TableCell className="whitespace-nowrap text-xs">{dateLabel(parent.createdAt)}</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => navigate(`/admin/parents/${parent.id}`)}><Eye className="ml-1 h-4 w-4" />التفاصيل</Button></TableCell></TableRow>)}</TableBody></Table></div>} {!query.isLoading && !query.isError && <div className="flex items-center justify-between border-t p-4"><span className="text-sm">صفحة {page} من {lastPage} — {query.data?.pagination.total || 0} نتيجة</span><div className="flex gap-2"><Button aria-label="الصفحة السابقة" size="icon" variant="outline" disabled={page <= 1} onClick={() => change("page", page - 1)}><ChevronRight /></Button><Button aria-label="الصفحة التالية" size="icon" variant="outline" disabled={page >= lastPage} onClick={() => change("page", page + 1)}><ChevronLeft /></Button></div></div>}</CardContent></Card>
  </div></DashboardLayout>;
}
