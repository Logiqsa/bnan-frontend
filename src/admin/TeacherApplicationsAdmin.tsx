import { useCallback, useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, Eye, KeyRound, Loader2, Mail, MessageCircle, Phone, RefreshCw, Search, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import { adminUsersApi, type RegenerateVerificationCodeResponse } from "@/api/adminUsersApi";
import {
  teacherApplicationsApi,
  type TeacherApplication,
  type TeacherApplicationStatus,
} from "@/api/teacherApplicationsApi";
import { applicantEmail, applicantName, applicantPhone, applicantWhatsapp, TeacherApplicationDetails } from "./TeacherApplicationDetails";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const statusLabels: Record<TeacherApplicationStatus, string> = {
  pending: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
};

const phoneHref = (value: string) => value === "—" ? "" : value.replace(/[^\d+]/g, "");
const isApplicationUnverified = (item: TeacherApplication) =>
  item.isVerified === false ||
  item.emailVerified === false ||
  item.verified === false ||
  item.user?.isVerified === false ||
  item.user?.emailVerified === false ||
  item.user?.verified === false;
const whatsappHref = (value: string) => {
  if (value === "—") return "";
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("01")) digits = `20${digits.slice(1)}`;
  else if (digits.startsWith("05")) digits = `966${digits.slice(1)}`;
  return digits ? `https://wa.me/${digits}` : "";
};

