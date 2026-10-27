import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { notificationsApi, type ApiNotification } from "@/api/notificationsApi";
import type { PortalRole } from "@/api/types";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";

export type Notification = ApiNotification;

const localizedText = (value: unknown, language: "ar" | "en" = "ar") => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const translations = value as Record<string, unknown>;
    const selected = translations[language] ?? translations.ar ?? translations.en;
    return typeof selected === "string" ? selected : "";
  }
  return "";
};

const mergeNotifications = (incoming: Notification[], current: Notification[]) => {
  const byId = new Map<string, Notification>();
  [...incoming, ...current].forEach((item) => {
    if (!byId.has(item.id)) byId.set(item.id, item);
  });
  return [...byId.values()]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 100);
};

const adminNotificationRoutes: Record<string, string> = {
  teacher_approval: "/admin?tab=teacher-applications",
  registration_requests: "/admin/students",
  students: "/admin/students",
  parents: "/admin/parents",
  users: "/admin?tab=all-users",
  classroom_change_requests: "/admin/classrooms",
  course_enrollment_requests: "/admin/courses",
  classroom_details: "/admin/classrooms",
  global_notification_details: "/admin/notifications/history",
  admin_payments: "/admin/payments",
  admin_subscriptions: "/admin/subscriptions",
  salary_approvals: "/admin/payroll",
  system_health: "/admin/client-errors",
  announcements: "/admin/announcements",
  courses: "/admin/courses",
  teachers: "/admin/teachers",
  schedule: "/admin/schedule",
  chat_room: "/admin/messages",
};

const teacherNotificationRoutes: Record<string, string> = {
  teacher_classrooms: "/portal/teacher/classrooms",
  teacher_home: "/portal/teacher",
  teacher_requests: "/portal/teacher/requests",
  chat_room: "/portal/teacher/messages",
  schedule: "/portal/teacher/schedule",
  session_details: "/portal/teacher/schedule",
  active_session: "/portal/teacher/schedule",
  session_summary: "/portal/teacher/schedule",
  teacher_students: "/portal/teacher/courses",
  classroom_details: "/portal/teacher/courses",
  courses: "/portal/teacher/courses",
  teacher_salary: "/portal/teacher/payroll",
  teacher_assignments: "/portal/teacher/classrooms",
  weekly_plan: "/portal/teacher/classrooms",
};

const supervisorNotificationRoutes: Record<string, string> = {
  supervisor_classrooms: "/portal/supervisor/classrooms",
  supervisor_sessions: "/portal/supervisor/schedule",
  attendance_sheet: "/portal/supervisor/schedule",
  schedule_conflicts: "/portal/supervisor/schedule",
  schedule: "/portal/supervisor/schedule",
  classroom_evaluations: "/portal/supervisor/evaluations",
  student_profile: "/portal/supervisor/classrooms",
  supervisor_students: "/portal/supervisor/classrooms",
  complaints: "/portal/supervisor/classrooms",
  chat_room: "/portal/supervisor/messages",
};

const studentNotificationRoutes: Record<string, string> = {
  student_home: "/portal/student",
  schedule: "/portal/student/schedule",
  active_session: "/portal/student/schedule",
  session_summary: "/portal/student/schedule",
  global_notification_details: "/portal/student/notifications",
  chat_room: "/portal/student/messages",
  student_evaluations: "/portal/student/evaluations",
  subscription: "/portal/student/subscriptions",
  subscription_usage: "/portal/student/subscriptions",
  packages: "/portal/student/subscriptions",
  certificates: "/portal/student/certificates",
  parent_child_certificates: "/portal/student/certificates",
  performance: "/portal/student/evaluations",
  ideal_student: "/portal/student/evaluations",
  weekly_evaluation: "/portal/student/evaluations",
  weekly_report: "/portal/student/evaluations",
  courses: "/portal/student/courses",
};

const notificationParam = (
  notification: Notification,
  key: string,
): string | undefined => {
  const value = notification.navigation?.params?.[key];
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
};

const firstParam = (notification: Notification, ...keys: string[]) => {
  for (const key of keys) {
    const value = notificationParam(notification, key)
      || (typeof notification.data?.[key] === "string" ? notification.data[key] as string : undefined);
    if (value) return value;
  }
  return undefined;
};

