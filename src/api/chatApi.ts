import { apiRequest } from "./client";

export interface ChatRoomSummary { id: string; classroomId?: string; displayName?: string; subtitle?: string; unreadCount?: number }
export interface ChatMessage { id: string; text?: string; sender?: { id?: string; _id?: string; fullName?: string; role?: string }; attachments?: Array<{ fileName?: string; fileUrl: string; mimeType?: string }>; createdAt?: string }
type Raw<T> = T & { _id?: string; id?: string };
const withId = <T extends object>(item: Raw<T>) => ({ ...item, id: item.id || item._id || "" });
export const chatApi = {
  rooms: async () => (await apiRequest<{ success: true; data: Raw<Omit<ChatRoomSummary,"id">>[] }>("/chats/rooms")).data.map(withId),
  adminRooms: async (classroomId: string) => (await apiRequest<{ success: true; data: Raw<Omit<ChatRoomSummary,"id">>[] }>(`/chats/admin/rooms?type=classroom&classroomId=${encodeURIComponent(classroomId)}&limit=10`)).data.map(withId),
  messages: async (roomId: string) => { const r=await apiRequest<{ success: true; data: Raw<Omit<ChatMessage,"id">>[]; pagination: { hasMore: boolean; nextCursor?: string } }>(`/chats/rooms/${roomId}/messages?limit=50`); return { ...r, data:r.data.map(withId) }; },
  send: async (roomId: string, text: string) => withId((await apiRequest<{ success: true; data: Raw<Omit<ChatMessage,"id">> }>(`/chats/rooms/${roomId}/messages`, { method:"POST", body:JSON.stringify({ text }) })).data),
  read: (roomId: string) => apiRequest(`/chats/rooms/${roomId}/read`, { method:"PATCH" }),
};
