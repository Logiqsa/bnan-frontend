import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, Loader2, RefreshCw, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { adminClassroomChangeRequestsApi, type AdminClassroomChangeRequest, type AdminClassroomChangeRequestType } from "@/api/adminClassroomChangeRequestsApi";
import { adminUsersApi, type AdminUser } from "@/api/adminUsersApi";
import DashboardLayout from "@/layouts/DashboardLayout";
import { ApiError } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const typeLabels: Record<AdminClassroomChangeRequestType, string> = {
  change_teacher: "طلب تغيير مدرس",
  teacher_leave: "اعتذار المدرس / طلب استبدال مدرس",
  cancel_subject: "طلب إلغاء المادة",
};
const statusLabels = { pending: "قيد المراجعة", approved: "تمت الموافقة", rejected: "مرفوض", cancelled: "ملغي" };
const requesterRoleLabels: Record<string, string> = { student: "طالب", teacher: "معلم", parent: "ولي أمر" };

const idOf = (value: unknown) => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const item = value as Record<string, unknown>;
  return String(item.id || item._id || "");
};
const nameOf = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "—";
  const item = value as Record<string, unknown>;
  if (typeof item.fullName === "string") return item.fullName;
  if (typeof item.name === "string") return item.name;
  return nameOf(item.user);
};
const dateOf = (value?: string | null) => value ? new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const errorMessage = (error: unknown, fallback: string) => error instanceof ApiError && error.message ? error.message : fallback;

