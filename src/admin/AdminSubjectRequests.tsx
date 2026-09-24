import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { adminSubjectRequestsApi, type AdminSubjectRequest, type AdminSubjectRequestFilters } from "@/api/adminSubjectRequestsApi";
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
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const statusLabels: Record<string, string> = {
  awaiting_admin_approval: "بانتظار موافقة الإدارة",
  pending: "قيد المتابعة",
  assigned: "تم إسناد المعلم",
  rejected: "مرفوض",
  cancelled: "ملغي",
};
const statuses = Object.entries(statusLabels);
const errorText = (error: unknown) => error instanceof ApiError ? error.message : "تعذر تحميل طلبات المواد.";
const dateLabel = (value?: string | null) => value ? new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const entityName = (value?: { name?: string | null } | null) => value?.name || "—";
const studentName = (request: AdminSubjectRequest) => request.student?.user?.fullName || request.student?.user?.email || request.student?.id || "—";

export default function AdminSubjectRequests({ embedded = false }: { embedded?: boolean } = {}) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<AdminSubjectRequestFilters>({ page: 1, limit: 20 });
  const [approvalTarget, setApprovalTarget] = useState<AdminSubjectRequest | null>(null);
  const [rejectionTarget, setRejectionTarget] = useState<AdminSubjectRequest | null>(null);
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("other");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const query = useQuery({ queryKey: ["admin-subject-requests", filters], queryFn: () => adminSubjectRequestsApi.list(filters), retry: 1 });
  const refresh = () => void query.refetch();
  const change = (key: keyof AdminSubjectRequestFilters, value?: string | number) => setFilters((current) => ({ ...current, [key]: value || undefined, page: key === "page" ? Number(value) : 1 }));
  const approve = useMutation({
    mutationFn: () => adminSubjectRequestsApi.approve(approvalTarget?.id || "", { receiptImage: receiptImage!, amount: amount.trim() && Number.isFinite(Number(amount)) ? Number(amount) : undefined, method: method as "cash" | "bank_transfer" | "instapay" | "wallet" | "other", referenceNumber, paymentNotes }),
    onSuccess: async () => { setApprovalTarget(null); setReceiptImage(null); setAmount(""); setReferenceNumber(""); setPaymentNotes(""); await queryClient.invalidateQueries({ queryKey: ["admin-subject-requests"] }); toast.success("تم اعتماد الطلب وتسجيل الدفع."); },
    onError: (error) => toast.error(errorText(error)),
  });
  const reject = useMutation({
    mutationFn: () => adminSubjectRequestsApi.reject(rejectionTarget?.id || ""),
    onSuccess: async () => { setRejectionTarget(null); await queryClient.invalidateQueries({ queryKey: ["admin-subject-requests"] }); toast.success("تم رفض الطلب."); },
    onError: (error) => toast.error(errorText(error)),
  });
  const page = query.data?.page || filters.page || 1;
  const limit = query.data?.limit || filters.limit || 20;
  const total = query.data?.total || 0;
  const lastPage = Math.max(1, Math.ceil(total / limit));
  const canApprove = Boolean(receiptImage) && !approve.isPending;

  const content = <div className="mx-auto max-w-7xl space-y-5" dir="rtl">
    <div><h1 className="text-3xl font-bold">طلبات المواد المصرية</h1><p className="mt-1 text-muted-foreground">مراجعة واعتماد طلبات إضافة المواد للطلاب المصريين.</p></div>
    <Card><CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3"><div className="space-y-1"><Label>الحالة</Label><Select value={filters.status || "all"} onValueChange={(value) => change("status", value === "all" ? undefined : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الحالات</SelectItem>{statuses.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div></CardContent></Card>
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>قائمة الطلبات {query.data && <span className="text-sm font-normal text-muted-foreground">({total})</span>}</CardTitle><Button aria-label="تحديث" variant="outline" size="sm" onClick={refresh} disabled={query.isFetching}><RefreshCw className={query.isFetching ? "animate-spin" : ""} /></Button></CardHeader><CardContent className="p-0">
      {query.isLoading ? <div className="space-y-3 p-5">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-12" />)}</div> : query.isError ? <div role="alert" className="grid gap-3 p-10 text-center"><p>{errorText(query.error)}</p><Button variant="outline" onClick={refresh}>إعادة المحاولة</Button></div> : !query.data?.data.length ? <p className="p-10 text-center text-muted-foreground">لا توجد طلبات.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>الطالب</TableHead><TableHead>المنهج</TableHead><TableHead>الصف</TableHead><TableHead>المادة</TableHead><TableHead>الباقة</TableHead><TableHead>الحالة</TableHead><TableHead>التاريخ</TableHead><TableHead>ملاحظات</TableHead><TableHead /></TableRow></TableHeader><TableBody>{query.data.data.map((request) => <TableRow key={request.id}><TableCell>{studentName(request)}</TableCell><TableCell>{entityName(request.curriculum)}</TableCell><TableCell>{entityName(request.grade)}</TableCell><TableCell>{entityName(request.subject)}</TableCell><TableCell>{entityName(request.package)}</TableCell><TableCell><Badge variant={request.status === "assigned" ? "default" : "outline"}>{statusLabels[request.status || ""] || request.status || "—"}</Badge></TableCell><TableCell className="whitespace-nowrap text-xs">{dateLabel(request.createdAt)}</TableCell><TableCell className="max-w-48 whitespace-pre-wrap text-sm">{request.notes || "—"}</TableCell><TableCell><div className="flex gap-2">{request.status === "awaiting_admin_approval" && <><Button size="sm" onClick={() => setApprovalTarget(request)}>اعتماد</Button><Button size="sm" variant="outline" onClick={() => setRejectionTarget(request)}>رفض</Button></>}</div></TableCell></TableRow>)}</TableBody></Table></div>}
      {!query.isLoading && !query.isError && <div className="flex items-center justify-between border-t p-4"><Select value={String(limit)} onValueChange={(value) => change("limit", Number(value))}><SelectTrigger aria-label="عدد النتائج" className="w-24"><SelectValue /></SelectTrigger><SelectContent>{[20, 50, 100].map((value) => <SelectItem key={value} value={String(value)}>{value}</SelectItem>)}</SelectContent></Select><span className="text-sm">صفحة {page} من {lastPage}</span><div className="flex gap-2"><Button aria-label="الصفحة السابقة" size="icon" variant="outline" disabled={page <= 1} onClick={() => change("page", page - 1)}><ChevronRight /></Button><Button aria-label="الصفحة التالية" size="icon" variant="outline" disabled={page >= lastPage} onClick={() => change("page", page + 1)}><ChevronLeft /></Button></div></div>}
    </CardContent></Card>
    <AlertDialog open={Boolean(approvalTarget)} onOpenChange={(open) => !open && !approve.isPending && setApprovalTarget(null)}><AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>اعتماد طلب المادة؟</AlertDialogTitle><AlertDialogDescription>سيتم تسجيل دفعة مصرية مكتملة ونقل الطلب إلى الحالة التالية.</AlertDialogDescription></AlertDialogHeader><div className="space-y-3"><div><Label htmlFor="subject-receipt">صورة الإيصال *</Label><Input id="subject-receipt" type="file" accept="image/*" onChange={(event) => setReceiptImage(event.target.files?.[0] || null)} disabled={approve.isPending} /></div><div><Label htmlFor="subject-amount">المبلغ</Label><Input id="subject-amount" type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={approve.isPending} /></div><div><Label>طريقة الدفع</Label><Select value={method} onValueChange={setMethod} disabled={approve.isPending}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[["cash", "نقدي"], ["bank_transfer", "تحويل بنكي"], ["instapay", "إنستاباي"], ["wallet", "محفظة"], ["other", "أخرى"]].map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="subject-reference">رقم المرجع</Label><Input id="subject-reference" value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} disabled={approve.isPending} /></div><div><Label htmlFor="subject-payment-notes">ملاحظات الدفع</Label><Textarea id="subject-payment-notes" value={paymentNotes} onChange={(event) => setPaymentNotes(event.target.value)} disabled={approve.isPending} /></div></div><AlertDialogFooter><AlertDialogCancel disabled={approve.isPending}>إلغاء</AlertDialogCancel><AlertDialogAction disabled={!canApprove} onClick={(event) => { event.preventDefault(); if (canApprove) approve.mutate(); }}>{approve.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}تأكيد الاعتماد</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={Boolean(rejectionTarget)} onOpenChange={(open) => !open && !reject.isPending && setRejectionTarget(null)}><AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>رفض طلب المادة؟</AlertDialogTitle><AlertDialogDescription>سيتم تغيير حالة الطلب إلى مرفوض. لا يدعم هذا endpoint إرسال سبب رفض.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={reject.isPending}>إلغاء</AlertDialogCancel><AlertDialogAction disabled={reject.isPending} onClick={(event) => { event.preventDefault(); reject.mutate(); }}>{reject.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}تأكيد الرفض</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
  return embedded ? content : <DashboardLayout>{content}</DashboardLayout>;
}
