import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { Check, Clock, RefreshCw, Save, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { teacherAttendanceIncidentsApi, type TeacherAttendanceIncident, type TeacherAttendancePolicy } from "@/api/teacherAttendanceIncidentsApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/layouts/DashboardLayout";
import { usePortalAuth } from "@/portal/PortalAuthContext";

const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("ar-EG-u-ca-gregory", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const defaults: TeacherAttendancePolicy = { graceMinutes: 5, absenceMinutes: 10, lateDeduction: { EGP: 0, SAR: 0 } };
const reviewLabel = { pending: "بانتظار المراجعة", approved: "تم اعتماد المخالفة", ignored: "تم تجاهل المخالفة" } as const;
const reviewVariant = (status: TeacherAttendanceIncident["reviewStatus"]) => status === "approved" ? "default" : status === "ignored" ? "outline" : "secondary";

export default function AdminTeacherAttendance() {
  const { user } = usePortalAuth();
  const isAdmin = user?.role === "admin";
  const basePath = isAdmin ? "/admin/teacher-attendance" : "/portal/supervisor/teacher-attendance";
  const { incidentId } = useParams<{ incidentId?: string }>();
  const client = useQueryClient();
  const [type, setType] = useState("all");
  const [reviewStatus, setReviewStatus] = useState("pending");
  const [policy, setPolicy] = useState(defaults);
  const [ignoreReason, setIgnoreReason] = useState("");
  const policyQuery = useQuery({ queryKey: ["teacher-attendance-policy"], queryFn: teacherAttendanceIncidentsApi.getPolicy });
  useEffect(() => { if (policyQuery.data) setPolicy(policyQuery.data); }, [policyQuery.data]);
  const incidents = useQuery({ queryKey: ["teacher-attendance-incidents", type, reviewStatus], queryFn: () => teacherAttendanceIncidentsApi.list({ type: type === "all" ? undefined : type, reviewStatus: reviewStatus === "all" ? undefined : reviewStatus }), enabled: !incidentId });
  const detail = useQuery({ queryKey: ["teacher-attendance-incident", incidentId], queryFn: () => teacherAttendanceIncidentsApi.get(incidentId!), enabled: Boolean(incidentId) });
  useEffect(() => { if (detail.data) setIgnoreReason(""); }, [detail.data]);
  const savePolicy = useMutation({ mutationFn: () => teacherAttendanceIncidentsApi.updatePolicy(policy), onSuccess: (data) => { setPolicy(data); toast.success("تم حفظ إعدادات الحضور والخصم."); }, onError: () => toast.error("تعذر حفظ الإعدادات.") });
  const updateIncident = useMutation({ mutationFn: (body: Parameters<typeof teacherAttendanceIncidentsApi.update>[1]) => teacherAttendanceIncidentsApi.update(incidentId!, body), onSuccess: async (_, body) => { await client.invalidateQueries({ queryKey: ["teacher-attendance-incident", incidentId] }); await client.invalidateQueries({ queryKey: ["teacher-attendance-incidents"] }); toast.success(body.decision === "approve" ? "تم اعتماد المخالفة وستظهر عند إعداد الراتب." : "تم تجاهل المخالفة ولن تدخل في الراتب."); }, onError: (error: Error) => toast.error(error.message || "تعذر حفظ القرار.") });
  const item = detail.data;
  const approveDisabled = updateIncident.isPending;

  return <DashboardLayout><div className="mx-auto w-full max-w-6xl space-y-5" dir="rtl">
    <header className="rounded-2xl border bg-card p-5"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Clock className="h-5 w-5" /></span><div><h1 className="text-2xl font-bold">تأخير وغياب المعلمين</h1><p className="text-sm text-muted-foreground">التأخير ينتظر اعتماد الإدارة أو المشرف قبل دخوله في خصومات الراتب. عدم الحضور يسجل بدون خصم.</p></div></div></header>
    {!incidentId && isAdmin && <PolicyCard policy={policy} setPolicy={setPolicy} saving={savePolicy.isPending} save={() => savePolicy.mutate()} />}
    {incidentId ? detail.isLoading ? <Skeleton className="h-80" /> : !item ? <Card><CardContent className="p-8 text-center">تعذر تحميل الحالة.</CardContent></Card> : <Card><CardHeader><CardTitle>{item.type === "late" ? "مراجعة مخالفة التأخير" : "تفاصيل عدم الحضور"}</CardTitle></CardHeader><CardContent className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2"><p><span className="text-muted-foreground">المعلم:</span> <strong>{item.teacher.fullName || "—"}</strong></p><p><span className="text-muted-foreground">الفصل:</span> <strong>{item.classroom.name || "—"}</strong></p><p><span className="text-muted-foreground">موعد الحصة:</span> <strong>{formatDate(item.scheduledStartAt)}</strong></p><p><span className="text-muted-foreground">بدء الحصة:</span> <strong>{formatDate(item.actualStartedAt)}</strong></p><p><span className="text-muted-foreground">الحالة:</span> <Badge variant={item.type === "absent" ? "destructive" : "secondary"}>{item.type === "late" ? `تأخير ${item.minutesLate} دقيقة` : "عدم حضور"}</Badge></p><p><span className="text-muted-foreground">قرار المراجعة:</span> <Badge variant={reviewVariant(item.reviewStatus)}>{item.type === "absent" ? "مسجل بدون خصم" : reviewLabel[item.reviewStatus]}</Badge></p></div>
      {item.type === "late" && item.reviewStatus === "pending" && <div className="space-y-4 rounded-xl border p-4"><p className="text-sm text-muted-foreground">الاعتماد يضيف المخالفة إلى قسم الخصومات عند إعداد كشف الراتب، وهناك يحدد الأدمن قيمة الخصم بعملة الكشف. التجاهل لا يخصم أي مبلغ.</p><div><Label>سبب تجاهل الخصم</Label><Input value={ignoreReason} onChange={(e) => setIgnoreReason(e.target.value)} placeholder="مطلوب عند اختيار تجاهل" /></div><div className="flex flex-wrap gap-2"><Button disabled={approveDisabled} onClick={() => updateIncident.mutate({ decision: "approve" })}><Check className="me-2 h-4 w-4" />اعتماد المخالفة</Button><Button variant="outline" disabled={!ignoreReason.trim() || updateIncident.isPending} onClick={() => updateIncident.mutate({ decision: "ignore", ignoreReason: ignoreReason.trim() })}><X className="me-2 h-4 w-4" />تجاهل المخالفة</Button></div></div>}
      {item.type === "late" && item.reviewStatus !== "pending" && <div className="rounded-xl border p-4 text-sm"><p><strong>{reviewLabel[item.reviewStatus]}</strong>{item.reviewedBy?.fullName ? ` بواسطة ${item.reviewedBy.fullName}` : ""}{item.reviewedAt ? ` في ${formatDate(item.reviewedAt)}` : ""}</p>{item.reviewStatus === "approved" ? <p className="mt-2">ستظهر المخالفة في مسودة كشف الراتب لتحديد قيمة الخصم أو استبعادها من الكشف.</p> : <p className="mt-2"><strong>سبب التجاهل:</strong> {item.ignoreReason}</p>}</div>}
      <Button asChild variant="outline"><Link to={basePath}>العودة للسجل</Link></Button>
    </CardContent></Card> : <IncidentList type={type} setType={setType} reviewStatus={reviewStatus} setReviewStatus={setReviewStatus} query={incidents} basePath={basePath} />}
  </div></DashboardLayout>;
}

function PolicyCard({ policy, setPolicy, saving, save }: { policy: TeacherAttendancePolicy; setPolicy: Dispatch<SetStateAction<TeacherAttendancePolicy>>; saving: boolean; save: () => void }) {
  return <Card><CardHeader><CardTitle>إعدادات الاحتساب</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><div><Label>وقت السماح بالدقائق</Label><Input type="number" min={1} value={policy.graceMinutes} onChange={(e) => setPolicy((p) => ({ ...p, graceMinutes: Number(e.target.value) }))} /></div><div><Label>تسجيل عدم الحضور بعد</Label><Input type="number" min={2} value={policy.absenceMinutes} onChange={(e) => setPolicy((p) => ({ ...p, absenceMinutes: Number(e.target.value) }))} /></div><div className="md:col-span-2"><p className="mb-3 text-xs text-muted-foreground">قيمة الخصم لا تحدد هنا؛ يتم اختيارها لكل مخالفة عند إعداد مسودة الراتب.</p><Button disabled={saving || policy.absenceMinutes <= policy.graceMinutes} onClick={save}><Save className="me-2 h-4 w-4" />حفظ الإعدادات</Button></div></CardContent></Card>;
}

function IncidentList({ type, setType, reviewStatus, setReviewStatus, query, basePath }: { type: string; setType: (value: string) => void; reviewStatus: string; setReviewStatus: (value: string) => void; query: UseQueryResult<TeacherAttendanceIncident[]>; basePath: string }) {
  return <Card><CardHeader className="flex-row items-center justify-between"><CardTitle>السجل</CardTitle><Button variant="outline" size="icon" onClick={() => void query.refetch()}><RefreshCw className="h-4 w-4" /></Button></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الحالات</SelectItem><SelectItem value="late">التأخير</SelectItem><SelectItem value="absent">عدم الحضور</SelectItem></SelectContent></Select><Select value={reviewStatus} onValueChange={setReviewStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">بانتظار المراجعة</SelectItem><SelectItem value="approved">المعتمدة</SelectItem><SelectItem value="ignored">المتجاهلة</SelectItem><SelectItem value="all">الكل</SelectItem></SelectContent></Select></div>{query.isLoading ? <Skeleton className="h-60" /> : <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[900px] text-sm"><thead className="bg-muted/50"><tr><th className="p-3 text-right">المعلم</th><th className="p-3 text-right">الفصل</th><th className="p-3 text-right">الموعد</th><th className="p-3 text-right">الحالة</th><th className="p-3 text-right">القرار</th><th className="p-3 text-right">الخصم/السبب</th><th className="p-3" /></tr></thead><tbody>{(query.data || []).map((row) => <tr key={row.id} className="border-t"><td className="p-3">{row.teacher.fullName || "—"}</td><td className="p-3">{row.classroom.name || "—"}</td><td className="p-3">{formatDate(row.scheduledStartAt)}</td><td className="p-3"><Badge variant={row.type === "absent" ? "destructive" : "secondary"}>{row.type === "late" ? `متأخر ${row.minutesLate} دقيقة` : "عدم حضور"}</Badge></td><td className="p-3"><Badge variant={reviewVariant(row.reviewStatus)}>{row.type === "absent" ? "مسجل بدون خصم" : reviewLabel[row.reviewStatus]}</Badge></td><td className="max-w-64 p-3">{row.type === "absent" ? "بدون خصم" : row.reviewStatus === "ignored" ? <span><strong>سبب التجاهل:</strong> {row.ignoreReason}</span> : row.reviewStatus === "approved" ? "القيمة تُحدد في مسودة الراتب" : "بانتظار قرار المراجعة"}</td><td className="p-3"><Button asChild size="sm" variant="outline"><Link to={`${basePath}/${row.id}`}>{row.reviewStatus === "pending" && row.type === "late" ? "مراجعة" : "التفاصيل"}</Link></Button></td></tr>)}{!query.data?.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">لا توجد حالات مطابقة.</td></tr>}</tbody></table></div>}</CardContent></Card>;
}
