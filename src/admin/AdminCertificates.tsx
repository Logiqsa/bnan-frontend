import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Award, ChevronLeft, ChevronRight, Eye, FileText, Image, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { adminCertificatesApi, type AdminCertificateFilters, type AdminCertificateListItem } from "@/api/adminCertificatesApi";
import DashboardLayout from "@/layouts/DashboardLayout";
import { ApiError } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const typeLabels: Record<string, string> = {
  student_monthly: "تقييم شهري للطالب",
  ideal_teacher: "المعلم المثالي",
  ideal_supervisor: "المشرف المثالي",
  general_teacher: "شهادة معلم",
};
const statusLabels: Record<string, string> = { draft: "مسودة", issued: "صادرة", revoked: "ملغاة" };
const errorText = (error: unknown) => error instanceof ApiError ? error.message : "تعذر تحميل الشهادات.";
const typeLabel = (value?: string) => typeLabels[value || ""] || value || "غير محدد";
const statusLabel = (value?: string) => statusLabels[value || ""] || value || "غير محدد";
const dateLabel = (value?: string | null) => value ? new Intl.DateTimeFormat("ar-EG-u-ca-gregory", { dateStyle: "medium" }).format(new Date(value)) : "—";
const periodLabel = (period?: { month: number; year: number }) => period ? `${period.month}/${period.year}` : "—";
const recipientLabel = (certificate: AdminCertificateListItem) => certificate.recipientName || certificate.studentName || certificate.teacherName || certificate.supervisorName || "—";

const CertificateState = ({ message, retry, fetching }: { message: string; retry: () => void; fetching: boolean }) => (
  <div role="alert" className="grid gap-3 p-10 text-center"><p className="text-destructive">{message}</p><Button variant="outline" onClick={retry} disabled={fetching}><RefreshCw className={fetching ? "animate-spin" : ""} />إعادة المحاولة</Button></div>
);

