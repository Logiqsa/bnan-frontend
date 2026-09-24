import type { ChatMessage } from "@/api/chatApi";
import type { TeacherMessagesData } from "@/components/chat/removeTeacherChatMessage";

export const updateTeacherChatMessage = (
  current: TeacherMessagesData | undefined,
  edited: ChatMessage,
): TeacherMessagesData | undefined => {
  if (!current || !edited.id) return current;
  if (!current.pages.some((page) => page.data.some((message) => message.id === edited.id)))
    return current;
  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      data: page.data.map((message) =>
        message.id === edited.id ? { ...message, ...edited } : message,
      ),
    })),
  };
};
