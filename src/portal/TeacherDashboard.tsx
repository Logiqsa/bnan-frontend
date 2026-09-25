import {
  BookOpen,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  RefreshCw,
  Timer,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePortalAuth } from "@/portal/PortalAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  teacherPendingRequestsPageQueryKey,
  teacherRequestsApi,
} from "@/api/teacherRequestsApi";
import { useTeacherUpcomingSessions } from "@/hooks/useTeacherUpcomingSessions";
import { coursesApi } from "@/api/coursesApi";

const TeacherDashboard = () => {
  const { user } = usePortalAuth();
  const { pick } = useLanguage();
  const pendingRequests = useQuery({
    queryKey: teacherPendingRequestsPageQueryKey(1, 20),
    queryFn: () => teacherRequestsApi.listPending({ page: 1, limit: 20 }),
    staleTime: 30_000,
    retry: 1,
  });
  const teachingCourses = useQuery({
    queryKey: ["teacher-courses"],
    queryFn: coursesApi.myTeachingCourses,
    staleTime: 30_000,
    retry: 1,
  });
  const upcomingSessions = useTeacherUpcomingSessions(user?.registrationModes);

  const courseAssignments = teachingCourses.data || [];
  const courseGroups = courseAssignments.flatMap(({ groups }) => groups);
  const hasReliableStudentCount = courseGroups.every(
    (group) => typeof group.studentsCount === "number",
  );
  const totalStudents = hasReliableStudentCount
    ? courseGroups.reduce((total, group) => total + group.studentsCount!, 0)
    : null;
  const activeCourses = courseAssignments.filter(
    ({ course }) => course.status === "active",
  ).length;
  const coursesWithRequiredMinutes = [
    ...new Map(
      courseAssignments
        .filter(
          ({ course }) =>
            typeof course.requiredMinutes === "number" &&
            Number.isFinite(course.requiredMinutes),
        )
        .map(({ course }) => [course.id, course] as const),
    ).values(),
  ];
  const totalRequiredMinutes = coursesWithRequiredMinutes.reduce(
    (total, course) => total + course.requiredMinutes!,
    0,
  );
  const groupProgress = courseAssignments.flatMap(({ course, groups }) =>
    groups.flatMap((group) =>
      group.progress ? [{ course, group, progress: group.progress }] : [],
    ),
  );

  const formatHours = (minutes: number) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
      minutes / 60,
    );

  const courseStatus = (status: string) => {
    const labels: Record<string, string> = {
      active: pick("نشطة", "Active"),
      completed: pick("مكتملة", "Completed"),
      cancelled: pick("ملغاة", "Cancelled"),
    };
    return labels[status] || status;
  };

  const sessionStatus = (status?: string) => {
    const labels: Record<string, string> = {
      starting: pick("جاري التجهيز", "Starting"),
      live: pick("مباشرة الآن", "Live now"),
      awaiting_zoom_end: pick("بانتظار الإنهاء", "Awaiting end"),
      ended: pick("انتهت", "Ended"),
      completed: pick("مكتملة", "Completed"),
    };
    return status ? labels[status] || status : null;
  };

  const dateLocale = pick("ar-EG-u-ca-gregory", "en-US-u-ca-gregory");

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <LayoutDashboard className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {pick("لوحة المعلم", "Teacher dashboard")}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                {pick(
                  `مرحبًا${user?.fullName ? `، ${user.fullName}` : ""}. ستجد هنا نظرة سريعة على يومك الدراسي.`,
                  `Welcome${user?.fullName ? `, ${user.fullName}` : ""}. Your teaching overview will appear here.`,
                )}
              </p>
            </div>
          </div>
        </header>

        <section
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          aria-label={pick("ملخص لوحة المعلم", "Teacher dashboard summary")}
        >
          <Card className="min-h-44 shadow-sm sm:col-span-2 xl:col-span-1">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <ClipboardList className="h-5 w-5" />
              </span>
              <CardTitle className="text-base">
                {pick("الطلبات المعلقة", "Pending requests")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-24 flex-col justify-between gap-4">
              {pendingRequests.isLoading ? (
                <div className="space-y-2" aria-label={pick("جاري تحميل الطلبات", "Loading requests")}>
                  <Skeleton className="h-9 w-16" />
                  <Skeleton className="h-4 w-36 max-w-full" />
                </div>
              ) : pendingRequests.isError ? (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">
                    {pick(
                      "تعذر تحميل الطلبات المعلقة.",
                      "Unable to load pending requests.",
                    )}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => void pendingRequests.refetch()}
                    disabled={pendingRequests.isFetching}
                  >
                    <RefreshCw className={`h-4 w-4 ${pendingRequests.isFetching ? "animate-spin" : ""}`} />
                    {pick("إعادة المحاولة", "Try again")}
                  </Button>
                </div>
              ) : (
                <div>
                  {typeof pendingRequests.data.pagination?.total === "number" ? (
                    <>
                      <p className="text-3xl font-bold tabular-nums text-primary">
                        {pendingRequests.data.pagination.total}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {pendingRequests.data.pagination.total === 0
                          ? pick("لا توجد طلبات معلقة حاليًا.", "No pending requests right now.")
                          : pick("طلبات بانتظار المراجعة.", "Requests awaiting review.")}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {pick(
                        "إجمالي الطلبات غير متاح حاليًا.",
                        "The pending request total is currently unavailable.",
                      )}
                    </p>
                  )}
                </div>
              )}
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link to="/portal/teacher/requests">
                  {pick("عرض الطلبات", "View requests")}
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="min-h-44 shadow-sm sm:col-span-2 xl:col-span-3">
            <CardHeader className="flex flex-col items-stretch justify-between gap-3 space-y-0 pb-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="h-5 w-5" />
                </span>
                <CardTitle className="text-base">
                  {pick("ملخص الدورات والفصول", "Courses and classrooms summary")}
                </CardTitle>
              </div>
              {!teachingCourses.isLoading && courseAssignments.length > 0 && (
                <Button asChild size="sm" variant="ghost" className="w-full shrink-0 sm:w-auto">
                  <Link to="/portal/teacher/courses">
                    {pick("عرض الدورات", "View courses")}
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {teachingCourses.isLoading ? (
                <div className="space-y-4" aria-label={pick("جاري تحميل الدورات", "Loading courses")}>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {[0, 1, 2].map((item) => (
                      <Skeleton key={item} className="h-16 rounded-xl" />
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>
                </div>
              ) : teachingCourses.isError ? (
                <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-center">
                  <p className="text-sm text-destructive">
                    {pick("تعذر تحميل بيانات الدورات.", "Unable to load course data.")}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    disabled={teachingCourses.isFetching}
                    onClick={() => void teachingCourses.refetch()}
                  >
                    <RefreshCw className={`h-4 w-4 ${teachingCourses.isFetching ? "animate-spin" : ""}`} />
                    {pick("إعادة المحاولة", "Try again")}
                  </Button>
                </div>
              ) : courseAssignments.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center text-center">
                  <BookOpen className="h-9 w-9 text-muted-foreground/60" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    {pick("لا توجد دورات مسندة إليك حاليًا.", "No courses are currently assigned to you.")}
                  </p>
                  <Button asChild size="sm" variant="outline" className="mt-4">
                    <Link to="/portal/teacher/courses">
                      {pick("فتح صفحة الدورات", "Open courses")}
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <dl className={`grid gap-2 ${totalStudents === null ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
                    <div className="min-w-0 rounded-xl bg-muted/50 p-3 text-center">
                      <dt className="text-xs text-muted-foreground">{pick("الدورات", "Courses")}</dt>
                      <dd className="mt-1 text-xl font-bold tabular-nums">{courseAssignments.length}</dd>
                    </div>
                    <div className="min-w-0 rounded-xl bg-muted/50 p-3 text-center">
                      <dt className="text-xs text-muted-foreground">{pick("المجموعات", "Groups")}</dt>
                      <dd className="mt-1 text-xl font-bold tabular-nums">{courseGroups.length}</dd>
                    </div>
                    <div className="min-w-0 rounded-xl bg-muted/50 p-3 text-center">
                      <dt className="text-xs text-muted-foreground">{pick("الدورات النشطة", "Active courses")}</dt>
                      <dd className="mt-1 text-xl font-bold tabular-nums">{activeCourses}</dd>
                    </div>
                    {totalStudents !== null && (
                      <div className="min-w-0 rounded-xl bg-muted/50 p-3 text-center">
                        <dt className="text-xs text-muted-foreground">{pick("الطلاب", "Students")}</dt>
                        <dd className="mt-1 text-xl font-bold tabular-nums">{totalStudents}</dd>
                      </div>
                    )}
                  </dl>
                  <div className="space-y-2">
                    {courseAssignments.slice(0, 3).map(({ course, groups }) => {
                      const reliableCourseStudents = groups.every(
                        (group) => typeof group.studentsCount === "number",
                      );
                      const courseStudents = reliableCourseStudents
                        ? groups.reduce((total, group) => total + group.studentsCount!, 0)
                        : null;
                      return (
                        <Link
                          key={course.id}
                          to={`/portal/teacher/courses/${course.id}`}
                          className="flex min-w-0 flex-col gap-2 rounded-xl border p-3 transition hover:border-primary/40 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="break-words text-sm font-semibold">{course.name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span>{groups.length} {pick("مجموعة", "groups")}</span>
                              {courseStudents !== null && (
                                <span className="inline-flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5" />
                                  {courseStudents} {pick("طالب", "students")}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant={course.status === "active" ? "default" : "secondary"}
                            className="w-fit shrink-0"
                          >
                            {courseStatus(course.status)}
                          </Badge>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="min-h-44 shadow-sm sm:col-span-2 xl:col-span-2">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Timer className="h-5 w-5" />
              </span>
              <CardTitle className="text-base">
                {pick("ملخص الساعات", "Hours summary")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teachingCourses.isLoading ? (
                <div className="space-y-3" aria-label={pick("جاري تحميل الساعات", "Loading hours")}>
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              ) : teachingCourses.isError ? (
                <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-center">
                  <p className="text-sm text-destructive">
                    {pick("تعذر تحميل بيانات الساعات.", "Unable to load hours data.")}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    disabled={teachingCourses.isFetching}
                    onClick={() => void teachingCourses.refetch()}
                  >
                    <RefreshCw className={`h-4 w-4 ${teachingCourses.isFetching ? "animate-spin" : ""}`} />
                    {pick("إعادة المحاولة", "Try again")}
                  </Button>
                </div>
              ) : courseAssignments.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center text-center">
                  <Timer className="h-9 w-9 text-muted-foreground/60" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    {pick(
                      "لا توجد دورات أو بيانات ساعات متاحة حاليًا.",
                      "No courses or hours data is currently available.",
                    )}
                  </p>
                </div>
              ) : coursesWithRequiredMinutes.length === 0 && groupProgress.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center text-center">
                  <Timer className="h-9 w-9 text-muted-foreground/60" />
                  <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                    {pick(
                      "تفاصيل الساعات المنجزة والمتبقية غير متاحة حاليًا.",
                      "Completed and remaining hours details are currently unavailable.",
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {coursesWithRequiredMinutes.length > 0 && (
                    <div className="rounded-xl bg-primary/5 p-4">
                      <p className="text-xs text-muted-foreground">
                        {pick("إجمالي الساعات المطلوبة للدورات", "Total required course hours")}
                      </p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-primary">
                        {formatHours(totalRequiredMinutes)} {pick("ساعة", "hours")}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {pick(
                          `محسوبة من requiredMinutes لعدد ${coursesWithRequiredMinutes.length} دورة فقط.`,
                          `Based only on requiredMinutes from ${coursesWithRequiredMinutes.length} courses.`,
                        )}
                      </p>
                    </div>
                  )}

                  {groupProgress.length > 0 && (
                    <div className="space-y-2">
                      {groupProgress.slice(0, 4).map(({ course, group, progress }) => (
                        <div key={`${course.id}-${group.id}`} className="rounded-xl border p-3">
                          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="break-words text-sm font-semibold">{course.name}</p>
                              <p className="mt-1 break-words text-xs text-muted-foreground">{group.name}</p>
                            </div>
                            {typeof progress.percentage === "number" && (
                              <Badge variant="secondary" className="w-fit shrink-0">
                                {progress.percentage}%
                              </Badge>
                            )}
                          </div>
                          <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                            {typeof progress.completedHours === "number" && (
                              <div className="rounded-lg bg-muted/50 p-2">
                                <dt className="text-muted-foreground">{pick("الساعات المنجزة", "Completed hours")}</dt>
                                <dd className="mt-1 font-semibold tabular-nums">{progress.completedHours}</dd>
                              </div>
                            )}
                            {typeof progress.totalHours === "number" && (
                              <div className="rounded-lg bg-muted/50 p-2">
                                <dt className="text-muted-foreground">{pick("إجمالي الساعات", "Total hours")}</dt>
                                <dd className="mt-1 font-semibold tabular-nums">{progress.totalHours}</dd>
                              </div>
                            )}
                            {typeof progress.remainingHours === "number" && (
                              <div className="rounded-lg bg-muted/50 p-2">
                                <dt className="text-muted-foreground">{pick("الساعات المتبقية", "Remaining hours")}</dt>
                                <dd className="mt-1 font-semibold tabular-nums">{progress.remainingHours}</dd>
                              </div>
                            )}
                          </dl>
                        </div>
                      ))}
                    </div>
                  )}

                  {groupProgress.length === 0 && (
                    <p className="rounded-xl border border-dashed p-3 text-sm leading-6 text-muted-foreground">
                      {pick(
                        "تفاصيل الساعات المنجزة والمتبقية غير متاحة حاليًا. الرقم المعروض يمثل الساعات المطلوبة للدورات فقط.",
                        "Completed and remaining hours details are currently unavailable. The displayed value represents required course hours only.",
                      )}
                    </p>
                  )}
                  {groupProgress.length > 0 &&
                    !groupProgress.some(
                      ({ progress }) => typeof progress.remainingHours === "number",
                    ) && (
                      <p className="rounded-xl border border-dashed p-3 text-sm leading-6 text-muted-foreground">
                        {pick(
                          "بيانات الساعات المتبقية غير متاحة في استجابة الدورات الحالية.",
                          "Remaining-hours data is not available in the current courses response.",
                        )}
                      </p>
                    )}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="min-h-44 shadow-sm sm:col-span-2 xl:col-span-2">
            <CardHeader className="flex flex-col items-stretch justify-between gap-3 space-y-0 pb-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <CardTitle className="text-base">
                  {pick("الحصص القادمة", "Upcoming sessions")}
                </CardTitle>
              </div>
              {!upcomingSessions.isLoading && upcomingSessions.lessons.length > 0 && (
                <Button asChild size="sm" variant="ghost" className="w-full shrink-0 sm:w-auto">
                  <Link to="/portal/teacher/schedule">
                    {pick("الجدول الكامل", "Full schedule")}
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {upcomingSessions.isLoading ? (
                <div className="space-y-3" aria-label={pick("جاري تحميل الحصص", "Loading sessions")}>
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-xl border p-3">
                      <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : upcomingSessions.allSourcesFailed ? (
                <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-center">
                  <p className="text-sm text-destructive">
                    {pick("تعذر تحميل الحصص القادمة.", "Unable to load upcoming sessions.")}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    disabled={upcomingSessions.isFetching}
                    onClick={() => void upcomingSessions.retry()}
                  >
                    <RefreshCw className={`h-4 w-4 ${upcomingSessions.isFetching ? "animate-spin" : ""}`} />
                    {pick("إعادة المحاولة", "Try again")}
                  </Button>
                </div>
              ) : upcomingSessions.lessons.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center text-center">
                  <CalendarClock className="h-9 w-9 text-muted-foreground/60" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    {pick("لا توجد حصص قادمة هذا الأسبوع.", "No upcoming sessions this week.")}
                  </p>
                  <Button asChild size="sm" variant="outline" className="mt-4">
                    <Link to="/portal/teacher/schedule">
                      {pick("فتح الجدول", "Open schedule")}
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingSessions.failedSources > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {pick(
                        "بعض بيانات الجدول غير متاحة حاليًا.",
                        "Some schedule data is currently unavailable.",
                      )}
                    </p>
                  )}
                  {upcomingSessions.lessons.map(({ lesson, startsAt }) => {
                    const status = sessionStatus(lesson.activeSession?.status);
                    return (
                      <Link
                        key={lesson.key}
                        to="/portal/teacher/schedule"
                        className="flex min-w-0 flex-col gap-3 rounded-xl border p-3 transition hover:border-primary/40 hover:bg-muted/40 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="break-words text-sm font-semibold">
                              {lesson.subject.name}
                            </p>
                            <Badge variant="outline" className="shrink-0 text-[10px]">
                              {lesson.scheduleKind === "course"
                                ? pick("دورة", "Course")
                                : lesson.registrationMode === "gulf"
                                  ? pick("خليجي", "Gulf")
                                  : pick("مصري", "Egyptian")}
                            </Badge>
                            {status && <Badge className="shrink-0 text-[10px]">{status}</Badge>}
                          </div>
                          {lesson.classroom.name && (
                            <p className="mt-1 break-words text-xs text-muted-foreground">
                              {lesson.classroom.name}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-start text-xs sm:text-end">
                          <p className="font-medium">
                            {startsAt.toLocaleDateString(dateLocale, {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                          <p dir="ltr" className="mt-1 text-muted-foreground sm:text-end">
                            {lesson.startTime}{lesson.endTime ? ` - ${lesson.endTime}` : ""}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
