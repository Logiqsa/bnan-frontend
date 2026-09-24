import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Eye, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { listAdminStudents, type AdminStudentFilters } from "@/api/adminStudentsApi";
import { listAdminParents } from "@/api/adminParentsApi";
import { catalogApi, type CurriculumOption, type GradeOption } from "@/api/catalogApi";
import DashboardLayout from "@/layouts/DashboardLayout";
import { ApiError } from "@/api/client";
import { dateLabel, display, entityName } from "@/admin/adminFinancialUi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AdminSearchableSelect from "@/components/admin/AdminSearchableSelect";

const statusLabels: Record<string, string> = { active: "نشط", inactive: "غير نشط", blocked: "محظور" };
const registrationStatusLabels: Record<string, string> = { pending: "قيد المراجعة", approved: "معتمد", rejected: "مرفوض" };
const registrationTypeLabels: Record<string, string> = { academic: "أكاديمي", course_only: "دورات فقط" };
const tableRegistrationTypeLabel = (registrationType?: string | null) => registrationType === "course_only" ? "دورات فقط" : "طالب أكاديمي";
const errorText = () => "تعذر تحميل قائمة الطلاب.";

type FilterOption = { id: string; name: string };

function SearchableFilter({
  label,
  placeholder,
  value,
  options,
  onChange,
}: {
  label: string;
  placeholder: string;
  value?: string;
  options: FilterOption[];
  onChange: (value?: string) => void;
}) {
  return <AdminSearchableSelect label={label} placeholder={placeholder} value={value} options={options.map((option) => ({ value: option.id, label: option.name }))} allLabel="الكل" onChange={onChange} />;
}