export default function TeacherApplicationsAdmin() {
  const [status, setStatus] = useState<TeacherApplicationStatus>("pending");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pageSizeInput, setPageSizeInput] = useState("20");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<TeacherApplication[]>([]);
  const [total, setTotal] = useState<number | undefined>();
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TeacherApplication | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<"approved" | "rejected" | null>(null);
  const [decisionTarget, setDecisionTarget] = useState<TeacherApplication | null>(null);
  const [verificationCodeTarget, setVerificationCodeTarget] = useState<TeacherApplication | null>(null);
  const [verificationCodeResult, setVerificationCodeResult] = useState<RegenerateVerificationCodeResponse | null>(null);
  const [verificationCodeLoading, setVerificationCodeLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [applications, unverifiedTeachers] = await Promise.all([
        teacherApplicationsApi.listAllByStatus(status),
        adminUsersApi.listAll("teacher", false),
      ]);
      const unverifiedById = new Map(unverifiedTeachers.map((user) => [user.id, user]));
      const unverifiedByEmail = new Map(
        unverifiedTeachers
          .filter((user) => Boolean(user.email?.trim()))
          .map((user) => [user.email!.trim().toLowerCase(), user]),
      );
      const normalizedQuery = searchQuery.trim().toLowerCase();
      const matchingApplications = normalizedQuery ? applications.filter((item) => [
        applicantName(item),
        applicantEmail(item),
        applicantPhone(item),
        applicantWhatsapp(item),
        item.specialization,
      ].some((value) => value?.toLowerCase().includes(normalizedQuery))) : applications;
      const pageApplications = matchingApplications.slice((page - 1) * pageSize, page * pageSize);
      setItems(pageApplications.map((item) => {
        const email = (item.email || item.user?.email)?.trim().toLowerCase();
        const unverifiedUser = (item.user?.id && unverifiedById.get(item.user.id)) ||
          (email ? unverifiedByEmail.get(email) : undefined);
        return unverifiedUser ? {
          ...item,
          isVerified: false,
          user: { ...item.user, ...unverifiedUser, isVerified: false },
        } : item;
      }));
      setTotal(matchingApplications.length);
      setHasNextPage(page * pageSize < matchingApplications.length);
    } catch (error) {
      toast.error((error as ApiError).message || "تعذر تحميل طلبات المعلمين");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const openDetails = async (item: TeacherApplication) => {
    setSelected(item);
    setDetailLoading(true);
    try {
      const { data } = await teacherApplicationsApi.get(item.id);
      const mergedApplication: TeacherApplication = {
        ...item,
        ...data,
        isVerified: data.isVerified ?? item.isVerified,
        user: item.user || data.user ? { ...item.user, ...data.user } : undefined,
      };
      const userId = mergedApplication.user?.id;
      if (userId) {
        try {
          const userResult = await adminUsersApi.get(userId);
          setSelected({
            ...mergedApplication,
            isVerified: mergedApplication.isVerified ?? userResult.data.isVerified,
            user: { ...mergedApplication.user, ...userResult.data },
          });
        } catch {
          setSelected(mergedApplication);
        }
      } else {
        const user = mergedApplication.email ? await adminUsersApi.findTeacherByEmail(mergedApplication.email) : null;
        setSelected(user ? {
          ...mergedApplication,
          isVerified: mergedApplication.isVerified ?? user.isVerified,
          user: { ...mergedApplication.user, ...user },
        } : mergedApplication);
      }
    } catch (error) {
      toast.error((error as ApiError).message || "تعذر تحميل تفاصيل الطلب");
    } finally {
      setDetailLoading(false);
    }
  };

  const updateStatus = async (nextStatus: "approved" | "rejected") => {
    const target = decisionTarget || selected;
    if (!target) return;
    const action = nextStatus === "approved" ? "قبول" : "رفض";
    setBusy(true);
    try {
      await teacherApplicationsApi.updateStatus(target.id, nextStatus);
      toast.success(nextStatus === "approved" ? "تم قبول طلب المعلم وتوثيق حسابه" : "تم رفض طلب المعلم");
      setPendingDecision(null);
      setDecisionTarget(null);
      setSelected(null);
      await load();
    } catch (error) {
      toast.error((error as ApiError).message || `تعذر ${action} الطلب`);
    } finally {
      setBusy(false);
    }
  };

  const regenerateVerificationCode = async () => {
    if (!verificationCodeTarget || verificationCodeLoading) return;
    setVerificationCodeLoading(true);
    try {
      const user = verificationCodeTarget.user?.id
        ? verificationCodeTarget.user
        : await adminUsersApi.findTeacherByEmail(applicantEmail(verificationCodeTarget));
      if (!user?.id) throw new Error("TEACHER_USER_NOT_FOUND");
      const result = await adminUsersApi.regenerateVerificationCode(
        user.id,
        "Teacher requested a new verification code",
      );
      setVerificationCodeTarget(null);
      setVerificationCodeResult(result);
      toast.success("تم تغيير رمز التحقق بنجاح");
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(
        apiError.code === "ACCOUNT_ALREADY_VERIFIED"
          ? "تم التحقق من هذا الحساب بالفعل"
          : apiError.message || "تعذر تغيير رمز التحقق",
      );
    } finally {
      setVerificationCodeLoading(false);
    }
  };

  const copyVerificationCode = async () => {
    if (!verificationCodeResult) return;
    try {
      await navigator.clipboard.writeText(verificationCodeResult.code);
      toast.success("تم نسخ رمز التحقق");
    } catch {
      toast.error("تعذر نسخ رمز التحقق");
    }
  };

  const changeFilter = (nextStatus: TeacherApplicationStatus) => { setStatus(nextStatus); setPage(1); };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-bold font-cairo">طلبات تقديم المعلمين</h2>
        <p className="text-sm text-muted-foreground">راجع بيانات المتقدمين وملفاتهم ثم اقبل أو ارفض الطلب.</p></div>
        <Button type="button" variant="outline" className="gap-2" disabled={loading} onClick={() => void load()}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />تحديث</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(statusLabels) as TeacherApplicationStatus[]).map((value) => (
          <Button key={value} size="sm" variant={status === value ? "default" : "outline"} onClick={() => changeFilter(value)}>{statusLabels[value]}</Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="pr-9"
            placeholder="ابحث بالاسم أو بيانات التواصل"
            aria-label="البحث في طلبات التقديم"
          />
        </div>
        <div className="flex items-center gap-2">
        <span className="whitespace-nowrap text-sm text-muted-foreground">عدد الصفوف</span>
        <Input
          type="number"
          min={1}
          max={100}
          value={pageSizeInput}
          disabled={loading}
          aria-label="عدد الصفوف في الصفحة"
          className="h-9 w-20 text-center"
          onChange={(event) => setPageSizeInput(event.target.value)}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading || !Number.isInteger(Number(pageSizeInput)) || Number(pageSizeInput) < 1 || Number(pageSizeInput) > 100 || Number(pageSizeInput) === pageSize}
          onClick={() => { setPageSize(Number(pageSizeInput)); setPage(1); }}
        >
          تطبيق
        </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div> : items.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">لا توجد طلبات {statusLabels[status]}</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead className="text-center">المتقدم</TableHead><TableHead className="text-center">التواصل</TableHead><TableHead className="text-center">التخصص</TableHead><TableHead className="text-center">تاريخ التقديم</TableHead><TableHead className="text-center">الإجراء</TableHead></TableRow></TableHeader>
              <TableBody>{items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-center">
                    <p className="font-semibold">{applicantName(item)}</p>
                    <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
                      <Badge variant={item.status === "rejected" ? "destructive" : item.status === "approved" ? "default" : "outline"}>{statusLabels[item.status]}</Badge>
                      {isApplicationUnverified(item) && <Badge variant="secondary">لم يتم التحقق</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-64 text-left">
                    <div className="flex w-full flex-col items-start space-y-1.5" dir="ltr">
                      {applicantEmail(item) !== "—" && <a href={`mailto:${applicantEmail(item)}`} className="flex items-center gap-1 text-primary hover:underline"><Mail className="h-3.5 w-3.5" />{applicantEmail(item)}</a>}
                      {phoneHref(applicantPhone(item)) && <a href={`tel:${phoneHref(applicantPhone(item))}`} className="flex items-center gap-1 text-primary hover:underline"><Phone className="h-3.5 w-3.5" />{applicantPhone(item)}</a>}
                      {whatsappHref(applicantWhatsapp(item)) && <a href={whatsappHref(applicantWhatsapp(item))} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-emerald-700 hover:underline"><MessageCircle className="h-3.5 w-3.5" />{applicantWhatsapp(item)}</a>}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{item.specialization || "—"}</TableCell>
                  <TableCell className="text-center">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("ar-SA-u-ca-gregory") : "—"}</TableCell>
                  <TableCell className="text-center"><div className="flex flex-wrap items-center justify-center gap-2">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => openDetails(item)}><Eye className="h-4 w-4" />عرض</Button>
                    {isApplicationUnverified(item) && <Button size="sm" variant="outline" className="gap-1" onClick={() => setVerificationCodeTarget(item)}><KeyRound className="h-4 w-4" />تغيير رمز التحقق</Button>}
                    {item.status === "pending" && <><Button size="sm" className="gap-1" onClick={() => { setDecisionTarget(item); setPendingDecision("approved"); }}><Check className="h-4 w-4" />قبول</Button><Button size="sm" variant="destructive" className="gap-1" onClick={() => { setDecisionTarget(item); setPendingDecision("rejected"); }}><X className="h-4 w-4" />رفض</Button></>}
                  </div></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">صفحة {page}{total !== undefined ? ` — إجمالي ${total} طلب` : ""}</span>
        <div className="flex gap-2"><Button size="sm" variant="outline" disabled={page === 1 || loading} onClick={() => setPage((value) => value - 1)}><ChevronRight className="h-4 w-4" />السابق</Button><Button size="sm" variant="outline" disabled={!hasNextPage || loading} onClick={() => setPage((value) => value + 1)}>التالي<ChevronLeft className="h-4 w-4" /></Button></div>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && !busy && setSelected(null)}>
        <DialogContent className="max-h-[92vh] w-[95vw] max-w-6xl overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="font-cairo">تفاصيل طلب {selected ? applicantName(selected) : "المعلم"}</DialogTitle><DialogDescription>راجع البيانات والملفات المرفقة قبل اتخاذ القرار.</DialogDescription></DialogHeader>
          {detailLoading || !selected ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin" /></div> : <>
            <TeacherApplicationDetails application={selected} />
          </>}
          {!detailLoading && selected && <DialogFooter className="gap-2">
            {isApplicationUnverified(selected) && <Button disabled={busy} variant="outline" onClick={() => setVerificationCodeTarget(selected)}><KeyRound className="ml-2 h-4 w-4" />تغيير رمز التحقق</Button>}
            {selected.status === "pending" && <><Button disabled={busy} variant="destructive" onClick={() => { setDecisionTarget(selected); setPendingDecision("rejected"); }}><X className="ml-2 h-4 w-4" />رفض الطلب</Button><Button disabled={busy} onClick={() => { setDecisionTarget(selected); setPendingDecision("approved"); }}><Check className="ml-2 h-4 w-4" />قبول الطلب</Button></>}
          </DialogFooter>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingDecision)} onOpenChange={(open) => { if (!open && !busy) { setPendingDecision(null); setDecisionTarget(null); } }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingDecision === "approved" ? "تأكيد قبول طلب المعلم" : "تأكيد رفض طلب المعلم"}</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من {pendingDecision === "approved" ? "قبول" : "رفض"} طلب {decisionTarget ? applicantName(decisionTarget) : "هذا المعلم"}؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || !pendingDecision}
              className={pendingDecision === "rejected" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
              onClick={(event) => {
                event.preventDefault();
                if (pendingDecision) void updateStatus(pendingDecision);
              }}
            >
              {busy && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {pendingDecision === "approved" ? "تأكيد القبول" : "تأكيد الرفض"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(verificationCodeTarget)} onOpenChange={(open) => !open && !verificationCodeLoading && setVerificationCodeTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تغيير رمز التحقق</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إنشاء رمز تحقق جديد لـ {verificationCodeTarget ? applicantName(verificationCodeTarget) : "هذا المعلم"}، وسيصبح الرمز السابق غير صالح.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={verificationCodeLoading}>إلغاء</AlertDialogCancel>
            <AlertDialogAction disabled={verificationCodeLoading} onClick={(event) => { event.preventDefault(); void regenerateVerificationCode(); }}>
              {verificationCodeLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              تأكيد التغيير
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(verificationCodeResult)} onOpenChange={(open) => !open && setVerificationCodeResult(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رمز التحقق الجديد</DialogTitle>
            <DialogDescription>انسخ الرمز وشاركه بأمان مع المعلم المقصود.</DialogDescription>
          </DialogHeader>
          {verificationCodeResult && <div className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-5 text-center"><p className="font-mono text-4xl font-bold tracking-[0.3em]" dir="ltr">{verificationCodeResult.code}</p></div>
            <div><p className="text-xs text-muted-foreground">ينتهي في:</p><p className="font-medium">{new Date(verificationCodeResult.expiresAt).toLocaleString("ar-SA-u-ca-gregory", { dateStyle: "medium", timeStyle: "short" })}</p></div>
            <div role="alert" className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>هذا الرمز حساس. شاركه فقط مع المعلم المقصود.</span></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setVerificationCodeResult(null)}>إغلاق</Button><Button className="gap-2" onClick={() => void copyVerificationCode()}><Copy className="h-4 w-4" />نسخ الرمز</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
