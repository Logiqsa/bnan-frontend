import { apiRequest } from "./client";
import type { GulfPaymentProvider, TamaraPaymentAddress } from "./types";

export type CourseMode = "group" | "individual";
export type CourseStatus = "active" | "completed" | "cancelled";
export type EnrollmentStatus =
  | "pending"
  | "active"
  | "cancelled"
  | "refunded"
  | "expired"
  | "removed";

export interface NamedRef {
  id?: string;
  _id?: string;
  name?: string;
  fullName?: string;
  user?:
    | string
    | { id?: string; _id?: string; fullName?: string; email?: string };
}
export interface CourseModeConfig {
  enabled: boolean;
  price: number;
}
export interface Course {
  id: string;
  name: string;
  description: string;
  image?: string;
  teacher: string | NamedRef;
  supervisor?: string | NamedRef | null;
  eligibleGrades: NamedRef[];
  grades?: NamedRef[];
  currency: string;
  curriculum?: string | NamedRef;
  enrollmentModes: Record<CourseMode, CourseModeConfig>;
  isPublished?: boolean;
  enrollmentOpen: boolean;
  status: CourseStatus;
  createdAt?: string;
  updatedAt?: string;
  subject?: string | NamedRef | null;
  requiredMinutes?: number;
  durationHours?: number;
  requiredDuration?: number;
  canEnroll?: boolean;
  availabilityReason?: string | null;
  groupManagementMode?: "automatic" | "manual";
  groupCapacity?: number;
}
export interface CourseInput {
  name: string;
  description: string;
  image?: string;
  teacher: string;
  supervisor?: string | null;
  grades: string[];
  subject: string;
  requiredMinutes: number;
  enrollmentModes: Record<CourseMode, CourseModeConfig>;
  currency: string;
  isPublished: boolean;
  enrollmentOpen: boolean;
  status?: CourseStatus;
  groupManagementMode?: "automatic" | "manual";
  groupCapacity?: number;
}

// The current production validator still reads eligibleGrades, while the
// Courses contract exposes grades. Keep both names at the transport boundary
// until the deployed validator is aligned; both contain the exact same IDs.
const courseInputBody = (body: CourseInput) => ({
  ...body,
  eligibleGrades: body.grades,
});
export interface CourseClassroom {
  id: string;
  name: string;
  courseMode?: CourseMode;
  isActive?: boolean;
}
export type CourseGroupStatus =
  | "draft"
  | "open"
  | "full"
  | "in_progress"
  | "completed"
  | "closed"
  | "cancelled";
export interface CourseGroup {
  id: string;
  name: string;
  status: CourseGroupStatus;
  capacity?: number;
  studentsCount?: number;
  classroom?: CourseClassroom | string | null;
  progress?: CourseProgress;
}
export interface CourseProgress {
  completedHours: number;
  totalHours: number;
  percentage: number;
}
export interface CourseEnrollment {
  id: string;
  course: Course | NamedRef | string;
  student?: NamedRef | string;
  mode: CourseMode;
  classroom?: CourseClassroom | string | null;
  payment?: NamedRef | string | null;
  group?: CourseGroup | NamedRef | string | null;
  status: EnrollmentStatus;
  price: number;
  currency: string;
  enrolledAt?: string;
  createdAt?: string;
}
export interface CourseScheduleSlot {
  day:
    | "saturday"
    | "sunday"
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday";
  startTime: string;
  endTime?: string;
}
export interface CourseSchedule {
  id?: string;
  classroom?: string;
  timezone: string;
  slots: CourseScheduleSlot[];
  updatedAt?: string;
}
export interface CourseCheckoutBody {
  courseId: string;
  mode: CourseMode;
  provider: GulfPaymentProvider;
  locale: "ar_SA" | "en_US";
  isMobile: false;
  paymentAddress?: TamaraPaymentAddress;
}
interface Envelope<T> {
  success: true;
  data: T;
}
type Raw<T> = T & { _id?: string; id?: string };
const withId = <T extends object>(item: Raw<T>): T & { id: string } => ({
  ...item,
  id: item.id || item._id || "",
});
const course = (item: Raw<Omit<Course, "id">>): Course => ({
  ...item,
  id: item.id || item._id || "",
  eligibleGrades: item.grades || item.eligibleGrades || [],
  enrollmentModes: item.enrollmentModes || {
    group: { enabled: false, price: 0 },
    individual: { enabled: false, price: 0 },
  },
});
const enrollment = (
  item: Raw<Omit<CourseEnrollment, "id">>,
): CourseEnrollment => ({
  ...item,
  id: item.id || item._id || "",
  course:
    typeof item.course === "object" && "name" in item.course
      ? course(item.course as Raw<Omit<Course, "id">>)
      : item.course,
  classroom:
    typeof item.classroom === "object" && item.classroom
      ? withId(item.classroom as Raw<Omit<CourseClassroom, "id">>)
      : item.classroom,
  group:
    typeof item.group === "object" && item.group
      ? group(item.group as Raw<Omit<CourseGroup, "id">>)
      : item.group,
});
const group = (item: Raw<Omit<CourseGroup, "id">>): CourseGroup => ({
  ...item,
  id: item.id || item._id || "",
  classroom:
    typeof item.classroom === "object" && item.classroom
      ? withId(item.classroom as Raw<Omit<CourseClassroom, "id">>)
      : item.classroom,
});

