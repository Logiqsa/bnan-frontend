import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { coursesApi, type CourseEnrollment } from "@/api/coursesApi";
import { courseStaffApi } from "@/api/courseStaffApi";
import { teacherApplicationsApi } from "@/api/teacherApplicationsApi";
import { courseError, refId, refName } from "@/lib/courseUi";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import CourseClassroomChat from "@/components/CourseClassroomChat";
import { TeacherApplicationDetails } from "@/admin/TeacherApplicationDetails";
import { Loader2, MessageCircle, Users } from "lucide-react";

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

const enrollmentStudent = (enrollment: CourseEnrollment) => {
  const student = enrollment.student;
  if (!student) return { name: "طالب غير متاح", email: "" };
  if (typeof student === "string") return { name: student, email: "" };
  const user = typeof student.user === "object" ? student.user : null;
  return {
    name: user?.fullName || student.fullName || student.name || "طالب غير متاح",
    email: user?.email || "",
  };
};

const enrollmentGroupName = (enrollment: CourseEnrollment) => {
  const value = enrollment.group || enrollment.courseGroup;
  return typeof value === "object" && value ? value.name || "—" : "—";
};

const enrollmentStatusNames: Record<CourseEnrollment["status"], string> = {
  pending: "قيد الانتظار",
  active: "نشط",
  cancelled: "ملغي",
  refunded: "مسترد",
  expired: "منتهي",
  removed: "تمت إزالته",
};

