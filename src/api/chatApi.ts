import { apiRequest } from "./client";

export interface ChatRoomSummary {
  id: string;
  type?: "support" | "teacher_parent" | "teacher_student" | "supervisor_student" | "classroom" | string;
  classroomId?: string;
  displayName?: string;
  subtitle?: string;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount?: number;
}
export interface AdminChatClassroomMetadata {
  classroomId: string;
  sourceType: "legacy" | "course";
  curriculumId?: string;
  curriculumName?: string;
  registrationMode?: "egyptian" | "gulf";
  gradeId?: string;
  gradeName?: string;
}
export interface ChatMessage {
  id: string;
  room?: string | { id?: string; _id?: string };
  text?: string;
  messageType?:
    | "text"
    | "session_summary"
    | "session_report"
    | "session_record"
    | string;
  session?: string | { id?: string; _id?: string };
  sessionName?: string;
  summaryTitle?: string;
  summaryContent?: string;
  summaryDocUrl?: string;
  reportSummary?: {
    participantRows?: number;
    uniqueParticipants?: number;
    startedAt?: string;
    endedAt?: string;
    durationMinutes?: number;
  };
  recordLink?: string;
  nextSteps?: string[];
  systemGenerated?: boolean;
  sender?: { id?: string; _id?: string; fullName?: string; role?: string };
  attachments?: Array<{
    fileName?: string;
    fileUrl: string;
    mimeType?: string;
    size?: number;
  }>;
  createdAt?: string;
  editedAt?: string;
  deletedForEveryone?: boolean;
  deletedAt?: string;
  updatedAt?: string;
}
export interface ChatMessagesResponse {
  success: true;
  data: ChatMessage[];
  pagination: { hasMore: boolean; nextCursor?: string | null };
}
interface AdminChatRoomsPage {
  success: true;
  data: Raw<Omit<ChatRoomSummary, "id">>[];
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
}
interface AdminClassroomsPage {
  success: true;
  data: Array<{
    id: string;
    curriculum?: { id?: string; name?: string; registrationMode?: "egyptian" | "gulf" };
    grade?: { id?: string; name?: string };
  }>;
  pagination: { currentPage: number; lastPage: number };
}
type Raw<T> = T & { _id?: string; id?: string };
const withId = <T extends object>(item: Raw<T>) => ({
  ...item,
  id: item.id || item._id || "",
});
export const chatApi = {
  rooms: async () =>
    (
      await apiRequest<{
        success: true;
        data: Raw<Omit<ChatRoomSummary, "id">>[];
      }>("/chats/rooms")
    ).data.map(withId),
  adminRooms: async (classroomId: string) => {
    const rooms: ChatRoomSummary[] = [];
    let page = 1;
    let hasNextPage = true;
    while (hasNextPage) {
      const response = await apiRequest<AdminChatRoomsPage>(
        `/chats/admin/rooms?type=classroom&classroomId=${encodeURIComponent(classroomId)}&page=${page}&limit=100`,
      );
      rooms.push(...response.data.map(withId));
      hasNextPage = response.hasNextPage;
      page += 1;
    }
    return rooms;
  },
  allAdminRooms: async () => {
    const rooms: ChatRoomSummary[] = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const response = await apiRequest<AdminChatRoomsPage>(
        `/chats/admin/rooms?page=${page}&limit=100`,
      );
      rooms.push(
        ...response.data
          .map(withId)
          .filter((room) => room.type !== "teacher_student"),
      );
      hasNextPage = response.hasNextPage;
      page += 1;
    }

    return rooms;
  },
  adminClassroomMetadata: async () => {
    const load = async (sourceType: "legacy" | "course") => {
      const items: AdminChatClassroomMetadata[] = [];
      let page = 1;
      let lastPage = 1;
      do {
        const response = await apiRequest<AdminClassroomsPage>(
          `/classrooms?sourceType=${sourceType}&page=${page}&limit=100`,
        );
        items.push(...response.data.map((classroom) => ({
          classroomId: classroom.id,
          sourceType,
          curriculumId: classroom.curriculum?.id,
          curriculumName: classroom.curriculum?.name,
          registrationMode: classroom.curriculum?.registrationMode,
          gradeId: classroom.grade?.id,
          gradeName: classroom.grade?.name,
        })));
        lastPage = response.pagination.lastPage;
        page += 1;
      } while (page <= lastPage);
      return items;
    };

    const [legacy, courses] = await Promise.all([load("legacy"), load("course")]);
    return [...legacy, ...courses];
  },
  messages: async (roomId: string, cursor?: string) => {
    const query = new URLSearchParams({ limit: "50" });
    if (cursor) query.set("cursor", cursor);
    const r = await apiRequest<{
      success: true;
      data: Raw<Omit<ChatMessage, "id">>[];
      pagination: { hasMore: boolean; nextCursor?: string | null };
    }>(`/chats/rooms/${roomId}/messages?${query}`);
    return { ...r, data: r.data.map(withId) };
  },
  send: async (roomId: string, text: string, attachments: File[] = []) => {
    const body: BodyInit = attachments.length > 0
      ? (() => {
          const form = new FormData();
          if (text.trim()) form.append("text", text.trim());
          attachments.forEach((file) => form.append("attachments", file));
          return form;
        })()
      : JSON.stringify({ text });
    return withId(
      (
        await apiRequest<{ success: true; data: Raw<Omit<ChatMessage, "id">> }>(
          `/chats/rooms/${roomId}/messages`,
          { method: "POST", body },
        )
      ).data,
    );
  },
  editMessage: async (messageId: string, text: string) =>
    withId(
      (
        await apiRequest<{ success: true; data: Raw<Omit<ChatMessage, "id">> }>(
          `/messages/${encodeURIComponent(messageId)}`,
          { method: "PATCH", body: JSON.stringify({ text }) },
        )
      ).data,
    ),
  read: (roomId: string) =>
    apiRequest(`/chats/rooms/${roomId}/read`, { method: "PATCH" }),
  deleteMessage: (roomId: string, messageId: string) =>
    apiRequest(`/chats/rooms/${encodeURIComponent(roomId)}/messages`, {
      method: "DELETE",
      body: JSON.stringify({ messageIds: [messageId] }),
    }),
};
