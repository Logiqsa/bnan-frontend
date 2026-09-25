import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminPayrollApi } from "@/api/adminPayrollApi";
import type { TeacherPayrollStatement } from "@/api/teacherPayrollStatementsApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import { courseError } from "@/lib/courseUi";
import PayrollReceiptButton from "@/components/PayrollReceiptButton";
import { formatPayrollStatementMoney } from "@/lib/payrollStatementCurrency";

const date = (value: string | null | undefined, locale: string) => value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value)) : "—";
const money = (value: number, currency: string, locale: string) => formatPayrollStatementMoney(value, currency, locale);
const statusLabel = (status: TeacherPayrollStatement["status"]) => status === "draft" ? "مسودة" : status === "paid" ? "مدفوع" : status === "cancelled" ? "ملغي" : "مرسل";

export default function AdminSentPayrollStatements() {
  const { language } = useLanguage();
  const locale = language === "ar" ? "ar-EG-u-ca-gregory" : "en-US";
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TeacherPayrollStatement | null>(null);
  const list = useQuery({ queryKey: ["admin-payroll-statements"], queryFn: () => adminPayrollApi.listStatements(), staleTime: 30_000, retry: 1 });
  const selected = useQuery({ queryKey: ["admin-payroll-statement", selectedId], queryFn: () => adminPayrollApi.getStatement(selectedId!), enabled: Boolean(selectedId), retry: 1 });
  const pay = useMutation({
    mutationFn: () => adminPayrollApi.payStatement(selectedId!, { receipt: receipt!, paidAt: paidAt || undefined, paymentReference: reference.trim() || undefined }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["admin-payroll-statements"] }); await client.invalidateQueries({ queryKey: ["admin-payroll-statement", selectedId] }); setSelectedId(null); setReceipt(null); setReference(""); setPaidAt(""); toast.success("تم تسجيل إرسال الراتب."); },
    onError: (error) => toast.error(courseError(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminPayrollApi.deleteStatement(id),
    onSuccess: async (_, id) => {
      client.setQueryData<TeacherPayrollStatement[]>(["admin-payroll-statements"], (current) => current?.filter((item) => item.id !== id) || []);
      setDeleteTarget(null);
      await client.invalidateQueries({ queryKey: ["admin-payroll-statements"] });
      toast.success("تم حذف الكشف بنجاح.");
    },
    onError: (error) => toast.error(courseError(error)),
  });
  const openPayment = (id: string) => { setReceipt(null); setReference(""); setPaidAt(""); setSelectedId(id); };
  return <section className="space-y-3" aria-labelledby="sent-payroll-statements-title" dir="rtl">
    <Card><CardHeader><CardTitle id="sent-payroll-statements-title">الكشوفات المرسلة</CardTitle></CardHeader><CardContent>
      {list.isLoading ? <Skeleton className="h-32 w-full" /> : list.isError ? <div className="space-y-3 p-5 text-center"><p className="text-sm text-destructive">تعذر تحميل الكشوفات المرسلة.</p><Button variant="outline" onClick={() => void list.refetch()}><RefreshCw className="me-2 h-4 w-4" />إعادة المحاولة</Button></div> : !list.data?.length ? <p className="p-5 text-center text-sm text-muted-foreground">لا توجد كشوفات مرسلة حتى الآن.</p> : <div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/40"><th className="p-3 text-right">المعلم</th><th className="p-3 text-right">المنهج</th><th className="p-3 text-right">الفترة</th><th className="p-3 text-right">المبلغ</th><th className="p-3 text-right">الحالة</th><th className="p-3 text-right">الإرسال</th><th className="p-3 text-right">الإجراء</th></tr></thead><tbody>{list.data.map((item) => { const paid = item.status === "paid" || Boolean(item.payment?.paidAt); return <tr key={item.id} className="border-b last:border-0"><td className="p-3">{item.teacher.fullName || item.teacher.email || "—"}</td><td className="p-3">{item.curriculum.name || "—"}</td><td className="p-3 whitespace-nowrap">{date(item.period.from, locale)} — {date(item.period.to, locale)}</td><td className="p-3 whitespace-nowrap" dir="ltr">{money(item.finalAmount, item.currency, locale)}</td><td className="p-3">{statusLabel(item.status)}{item.payment?.paidAt && <span className="block text-xs text-muted-foreground">تم الدفع {date(item.payment.paidAt, locale)}</span>}</td><td className="p-3 whitespace-nowrap">{date(item.sentAt, locale)}</td><td className="p-3"><div className="flex flex-wrap items-center gap-2"><Button asChild size="sm" variant="outline"><Link to={`/admin/payroll/statements/${encodeURIComponent(item.id)}`}>عرض الكشف</Link></Button>{item.status === "draft" && <Button asChild size="sm" variant="outline"><Link to={`/admin/payroll/statements/${encodeURIComponent(item.id)}?edit=1`}>تعديل الكشف</Link></Button>}{item.status !== "paid" && item.status !== "cancelled" && <Button size="sm" onClick={() => openPayment(item.id)}>إرسال الراتب</Button>}{item.status === "paid" && item.payment?.hasReceipt && <PayrollReceiptButton fetchReceipt={() => adminPayrollApi.getStatementReceipt(item.id)} label="عرض الإيصال" />}<Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={paid || remove.isPending} title={paid ? "لا يمكن حذف كشف تم صرفه." : undefined} onClick={() => setDeleteTarget(item)}><Trash2 className="me-1 h-4 w-4" />حذف الكشف</Button>{paid && <span className="text-xs text-muted-foreground">لا يمكن حذف كشف تم صرفه.</span>}</div></td></tr>; })}</tbody></table></div>}
    </CardContent></Card>
    <Dialog open={Boolean(selectedId)} onOpenChange={(open) => { if (!open && !pay.isPending) setSelectedId(null); }}><DialogContent><DialogHeader><DialogTitle>إرسال الراتب</DialogTitle><DialogDescription>سيتم تسجيل هذا الكشف كمدفوع بعد تأكيد التحويل خارج النظام.</DialogDescription></DialogHeader>{selected.isLoading ? <Skeleton className="h-32" /> : selected.isError || !selected.data ? <p className="text-sm text-destructive">تعذر تحميل بيانات الدفع.</p> : selected.data.status === "paid" ? <p className="text-sm text-muted-foreground">هذا الكشف مدفوع بالفعل.</p> : <div className="space-y-3 text-sm"><div className="rounded-lg border bg-muted/20 p-3"><p><strong>المعلم:</strong> {selected.data.teacher.fullName || selected.data.teacher.email || "—"}</p><p><strong>الفترة:</strong> {date(selected.data.period.from, locale)} — {date(selected.data.period.to, locale)}</p><p><strong>المبلغ:</strong> <span dir="ltr">{money(selected.data.finalAmount, selected.data.currency, locale)}</span></p>{selected.data.payoutProfile ? <><p><strong>طريقة الدفع:</strong> {selected.data.payoutProfile.method}</p><p><strong>اسم الحساب:</strong> {selected.data.payoutProfile.accountHolderName}</p><p><strong>الحساب/الهاتف:</strong> {selected.data.payoutProfile.accountNumber || selected.data.payoutProfile.walletPhone || selected.data.payoutProfile.instapayAddress || selected.data.payoutProfile.iban || "—"}</p></> : <p className="text-destructive">لا توجد بيانات استلام مسجلة لهذا المعلم.</p>}</div><div><Label htmlFor="statement-receipt">إيصال التحويل (صورة أو PDF)</Label><Input id="statement-receipt" type="file" accept="image/*,application/pdf" onChange={(event) => { const file = event.target.files?.[0] || null; if (file && (!file.type.startsWith("image/") && file.type !== "application/pdf" || file.size > 20 * 1024 * 1024)) { toast.error("اختر صورة أو PDF بحجم لا يتجاوز 20 ميجابايت."); setReceipt(null); return; } setReceipt(file); }} disabled={pay.isPending} /></div><div><Label htmlFor="statement-reference">مرجع الدفع (اختياري)</Label><Input id="statement-reference" value={reference} onChange={(event) => setReference(event.target.value)} disabled={pay.isPending} /></div><div><Label htmlFor="statement-paid-at">تاريخ الدفع (اختياري)</Label><Input id="statement-paid-at" type="date" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} disabled={pay.isPending} /></div></div>}<DialogFooter><Button variant="outline" onClick={() => setSelectedId(null)} disabled={pay.isPending}>إلغاء</Button><Button onClick={() => { if (receipt && selected.data?.payoutProfile && selected.data.status !== "paid") pay.mutate(); }} disabled={!receipt || !selected.data?.payoutProfile || selected.data?.status === "paid" || pay.isPending}>{pay.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}تأكيد إرسال الراتب</Button></DialogFooter></DialogContent></Dialog>
    <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open && !remove.isPending) setDeleteTarget(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>هل أنت متأكد من حذف هذا الكشف؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف الكشف ويمكن بعد ذلك إنشاء كشف جديد لنفس المعلم والفترة.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={remove.isPending}>إلغاء</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={remove.isPending} onClick={(event) => { event.preventDefault(); if (deleteTarget && !remove.isPending) remove.mutate(deleteTarget.id); }}>{remove.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}حذف الكشف</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}