export default function CourseDetailAdmin() {
  const { courseId = "" } = useParams();
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
  const query = useQuery({
    queryKey: ["admin-course", courseId],
    queryFn: () => coursesApi.getAdmin(courseId),
  });
  const groups = useQuery({
    queryKey: ["admin-course-groups", courseId],
    queryFn: () => coursesApi.listGroups(courseId),
  });
  const enrollments = useQuery({
    queryKey: ["admin-course-enrollments", courseId],
    queryFn: () => coursesApi.listEnrollments(courseId),
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
  const teacherUserId = (() => {
    const teacherId = refId(query.data?.teacher);
    const match = staff.data?.find((item) => item.id === teacherId || item.userId === teacherId);
    return match?.userId || (typeof query.data?.teacher === "object" && typeof query.data.teacher.user === "object" ? refId(query.data.teacher.user) : "") || teacherId;
  })();
  const teacherDetails = useQuery({
    queryKey: ["course-teacher-details", teacherUserId],
    queryFn: () => teacherApplicationsApi.getByUserId(teacherUserId),
    enabled: teacherDialogOpen && Boolean(teacherUserId),
  });
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
            <Breadcrumb dir="rtl">
              <BreadcrumbList>
                <BreadcrumbItem><BreadcrumbLink asChild><Link to="/admin">لوحة التحكم</Link></BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator className="rotate-180" />
                <BreadcrumbItem><BreadcrumbLink asChild><Link to="/admin/courses">الدورات</Link></BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator className="rotate-180" />
                <BreadcrumbItem><BreadcrumbPage>{query.data.name}</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
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
              <TabsList className="mb-5 grid h-11 w-full grid-cols-4 rounded-xl p-1">
                <TabsTrigger value="chat">المحادثة</TabsTrigger>
                <TabsTrigger value="groups">المجموعات</TabsTrigger>
                <TabsTrigger value="students">الطلاب المسجلون</TabsTrigger>
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
                          {staff.isLoading ? <p className="mt-1 font-bold">جاري تحميل الاسم...</p> : teacherUserId ? <button type="button" className="mt-1 font-bold text-primary underline-offset-4 hover:underline" onClick={() => setTeacherDialogOpen(true)}>{staffName(query.data.teacher)}</button> : <p className="mt-1 font-bold">{staffName(query.data.teacher)}</p>}
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
              <TabsContent value="groups" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 font-bold"><Users className="h-5 w-5" />مجموعات الدورة</h2>
                    <p className="mt-1 text-sm text-muted-foreground">المجموعات والفصول المرتبطة وعدد الطلاب في كل مجموعة.</p>
                  </div>
                  <Button variant="outline" asChild><Link to={`/admin/courses/${courseId}/groups`}>إدارة المجموعات</Link></Button>
                </div>
                {groups.isLoading ? (
                  <p className="py-10 text-center">جاري تحميل المجموعات...</p>
                ) : groups.error ? (
                  <div className="py-10 text-center text-destructive"><p>{courseError(groups.error)}</p><Button className="mt-3" variant="outline" onClick={() => void groups.refetch()}>إعادة المحاولة</Button></div>
                ) : !groups.data?.length ? (
                  <p className="rounded-xl border border-dashed py-10 text-center text-muted-foreground">لا توجد مجموعات في هذه الدورة حتى الآن.</p>
                ) : (
                  <div className="divide-y overflow-hidden rounded-xl border bg-card">
                    {groups.data.map((group) => {
                      const classroomId = classroomIdOf(group.classroom);
                      const classroomName = typeof group.classroom === "object" ? group.classroom?.name : "";
                      return <div key={group.id} className="flex flex-wrap items-center justify-between gap-4 p-4"><div><div className="flex flex-wrap items-center gap-2"><Link to={`/admin/courses/${courseId}/groups`} className="font-bold text-primary underline-offset-4 hover:underline">{group.name}</Link><Badge variant="secondary">{group.status}</Badge></div><p className="mt-2 text-sm text-muted-foreground">الطلاب: {group.studentsCount ?? 0}{group.capacity ? ` / ${group.capacity}` : ""}{classroomName ? ` · الفصل: ${classroomName}` : ""}</p></div>{classroomId && <Button size="sm" variant="outline" asChild><Link to={`/admin/course-classrooms/${classroomId}/schedule`}>عرض الجدول</Link></Button>}</div>;
                    })}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="students">
                <Card>
                  <CardContent className="p-5">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <h2 className="flex items-center gap-2 font-bold"><Users className="h-5 w-5" />الطلاب المسجلون</h2>
                        <p className="mt-1 text-sm text-muted-foreground">كل تسجيلات الدورة وحالتها والمجموعة التابعة لها.</p>
                      </div>
                      <Badge variant="secondary">{enrollments.data?.total ?? 0} طالب</Badge>
                    </div>
                    {enrollments.isLoading ? (
                      <p className="py-10 text-center">جاري تحميل الطلاب...</p>
                    ) : enrollments.error ? (
                      <div className="py-10 text-center text-destructive">
                        <p>{courseError(enrollments.error)}</p>
                        <Button className="mt-3" variant="outline" onClick={() => void enrollments.refetch()}>إعادة المحاولة</Button>
                      </div>
                    ) : !enrollments.data?.enrollments.length ? (
                      <p className="py-10 text-center text-muted-foreground">لا يوجد طلاب مسجلون في الدورة حتى الآن.</p>
                    ) : (
                      <div className="space-y-3">
                        {enrollments.data.enrollments.map((item) => {
                          const student = enrollmentStudent(item);
                          return <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-4"><div><p className="font-semibold">{student.name}</p>{student.email && <p className="mt-1 text-sm text-muted-foreground" dir="ltr">{student.email}</p>}</div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{item.mode === "group" ? enrollmentGroupName(item) : "فردي"}</Badge><Badge variant={item.status === "active" ? "default" : "secondary"}>{enrollmentStatusNames[item.status]}</Badge></div></div>;
                        })}
                      </div>
                    )}
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
            <Dialog open={teacherDialogOpen} onOpenChange={setTeacherDialogOpen}>
              <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
                <DialogHeader>
                  <DialogTitle>تفاصيل المعلم — {staffName(query.data.teacher)}</DialogTitle>
                  <DialogDescription>بيانات المعلم المسؤول عن هذه الدورة.</DialogDescription>
                </DialogHeader>
                {teacherDetails.isLoading ? <div className="grid min-h-48 place-items-center"><Loader2 className="h-7 w-7 animate-spin" /></div> : teacherDetails.error ? <div className="py-10 text-center text-destructive"><p>{courseError(teacherDetails.error)}</p><Button className="mt-3" variant="outline" onClick={() => void teacherDetails.refetch()}>إعادة المحاولة</Button></div> : teacherDetails.data?.data ? <TeacherApplicationDetails application={teacherDetails.data.data} /> : <p className="py-10 text-center text-muted-foreground">لا توجد تفاصيل إضافية متاحة لهذا المعلم.</p>}
              </DialogContent>
            </Dialog>
          </div>
        )
      )}
    </DashboardLayout>
  );
}
