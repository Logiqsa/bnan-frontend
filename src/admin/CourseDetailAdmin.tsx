import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { coursesApi } from "@/api/coursesApi";
import { courseStaffApi } from "@/api/courseStaffApi";
import { courseError, refId, refName } from "@/lib/courseUi";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import CourseClassroomChat from "@/components/CourseClassroomChat";
import { MessageCircle } from "lucide-react";

const classroomIdOf = (value: unknown) =>
  typeof value === "string"
    ? value
    : value && typeof value === "object"
      ? String(
          (value as { id?: string; _id?: string }).id ||
            (value as { _id?: string })._id ||
            "",
        )
      : "";

export default function CourseDetailAdmin() {
  const { courseId = "" } = useParams();
  const query = useQuery({
    queryKey: ["admin-course", courseId],
    queryFn: () => coursesApi.getAdmin(courseId),
  });
  const groups = useQuery({
    queryKey: ["admin-course-groups", courseId],
    queryFn: () => coursesApi.listGroups(courseId),
  });
  const staff = useQuery({
    queryKey: ["course-admin-staff-names"],
    queryFn: async () => {
      const [teachers, supervisors] = await Promise.all([
        courseStaffApi.teachers(),
        courseStaffApi.supervisors(),
      ]);
      return [...teachers, ...supervisors];
    },
  });
  const staffName = (value: Parameters<typeof refId>[0]) => {
    const id = refId(value);
    const resolved = staff.data?.find(
      (item) => item.id === id || item.userId === id,
    )?.name;
    if (resolved) return resolved;
    const populatedName = refName(value);
    return typeof value !== "string" && populatedName !== "—"
      ? populatedName
      : "غير متاح";
  };
  const [selectedClassroomId, setSelectedClassroomId] = useState("");
  return (
    <DashboardLayout>
      {query.isLoading ? (
        <p>جاري التحميل...</p>
      ) : query.error ? (
        <p className="text-destructive">{courseError(query.error)}</p>
      ) : (
        query.data && (
          <div className="mx-auto max-w-5xl space-y-5">
            <div className="flex items-center justify-between rounded-2xl border bg-card p-4 shadow-sm">
              <div>
                <p className="text-xs text-muted-foreground">تفاصيل الدورة</p>
                <h1 className="mt-1 text-2xl font-bold">{query.data.name}</h1>
              </div>
              <Button asChild>
                <Link to={`/admin/courses/${courseId}/edit`}>تعديل</Link>
              </Button>
            </div>
            <Tabs defaultValue="details">
              <TabsList className="mb-5 grid h-11 w-full grid-cols-3 rounded-xl p-1">
                <TabsTrigger value="chat">المحادثة</TabsTrigger>
                <TabsTrigger value="enrollments">التسجيلات والفصول</TabsTrigger>
                <TabsTrigger value="details">التفاصيل</TabsTrigger>
              </TabsList>
              <TabsContent value="details">
                <Accordion
                  type="multiple"
                  defaultValue={["basic"]}
                  className="space-y-3"
                >
                  <AccordionItem
                    value="basic"
                    className="overflow-hidden rounded-2xl border bg-card px-5 shadow-sm"
                  >
                    <AccordionTrigger className="text-lg font-bold hover:no-underline">
                      المعلومات الأساسية
                    </AccordionTrigger>
                    <AccordionContent className="border-t pt-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border bg-muted/30 p-4 sm:col-span-2">
                          <p className="mb-1 text-xs text-muted-foreground">
                            وصف الدورة
                          </p>
                          <p className="whitespace-pre-wrap">
                            {query.data.description}
                          </p>
                        </div>
                        <div className="rounded-xl border bg-muted/30 p-4">
                          <p className="text-xs text-muted-foreground">
                            المعلم
                          </p>
                          <p className="mt-1 font-bold">
                            {staff.isLoading
                              ? "جاري تحميل الاسم..."
                              : staffName(query.data.teacher)}
                          </p>
                        </div>
                        <div className="rounded-xl border bg-muted/30 p-4">
                          <p className="text-xs text-muted-foreground">
                            المشرف
                          </p>
                          <p className="mt-1 font-bold">
                            {query.data.supervisor
                              ? staffName(query.data.supervisor)
                              : "غير معين"}
                          </p>
                        </div>
                        <div className="rounded-xl border bg-muted/30 p-4 sm:col-span-2">
                          <p className="mb-2 text-xs text-muted-foreground">
                            حالة الدورة
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Badge>{query.data.status}</Badge>
                            <Badge variant="outline">
                              {query.data.isPublished ? "منشورة" : "مسودة"}
                            </Badge>
                            <Badge variant="outline">
                              {query.data.enrollmentOpen
                                ? "التسجيل مفتوح"
                                : "التسجيل مغلق"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem
                    value="modes"
                    className="overflow-hidden rounded-2xl border bg-card px-5 shadow-sm"
                  >
                    <AccordionTrigger className="text-lg font-bold hover:no-underline">
                      أنماط التسجيل والأسعار
                    </AccordionTrigger>
                    <AccordionContent className="border-t pt-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border bg-muted/30 p-4">
                          <p className="text-xs text-muted-foreground">
                            التسجيل الجماعي
                          </p>
                          <p className="mt-1 font-bold">
                            {query.data.enrollmentModes.group.enabled
                              ? `${query.data.enrollmentModes.group.price} ${query.data.currency}`
                              : "معطل"}
                          </p>
                        </div>
                        <div className="rounded-xl border bg-muted/30 p-4">
                          <p className="text-xs text-muted-foreground">
                            التسجيل الفردي
                          </p>
                          <p className="mt-1 font-bold">
                            {query.data.enrollmentModes.individual.enabled
                              ? `${query.data.enrollmentModes.individual.price} ${query.data.currency}`
                              : "معطل"}
                          </p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>
              <TabsContent value="enrollments">
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    استجابة تفاصيل الدورة الحالية لا تُرجع التسجيلات أو الفصول
                    المرتبطة.
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="chat">
                <div className="space-y-4">
                  <div>
                    <h2 className="font-semibold">محادثات مجموعات الدورة</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      لكل مجموعة فصل ومحادثة مستقلة. اختر المجموعة لفتح
                      محادثتها.
                    </p>
                  </div>
                  {groups.isLoading ? (
                    <p className="rounded-xl border p-8 text-center">
                      جاري تحميل المحادثات...
                    </p>
                  ) : groups.error ? (
                    <p className="rounded-xl border p-8 text-center text-destructive">
                      {courseError(groups.error)}
                    </p>
                  ) : !groups.data?.some((group) =>
                      classroomIdOf(group.classroom),
                    ) ? (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        لا توجد مجموعات مرتبطة بفصول حتى الآن، لذلك لا توجد
                        محادثات متاحة.
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {groups.data
                          .filter((group) => classroomIdOf(group.classroom))
                          .map((group) => {
                            const classroomId = classroomIdOf(group.classroom);
                            const selected =
                              selectedClassroomId === classroomId;
                            return (
                              <button
                                type="button"
                                key={group.id}
                                onClick={() =>
                                  setSelectedClassroomId(classroomId)
                                }
                                className={`rounded-xl border p-4 text-right transition-colors hover:border-primary ${selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card"}`}
                              >
                                <MessageCircle className="mb-3 h-5 w-5 text-primary" />
                                <p className="font-semibold">{group.name}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {typeof group.classroom === "object"
                                    ? group.classroom?.name
                                    : "محادثة الفصل"}
                                </p>
                                <Badge className="mt-3" variant="secondary">
                                  {group.status}
                                </Badge>
                              </button>
                            );
                          })}
                      </div>
                      {selectedClassroomId ? (
                        <CourseClassroomChat
                          classroomId={selectedClassroomId}
                        />
                      ) : (
                        <Card>
                          <CardContent className="p-8 text-center text-muted-foreground">
                            اختر مجموعة من البطاقات لعرض محادثتها.
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )
      )}
    </DashboardLayout>
  );
}
