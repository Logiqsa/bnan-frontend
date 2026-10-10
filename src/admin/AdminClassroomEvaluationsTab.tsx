import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, RefreshCw } from "lucide-react";
import { adminEvaluationsApi } from "@/api/adminEvaluationsApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsContent } from "@/components/ui/tabs";
import { useLanguage } from "@/i18n/LanguageContext";

const dateLabel = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("ar-EG-u-ca-gregory", {
        dateStyle: "medium",
      }).format(new Date(value))
    : "—";

const studentName = (item: { student?: { user?: { fullName?: string | null; email?: string | null } | null } | null }) =>
  item.student?.user?.fullName || item.student?.user?.email || "—";

export default function AdminClassroomEvaluationsTab({
  classroomId,
  active = true,
}: {
  classroomId: string;
  active?: boolean;
}) {
  const { pick } = useLanguage();
  const evaluations = useQuery({
    queryKey: ["admin-classroom-evaluations", classroomId],
    queryFn: () => adminEvaluationsApi.listEvaluations({ classroom: classroomId, page: 1, limit: 100 }),
    enabled: Boolean(classroomId) && active,
    retry: false,
  });

  return (
    <TabsContent value="evaluations" className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            {pick("تقييمات طلاب الفصل", "Classroom student evaluations")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {evaluations.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : evaluations.isError ? (
            <div className="grid gap-3 py-8 text-center">
              <p>{pick("تعذر تحميل تقييمات الفصل.", "Unable to load classroom evaluations.")}</p>
              <Button variant="outline" onClick={() => void evaluations.refetch()}>
                <RefreshCw className="ml-2 h-4 w-4" />
                {pick("إعادة المحاولة", "Retry")}
              </Button>
            </div>
          ) : !evaluations.data?.data.length ? (
            <p className="py-8 text-center text-muted-foreground">
              {pick("لا توجد تقييمات مسجلة لهذا الفصل.", "No evaluations recorded for this classroom.")}
            </p>
          ) : (
            <div className="space-y-3">
              {evaluations.data.data.map((evaluation) => (
                <div key={evaluation.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{studentName(evaluation)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[evaluation.subject?.name, dateLabel(evaluation.weekStart)].filter(Boolean).join(" — ")}
                      </p>
                    </div>
                    <Badge variant="outline">{evaluation.createdByRole || pick("—", "—")}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">{pick("الحضور", "Attendance")}: {evaluation.attendance || "—"}</Badge>
                    <Badge variant="secondary">{pick("المشاركة", "Participation")}: {evaluation.participation || "—"}</Badge>
                    <Badge variant="secondary">{pick("الواجب", "Homework")}: {evaluation.homework || "—"}</Badge>
                    <Badge variant="secondary">{pick("السلوك", "Behavior")}: {evaluation.behavior || "—"}</Badge>
                    {evaluation.bonus ? <Badge variant="outline">{pick("إضافي", "Bonus")}: {evaluation.bonus}</Badge> : null}
                  </div>
                  {evaluation.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{evaluation.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