const globalNotificationLink = (notification: Notification, role: PortalRole) => {
  const broadcastId = firstParam(notification, "broadcastId")
    || (notification.resource?.model === "GlobalNotification" ? notification.resource.id || undefined : undefined);
  if (!broadcastId) return role === "admin" ? "/admin/notifications/history" : role === "supervisor" ? "/portal/supervisor/classrooms" : `/portal/${role}/notifications`;
  const prefix = role === "admin" ? "/admin/notifications" : `/portal/${role}/notifications`;
  return `${prefix}/${encodeURIComponent(broadcastId)}`;
};

const resourceNotificationLink = (notification: Notification, role: PortalRole) => {
  const model = notification.resource?.model?.toLowerCase();
  const resourceId = notification.resource?.id || undefined;
  if (!model || !resourceId) return undefined;
  const id = encodeURIComponent(resourceId);
  if (role === "admin") {
    const routes: Record<string, string> = {
      assignment: `/admin/assignments/${id}`,
      certificate: `/admin/certificates/${id}`,
      classroom: `/admin/classrooms/${id}`,
      parent: `/admin/parents/${id}`,
      payment: `/admin/payments/${id}`,
      student: `/admin/students/${id}`,
      subscription: `/admin/subscriptions/${id}`,
    };
    return routes[model];
  }
  if (role === "teacher") {
    if (model === "assignment") return `/portal/teacher/assignments/${id}`;
    if (model === "classroom") return `/portal/teacher/classrooms/${id}`;
  }
  if (role === "student") {
    if (model === "assignment") return `/portal/student/assignments?assignmentId=${id}`;
    if (model === "classroom") return `/portal/student/classrooms/${id}`;
    if (model === "courseenrollment") return `/portal/student/courses/${id}`;
    if (model === "certificate") return "/portal/student/certificates";
    if (model === "subscription" || model === "payment" || model === "package") return "/portal/student/subscriptions";
  }
  if (role === "supervisor" && model === "classroom") return `/portal/supervisor/classrooms/${id}`;
  return undefined;
};

const assignmentNotificationLink = (notification: Notification) => {
  const assignmentId = notificationParam(notification, "assignmentId")
    || (typeof notification.data?.assignmentId === "string" ? notification.data.assignmentId : undefined);
  return assignmentId
    ? `/portal/student/assignments?assignmentId=${encodeURIComponent(assignmentId)}`
    : "/portal/student/assignments";
};

const teacherNotificationLink = (
  notification: Notification,
  target: string | undefined,
): string | undefined => {
  if (notification.key === "TEACHER_ASSIGNMENT") {
    const classroomId = notificationParam(notification, "classroomId");
    return classroomId
      ? `/portal/teacher/classrooms/${encodeURIComponent(classroomId)}`
      : "/portal/teacher/classrooms";
  }

  if (target === "assignment_submissions" || notification.key === "ASSIGNMENT_SUBMITTED") {
    const assignmentId = notificationParam(notification, "assignmentId");
    const submissionId = notificationParam(notification, "submissionId");
    if (assignmentId) {
      const params = new URLSearchParams();
      if (submissionId) params.set("submissionId", submissionId);
      const query = params.toString();
      return `/portal/teacher/assignments/${encodeURIComponent(assignmentId)}${query ? `?${query}` : ""}`;
    }
    return "/portal/teacher/assignments";
  }

  if (target === "teacher_payroll_statement") {
    const statementId = notificationParam(notification, "statementId");
    return statementId ? `/portal/teacher/payroll-statements/${encodeURIComponent(statementId)}` : "/portal/teacher/payroll";
  }

  if (notification.type === "chat_room" || target === "chat_room") {
    const roomId = notificationParam(notification, "roomId");
    return roomId
      ? `/portal/teacher/messages?${new URLSearchParams({ roomId }).toString()}`
      : teacherNotificationRoutes.chat_room;
  }

  if (notification.key === "RECORDING_READY") {
    const classroomId = notificationParam(notification, "classroomId");
    return classroomId
      ? `/portal/teacher/classrooms/${encodeURIComponent(classroomId)}?tab=recordings`
      : teacherNotificationRoutes.classroom_details;
  }

  if (target === "session_details" || target === "session_summary") {
    const classroomId = notificationParam(notification, "classroomId");
    const sessionId = notificationParam(notification, "sessionId");
    if (classroomId && sessionId) {
      return `/portal/teacher/classrooms/${encodeURIComponent(classroomId)}/sessions/${encodeURIComponent(sessionId)}`;
    }
    return teacherNotificationRoutes[target];
  }

  if (target === "classroom_details") {
    const classroomId = notificationParam(notification, "classroomId");
    return classroomId
      ? `/portal/teacher/classrooms/${encodeURIComponent(classroomId)}`
      : teacherNotificationRoutes.classroom_details;
  }

  return target ? teacherNotificationRoutes[target] : undefined;
};