export default function ClassroomChangeRequestsAdmin() {
  const client = useQueryClient();
  const [type, setType] = useState<AdminClassroomChangeRequestType | "all">("all");
  const [status, setStatus] = useState<"all" | "pending" | "approved" | "rejected" | "cancelled">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replacementTeacherId, setReplacementTeacherId] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [confirming, setConfirming] = useState<"approve" | "reject" | null>(null);

  const list = useQuery({
    queryKey: ["admin-classroom-change-requests", type, status],
    queryFn: () => adminClassroomChangeRequestsApi.list({ requestType: type === "all" ? undefined : type, status: status === "all" ? undefined : status }),
    retry: 1,
  });
  const detail = useQuery({
    queryKey: ["admin-classroom-change-request", selectedId],
    queryFn: () => adminClassroomChangeRequestsApi.get(selectedId!),
    enabled: Boolean(selectedId),
    retry: 1,
  });
  const teachers = useQuery({
    queryKey: ["admin-approved-teachers-for-change-requests"],
    queryFn: () => adminUsersApi.listAll("teacher"),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const request = detail.data?.data;
  const approvedTeachers = useMemo(() => (teachers.data || []).filter((teacher) => !teacher.teacherStatus || teacher.teacherStatus === "approved"), [teachers.data]);
  const terminal = request && request.status !== "pending";
  const needsReplacement = request?.requestType === "change_teacher" || request?.requestType === "teacher_leave";

  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ["admin-classroom-change-requests"] });
    if (selectedId) await client.invalidateQueries({ queryKey: ["admin-classroom-change-request", selectedId] });
  };
  const approve = useMutation({
    mutationFn: () => adminClassroomChangeRequestsApi.approve(request!.id!, {
      ...(needsReplacement ? { replacementTeacherId } : {}),
      ...(adminNotes.trim() ? { adminNotes: adminNotes.trim() } : {}),
    }),
    onSuccess: async () => { setConfirming(null); await refresh(); toast.success("تمت الموافقة على الطلب."); },
    onError: (error) => toast.error(errorMessage(error, "تعذر اعتماد الطلب.")),
  });
  const reject = useMutation({
    mutationFn: () => adminClassroomChangeRequestsApi.reject(request!.id!, rejectionReason.trim() ? { rejectionReason: rejectionReason.trim() } : {}),
    onSuccess: async () => { setConfirming(null); setRejecting(false); await refresh(); toast.success("تم رفض الطلب."); },
    onError: (error) => toast.error(errorMessage(error, "تعذر رفض الطلب.")),
  });

  const open = (item: AdminClassroomChangeRequest) => {
    setSelectedId(item.id || null);
    setReplacementTeacherId(""); setAdminNotes(""); setRejectionReason(""); setRejecting(false); setConfirming(null);
  };
  const close = () => { if (!approve.isPending && !reject.isPending) setSelectedId(null); };
  const canApprove = Boolean(request && !terminal && (!needsReplacement || replacementTeacherId) && !approve.isPending && !reject.isPending);

  return <DashboardLayout>
    <div className="mx-auto max-w-7xl space-y-5" dir="rtl">
      <div><h1 className="text-3xl font-bold">طلبات تغيير المعلم والمواد</h1><p className="mt-1 text-muted-foreground">مراجعة طلبات تغيير المعلم، اعتذار المعلم، وإلغاء المادة.</p></div>
      <Card><CardContent className="grid gap-3 p-4 sm:grid-cols-2"><div className="space-y-1"><Label>نوع الطلب</Label><Select value={type} onValueChange={(value) => setType(value as typeof type)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الطلبات</SelectItem>{Object.entries(typeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>الحالة</Label><Select value={status} onValueChange={(value) => setStatus(value as typeof status)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الحالات</SelectItem>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div></CardContent></Card>
      <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>قائمة الطلبات</CardTitle><Button variant="outline" size="sm" onClick={() => void list.refetch()} disabled={list.isFetching}><RefreshCw className={list.isFetching ? "animate-spin" : ""} /></Button></CardHeader><CardContent className="p-0">{list.isLoading ? <div className="space-y-3 p-5">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-12" />)}</div> : list.isError ? <div role="alert" className="grid gap-3 p-10 text-center"><p>تعذر تحميل الطلبات.</p><Button variant="outline" onClick={() => void list.refetch()}>إعادة المحاولة</Button></div> : !list.data?.data.length ? <p className="p-10 text-center text-muted-foreground">لا توجد طلبات.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>النوع</TableHead><TableHead>الطالب</TableHead><TableHead>المادة</TableHead><TableHead>الفصل</TableHead><TableHead>المعلم الحالي</TableHead><TableHead>الحالة</TableHead><TableHead>تاريخ الطلب</TableHead><TableHead /></TableRow></TableHeader><TableBody>{list.data.data.map((item) => <TableRow key={item.id}><TableCell>{typeLabels[item.requestType]}</TableCell><TableCell>{nameOf(item.student)}</TableCell><TableCell>{nameOf(item.subject)}</TableCell><TableCell>{nameOf(item.classroom)}</TableCell><TableCell>{nameOf(item.currentTeacher)}</TableCell><TableCell><Badge variant={item.status === "approved" ? "default" : item.status === "pending" ? "secondary" : "outline"}>{statusLabels[item.status]}</Badge></TableCell><TableCell className="whitespace-nowrap text-xs">{dateOf(item.createdAt)}</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => open(item)}><Eye className="ml-1 h-4 w-4" />التفاصيل</Button></TableCell></TableRow>)}</TableBody></Table></div>}</CardContent></Card>
    </div>
    <Dialog open={Boolean(selectedId)} onOpenChange={(openState) => !openState && close()}><DialogContent className="max-h-[90vh] overflow-y-auto" dir="rtl"><DialogHeader><DialogTitle>تفاصيل الطلب</DialogTitle><DialogDescription>{detail.isLoading ? "جاري تحميل التفاصيل..." : request ? typeLabels[request.requestType] : ""}</DialogDescription></DialogHeader>{detail.isLoading ? <Loader2 className="mx-auto my-10 animate-spin" /> : detail.isError ? <div role="alert" className="grid gap-3 py-8 text-center"><p>تعذر تحميل تفاصيل الطلب.</p><Button variant="outline" onClick={() => void detail.refetch()}>إعادة المحاولة</Button></div> : request ? <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2">{[["الطالب", nameOf(request.student)], ["المادة", nameOf(request.subject)], ["الفصل", nameOf(request.classroom)], ["المعلم الحالي", nameOf(request.currentTeacher)], ["مقدم الطلب", nameOf(request.requester)], ["دور مقدم الطلب", request.requesterRole || "—"], ["الحالة", statusLabels[request.status]], ["تاريخ الطلب", dateOf(request.createdAt)], ["تاريخ المراجعة", dateOf(request.reviewedAt)], ["راجع الطلب", nameOf(request.reviewedBy)], ["المعلم البديل", nameOf(request.replacementTeacher)]].map(([label, value]) => <div key={label} className="rounded-lg border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>)}</div><div className="space-y-2"><Label>ملاحظات مقدم الطلب</Label><div className="whitespace-pre-wrap rounded-lg border p-3 text-sm">{request.notes || "—"}</div></div>{request.adminNotes && <div className="space-y-2"><Label>ملاحظات الإدارة</Label><div className="whitespace-pre-wrap rounded-lg border p-3 text-sm">{request.adminNotes}</div></div>}{request.rejectionReason && <div className="space-y-2"><Label>سبب الرفض</Label><div className="whitespace-pre-wrap rounded-lg border p-3 text-sm">{request.rejectionReason}</div></div>}{!terminal && <div className="space-y-4 border-t pt-4">{needsReplacement && <div className="space-y-2"><Label>المعلم البديل</Label><Select value={replacementTeacherId} onValueChange={setReplacementTeacherId}><SelectTrigger><SelectValue placeholder="اختر المعلم البديل" /></SelectTrigger><SelectContent>{approvedTeachers.filter((teacher) => teacher.id !== idOf(request.currentTeacher)).map((teacher: AdminUser) => <SelectItem key={teacher.id} value={teacher.id}>{teacher.fullName || teacher.email || teacher.id}</SelectItem>)}</SelectContent></Select>{!teachers.data && teachers.isLoading && <p className="text-xs text-muted-foreground">جاري تحميل المعلمين...</p>}</div>}<div className="space-y-2"><Label>ملاحظات الإدارة (اختياري)</Label><Textarea value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} maxLength={2000} /></div>{rejecting && <div className="space-y-2"><Label>سبب الرفض (اختياري)</Label><Textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} maxLength={2000} /></div>}<div className="flex flex-wrap gap-2"><Button disabled={!canApprove} onClick={() => setConfirming("approve")}><Check className="ml-1 h-4 w-4" />موافقة</Button>{!rejecting ? <Button variant="outline" disabled={approve.isPending || reject.isPending} onClick={() => setRejecting(true)}><X className="ml-1 h-4 w-4" />رفض</Button> : <Button variant="outline" disabled={approve.isPending || reject.isPending} onClick={() => setConfirming("reject")}><X className="ml-1 h-4 w-4" />تأكيد الرفض</Button>}</div></div>}</div> : null}<DialogFooter><Button variant="outline" onClick={close}>إغلاق</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(confirming)} onOpenChange={(openState) => !openState && setConfirming(null)}><DialogContent dir="rtl"><DialogHeader><DialogTitle>{confirming === "approve" ? "تأكيد الموافقة" : "تأكيد الرفض"}</DialogTitle><DialogDescription>{confirming === "approve" ? (request?.requestType === "cancel_subject" ? "سيتم إلغاء المادة حسب سلوك النظام الحالي." : "سيتم تعيين المعلم البديل واعتماد الطلب.") : "هل تريد رفض هذا الطلب؟"}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setConfirming(null)} disabled={approve.isPending || reject.isPending}>إلغاء</Button><Button onClick={() => confirming === "approve" ? approve.mutate() : reject.mutate()} disabled={approve.isPending || reject.isPending}>{(approve.isPending || reject.isPending) && <Loader2 className="ml-1 h-4 w-4 animate-spin" />}{confirming === "approve" ? "تأكيد الموافقة" : "تأكيد الرفض"}</Button></DialogFooter></DialogContent></Dialog>
  </DashboardLayout>;
}
