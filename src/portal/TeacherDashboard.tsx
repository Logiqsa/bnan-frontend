import {
  Bell,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  ClipboardCheck,
  LayoutDashboard,
  RefreshCw,
  WalletCards,
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
import { teacherPayoutProfileApi } from "@/api/teacherPayoutProfileApi";
import { useNotificationsContext } from "@/contexts/notifications-context";
import { notificationLink } from "@/hooks/useNotifications";
import { formatScheduleTime } from "@/admin/zoom/classroomManagement";

const TeacherDashboardContent = () => {
  const { user } = usePortalAuth();
  const { pick, isArabic } = useLanguage();
  const {
    items: notifications,
    unreadCount,
    loading: notificationsLoading,
    error: notificationsError,
    reload: reloadNotifications,
  } = useNotificationsContext();
  const payoutProfile = useQuery({
    queryKey: ["teacher-payout-profile"],
    queryFn: teacherPayoutProfileApi.get,
    staleTime: 60_000,
    retry: 1,
  });
  const pendingRequests = useQuery({
    queryKey: teacherPendingRequestsPageQueryKey(1, 20),
    queryFn: () => teacherRequestsApi.listPending({ page: 1, limit: 20 }),
    staleTime: 30_000,
    retry: 1,
  });
  const upcomingSessions = useTeacherUpcomingSessions(user?.registrationModes);
  const pendingReviews = notifications.filter(
    (notification) =>
      notification.key === "ASSIGNMENT_SUBMITTED" && !notification.isRead,
  );

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

      {!payoutProfile.isError &&
        (payoutProfile.isPending ||
          !payoutProfile.data ||
          pendingReviews.length > 0) && (
          <section
            aria-label={pick("المهام المطلوبة", "To-do")}
            className="grid gap-4 md:grid-cols-2"
          >
            {payoutProfile.isPending ? (
              <Card className="shadow-sm">
                <CardContent className="p-5">
                  <Skeleton className="h-20 w-full rounded-xl" />
                </CardContent>
              </Card>
            ) : !payoutProfile.data ? (
              <Card className="border-primary/20 bg-primary/[0.03] shadow-sm">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <WalletCards className="h-5 w-5" />
                  </span>
                  <CardTitle className="text-base">
                    {pick("أكمل بيانات الاستلام", "Complete payout details")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm leading-6 text-muted-foreground">
                    {pick(
                      "أضف بيانات استلام مستحقاتك حتى نتمكن من تحويلها لك.",
                      "Add your payout details so we can transfer your earnings to you.",
                    )}
                  </p>
                  <Button asChild size="sm">
                    <Link to="/portal/teacher/settings">
                      {pick("إضافة البيانات", "Add details")}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : null}
            {pendingReviews.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/40 shadow-sm">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
                    <ClipboardCheck className="h-5 w-5" />
                  </span>
                  <CardTitle className="text-base">
                    {pick("واجبات تحتاج إلى تصحيح", "Assignments to grade")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pendingReviews.slice(0, 3).map((notification) => {
                    const link = notificationLink(notification, "teacher");
                    const studentName =
                      typeof notification.data?.studentName === "string" &&
                      notification.data.studentName.trim()
                        ? notification.data.studentName
                        : pick("طالب", "A student");
                    const assignmentTitle =
                      typeof notification.data?.assignmentTitle === "string" &&
                      notification.data.assignmentTitle.trim()
                        ? notification.data.assignmentTitle
                        : pick("واجب", "an assignment");
                    return link ? (
                      <Link
                        key={notification.id}
                        to={link}
                        className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3 text-sm transition hover:border-primary/40 hover:bg-muted/40"
                      >
                        <span className="min-w-0 break-words">
                          <strong>{studentName}</strong> —{" "}
                          {pick("سلّم", "submitted")} {assignmentTitle}
                        </span>
                        <span className="shrink-0 text-primary">
                          {pick("تصحيح", "Grade")}
                        </span>
                      </Link>
                    ) : null;
                  })}
                  {pendingReviews.length > 3 && (
                    <Link
                      to="/portal/teacher/notifications"
                      className="block text-sm text-primary hover:underline"
                    >
                      {pick(
                        `عرض ${pendingReviews.length - 3} مهام أخرى`,
                        `View ${pendingReviews.length - 3} more tasks`,
                      )}
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}
          </section>
        )}

      <section
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        aria-label={pick("ملخص لوحة المعلم", "Teacher dashboard summary")}
      >
        <Card className="min-h-44 shadow-sm md:col-span-2 xl:order-2 xl:row-start-2 xl:col-span-1">
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
              <div
                className="space-y-2"
                aria-label={pick("جاري تحميل الطلبات", "Loading requests")}
              >
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
                  <RefreshCw
                    className={`h-4 w-4 ${pendingRequests.isFetching ? "animate-spin" : ""}`}
                  />
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
                        ? pick(
                            "لا توجد طلبات معلقة حاليًا.",
                            "No pending requests right now.",
                          )
                        : pick(
                            "طلبات بانتظار المراجعة.",
                            "Requests awaiting review.",
                          )}
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
        <Card className="min-h-44 shadow-sm xl:order-1 xl:row-start-1 xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Bell className="h-5 w-5" />
              </span>
              <CardTitle className="text-base">
                {pick("الإشعارات", "Notifications")}
              </CardTitle>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link to="/portal/teacher/notifications">
                {pick("عرض الكل", "View all")}
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {notificationsLoading ? (
              <div
                className="space-y-2"
                aria-label={pick(
                  "جاري تحميل الإشعارات",
                  "Loading notifications",
                )}
              >
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : notificationsError ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive">
                  {pick(
                    "تعذر تحميل الإشعارات.",
                    "Unable to load notifications.",
                  )}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void reloadNotifications()}
                >
                  {pick("إعادة المحاولة", "Retry")}
                </Button>
              </div>
            ) : notifications.length === 0 ? (
              <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                {pick("لا توجد إشعارات حتى الآن.", "No notifications yet.")}
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {unreadCount > 0
                    ? pick(
                        `${unreadCount} إشعار غير مقروء`,
                        `${unreadCount} unread notifications`,
                      )
                    : pick("كل الإشعارات مقروءة", "All notifications are read")}
                </p>
                <div className="space-y-2">
                  {notifications.slice(0, 2).map((notification) => (
                    <Link
                      key={notification.id}
                      to={
                        notificationLink(notification, "teacher") ||
                        "/portal/teacher/notifications"
                      }
                      className={`block rounded-xl border p-3 text-sm transition hover:border-primary/40 hover:bg-muted/40 ${notification.isRead ? "" : "border-primary/30 bg-primary/[0.03]"}`}
                    >
                      <p className="break-words font-semibold">
                        {notification.title || pick("إشعار", "Notification")}
                      </p>
                      {notification.body && (
                        <p className="mt-1 line-clamp-2 break-words text-xs text-muted-foreground">
                          {notification.body}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="min-h-44 shadow-sm xl:order-3 xl:row-span-2 xl:row-start-1 xl:col-span-2 xl:h-full">
          <CardHeader className="flex flex-col items-stretch justify-between gap-3 space-y-0 pb-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <CalendarDays className="h-5 w-5" />
              </span>
              <CardTitle className="text-base">
                {pick("الحصص القادمة", "Upcoming sessions")}
              </CardTitle>
            </div>
            {!upcomingSessions.isLoading &&
              upcomingSessions.lessons.length > 0 && (
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="w-full shrink-0 sm:w-auto"
                >
                  <Link to="/portal/teacher/schedule">
                    {pick("الجدول الكامل", "Full schedule")}
                  </Link>
                </Button>
              )}
          </CardHeader>
          <CardContent>
            {upcomingSessions.isLoading ? (
              <div
                className="space-y-3"
                aria-label={pick("جاري تحميل الحصص", "Loading sessions")}
              >
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-xl border p-3"
                  >
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
                  {pick(
                    "تعذر تحميل الحصص القادمة.",
                    "Unable to load upcoming sessions.",
                  )}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  disabled={upcomingSessions.isFetching}
                  onClick={() => void upcomingSessions.retry()}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${upcomingSessions.isFetching ? "animate-spin" : ""}`}
                  />
                  {pick("إعادة المحاولة", "Try again")}
                </Button>
              </div>
            ) : upcomingSessions.lessons.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center text-center">
                <CalendarClock className="h-9 w-9 text-muted-foreground/60" />
                <p className="mt-3 text-sm text-muted-foreground">
                  {pick(
                    "لا توجد حصص قادمة هذا الأسبوع.",
                    "No upcoming sessions this week.",
                  )}
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
                          <Badge
                            variant="outline"
                            className="shrink-0 text-[10px]"
                          >
                            {lesson.scheduleKind === "course"
                              ? pick("دورة", "Course")
                              : lesson.registrationMode === "gulf"
                                ? pick("خليجي", "Gulf")
                                : pick("مصري", "Egyptian")}
                          </Badge>
                          {status && (
                            <Badge className="shrink-0 text-[10px]">
                              {status}
                            </Badge>
                          )}
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
                        <p
                          dir="ltr"
                          className="mt-1 text-muted-foreground sm:text-end"
                        >
                          {formatScheduleTime(lesson.startTime, isArabic)}
                          {lesson.endTime ? ` - ${formatScheduleTime(lesson.endTime, isArabic)}` : ""}
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
  );
};

const TeacherDashboard = () => (
  <DashboardLayout>
    <TeacherDashboardContent />
  </DashboardLayout>
);

export default TeacherDashboard;