export default function AdminStudents() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<AdminStudentFilters>({ page: 1, limit: 20 });
  const query = useQuery({ queryKey: ["admin-students", filters], queryFn: () => listAdminStudents(filters), retry: 1 });
  const parentsQuery = useQuery({ queryKey: ["admin-student-filter-parents"], queryFn: async () => (await listAdminParents({ page: 1, limit: 100 })).data, staleTime: 5 * 60_000, retry: 1 });
  const curriculumsQuery = useQuery({ queryKey: ["admin-student-filter-curriculums"], queryFn: async () => (await catalogApi.curriculums()).data, staleTime: 5 * 60_000, retry: 1 });
  const gradesQuery = useQuery({ queryKey: ["admin-student-filter-grades", filters.curriculum || "all"], queryFn: async () => (filters.curriculum ? (await catalogApi.grades(filters.curriculum)).data : (await catalogApi.allGrades()).data), staleTime: 5 * 60_000, retry: 1 });
  const change = (key: keyof AdminStudentFilters, value?: string | number) => setFilters((current) => ({ ...current, [key]: value || undefined, page: key === "page" ? Number(value) : 1 }));
  const changeCurriculum = (value?: string) => setFilters((current) => ({ ...current, curriculum: value, grade: undefined, page: 1 }));
  const page = query.data?.pagination.current_page || filters.page || 1;
  const lastPage = query.data?.pagination.last_page || 1;
  const parentOptions: FilterOption[] = (parentsQuery.data || []).flatMap((parent) => parent.id && parent.user?.fullName ? [{ id: parent.id, name: parent.user.fullName }] : []);
  const curriculumOptions: CurriculumOption[] = curriculumsQuery.data || [];
  const gradeOptions: GradeOption[] = gradesQuery.data || [];

  return <DashboardLayout><div className="mx-auto max-w-7xl space-y-5" dir="rtl">
    <div><h1 className="text-3xl font-bold">الطلاب</h1><p className="mt-1 text-muted-foreground">عرض بيانات الطلاب للمتابعة الإدارية فقط.</p></div>
    <Card><CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"><div className="space-y-1"><Label htmlFor="admin-student-search">بحث</Label><Input id="admin-student-search" placeholder="الاسم أو البريد الإلكتروني" value={filters.search || ""} onChange={(event) => change("search", event.target.value)} /></div><div className="space-y-1"><Label>حالة الحساب</Label><Select value={filters.status || "all"} onValueChange={(value) => change("status", value === "all" ? undefined : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الحالات</SelectItem>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><SearchableFilter label="ولي الأمر" placeholder="اختر ولي الأمر" value={filters.parent} options={parentOptions} onChange={(value) => change("parent", value)} /><div className="space-y-1"><Label>نوع التسجيل</Label><Select value={filters.registrationType || "all"} onValueChange={(value) => change("registrationType", value === "all" ? undefined : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الأنواع</SelectItem>{Object.entries(registrationTypeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>حالة التسجيل</Label><Select value={filters.registrationStatus || "all"} onValueChange={(value) => change("registrationStatus", value === "all" ? undefined : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الحالات</SelectItem>{Object.entries(registrationStatusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><SearchableFilter label="المنهج" placeholder="اختر المنهج" value={filters.curriculum} options={curriculumOptions.map((option) => ({ id: option.id, name: option.name }))} onChange={changeCurriculum} /><SearchableFilter label="الصف" placeholder={filters.curriculum ? "اختر الصف" : "اختر المنهج أولًا"} value={filters.grade} options={gradeOptions.map((option) => ({ id: option.id, name: option.name }))} onChange={(value) => change("grade", value)} /><div className="space-y-1"><Label htmlFor="admin-student-from">من</Label><Input id="admin-student-from" type="date" value={filters.from || ""} onChange={(event) => change("from", event.target.value)} /></div><div className="space-y-1"><Label htmlFor="admin-student-to">إلى</Label><Input id="admin-student-to" type="date" value={filters.to || ""} onChange={(event) => change("to", event.target.value)} /></div></CardContent></Card>
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>قائمة الطلاب {query.data && <span className="text-sm font-normal text-muted-foreground">({query.data.pagination.total})</span>}</CardTitle><Button aria-label="تحديث" variant="outline" size="sm" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw className={query.isFetching ? "animate-spin" : ""} /></Button></CardHeader><CardContent className="p-0">{query.isLoading ? <div className="space-y-3 p-5">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-12" />)}</div> : query.isError ? <div role="alert" className="grid gap-3 p-10 text-center"><p>{errorText()}</p><Button variant="outline" onClick={() => void query.refetch()}>إعادة المحاولة</Button></div> : !query.data?.data.length ? <p className="p-10 text-center text-muted-foreground">لا يوجد طلاب.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>الطالب</TableHead><TableHead>البريد الإلكتروني</TableHead><TableHead>ولي الأمر</TableHead><TableHead>المنهج</TableHead><TableHead>الصف</TableHead><TableHead>النوع</TableHead><TableHead>حالة التسجيل</TableHead><TableHead>الحالة</TableHead><TableHead>تاريخ الإنشاء</TableHead><TableHead /></TableRow></TableHeader><TableBody>{query.data.data.map((student) => <TableRow key={student.id}><TableCell>{entityName(student.user)}</TableCell><TableCell>{display(student.user?.email)}</TableCell><TableCell>{entityName(student.parent?.user)}</TableCell><TableCell>{entityName(student.curriculum)}</TableCell><TableCell>{entityName(student.grade)}</TableCell><TableCell>{tableRegistrationTypeLabel(student.registrationType)}</TableCell><TableCell><Badge variant={student.registrationStatus === "approved" ? "default" : "outline"}>{registrationStatusLabels[student.registrationStatus || ""] || display(student.registrationStatus)}</Badge></TableCell><TableCell>{statusLabels[student.user?.status || ""] || display(student.user?.status)}</TableCell><TableCell className="whitespace-nowrap text-xs">{dateLabel(student.createdAt)}</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => navigate(`/admin/students/${student.id}`)}><Eye className="ml-1 h-4 w-4" />التفاصيل</Button></TableCell></TableRow>)}</TableBody></Table></div>} {!query.isLoading && !query.isError && <div className="flex items-center justify-between border-t p-4"><span className="text-sm">صفحة {page} من {lastPage} — {query.data?.pagination.total || 0} نتيجة</span><div className="flex gap-2"><Button aria-label="الصفحة السابقة" size="icon" variant="outline" disabled={page <= 1} onClick={() => change("page", page - 1)}><ChevronRight /></Button><Button aria-label="الصفحة التالية" size="icon" variant="outline" disabled={page >= lastPage} onClick={() => change("page", page + 1)}><ChevronLeft /></Button></div></div>}</CardContent></Card>
  </div></DashboardLayout>;
}
