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
    curriculum?: { id?: string; _id?: string; name?: string } | null;
  } | null;
}

export interface TeacherRegularClassroom {
  assignmentId: string;
  classroomId: string;
  classroomName: string;
  registrationMode?: ClassroomRegistrationMode;
  curriculum?: { id: string; name: string } | null;
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
          curriculum: assignment.classroom.curriculum?.id || assignment.classroom.curriculum?._id
            ? { id: assignment.classroom.curriculum.id || assignment.classroom.curriculum._id || "", name: assignment.classroom.curriculum.name || "" }
            : null,
        };
      })
      .filter((item): item is TeacherRegularClassroom => Boolean(item));
  },
};
