import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { coursesApi, type CourseScheduleSlot } from "@/api/coursesApi";
import { courseError } from "@/lib/courseUi";
import { hasLegacyCourseScheduleSlots, newEditableCourseScheduleSlot, serializeCourseScheduleSlots, toEditableCourseScheduleSlots, type EditableCourseScheduleSlot } from "@/lib/courseScheduleEditor";
import { usePortalAuth } from "@/portal/PortalAuthContext";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
const days: CourseScheduleSlot["day"][] = [
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];
const labels: Record<string, string> = {
  saturday: "السبت",
  sunday: "الأحد",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
};
export default function CourseClassroomSchedule() {
  const { classroomId = "" } = useParams();
  const { user } = usePortalAuth();
  const editable =
    !!user && ["admin", "teacher", "supervisor"].includes(user.role);
  const q = useQuery({
    queryKey: ["course-schedule", classroomId],
    queryFn: () => coursesApi.getSchedule(classroomId),
    retry: false,
  });
  const [timezone, setTimezone] = useState("Africa/Cairo");
  const [slots, setSlots] = useState<EditableCourseScheduleSlot[]>([]);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [conflictNotice, setConflictNotice] = useState("");
  const editRevision = useRef(0);
  const legacy = Boolean(q.data?.slots?.length && hasLegacyCourseScheduleSlots(q.data.slots));
  const changeSlots = (updater: (current: EditableCourseScheduleSlot[]) => EditableCourseScheduleSlot[]) => {
    editRevision.current += 1;
    setDirty(true);
    setSlots(updater);
  };
  useEffect(() => {
    if (q.data && !dirty) {
      setTimezone(q.data.timezone || "Africa/Cairo");
      setSlots(toEditableCourseScheduleSlots(q.data.slots || []));
    }
  }, [dirty, q.data]);
  const save = async () => {
    if (legacy) return toast.error(courseError({ code: "COURSE_SCHEDULE_LEGACY_SLOT_IDS_REQUIRED" }));
    const revision = editRevision.current;
    setBusy(true);
    setConflictNotice("");
    try {
      await coursesApi.updateSchedule(classroomId, { timezone, slots: serializeCourseScheduleSlots(slots) });
      const latest = await coursesApi.getSchedule(classroomId);
      if (editRevision.current === revision && latest) {
        setTimezone(latest.timezone || "Africa/Cairo");
        setSlots(toEditableCourseScheduleSlots(latest.slots || []));
        setDirty(false);
      }
      toast.success("تم حفظ جدول الفصل");
      await q.refetch();
    } catch (e) {
      const code = (e as { code?: string })?.code || "";
      if (["COURSE_SCHEDULE_CONCURRENT_UPDATE", "COURSE_SCHEDULE_SLOT_ID_UNKNOWN", "COURSE_SCHEDULE_SLOT_ID_FOREIGN", "COURSE_SCHEDULE_SLOT_IDENTITY_AMBIGUOUS"].includes(code)) {
        await coursesApi.getSchedule(classroomId).catch(() => null);
        setConflictNotice("تم جلب أحدث نسخة من الخادم دون حذف تعديلاتك الحالية. راجع تغييراتك وأعد تحميل الصفحة قبل إعادة تطبيقها.");
      }
      toast.error(courseError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-5" dir="rtl">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/portal/teacher">الرئيسية</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="rotate-180" />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/portal/teacher/courses">دوراتي</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="rotate-180" />
            <BreadcrumbItem>
              <BreadcrumbPage>تعديل جدول المجموعة</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Card className="mx-auto max-w-4xl">
          <CardHeader>
            <CardTitle>جدول فصل الدورة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {q.isLoading ? (
              <p>جاري التحميل...</p>
            ) : q.error ? (
              <p className="text-destructive">{courseError(q.error)}</p>
            ) : (
              <>
                <label className="block space-y-2">
                  <span>المنطقة الزمنية</span>
                  <Input
                    value={timezone}
                    onChange={(e) => { editRevision.current += 1; setDirty(true); setTimezone(e.target.value); }}
                    disabled={!editable || legacy || busy}
                  />
                </label>
                <div className="space-y-3">
                  {slots.map((s, i) => (
                    <div
                      key={s.clientKey}
                      className="grid gap-2 rounded-xl border p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
                    >
                      <Select
                        value={s.day}
                        disabled={!editable || legacy || busy}
                        onValueChange={(x) =>
                          changeSlots((v) =>
                            v.map((y, n) =>
                              n === i
                                ? { ...y, day: x as CourseScheduleSlot["day"] }
                                : y,
                            ),
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {days.map((d) => (
                            <SelectItem key={d} value={d}>
                              {labels[d]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <label className="grid gap-1.5 text-sm font-medium">
                        <span className="text-muted-foreground">وقت البداية</span>
                        <Input
                          type="time"
                          value={s.startTime}
                          disabled={!editable || legacy || busy}
                          onChange={(e) =>
                            changeSlots((v) =>
                              v.map((y, n) =>
                                n === i ? { ...y, startTime: e.target.value } : y,
                              ),
                            )
                          }
                        />
                      </label>
                      <label className="grid gap-1.5 text-sm font-medium">
                        <span className="text-muted-foreground">وقت النهاية</span>
                        <Input
                          type="time"
                          value={s.endTime || ""}
                          disabled={!editable || legacy || busy}
                          onChange={(e) =>
                            changeSlots((v) =>
                              v.map((y, n) =>
                                n === i
                                  ? { ...y, endTime: e.target.value || undefined }
                                  : y,
                              ),
                            )
                          }
                        />
                      </label>
                      {editable && !legacy && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            changeSlots((v) => v.filter((_, n) => n !== i))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {!slots.length && (
                    <p className="text-sm text-muted-foreground">
                      لا توجد مواعيد لهذا الفصل.
                    </p>
                  )}
                </div>
                {legacy && <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">هذا جدول قديم متاح للعرض فقط. يلزم ترقية بيانات المواعيد بشكل منظّم قبل السماح بتعديله.</p>}
                {conflictNotice && <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{conflictNotice}</p>}
                {editable && !legacy && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        changeSlots((v) => [
                          ...v,
                          newEditableCourseScheduleSlot({
                            day: "sunday",
                            startTime: "18:00",
                            endTime: "19:00",
                          }),
                        ])
                      }
                    >
                      <Plus className="me-2 h-4 w-4" />
                      موعد
                    </Button>
                    <Button onClick={save} disabled={busy}>
                      {busy ? "جاري الحفظ..." : "حفظ الجدول"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
