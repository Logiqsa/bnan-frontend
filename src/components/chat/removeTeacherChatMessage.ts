import type { InfiniteData } from "@tanstack/react-query";
import type { ChatMessagesResponse } from "@/api/chatApi";

export type TeacherMessagesData = InfiniteData<ChatMessagesResponse, string | undefined>;

export const removeTeacherChatMessage = (
  current: TeacherMessagesData | undefined,
  messageId: string,
): TeacherMessagesData | undefined => {
  if (!current || !current.pages.some((page) => page.data.some((message) => message.id === messageId)))
    return current;
  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      data: page.data.filter((message) => message.id !== messageId),
    })),
  };
};