export default function AdminCertificates() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<AdminCertificateFilters>({ page: 1, limit: 20 });
  const query = useQuery({ queryKey: ["admin-certificates", filters], queryFn: () => adminCertificatesApi.list(filters), retry: 1 });
  const [issuing, setIssuing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const change = (key: keyof AdminCertificateFilters, value?: string | number) => setFilters((current) => ({ ...current, [key]: value || undefined, page: key === "page" ? Number(value) : 1 }));
  const page = query.data?.pagination.current_page || filters.page || 1;
  const lastPage = query.data?.pagination.last_page || 1;

  const issueDrafts = async () => {
    if (!confirm("سيتم إصدار كل المسودات المؤهلة. هل تريد المتابعة؟")) return;
    setIssuing(true);
    try {
      const result = await adminCertificatesApi.issueDrafts();
      toast.success(`تم إصدار ${result.data.certificates.length} شهادة`);
      await queryClient.invalidateQueries({ queryKey: ["admin-certificates"] });
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setIssuing(false);
    }
  };

  const deleteDraft = async (certificate: AdminCertificateListItem) => {
    if (certificate.status !== "draft" || !confirm("حذف هذه المسودة؟")) return;
    setDeletingId(certificate.id);
    try {
      await adminCertificatesApi.deleteDraft(certificate.id);
      toast.success("تم حذف المسودة");
      await queryClient.invalidateQueries({ queryKey: ["admin-certificates"] });
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setDeletingId(null);
    }
  };

  return <DashboardLayout><div className="mx-auto max-w-7xl space-y-5" dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="flex items-center gap-2 text-3xl font-bold"><Award className="h-7 w-7" />الشهادات</h1><p className="mt-1 text-muted-foreground">إدارة شهادات الطلاب والمعلمين والمشرفين.</p></div><Button onClick={() => void issueDrafts()} disabled={issuing}><FileText className="ml-1 h-4 w-4" />{issuing ? "جاري الإصدار..." : "إصدار المسودات"}</Button></div>
    <Card><CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"><div className="space-y-1"><Label>نوع الشهادة</Label><Select value={filters.certificateType || "all"} onValueChange={(value) => change("certificateType", value === "all" ? undefined : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الأنواع</SelectItem>{Object.entries(typeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>الحالة</Label><Select value={filters.status || "all"} onValueChange={(value) => change("status", value === "all" ? undefined : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الحالات</SelectItem>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label htmlFor="certificate-month">الشهر</Label><Input id="certificate-month" type="number" min="1" max="12" value={filters.month || ""} onChange={(event) => change("month", event.target.value ? Number(event.target.value) : undefined)} /></div><div className="space-y-1"><Label htmlFor="certificate-year">السنة</Label><Input id="certificate-year" type="number" min="2000" max="2100" value={filters.year || ""} onChange={(event) => change("year", event.target.value ? Number(event.target.value) : undefined)} /></div></CardContent></Card>
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>قائمة الشهادات {query.data && <span className="text-sm font-normal text-muted-foreground">({query.data.pagination.total})</span>}</CardTitle><Button aria-label="تحديث" variant="outline" size="sm" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw className={query.isFetching ? "animate-spin" : ""} /></Button></CardHeader><CardContent className="p-0">{query.isLoading ? <div className="space-y-3 p-5">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-12" />)}</div> : query.isError ? <CertificateState message={errorText(query.error)} retry={() => void query.refetch()} fetching={query.isFetching} /> : !query.data?.data.length ? <p className="p-10 text-center text-muted-foreground">لا توجد شهادات.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>المستفيد</TableHead><TableHead>نوع الشهادة</TableHead><TableHead>الحالة</TableHead><TableHead>الفترة</TableHead><TableHead>تاريخ الإصدار</TableHead><TableHead>تاريخ الإنشاء</TableHead><TableHead /></TableRow></TableHeader><TableBody>{query.data.data.map((certificate) => <TableRow key={certificate.id}><TableCell>{recipientLabel(certificate)}</TableCell><TableCell>{typeLabel(certificate.certificateType)}</TableCell><TableCell><Badge variant={certificate.status === "issued" ? "default" : "outline"}>{statusLabel(certificate.status)}</Badge></TableCell><TableCell>{periodLabel(certificate.period)}</TableCell><TableCell className="whitespace-nowrap text-xs">{dateLabel(certificate.issuedAt)}</TableCell><TableCell className="whitespace-nowrap text-xs">{dateLabel(certificate.createdAt)}</TableCell><TableCell><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => navigate(`/admin/certificates/${certificate.id}`)}><Eye className="ml-1 h-4 w-4" />التفاصيل</Button>{certificate.status === "draft" && <Button size="icon" variant="destructive" aria-label="حذف المسودة" title="حذف المسودة" disabled={deletingId === certificate.id} onClick={() => void deleteDraft(certificate)}>{deletingId === certificate.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button>}</div></TableCell></TableRow>)}</TableBody></Table></div>}{!query.isLoading && !query.isError && <div className="flex items-center justify-between border-t p-4"><Select value={String(filters.limit || 20)} onValueChange={(value) => change("limit", Number(value))}><SelectTrigger aria-label="عدد النتائج" className="w-24"><SelectValue /></SelectTrigger><SelectContent>{[20, 50, 100].map((value) => <SelectItem key={value} value={String(value)}>{value}</SelectItem>)}</SelectContent></Select><span className="text-sm">صفحة {page} من {lastPage}</span><div className="flex gap-2"><Button aria-label="الصفحة السابقة" size="icon" variant="outline" disabled={page <= 1} onClick={() => change("page", page - 1)}><ChevronRight /></Button><Button aria-label="الصفحة التالية" size="icon" variant="outline" disabled={page >= lastPage} onClick={() => change("page", page + 1)}><ChevronLeft /></Button></div></div>}</CardContent></Card>
  </div></DashboardLayout>;
}

export function AdminCertificateDetail() {
  const navigate = useNavigate();
  const { certificateId = "" } = useParams();
  const query = useQuery({ queryKey: ["admin-certificate", certificateId], queryFn: () => adminCertificatesApi.getById(certificateId), enabled: Boolean(certificateId), retry: false });
  const certificate = query.data;
  const field = (label: string, value: unknown) => <div className="rounded-lg border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-medium">{value == null || value === "" ? "—" : String(value)}</p></div>;
  const recipientName = typeof certificate?.recipient === "string" ? certificate.recipient : certificate?.recipient?.fullName || certificate?.recipientSnapshot?.fullName;
  return <DashboardLayout><div className="mx-auto max-w-5xl space-y-5" dir="rtl"><Button variant="ghost" onClick={() => navigate("/admin/certificates")}><ArrowLeft className="ml-1 h-4 w-4" />العودة للشهادات</Button><Card><CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" />تفاصيل الشهادة</CardTitle></CardHeader><CardContent>{query.isLoading ? <div className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-14" />)}</div> : query.isError ? <CertificateState message={errorText(query.error)} retry={() => void query.refetch()} fetching={query.isFetching} /> : certificate ? <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2">{field("رقم الشهادة", certificate.certificateNumber)}{field("المستفيد", recipientName)}{field("نوع الشهادة", typeLabel(certificate.certificateType))}{field("الحالة", statusLabel(certificate.status))}{field("الفترة", periodLabel(certificate.period))}{field("الموقّع", certificate.signerName)}{field("تاريخ الإنشاء", dateLabel(certificate.createdAt))}{field("تاريخ الإصدار", dateLabel(certificate.issuedAt))}{field("المنهج", certificate.academicContext?.curriculumNameSnapshot)}{field("الصف", certificate.academicContext?.gradeNameSnapshot)}{field("الفصل", certificate.academicContext?.classroomNameSnapshot)}{field("المجموع", certificate.totalScore != null && certificate.totalMaxScore != null ? `${certificate.totalScore} / ${certificate.totalMaxScore}` : undefined)}{field("النسبة", certificate.percentage != null ? `${certificate.percentage}%` : undefined)}</div>{certificate.previewImagePath && <div><h2 className="mb-2 font-semibold">المعاينة</h2><img src={certificate.previewImagePath} alt="معاينة الشهادة" className="max-h-[32rem] w-full rounded-xl border bg-muted object-contain" /></div>}{certificate.pdfPath && <Button asChild><a href={certificate.pdfPath} target="_blank" rel="noreferrer"><FileText className="ml-1 h-4 w-4" />فتح ملف الشهادة</a></Button>}{!!certificate.subjects?.length && <div><h2 className="mb-2 font-semibold">المواد والدرجات</h2><div className="space-y-2">{certificate.subjects.map((subject, index) => <div key={`${subject.subject || "subject"}-${index}`} className="flex justify-between gap-3 rounded-lg border p-3"><span>{subject.nameSnapshot || "—"}</span><span>{subject.score ?? "—"} / {subject.maxScore ?? "—"}</span></div>)}</div></div>}</div> : <p className="py-10 text-center">الشهادة غير موجودة.</p>}</CardContent></Card></div></DashboardLayout>;
}
