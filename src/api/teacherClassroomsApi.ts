import { apiRequest } from "@/api/client";

export type ClassroomRegistrationMode = "egyptian" | "gulf";

interface RawTeacherClassroomAssignment {
  _id?: string;
  id?: string;
  classroom?: {
    _id?: string;
    id?: string;
    name?: string;
    registrationMode?: ClassroomRegistrationMode;
  } | null;
}

export interface TeacherRegularClassroom {
  assignmentId: string;
  classroomId: string;
  classroomName: string;
  registrationMode?: ClassroomRegistrationMode;
}

export const teacherClassroomsApi = {
  listMine: async () => {
    const response = await apiRequest<{
      success: true;
      data: RawTeacherClassroomAssignment[];
    }>("/teachers/myclassrooms");

    return (Array.isArray(response.data) ? response.data : [])
      .map((assignment): TeacherRegularClassroom | null => {
        const classroomId = assignment.classroom?.id || assignment.classroom?._id || "";
        if (!classroomId || !assignment.classroom?.name) return null;
        return {
          assignmentId: assignment.id || assignment._id || "",
          classroomId,
          classroomName: assignment.classroom.name,
          registrationMode: assignment.classroom.registrationMode,
        };
      })
      .filter((item): item is TeacherRegularClassroom => Boolean(item));
  },
};
