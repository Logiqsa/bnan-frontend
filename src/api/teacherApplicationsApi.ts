import { apiRequest } from "./client";

export type TeacherApplicationStatus = "pending" | "approved" | "rejected";

export interface NamedEntity {
  id?: string;
  name?: string;
}

export interface TeacherAssignment {
  grade?: NamedEntity | string;
  subjects?: Array<NamedEntity | string>;
}

export interface TeacherApplication {
  id: string;
  _id?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  nationality?: string;
  country?: string;
  city?: string;
  dateOfBirth?: string;
  degree?: string;
  specialization?: string;
  institutionName?: string;
  graduationYear?: number;
  graduationGrade?: string;
  hasTeachingExperience?: boolean;
  hasOnlineTeachingExperience?: boolean;
  availableHoursPerWeek?: number;
  computerSkillLevel?: string;
  hasLaptop?: boolean;
  hasStableInternet?: boolean;
  hasGoodCamera?: boolean;
  hasMicrophone?: boolean;
  canProvideDemoSession?: boolean;
  introVideoUrl?: string;
  joiningReason?: string;
  weakStudentHandling?: string;
  termsAccepted?: boolean;
  status: TeacherApplicationStatus;
  isVerified?: boolean;
  emailVerified?: boolean;
  verified?: boolean;
  curriculum?: NamedEntity | string;
  curriculums?: Array<NamedEntity | string>;
  additionalCurriculums?: Array<NamedEntity | string>;
  teacherAssignments?: TeacherAssignment[];
  assignments?: TeacherAssignment[];
  teachingAssignments?: TeacherAssignment[];
  gradeSubjects?: TeacherAssignment[];
  grades?: Array<NamedEntity | string>;
  subjects?: Array<NamedEntity | string>;
  cv?: string;
  cvUrl?: string;
  certificate?: string;
  certificateUrl?: string;
  identityDocument?: string;
  identityDocumentUrl?: string;
  stableInternetProof?: string;
  stableInternetProofUrl?: string;
  experienceCertificates?: string[];
  termsAcceptedAt?: string;
  termsVersion?: number;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    id?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    status?: string;
    isVerified?: boolean;
    emailVerified?: boolean;
    verified?: boolean;
  };
}

export interface TeacherApplicationsResponse {
  success: true;
  data: TeacherApplication[];
  length?: number;
  currentPage?: number;
  totalCount?: number;
  totalPages?: number;
  page?: number;
  limit?: number;
  total?: number;
  hasNextPage?: boolean;
}

type TeacherApplicationPayload = Omit<TeacherApplication, "id"> & { id?: string; _id?: string };
type TeacherApplicationsPayload = Omit<TeacherApplicationsResponse, "data"> & { data: TeacherApplicationPayload[] };

const arrayValue = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
};

const normalizeTeacher = (item: TeacherApplicationPayload): TeacherApplication => {
  const raw = item as TeacherApplicationPayload & Record<string, unknown>;
  const curriculums = arrayValue<NamedEntity | string>(raw.curriculums);
  if (!curriculums.length && item.curriculum) curriculums.push(item.curriculum);
  const teacherAssignments = [raw.teacherAssignments, raw.assignments, raw.teachingAssignments, raw.gradeSubjects]
    .map((value) => arrayValue<TeacherAssignment>(value))
    .find((value) => value.length > 0) || [];
  return {
    ...item,
    id: item.id || item._id || "",
    curriculums,
    teacherAssignments,
  };
};

const normalizeList = (result: TeacherApplicationsPayload, requestedLimit = 20): TeacherApplicationsResponse => ({
  ...result,
  data: result.data.map(normalizeTeacher),
  page: result.page ?? result.currentPage,
  total: result.total ?? result.totalCount,
  hasNextPage: result.totalPages !== undefined
    ? (result.page ?? result.currentPage ?? 1) < result.totalPages
    : result.hasNextPage ?? (
      result.total !== undefined || result.totalCount !== undefined
        ? (result.page ?? result.currentPage ?? 1) * (result.limit ?? requestedLimit) < (result.total ?? result.totalCount ?? 0)
        : result.data.length === requestedLimit
    ),
});

const fetchAllByStatus = async (status: TeacherApplicationStatus) => {
  const applications = new Map<string, TeacherApplication>();
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const result = normalizeList(
      await apiRequest<TeacherApplicationsPayload>(`/teachers?status=${status}&page=${page}&limit=100`),
      100,
    );
    result.data.forEach((application) => applications.set(application.id, application));
    hasNextPage = result.data.length > 0 && Boolean(result.hasNextPage);
    page += 1;
  }

  return [...applications.values()];
};

export const teacherApplicationsApi = {
  list: async (status: TeacherApplicationStatus, page = 1, limit = 20) =>
    normalizeList(
      await apiRequest<TeacherApplicationsPayload>(`/teachers?status=${status}&page=${page}&limit=${limit}`),
      limit,
    ),
  countByStatus: async (status: TeacherApplicationStatus) => {
    return (await fetchAllByStatus(status)).length;
  },
  listAllByStatus: fetchAllByStatus,
  get: async (id: string) => {
    const result = await apiRequest<{ success: true; data: TeacherApplicationPayload }>(`/teachers/${id}`);
    return { ...result, data: normalizeTeacher(result.data) };
  },
  getByUserId: async (userId: string) => {
    const statuses: TeacherApplicationStatus[] = ["approved", "pending", "rejected"];
    for (const status of statuses) {
      let page = 1;
      let hasNextPage = true;
      while (hasNextPage) {
        const result = normalizeList(await apiRequest<TeacherApplicationsPayload>(`/teachers?status=${status}&page=${page}&limit=20`));
        const application = result.data.find((item) => item.user?.id === userId || item.id === userId);
        if (application) {
          const details = await apiRequest<{ success: true; data: TeacherApplicationPayload }>(`/teachers/${application.id}`);
          return { ...details, data: normalizeTeacher(details.data) };
        }
        hasNextPage = result.hasNextPage ?? result.data.length === 20;
        page += 1;
      }
    }
    return null;
  },
  updateStatus: async (id: string, status: Exclude<TeacherApplicationStatus, "pending">) => {
    const result = await apiRequest<{ success: true; data?: TeacherApplicationPayload; message?: string }>(`/teachers/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return { ...result, data: result.data ? normalizeTeacher(result.data) : undefined };
  },
};