export const notificationLink = (
  notification: Notification,
  role: PortalRole,
): string | undefined => {
  const target = notification.navigation?.target || notification.navigation?.screen;
  if (notification.key === "GLOBAL_NOTIFICATION" || target === "global_notification_details") {
    return globalNotificationLink(notification, role);
  }
  if (role === "admin") {
    if (notification.type === "chat_room" || target === "chat_room") {
      const roomId = notificationParam(notification, "roomId");
      return roomId
        ? `/admin/messages?${new URLSearchParams({ roomId }).toString()}`
        : adminNotificationRoutes.chat_room;
    }
    if (target === "classroom_change_requests") {
      const requestId = notificationParam(notification, "requestId")
        || (typeof notification.data?.requestId === "string"
          ? notification.data.requestId
          : undefined);
      return requestId
        ? `/admin/classroom-change-requests?requestId=${encodeURIComponent(requestId)}`
        : "/admin/classroom-change-requests";
    }
    if (target === "course_enrollment_requests") {
      const courseId = notificationParam(notification, "courseId")
        || (typeof notification.data?.courseId === "string"
          ? notification.data.courseId
          : undefined);
      return courseId
        ? `/admin/courses/${encodeURIComponent(courseId)}`
        : adminNotificationRoutes.course_enrollment_requests;
    }
    const studentId = firstParam(notification, "studentId");
    if ((target === "students" || target === "registration_requests" || target === "student_profile") && studentId) return `/admin/students/${encodeURIComponent(studentId)}`;
    const parentId = firstParam(notification, "parentId");
    if (target === "parents" && parentId) return `/admin/parents/${encodeURIComponent(parentId)}`;
    const classroomId = firstParam(notification, "classroomId");
    if (target === "classroom_details" && classroomId) return `/admin/classrooms/${encodeURIComponent(classroomId)}`;
    const paymentId = firstParam(notification, "paymentId");
    if ((target === "admin_payments" || notification.resource?.model === "Payment") && paymentId) return `/admin/payments/${encodeURIComponent(paymentId)}`;
    const subscriptionId = firstParam(notification, "subscriptionId");
    if ((target === "admin_subscriptions" || notification.resource?.model === "Subscription") && subscriptionId) return `/admin/subscriptions/${encodeURIComponent(subscriptionId)}`;
    const certificateId = firstParam(notification, "certificateId");
    if (target === "certificates" && certificateId) return `/admin/certificates/${encodeURIComponent(certificateId)}`;
    const assignmentId = firstParam(notification, "assignmentId");
    const submissionId = firstParam(notification, "submissionId");
    if (assignmentId && (target === "assignment_details" || target === "assignment_submissions")) return submissionId ? `/admin/assignments/${encodeURIComponent(assignmentId)}/submissions/${encodeURIComponent(submissionId)}` : `/admin/assignments/${encodeURIComponent(assignmentId)}`;
    return (typeof target === "string" ? adminNotificationRoutes[target] : undefined)
      || resourceNotificationLink(notification, role);
  }
  if (role === "teacher") {
    if (target === "teacher_classrooms") {
      const classroomId = notificationParam(notification, "classroomId");
      return classroomId ? `/portal/teacher/classrooms/${encodeURIComponent(classroomId)}` : teacherNotificationRoutes.teacher_classrooms;
    }
    return teacherNotificationLink(
      notification,
      typeof target === "string" ? target : undefined,
    ) || resourceNotificationLink(notification, role);
  }
  if (role === "supervisor") {
    if (target === "supervisor_classrooms") {
      const classroomId = notificationParam(notification, "classroomId");
      return classroomId ? `/portal/supervisor/classrooms/${encodeURIComponent(classroomId)}` : supervisorNotificationRoutes.supervisor_classrooms;
    }
    if (target === "chat_room" || notification.type === "chat_room") {
      const roomId = firstParam(notification, "roomId", "chatId");
      return roomId ? `/portal/supervisor/messages?${new URLSearchParams({ roomId }).toString()}` : supervisorNotificationRoutes.chat_room;
    }
    const classroomId = firstParam(notification, "classroomId");
    if (target === "classroom_details" && classroomId) return `/portal/supervisor/classrooms/${encodeURIComponent(classroomId)}`;
    return (typeof target === "string" ? supervisorNotificationRoutes[target] : undefined)
      || resourceNotificationLink(notification, role);
  }
  if (role === "student") {
    if (notification.key === "RECORDING_READY") {
      const classroomId = notificationParam(notification, "classroomId");
      return classroomId
        ? `/portal/student/classrooms/${encodeURIComponent(classroomId)}?tab=recordings`
        : studentNotificationRoutes.student_home;
    }
    if (target === "classroom_details") {
      const classroomId = notificationParam(notification, "classroomId");
      return classroomId
        ? `/portal/student/classrooms/${encodeURIComponent(classroomId)}`
        : "/portal/student/classrooms";
    }
    if (target === "assignment_details" || notification.key === "HOMEWORK_CREATED" || notification.key === "HOMEWORK_GRADED") {
      return assignmentNotificationLink(notification);
    }
    if (notification.type === "chat_room" || target === "chat_room") {
      const roomId = notificationParam(notification, "roomId");
      return roomId
        ? `/portal/student/messages?${new URLSearchParams({ roomId }).toString()}`
        : studentNotificationRoutes.chat_room;
    }
    return (typeof target === "string" ? studentNotificationRoutes[target] : undefined)
      || resourceNotificationLink(notification, role);
  }
  return undefined;
};

