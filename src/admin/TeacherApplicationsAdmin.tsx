import { useCallback, useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Eye, Loader2, Mail, Phone, X } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import {
  teacherApplicationsApi,
  type TeacherApplication,
  type TeacherApplicationStatus,
} from "@/api/teacherApplicationsApi";
import { applicantEmail, applicantName, applicantPhone, TeacherApplicationDetails } from "./TeacherApplicationDetails";
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
                  <TableCell>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("ar-SA-u-ca-gregory") : "—"}</TableCell>
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
        <DialogContent className="max-h-[92vh] w-[95vw] max-w-6xl overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="font-cairo">تفاصيل طلب {selected ? applicantName(selected) : "المعلم"}</DialogTitle><DialogDescription>راجع البيانات والملفات المرفقة قبل اتخاذ القرار.</DialogDescription></DialogHeader>
          {detailLoading || !selected ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin" /></div> : <>
            <TeacherApplicationDetails application={selected} />
          </>}
          {selected?.status === "pending" && !detailLoading && <DialogFooter className="gap-2"><Button disabled={busy} variant="destructive" onClick={() => updateStatus("rejected")}><X className="ml-2 h-4 w-4" />رفض الطلب</Button><Button disabled={busy} onClick={() => updateStatus("approved")}>{busy ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Check className="ml-2 h-4 w-4" />}قبول الطلب</Button></DialogFooter>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
