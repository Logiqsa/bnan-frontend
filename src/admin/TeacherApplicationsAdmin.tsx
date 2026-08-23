import { useCallback, useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ExternalLink, Eye, FileText, Loader2, Mail, Phone, X } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import {
  teacherApplicationsApi,
  type NamedEntity,
  type TeacherApplication,
  type TeacherApplicationStatus,
} from "@/api/teacherApplicationsApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const statusLabels: Record<TeacherApplicationStatus, string> = {
  pending: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
};
const graduationLabels: Record<string, string> = { excellent: "ممتاز", "very-good": "جيد جدًا", good: "جيد", pass: "مقبول" };
const computerLabels: Record<string, string> = { excellent: "ممتاز", "very-good": "جيد جدًا", good: "جيد" };
const entityName = (value?: NamedEntity | string) => typeof value === "string" ? value : value?.name || "—";
const yesNo = (value?: boolean) => value === undefined ? "—" : value ? "نعم" : "لا";
const applicantName = (item: TeacherApplication) => item.fullName || item.user?.fullName || "بدون اسم";
const applicantEmail = (item: TeacherApplication) => item.email || item.user?.email || "—";
const applicantPhone = (item: TeacherApplication) => item.phone || item.user?.phone || "—";
const fileUrl = (item: TeacherApplication, key: "cv" | "certificate" | "identityDocument") => item[`${key}Url`] || item[key];

const Detail = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="rounded-xl border bg-muted/20 p-3">
    <p className="mb-1 text-xs text-muted-foreground">{label}</p>
    <p className="break-words text-sm font-medium">{value ?? "—"}</p>
  </div>
);

const FileButton = ({ label, url }: { label: string; url?: string }) => url ? (
  <Button asChild variant="outline" className="justify-start gap-2">
    <a href={url} target="_blank" rel="noopener noreferrer"><FileText className="h-4 w-4" />{label}<ExternalLink className="mr-auto h-3.5 w-3.5" /></a>
  </Button>
) : <Button variant="outline" disabled className="justify-start gap-2"><FileText className="h-4 w-4" />{label} — غير مرفق</Button>;

