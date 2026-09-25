import { apiRequest } from "./client";

export interface StudentClassroomEnrollment {
  id: string;
  status: "pending" | "approved" | "rejected" | "archived";
  classroom: { id: string; name: string } | string;
}

interface RawEnrollment extends Omit<StudentClassroomEnrollment, "id" | "classroom"> {
  id?: string;
  _id?: string;
  classroom: { id?: string; _id?: string; name: string } | string;
}

export const studentClassroomsApi = {
  myEnrollments: async () => {
    const response = await apiRequest<{ success: true; data: RawEnrollment[] }>(
      "/students/me/enrollments",
    );
    return response.data.map((item): StudentClassroomEnrollment => {
      const { _id, ...fields } = item;
      return {
        ...fields,
        id: item.id || _id || "",
        classroom: typeof item.classroom === "object" ? {
          id: item.classroom.id || item.classroom._id || "",
          name: item.classroom.name,
        } : item.classroom,
      };
    });
  },
};