export const coursesApi = {
  uploadImage: async (file: File) => {
    const form = new FormData();
    form.append("image", file);
    return (
      await apiRequest<Envelope<{ path: string; url?: string }>>(
        "/admin/courses/images",
        { method: "POST", body: form },
      )
    ).data;
  },
  listPublic: async () => {
    const r = await apiRequest<Envelope<Raw<Omit<Course, "id">>[]>>("/courses");
    return r.data.map(course);
  },
  getPublic: async (id: string) =>
    course(
      (await apiRequest<Envelope<Raw<Omit<Course, "id">>>>(`/courses/${id}`))
        .data,
    ),
  listAdmin: async () => {
    const r =
      await apiRequest<Envelope<Raw<Omit<Course, "id">>[]>>("/admin/courses");
    return r.data.map(course);
  },
  getAdmin: async (id: string) =>
    course(
      (
        await apiRequest<Envelope<Raw<Omit<Course, "id">>>>(
          `/admin/courses/${id}`,
        )
      ).data,
    ),
  create: async (body: CourseInput) =>
    course(
      (
        await apiRequest<Envelope<Raw<Omit<Course, "id">>>>("/admin/courses", {
          method: "POST",
          body: JSON.stringify(courseInputBody(body)),
        })
      ).data,
    ),
  update: async (id: string, body: CourseInput) =>
    course(
      (
        await apiRequest<Envelope<Raw<Omit<Course, "id">>>>(
          `/admin/courses/${id}`,
          { method: "PATCH", body: JSON.stringify(courseInputBody(body)) },
        )
      ).data,
    ),
  setPublished: async (id: string, isPublished: boolean) =>
    course(
      (
        await apiRequest<Envelope<Raw<Omit<Course, "id">>>>(
          `/admin/courses/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify({ isPublished }),
          },
        )
      ).data,
    ),
  enrollFree: async (id: string, mode: CourseMode) =>
    enrollment(
      (
        await apiRequest<Envelope<Raw<Omit<CourseEnrollment, "id">>>>(
          `/courses/${id}/enroll`,
          { method: "POST", body: JSON.stringify({ mode }) },
        )
      ).data,
    ),
  checkout: (body: CourseCheckoutBody, key: string) =>
    apiRequest<
      Envelope<{
        paymentId: string;
        checkoutUrl: string;
        orderId: string;
        status: string;
      }>
    >("/payment/courses/checkout", {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: JSON.stringify(body),
    }),
  myEnrollments: async () => {
    const r = await apiRequest<Envelope<Raw<Omit<CourseEnrollment, "id">>[]>>(
      "/courses/me/enrollments",
    );
    return r.data.map(enrollment);
  },
  myEnrollment: async (id: string) =>
    enrollment(
      (
        await apiRequest<Envelope<Raw<Omit<CourseEnrollment, "id">>>>(
          `/courses/me/enrollments/${id}`,
        )
      ).data,
    ),
  myProgress: async (id: string) =>
    (
      await apiRequest<Envelope<CourseProgress>>(
        `/courses/me/enrollments/${id}/progress`,
      )
    ).data,
  listGroups: async (courseId: string) => {
    const r = await apiRequest<Envelope<Raw<Omit<CourseGroup, "id">>[]>>(
      `/admin/courses/${courseId}/groups`,
    );
    return r.data.map(group);
  },
  createGroup: async (
    courseId: string,
    body: { name: string; capacity?: number },
  ) =>
    group(
      (
        await apiRequest<Envelope<Raw<Omit<CourseGroup, "id">>>>(
          `/admin/courses/${courseId}/groups`,
          { method: "POST", body: JSON.stringify(body) },
        )
      ).data,
    ),
  updateGroupStatus: async (groupId: string, status: CourseGroupStatus) =>
    group(
      (
        await apiRequest<Envelope<Raw<Omit<CourseGroup, "id">>>>(
          `/admin/courses/groups/${groupId}/status`,
          { method: "PATCH", body: JSON.stringify({ status }) },
        )
      ).data,
    ),
  revoke: async (id: string, status: "cancelled" | "refunded" | "removed") =>
    enrollment(
      (
        await apiRequest<Envelope<Raw<Omit<CourseEnrollment, "id">>>>(
          `/admin/courses/enrollments/${id}/status`,
          { method: "PATCH", body: JSON.stringify({ status }) },
        )
      ).data,
    ),
  getSchedule: async (classroomId: string) =>
    (
      await apiRequest<Envelope<CourseSchedule | null>>(
        `/courses/classrooms/${classroomId}/schedule`,
      )
    ).data,
  updateSchedule: async (
    classroomId: string,
    body: Pick<CourseSchedule, "timezone" | "slots">,
  ) =>
    (
      await apiRequest<Envelope<CourseSchedule>>(
        `/courses/classrooms/${classroomId}/schedule`,
        { method: "PUT", body: JSON.stringify(body) },
      )
    ).data,
};