export const adminNotificationLink = (notification: Notification): string | undefined =>
  notificationLink(notification, "admin");

export function useNotifications(language?: "ar" | "en") {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const receivedIds = useRef(new Set<string>());
  const initialized = useRef(false);

  const load = useCallback(async () => {
    // Changing language must refetch because the backend localizes title/body.
    void language;
    setLoading(true);
    setError(null);
    try {
      const response = await notificationsApi.list(100);
      const newlyLoaded = initialized.current
        ? response.data.filter((notification) => !receivedIds.current.has(notification.id))
        : [];
      response.data.forEach((notification) => receivedIds.current.add(notification.id));
      setItems((current) => mergeNotifications(response.data, current));
      setUnreadCount(response.unreadCount);
      if (newlyLoaded.length > 0) {
        newlyLoaded
          .slice()
          .reverse()
          .forEach((notification) => {
            toast(notification.title, { description: notification.body });
          });
      }
      initialized.current = true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تحميل الإشعارات.");
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    void load();
    const socket = getSocket();
    const receive = (payload: Notification) => {
      const notification = {
        ...payload,
        // Some backend emitters format before a request language is available
        // and therefore send the bilingual template object over the socket.
        title: localizedText(payload?.title, language),
        body: localizedText(payload?.body, language) || undefined,
      };
      if (!notification?.id) return;
      if (receivedIds.current.has(notification.id)) return;
      receivedIds.current.add(notification.id);
      setItems((current) => mergeNotifications([notification], current));
      setUnreadCount((current) => current + (notification.isRead ? 0 : 1));
      toast(notification.title, { description: notification.body });
    };
    const realtimeEvents = ["notification", "newNotification", "notification:new"];
    realtimeEvents.forEach((event) => socket.on(event, receive));
    socket.on("connect", load);
    const pollingTimer = window.setInterval(() => {
      void load();
    }, 15_000);
    return () => {
      realtimeEvents.forEach((event) => socket.off(event, receive));
      socket.off("connect", load);
      window.clearInterval(pollingTimer);
    };
  }, [load, language]);

  const markRead = useCallback(async (id: string) => {
    const target = items.find((item) => item.id === id);
    if (!target || target.isRead) return;
    setItems((current) => current.map((item) => item.id === id ? { ...item, isRead: true, status: "read" } : item));
    setUnreadCount((current) => Math.max(0, current - 1));
    try {
      const response = await notificationsApi.markRead([id]);
      setUnreadCount(response.data.unreadCount);
    } catch (reason) {
      setItems((current) => current.map((item) => item.id === id ? target : item));
      setUnreadCount((current) => current + 1);
      throw reason;
    }
  }, [items]);

  const markAllRead = useCallback(async () => {
    const previousItems = items;
    const previousCount = unreadCount;
    setItems((current) => current.map((item) => ({ ...item, isRead: true, status: "read" })));
    setUnreadCount(0);
    try {
      const response = await notificationsApi.markAllRead();
      setUnreadCount(response.data.unreadCount);
    } catch (reason) {
      setItems(previousItems); setUnreadCount(previousCount);
      throw reason;
    }
  }, [items, unreadCount]);

  return useMemo(() => ({ items, unreadCount, loading, error, reload: load, markRead, markAllRead }), [items, unreadCount, loading, error, load, markRead, markAllRead]);
}
