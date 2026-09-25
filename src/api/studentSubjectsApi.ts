import { apiRequest } from "@/api/client";

export interface StudentSubject {
  id: string;
  name: string;
}

interface StudentSubjectsResponse {
  success: true;
  data: Array<StudentSubject & { _id?: string }>;
}

export const studentSubjectsQueryKey = ["student-subjects"] as const;

export const studentSubjectsApi = {
  list: async (): Promise<StudentSubject[]> => {
    const response = await apiRequest<StudentSubjectsResponse>("/students/me/subjects");
    return response.data.map((subject) => ({
      id: subject.id || subject._id || "",
      name: subject.name,
    }));
  },
};
