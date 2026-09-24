import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, MessageCircle, MessagesSquare, RefreshCw } from "lucide-react";
import { chatApi, type ChatMessage, type ChatRoomSummary } from "@/api/chatApi";
import ChatRoomList from "@/components/chat/ChatRoomList";
import TeacherChatConversation from "@/components/chat/TeacherChatConversation";
import { removeTeacherChatMessage, type TeacherMessagesData } from "@/components/chat/removeTeacherChatMessage";
import { updateTeacherChatMessage } from "@/components/chat/updateTeacherChatMessage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSocket } from "@/lib/socket";

const messageQueryPrefix = "admin-classroom-chat-messages";
type RealtimeMessage = ChatMessage & { _id?: string };

const messageRoomId = (room: ChatMessage["room"]) =>
  typeof room === "string" ? room : room?.id || room?._id || "";

const roomClassroomId = (room: ChatRoomSummary) => {
  const value = room.classroomId as unknown;
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const reference = value as { id?: string; _id?: string };
    return reference.id || reference._id || "";
  }
  return "";
};

export default function AdminClassroomChat({
  classroomId,
  active,
}: {
  classroomId: string;
  active: boolean;
}) {
  const queryClient = useQueryClient();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const selectedRoomIdRef = useRef<string | null>(null);
  const processedMessageIds = useRef(new Set<string>());
  const roomsQueryKey = useMemo(
    () => ["admin-classroom-chat-rooms", classroomId] as const,
    [classroomId],
  );
  const rooms = useQuery({
    queryKey: roomsQueryKey,
    queryFn: () => chatApi.adminRooms(classroomId),
    enabled: active && Boolean(classroomId),
    staleTime: 30_000,
    retry: 1,
  });
  const roomItems = useMemo(
    () => (rooms.data || []).filter(
      (room) => room.type === "classroom" && roomClassroomId(room) === classroomId,
    ),
    [classroomId, rooms.data],
  );
  const roomIdsKey = roomItems.map((room) => room.id).join("|");
  const selectedRoom = roomItems.find((room) => room.id === selectedRoomId);

  const markRoomRead = useCallback((roomId: string) => {
    queryClient.setQueryData<ChatRoomSummary[]>(roomsQueryKey, (current) =>
      current?.map((room) => room.id === roomId ? { ...room, unreadCount: 0 } : room),
    );
  }, [queryClient, roomsQueryKey]);

  useEffect(() => {
    selectedRoomIdRef.current = selectedRoomId;
  }, [selectedRoomId]);

  useEffect(() => {
    if (selectedRoomId && !roomItems.some((room) => room.id === selectedRoomId)) {
      setSelectedRoomId(null);
    }
  }, [roomIdsKey, roomItems, selectedRoomId]);

  useEffect(() => {
    if (!active) return;
    const roomIds = roomIdsKey.split("|").filter(Boolean);
    if (!roomIds.length) return;
    const socket = getSocket();
    const joinRooms = () => {
      roomIds.forEach((roomId) => socket.emit("joinRoom", roomId));
      if (selectedRoomIdRef.current) socket.emit("markAsRead", selectedRoomIdRef.current);
    };
    const reconnect = () => {
      joinRooms();
      void queryClient.invalidateQueries({ queryKey: roomsQueryKey });
      if (selectedRoomIdRef.current) {
        void queryClient.invalidateQueries({
          queryKey: [messageQueryPrefix, selectedRoomIdRef.current],
        });
      }
    };
    const receiveMessage = (raw: RealtimeMessage) => {
      const id = raw.id || raw._id || "";
      const roomId = messageRoomId(raw.room);
      if (!id || !roomIds.includes(roomId) || processedMessageIds.current.has(id)) return;
      const messageKey = [messageQueryPrefix, roomId] as const;
      const cached = queryClient.getQueryData<TeacherMessagesData>(messageKey);
      if (cached?.pages.some((page) => page.data.some((message) => message.id === id))) {
        processedMessageIds.current.add(id);
        return;
      }
      processedMessageIds.current.add(id);
      const incoming = { ...raw, id };
      if (cached) {
        queryClient.setQueryData<TeacherMessagesData>(messageKey, (current) => current ? {
          ...current,
          pages: current.pages.map((page, index) =>
            index === 0 ? { ...page, data: [...page.data, incoming] } : page,
          ),
        } : current);
      } else if (roomId === selectedRoomIdRef.current) {
        void queryClient.invalidateQueries({ queryKey: messageKey });
      }
      if (roomId === selectedRoomIdRef.current) {
        markRoomRead(roomId);
        socket.emit("markAsRead", roomId);
      } else {
        queryClient.setQueryData<ChatRoomSummary[]>(roomsQueryKey, (current) =>
          current?.map((room) => room.id === roomId
            ? { ...room, unreadCount: (room.unreadCount ?? 0) + 1 }
            : room),
        );
      }
    };
    const receiveEdited = (raw: RealtimeMessage) => {
      const id = raw.id || raw._id || "";
      const roomId = messageRoomId(raw.room);
      if (!id || !roomIds.includes(roomId)) return;
      queryClient.setQueryData<TeacherMessagesData>(
        [messageQueryPrefix, roomId],
        (current) => updateTeacherChatMessage(current, { ...raw, id }),
      );
    };
    const receiveDeleted = (payload: { roomId?: string; messageId?: string }) => {
      const roomId = String(payload?.roomId || "");
      const messageId = String(payload?.messageId || "");
      if (!messageId || !roomIds.includes(roomId)) return;
      queryClient.setQueryData<TeacherMessagesData>(
        [messageQueryPrefix, roomId],
        (current) => removeTeacherChatMessage(current, messageId),
      );
    };
    const receiveRead = (payload: { roomId?: string }) => {
      const roomId = String(payload?.roomId || "");
      if (roomIds.includes(roomId)) markRoomRead(roomId);
    };

    socket.on("newMessage", receiveMessage);
    socket.on("messageEdited", receiveEdited);
    socket.on("messageDeleted", receiveDeleted);
    socket.on("roomRead", receiveRead);
    socket.on("connect", reconnect);
    if (socket.connected) joinRooms();

    return () => {
      socket.off("newMessage", receiveMessage);
      socket.off("messageEdited", receiveEdited);
      socket.off("messageDeleted", receiveDeleted);
      socket.off("roomRead", receiveRead);
      socket.off("connect", reconnect);
      roomIds.forEach((roomId) => socket.emit("leaveRoom", roomId));
    };
  }, [active, markRoomRead, queryClient, roomIdsKey, roomsQueryKey]);

  return (
    <Card className="h-[70dvh] min-h-[32rem] overflow-hidden shadow-sm">
      <div className="grid h-full min-h-0 min-w-0 md:grid-cols-[minmax(13rem,18rem)_minmax(0,1fr)]">
        <aside
          className={`${selectedRoomId ? "hidden md:flex" : "flex"} min-h-0 min-w-0 flex-col overflow-hidden border-e bg-card`}
          aria-label="محادثات الفصل"
        >
          <div className="border-b p-4">
            <h2 className="font-semibold">محادثات الفصل</h2>
            {rooms.isSuccess && <p className="mt-1 text-xs text-muted-foreground">{roomItems.length} محادثة</p>}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {rooms.isLoading ? (
              <div className="space-y-3 p-4" aria-label="جاري تحميل محادثات الفصل">
                <Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" />
              </div>
            ) : rooms.isError ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-5 text-center">
                <p className="text-sm text-destructive">تعذر تحميل محادثات الفصل.</p>
                <Button type="button" size="sm" variant="outline" onClick={() => void rooms.refetch()}>
                  <RefreshCw className="ml-2 h-4 w-4" />إعادة المحاولة
                </Button>
              </div>
            ) : roomItems.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center p-5 text-center text-muted-foreground">
                <MessageCircle className="h-10 w-10 opacity-50" />
                <p className="mt-3">لا توجد محادثات لهذا الفصل</p>
              </div>
            ) : (
              <ChatRoomList rooms={roomItems} selectedRoomId={selectedRoomId} onSelect={setSelectedRoomId} showPreview />
            )}
          </div>
        </aside>

        <section className={`${selectedRoomId ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-col overflow-hidden bg-muted/10`} aria-label="محادثة الفصل المحددة">
          {selectedRoom && (
            <div className="flex min-w-0 items-center gap-3 border-b bg-card p-3 md:p-4">
              <Button type="button" size="icon" variant="ghost" className="shrink-0 md:hidden" onClick={() => setSelectedRoomId(null)} aria-label="العودة إلى محادثات الفصل">
                <ArrowRight className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h2 className="break-words font-semibold">{selectedRoom.displayName || "محادثة الفصل"}</h2>
                {selectedRoom.subtitle && <p className="mt-0.5 break-words text-xs text-muted-foreground">{selectedRoom.subtitle}</p>}
              </div>
            </div>
          )}
          {selectedRoom ? (
            <TeacherChatConversation
              key={selectedRoom.id}
              room={selectedRoom}
              onRead={markRoomRead}
              queryKeyPrefix={messageQueryPrefix}
            />
          ) : (
            <div className="flex min-h-64 flex-1 items-center justify-center p-6 text-center">
              <div>
                <MessagesSquare className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 font-semibold">اختر محادثة لعرض الرسائل.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </Card>
  );
}
