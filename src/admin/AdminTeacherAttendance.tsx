import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { Check, Clock, Loader2, RefreshCw, Save, Trash2, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  teacherAttendanceIncidentsApi,
  type TeacherAttendanceIncident,
  type TeacherAttendancePolicy,
} from "@/api/teacherAttendanceIncidentsApi";
import { teacherApplicationsApi } from "@/api/teacherApplicationsApi";
import { TeacherApplicationDetails } from "@/admin/TeacherApplicationDetails";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DashboardLayout from "@/layouts/DashboardLayout";
import { usePortalAuth } from "@/portal/PortalAuthContext";

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("ar-EG-u-ca-gregory", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
const defaults: TeacherAttendancePolicy = {
  graceMinutes: 5,
  absenceMinutes: 10,
  lateDeduction: { EGP: 0, SAR: 0 },
};
const reviewLabel = {
  pending: "بانتظار المراجعة",
  approved: "تم اعتماد المخالفة",
  ignored: "تم تجاهل المخالفة",
} as const;
const reviewVariant = (status: TeacherAttendanceIncident["reviewStatus"]) =>
  status === "approved"
    ? "default"
    : status === "ignored"
      ? "outline"
      : "secondary";

export default function AdminTeacherAttendance() {
  const { user } = usePortalAuth();
  const isAdmin = user?.role === "admin";
  const basePath = isAdmin
    ? "/admin/teacher-attendance"
    : "/portal/supervisor/teacher-attendance";
  const classroomBasePath = isAdmin
    ? "/admin/classrooms"
    : "/portal/supervisor/classrooms";
  const { incidentId } = useParams<{ incidentId?: string }>();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [type, setType] = useState("all");
  const [reviewStatus, setReviewStatus] = useState("pending");
  const [policy, setPolicy] = useState(defaults);
  const [policyEditing, setPolicyEditing] = useState(false);
  const [ignoreReason, setIgnoreReason] = useState("");
  const [teacherDialogUserId, setTeacherDialogUserId] = useState("");
  const policyQuery = useQuery({
    queryKey: ["teacher-attendance-policy"],
    queryFn: teacherAttendanceIncidentsApi.getPolicy,
  });
  useEffect(() => {
    if (policyQuery.data) setPolicy(policyQuery.data);
  }, [policyQuery.data]);
  const incidents = useQuery({
    queryKey: ["teacher-attendance-incidents", type, reviewStatus],
    queryFn: () =>
      teacherAttendanceIncidentsApi.list({
        type: type === "all" ? undefined : type,
        reviewStatus: reviewStatus === "all" ? undefined : reviewStatus,
      }),
    enabled: !incidentId,
  });
  const detail = useQuery({
    queryKey: ["teacher-attendance-incident", incidentId],
    queryFn: () => teacherAttendanceIncidentsApi.get(incidentId!),
    enabled: Boolean(incidentId),
  });
  const teacherDetails = useQuery({
    queryKey: ["teacher-attendance-teacher-details", teacherDialogUserId],
    queryFn: () => teacherApplicationsApi.getByUserId(teacherDialogUserId),
    enabled: Boolean(teacherDialogUserId),
  });
  useEffect(() => {
    if (detail.data) setIgnoreReason("");
  }, [detail.data]);
  const savePolicy = useMutation({
    mutationFn: () => teacherAttendanceIncidentsApi.updatePolicy(policy),
    onSuccess: (data) => {
      setPolicy(data);
      setPolicyEditing(false);
      toast.success("تم حفظ إعدادات الحضور والخصم.");
    },
    onError: () => toast.error("تعذر حفظ الإعدادات."),
  });
  const updateIncident = useMutation({
    mutationFn: (
      body: Parameters<typeof teacherAttendanceIncidentsApi.update>[1],
    ) => teacherAttendanceIncidentsApi.update(incidentId!, body),
    onSuccess: async (_, body) => {
      await client.invalidateQueries({
        queryKey: ["teacher-attendance-incident", incidentId],
      });
      await client.invalidateQueries({
        queryKey: ["teacher-attendance-incidents"],
      });
      toast.success(
        body.decision === "approve"
          ? "تم اعتماد المخالفة وستظهر عند إعداد الراتب."
          : "تم تجاهل المخالفة ولن تدخل في الراتب.",
      );
    },
    onError: (error: Error) => toast.error(error.message || "تعذر حفظ القرار."),
  });
  const removeIncident = useMutation({
    mutationFn: (id: string) => teacherAttendanceIncidentsApi.remove(id),
    onSuccess: async (_, id) => {
      await client.invalidateQueries({ queryKey: ["teacher-attendance-incidents"] });
      client.removeQueries({ queryKey: ["teacher-attendance-incident", id] });
      if (incidentId === id) navigate(basePath, { replace: true });
      toast.success("تم حذف سجل الحضور ولن يعاد إنشاؤه تلقائيًا.");
    },
    onError: (error: Error) => toast.error(
      error.message === "ATTENDANCE_INCIDENT_USED_IN_PAYROLL"
        ? "لا يمكن حذف المخالفة لأنها مستخدمة بالفعل في كشف راتب."
        : error.message || "تعذر حذف السجل.",
    ),
  });
  const requestDelete = (id: string) => {
    if (window.confirm("هل تريد حذف سجل الحضور نهائيًا من السجل؟")) removeIncident.mutate(id);
  };
  const item = detail.data;
  const approveDisabled = updateIncident.isPending;

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-6xl space-y-5" dir="rtl">
        <header className="rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Clock className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold">تأخير وغياب المعلمين</h1>
              <p className="text-sm text-muted-foreground">
                التأخير ينتظر اعتماد الإدارة أو المشرف، وعدم الحضور يسجل
                تلقائيًا. يمكن تحديد قيمة الخصم لكل منهما عند إعداد الراتب.
              </p>
            </div>
          </div>
        </header>
        {!incidentId && isAdmin && (
          <PolicyCard
            policy={policy}
            setPolicy={setPolicy}
            editing={policyEditing}
            setEditing={setPolicyEditing}
            cancel={() => {
              setPolicy(policyQuery.data || defaults);
              setPolicyEditing(false);
            }}
            saving={savePolicy.isPending}
            save={() => savePolicy.mutate()}
          />
        )}
        {incidentId ? (
          detail.isLoading ? (
            <Skeleton className="h-80" />
          ) : !item ? (
            <Card>
              <CardContent className="p-8 text-center">
                تعذر تحميل الحالة.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>
                  {item.type === "late"
                    ? "مراجعة مخالفة التأخير"
                    : "تفاصيل عدم الحضور"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <p>
                    <span className="text-muted-foreground">المعلم:</span>{" "}
                    {item.teacher.userId && isAdmin ? (
                      <button
                        type="button"
                        className="font-bold text-primary underline-offset-4 hover:underline"
                        onClick={() =>
                          setTeacherDialogUserId(item.teacher.userId!)
                        }
                      >
                        {item.teacher.fullName || "—"}
                      </button>
                    ) : (
                      <strong>{item.teacher.fullName || "—"}</strong>
                    )}
                  </p>
                  <p>
                    <span className="text-muted-foreground">الفصل:</span>{" "}
                    {item.classroom.id ? (
                      <Link
                        className="font-bold text-primary underline-offset-4 hover:underline"
                        to={`${classroomBasePath}/${encodeURIComponent(item.classroom.id)}`}
                      >
                        {item.classroom.name || "—"}
                      </Link>
                    ) : (
                      <strong>{item.classroom.name || "—"}</strong>
                    )}
                  </p>
                  <p>
                    <span className="text-muted-foreground">موعد الحصة:</span>{" "}
                    <strong>{formatDate(item.scheduledStartAt)}</strong>
                  </p>
                  <p>
                    <span className="text-muted-foreground">بدء الحصة:</span>{" "}
                    <strong>{formatDate(item.actualStartedAt)}</strong>
                  </p>
                  <p>
                    <span className="text-muted-foreground">الحالة:</span>{" "}
                    <Badge
                      variant={
                        item.type === "absent" ? "destructive" : "secondary"
                      }
                    >
                      {item.type === "late"
                        ? `تأخير ${item.minutesLate} دقيقة`
                        : "عدم حضور"}
                    </Badge>
                  </p>
                  <p>
                    <span className="text-muted-foreground">
                      قرار المراجعة:
                    </span>{" "}
                    <Badge variant={reviewVariant(item.reviewStatus)}>
                      {reviewLabel[item.reviewStatus]}
                    </Badge>
                  </p>
                </div>
                {item.type === "late" && item.reviewStatus === "pending" && (
                  <div className="space-y-4 rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">
                      الاعتماد يضيف المخالفة إلى قسم الخصومات عند إعداد كشف
                      الراتب، وهناك يحدد الأدمن قيمة الخصم بعملة الكشف. التجاهل
                      لا يخصم أي مبلغ.
                    </p>
                    <div className="space-y-2">
                      <Label className="block">سبب تجاهل الخصم</Label>
                      <Input
                        value={ignoreReason}
                        onChange={(e) => setIgnoreReason(e.target.value)}
                        placeholder="مطلوب عند اختيار تجاهل"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={approveDisabled}
                        onClick={() =>
                          updateIncident.mutate({ decision: "approve" })
                        }
                      >
                        <Check className="me-2 h-4 w-4" />
                        اعتماد المخالفة
                      </Button>
                      <Button
                        variant="outline"
                        disabled={
                          !ignoreReason.trim() || updateIncident.isPending
                        }
                        onClick={() =>
                          updateIncident.mutate({
                            decision: "ignore",
                            ignoreReason: ignoreReason.trim(),
                          })
                        }
                      >
                        <X className="me-2 h-4 w-4" />
                        تجاهل المخالفة
                      </Button>
                    </div>
                  </div>
                )}
                {item.type === "late" && item.reviewStatus !== "pending" && (
                  <div className="rounded-xl border p-4 text-sm">
                    <p>
                      <strong>{reviewLabel[item.reviewStatus]}</strong>
                      {item.reviewedBy?.fullName
                        ? ` بواسطة ${item.reviewedBy.fullName}`
                        : ""}
                      {item.reviewedAt
                        ? ` في ${formatDate(item.reviewedAt)}`
                        : ""}
                    </p>
                    {item.reviewStatus === "approved" ? (
                      <p className="mt-2">
                        ستظهر المخالفة في مسودة كشف الراتب لتحديد قيمة الخصم أو
                        استبعادها من الكشف.
                      </p>
                    ) : (
                      <p className="mt-2">
                        <strong>سبب التجاهل:</strong> {item.ignoreReason}
                      </p>
                    )}
                  </div>
                )}
                {item.type === "absent" && (
                  <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                    عدم الحضور معتمد ومتاح ضمن مخالفات الحضور عند إعداد مسودة كشف الراتب، ويمكن للأدمن تحديد قيمة الخصم أو تركه بدون خصم.
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline">
                    <Link to={basePath}>العودة للسجل</Link>
                  </Button>
                  {isAdmin && (
                    <Button variant="destructive" disabled={removeIncident.isPending} onClick={() => requestDelete(item.id)}>
                      <Trash2 className="me-2 h-4 w-4" />
                      حذف السجل
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        ) : (
          <IncidentList
            type={type}
            setType={setType}
            reviewStatus={reviewStatus}
            setReviewStatus={setReviewStatus}
            query={incidents}
            basePath={basePath}
            classroomBasePath={classroomBasePath}
            canViewTeacher={isAdmin}
            canDelete={isAdmin}
            onTeacherClick={setTeacherDialogUserId}
            onDelete={requestDelete}
            deletingId={removeIncident.isPending ? removeIncident.variables : undefined}
          />
        )}
        <Dialog
          open={Boolean(teacherDialogUserId)}
          onOpenChange={(open) => !open && setTeacherDialogUserId("")}
        >
          <DialogContent
            dir="rtl"
            className="max-h-[92vh] w-[95vw] max-w-6xl overflow-y-auto"
          >
            <DialogHeader>
              <DialogTitle>تفاصيل المعلم</DialogTitle>
              <DialogDescription>
                بيانات حساب المعلم وملف التقديم الكامل.
              </DialogDescription>
            </DialogHeader>
            {teacherDetails.isLoading ? (
              <div className="grid min-h-48 place-items-center">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>
            ) : teacherDetails.isError ? (
              <div className="space-y-3 py-10 text-center">
                <p className="text-destructive">تعذر تحميل تفاصيل المعلم.</p>
                <Button
                  variant="outline"
                  onClick={() => void teacherDetails.refetch()}
                >
                  إعادة المحاولة
                </Button>
              </div>
            ) : teacherDetails.data?.data ? (
              <TeacherApplicationDetails
                application={teacherDetails.data.data}
              />
            ) : (
              <p className="py-10 text-center text-muted-foreground">
                لا توجد تفاصيل إضافية متاحة لهذا المعلم.
              </p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

function PolicyCard({
  policy,
  setPolicy,
  editing,
  setEditing,
  cancel,
  saving,
  save,
}: {
  policy: TeacherAttendancePolicy;
  setPolicy: Dispatch<SetStateAction<TeacherAttendancePolicy>>;
  editing: boolean;
  setEditing: (value: boolean) => void;
  cancel: () => void;
  saving: boolean;
  save: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>إعدادات الاحتساب</CardTitle>
        {!editing && (
          <Button variant="outline" onClick={() => setEditing(true)}>
            تعديل الإعدادات
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          {editing ? (
            <>
              <div className="space-y-2">
                <Label className="block">وقت السماح بالدقائق</Label>
                <Input
                  type="number"
                  min={1}
                  value={policy.graceMinutes}
                  onChange={(e) =>
                    setPolicy((p) => ({
                      ...p,
                      graceMinutes: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="block">تسجيل عدم الحضور بعد</Label>
                <Input
                  type="number"
                  min={2}
                  value={policy.absenceMinutes}
                  onChange={(e) =>
                    setPolicy((p) => ({
                      ...p,
                      absenceMinutes: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">
                  وقت السماح بالدقائق
                </p>
                <p className="mt-2 text-xl font-bold">
                  {policy.graceMinutes} دقائق
                </p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">
                  تسجيل عدم الحضور بعد
                </p>
                <p className="mt-2 text-xl font-bold">
                  {policy.absenceMinutes} دقائق
                </p>
              </div>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          قيمة الخصم لا تحدد هنا؛ يتم اختيارها لكل مخالفة عند إعداد مسودة
          الراتب.
        </p>
        {editing && (
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={saving || policy.absenceMinutes <= policy.graceMinutes}
              onClick={save}
            >
              <Save className="me-2 h-4 w-4" />
              {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
            </Button>
            <Button variant="outline" disabled={saving} onClick={cancel}>
              إلغاء
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IncidentList({
  type,
  setType,
  reviewStatus,
  setReviewStatus,
  query,
  basePath,
  classroomBasePath,
  canViewTeacher,
  canDelete,
  onTeacherClick,
  onDelete,
  deletingId,
}: {
  type: string;
  setType: (value: string) => void;
  reviewStatus: string;
  setReviewStatus: (value: string) => void;
  query: UseQueryResult<TeacherAttendanceIncident[]>;
  basePath: string;
  classroomBasePath: string;
  canViewTeacher: boolean;
  canDelete: boolean;
  onTeacherClick: (userId: string) => void;
  onDelete: (id: string) => void;
  deletingId?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>السجل</CardTitle>
        <Button
          variant="outline"
          size="icon"
          onClick={() => void query.refetch()}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="late">التأخير</SelectItem>
              <SelectItem value="absent">عدم الحضور</SelectItem>
            </SelectContent>
          </Select>
          <Select value={reviewStatus} onValueChange={setReviewStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">بانتظار المراجعة</SelectItem>
              <SelectItem value="approved">المعتمدة</SelectItem>
              <SelectItem value="ignored">المتجاهلة</SelectItem>
              <SelectItem value="all">الكل</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {query.isLoading ? (
          <Skeleton className="h-60" />
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-right">المعلم</th>
                  <th className="p-3 text-right">الفصل</th>
                  <th className="p-3 text-right">الموعد</th>
                  <th className="p-3 text-right">الحالة</th>
                  <th className="p-3 text-right">القرار</th>
                  <th className="p-3 text-right">الخصم/السبب</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {(query.data || []).map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="p-3">
                      {canViewTeacher && row.teacher.userId ? (
                        <button
                          type="button"
                          className="font-medium text-primary underline-offset-4 hover:underline"
                          onClick={() => onTeacherClick(row.teacher.userId!)}
                        >
                          {row.teacher.fullName || "—"}
                        </button>
                      ) : (
                        row.teacher.fullName || "—"
                      )}
                    </td>
                    <td className="p-3">
                      {row.classroom.id ? (
                        <Link
                          className="font-medium text-primary underline-offset-4 hover:underline"
                          to={`${classroomBasePath}/${encodeURIComponent(row.classroom.id)}`}
                        >
                          {row.classroom.name || "—"}
                        </Link>
                      ) : (
                        row.classroom.name || "—"
                      )}
                    </td>
                    <td className="p-3">{formatDate(row.scheduledStartAt)}</td>
                    <td className="p-3">
                      <Badge
                        variant={
                          row.type === "absent" ? "destructive" : "secondary"
                        }
                      >
                        {row.type === "late"
                          ? `متأخر ${row.minutesLate} دقيقة`
                          : "عدم حضور"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant={reviewVariant(row.reviewStatus)}>
                        {row.type === "absent"
                          ? "متاح للخصم"
                          : reviewLabel[row.reviewStatus]}
                      </Badge>
                    </td>
                    <td className="max-w-64 p-3">
                      {row.type === "absent" ? (
                        "القيمة تُحدد في مسودة الراتب"
                      ) : row.reviewStatus === "ignored" ? (
                        <span>
                          <strong>سبب التجاهل:</strong> {row.ignoreReason}
                        </span>
                      ) : row.reviewStatus === "approved" ? (
                        "القيمة تُحدد في مسودة الراتب"
                      ) : (
                        "بانتظار قرار المراجعة"
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`${basePath}/${row.id}`}>
                            {row.reviewStatus === "pending" && row.type === "late"
                              ? "مراجعة"
                              : "التفاصيل"}
                          </Link>
                        </Button>
                        {canDelete && (
                          <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={deletingId === row.id} aria-label="حذف سجل الحضور" onClick={() => onDelete(row.id)}>
                            {deletingId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!query.data?.length && (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-muted-foreground"
                    >
                      لا توجد حالات مطابقة.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