export default function TeacherApplicationsAdmin() {
  const [status, setStatus] = useState<TeacherApplicationStatus>("pending");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TeacherApplication[]>([]);
  const [total, setTotal] = useState<number | undefined>();
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TeacherApplication | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await teacherApplicationsApi.list(status, page);
      setItems(result.data);
      setTotal(result.total);
      setHasNextPage(result.hasNextPage ?? result.data.length === 20);
    } catch (error) {
      toast.error((error as ApiError).message || "تعذر تحميل طلبات المعلمين");
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { load(); }, [load]);

  const openDetails = async (item: TeacherApplication) => {
    setSelected(item);
    setDetailLoading(true);
    try {
      const { data } = await teacherApplicationsApi.get(item.id);
      setSelected(data);
    } catch (error) {
      toast.error((error as ApiError).message || "تعذر تحميل تفاصيل الطلب");
    } finally {
      setDetailLoading(false);
    }
  };

  const updateStatus = async (nextStatus: "approved" | "rejected") => {
    if (!selected) return;
    const action = nextStatus === "approved" ? "قبول" : "رفض";
    if (!window.confirm(`هل أنت متأكد من ${action} طلب ${applicantName(selected)}؟`)) return;
    setBusy(true);
    try {
      await teacherApplicationsApi.updateStatus(selected.id, nextStatus);
      toast.success(nextStatus === "approved" ? "تم قبول طلب المعلم" : "تم رفض طلب المعلم");
      setSelected(null);
      await load();
    } catch (error) {
      toast.error((error as ApiError).message || `تعذر ${action} الطلب`);
    } finally {
      setBusy(false);
    }
  };

  const changeFilter = (nextStatus: TeacherApplicationStatus) => { setStatus(nextStatus); setPage(1); };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-xl font-bold font-cairo">طلبات تقديم المعلمين</h2>
        <p className="text-sm text-muted-foreground">راجع بيانات المتقدمين وملفاتهم ثم اقبل أو ارفض الطلب.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(statusLabels) as TeacherApplicationStatus[]).map((value) => (
          <Button key={value} size="sm" variant={status === value ? "default" : "outline"} onClick={() => changeFilter(value)}>{statusLabels[value]}</Button>
        ))}
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div> : items.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">لا توجد طلبات {statusLabels[status]}</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead className="text-right">المتقدم</TableHead><TableHead className="text-right">التواصل</TableHead><TableHead className="text-right">التخصص</TableHead><TableHead className="text-right">تاريخ التقديم</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>{items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell><p className="font-semibold">{applicantName(item)}</p><Badge className="mt-1" variant={item.status === "rejected" ? "destructive" : item.status === "approved" ? "default" : "outline"}>{statusLabels[item.status]}</Badge></TableCell>
                  <TableCell><p className="flex items-center gap-1" dir="ltr"><Mail className="h-3.5 w-3.5" />{applicantEmail(item)}</p><p className="mt-1 flex items-center gap-1" dir="ltr"><Phone className="h-3.5 w-3.5" />{applicantPhone(item)}</p></TableCell>
                  <TableCell>{item.specialization || "—"}</TableCell>
                  <TableCell>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("ar-SA") : "—"}</TableCell>
                  <TableCell><Button size="sm" variant="outline" className="gap-1" onClick={() => openDetails(item)}><Eye className="h-4 w-4" />عرض التفاصيل</Button></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">صفحة {page}{total !== undefined ? ` — إجمالي ${total} طلب` : ""}</span>
        <div className="flex gap-2"><Button size="sm" variant="outline" disabled={page === 1 || loading} onClick={() => setPage((value) => value - 1)}><ChevronRight className="h-4 w-4" />السابق</Button><Button size="sm" variant="outline" disabled={!hasNextPage || loading} onClick={() => setPage((value) => value + 1)}>التالي<ChevronLeft className="h-4 w-4" /></Button></div>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && !busy && setSelected(null)}>
        <DialogContent className="max-w-4xl" dir="rtl">
          <DialogHeader><DialogTitle className="font-cairo">تفاصيل طلب {selected ? applicantName(selected) : "المعلم"}</DialogTitle><DialogDescription>راجع البيانات والملفات المرفقة قبل اتخاذ القرار.</DialogDescription></DialogHeader>
          {detailLoading || !selected ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin" /></div> : <>
            <section><h3 className="mb-3 font-bold font-cairo">البيانات الشخصية والتواصل</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Detail label="الاسم" value={applicantName(selected)} /><Detail label="البريد الإلكتروني" value={applicantEmail(selected)} /><Detail label="الهاتف" value={applicantPhone(selected)} /><Detail label="واتساب" value={selected.whatsapp} /><Detail label="الجنسية" value={selected.nationality} /><Detail label="الموقع" value={[selected.city, selected.country].filter(Boolean).join("، ") || "—"} /><Detail label="البريد مفعّل" value={yesNo(selected.isVerified ?? selected.user?.isVerified)} /></div></section>
            <section><h3 className="mb-3 font-bold font-cairo">المؤهلات والخبرة</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Detail label="المؤهل" value={selected.degree} /><Detail label="التخصص" value={selected.specialization} /><Detail label="جهة التخرج" value={selected.institutionName} /><Detail label="سنة التخرج" value={selected.graduationYear} /><Detail label="التقدير" value={selected.graduationGrade ? graduationLabels[selected.graduationGrade] || selected.graduationGrade : "—"} /><Detail label="خبرة تدريس" value={yesNo(selected.hasTeachingExperience)} /><Detail label="خبرة تدريس أونلاين" value={yesNo(selected.hasOnlineTeachingExperience)} /><Detail label="الساعات المتاحة أسبوعيًا" value={selected.availableHoursPerWeek} /></div></section>
            <section><h3 className="mb-3 font-bold font-cairo">التجهيز التقني</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Detail label="استخدام الكمبيوتر" value={selected.computerSkillLevel ? computerLabels[selected.computerSkillLevel] || selected.computerSkillLevel : "—"} /><Detail label="حاسوب" value={yesNo(selected.hasLaptop)} /><Detail label="إنترنت مستقر" value={yesNo(selected.hasStableInternet)} /><Detail label="كاميرا جيدة" value={yesNo(selected.hasGoodCamera)} /><Detail label="ميكروفون" value={yesNo(selected.hasMicrophone)} /><Detail label="يمكنه تقديم حصة تجريبية" value={yesNo(selected.canProvideDemoSession)} /></div></section>
            <section><h3 className="mb-3 font-bold font-cairo">المناهج والمواد</h3><p className="mb-3 text-sm"><strong>المناهج:</strong> {selected.curriculums?.map(entityName).join("، ") || "—"}</p><div className="space-y-2">{selected.teacherAssignments?.length ? selected.teacherAssignments.map((assignment, index) => <div key={index} className="rounded-xl border p-3 text-sm"><strong>{entityName(assignment.grade)}:</strong> {assignment.subjects?.map(entityName).join("، ") || "—"}</div>) : <p className="text-sm text-muted-foreground">لا توجد صفوف أو مواد مسجلة.</p>}</div></section>
            <section><h3 className="mb-3 font-bold font-cairo">إجابات المتقدم</h3><div className="space-y-3"><Detail label="سبب الانضمام" value={selected.joiningReason} /><Detail label="طريقة التعامل مع الطالب الضعيف" value={selected.weakStudentHandling} />{selected.introVideoUrl && <Button asChild variant="outline"><a href={selected.introVideoUrl} target="_blank" rel="noopener noreferrer">فتح الفيديو التعريفي<ExternalLink className="mr-2 h-4 w-4" /></a></Button>}</div></section>
            <section><h3 className="mb-3 font-bold font-cairo">الملفات المرفقة</h3><div className="grid gap-2 sm:grid-cols-3"><FileButton label="السيرة الذاتية CV" url={fileUrl(selected, "cv")} /><FileButton label="الشهادة" url={fileUrl(selected, "certificate")} /><FileButton label="إثبات الهوية" url={fileUrl(selected, "identityDocument")} /></div></section>
          </>}
          {selected?.status === "pending" && !detailLoading && <DialogFooter className="gap-2"><Button disabled={busy} variant="destructive" onClick={() => updateStatus("rejected")}><X className="ml-2 h-4 w-4" />رفض الطلب</Button><Button disabled={busy} onClick={() => updateStatus("approved")}>{busy ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Check className="ml-2 h-4 w-4" />}قبول الطلب</Button></DialogFooter>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
