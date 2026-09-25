import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, MessageCircle, MessagesSquare, RefreshCw, Search } from "lucide-react";
import { chatApi, type ChatMessage, type ChatRoomSummary } from "@/api/chatApi";
import ChatRoomList from "@/components/chat/ChatRoomList";
import TeacherChatConversation from "@/components/chat/TeacherChatConversation";
import {
  removeTeacherChatMessage,
  type TeacherMessagesData,
} from "@/components/chat/removeTeacherChatMessage";
import { updateTeacherChatMessage } from "@/components/chat/updateTeacherChatMessage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import DashboardLayout from "@/layouts/DashboardLayout";
import { getSocket } from "@/lib/socket";
import { usePortalAuth } from "@/portal/PortalAuthContext";

const studentChatRoomsQueryKey = ["student-chat-rooms"] as const;
const studentMessagesQueryKeyPrefix = "student-chat-messages";
type RealtimeChatMessage = ChatMessage & { _id?: string };

const roomReferenceId = (room: ChatMessage["room"]) =>
  typeof room === "string" ? room : room?.id || room?._id || "";

const messagePreview = (message: ChatMessage) =>
  message.text?.trim() ||
  (message.attachments?.length ? "📎 Attachment" : "") ||
  message.summaryTitle?.trim() ||
  message.sessionName?.trim() ||
  "";

const StudentMessages = () => {
  const { pick } = useLanguage();
  const { user } = usePortalAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const requestedRoomId = searchParams.get("roomId")?.trim() || null;
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomSearch, setRoomSearch] = useState("");
  const selectedRoomIdRef = useRef<string | null>(null);
  const handledRequestedRoomId = useRef<string | null>(null);
  const processedMessageIds = useRef(new Set<string>());

  const rooms = useQuery({
    queryKey: studentChatRoomsQueryKey,
    queryFn: chatApi.rooms,
    staleTime: 30_000,
    retry: 1,
  });
  const roomItems = useMemo(() => rooms.data || [], [rooms.data]);
  const roomIdsKey = roomItems.map((room) => room.id).join("|");
  const selectedRoom = roomItems.find((room) => room.id === selectedRoomId);
  const invalidRequestedRoom = Boolean(
    requestedRoomId && rooms.isSuccess && !roomItems.some((room) => room.id === requestedRoomId),
  );
  const filteredRooms = useMemo(() => {
    const search = roomSearch.trim().toLocaleLowerCase();
    if (!search) return roomItems;
    return roomItems.filter((room) =>
      [room.displayName, room.subtitle].some((value) =>
        value?.toLocaleLowerCase().includes(search),
      ),
    );
  }, [roomItems, roomSearch]);

  const markRoomRead = useCallback((roomId: string) => {
    queryClient.setQueryData<ChatRoomSummary[]>(studentChatRoomsQueryKey, (current) =>
      current?.map((room) => room.id === roomId ? { ...room, unreadCount: 0 } : room),
    );
  }, [queryClient]);

  useEffect(() => {
    selectedRoomIdRef.current = selectedRoomId;
  }, [selectedRoomId]);

  useEffect(() => {
    if (!requestedRoomId || !rooms.isSuccess) return;
    if (handledRequestedRoomId.current === requestedRoomId) return;
    handledRequestedRoomId.current = requestedRoomId;
    if (roomItems.some((room) => room.id === requestedRoomId)) {
      setSelectedRoomId(requestedRoomId);
    } else {
      setSelectedRoomId(null);
    }
  }, [requestedRoomId, roomIdsKey, roomItems, rooms.isSuccess]);

  useEffect(() => {
    const roomIds = roomIdsKey.split("|").filter(Boolean);
    if (!roomIds.length) return;
    const socket = getSocket();
    const joinRooms = () => {
      roomIds.forEach((roomId) => socket.emit("joinRoom", roomId));
      if (selectedRoomIdRef.current) socket.emit("markAsRead", selectedRoomIdRef.current);
    };
    const receiveMessage = (raw: RealtimeChatMessage) => {
      const messageId = raw.id || raw._id || "";
      const roomId = roomReferenceId(raw.room);
      if (!messageId || !roomId || !roomIds.includes(roomId)) return;
      if (processedMessageIds.current.has(messageId)) return;

      const messageKey = [studentMessagesQueryKeyPrefix, roomId] as const;
      const cached = queryClient.getQueryData<TeacherMessagesData>(messageKey);
      if (cached?.pages.some((page) => page.data.some((message) => message.id === messageId))) {
        processedMessageIds.current.add(messageId);
        return;
      }
      processedMessageIds.current.add(messageId);
      const incoming = { ...raw, id: messageId };
      const active = selectedRoomIdRef.current === roomId;

      if (active) {
        if (cached) {
          queryClient.setQueryData<TeacherMessagesData>(messageKey, (current) => current ? {
            ...current,
            pages: current.pages.map((page, index) =>
              index === 0 ? { ...page, data: [...page.data, incoming] } : page,
            ),
          } : current);
        } else {
          void queryClient.invalidateQueries({ queryKey: messageKey });
        }
        markRoomRead(roomId);
        socket.emit("markAsRead", roomId);
      }

      const senderId = raw.sender?.id || raw.sender?._id;
      queryClient.setQueryData<ChatRoomSummary[]>(studentChatRoomsQueryKey, (current) =>
        current?.map((room) => room.id === roomId ? {
          ...room,
          lastMessage: messagePreview(incoming) || room.lastMessage,
          lastMessageAt: incoming.createdAt || room.lastMessageAt,
          unreadCount: active || senderId === user?.id
            ? active ? 0 : room.unreadCount
            : (room.unreadCount ?? 0) + 1,
        } : room),
      );
    };
    const receiveEdited = (raw: RealtimeChatMessage) => {
      const id = raw.id || raw._id || "";
      const roomId = roomReferenceId(raw.room);
      if (!id || !roomId || !roomIds.includes(roomId)) return;
      queryClient.setQueryData<TeacherMessagesData>(
        [studentMessagesQueryKeyPrefix, roomId],
        (current) => updateTeacherChatMessage(current, { ...raw, id }),
      );
    };
    const receiveDeleted = (payload: { roomId?: string; messageId?: string }) => {
      const roomId = String(payload.roomId || "");
      const messageId = String(payload.messageId || "");
      if (!roomId || !messageId || !roomIds.includes(roomId)) return;
      queryClient.setQueryData<TeacherMessagesData>(
        [studentMessagesQueryKeyPrefix, roomId],
        (current) => removeTeacherChatMessage(current, messageId),
      );
    };
    const receiveRoomRead = (payload: { roomId?: string; unreadCount?: number }) => {
      if (payload.roomId && payload.unreadCount === 0) markRoomRead(String(payload.roomId));
    };
    const reconnect = () => {
      joinRooms();
      void queryClient.invalidateQueries({ queryKey: studentChatRoomsQueryKey });
      if (selectedRoomIdRef.current) {
        void queryClient.invalidateQueries({
          queryKey: [studentMessagesQueryKeyPrefix, selectedRoomIdRef.current],
        });
      }
    };

    socket.on("newMessage", receiveMessage);
    socket.on("messageEdited", receiveEdited);
    socket.on("messageDeleted", receiveDeleted);
    socket.on("roomRead", receiveRoomRead);
    socket.on("connect", reconnect);
    if (socket.connected) joinRooms();

    return () => {
      socket.off("newMessage", receiveMessage);
      socket.off("messageEdited", receiveEdited);
      socket.off("messageDeleted", receiveDeleted);
      socket.off("roomRead", receiveRoomRead);
      socket.off("connect", reconnect);
      roomIds.forEach((roomId) => socket.emit("leaveRoom", roomId));
    };
  }, [markRoomRead, queryClient, roomIdsKey, user?.id]);

  return (
    <DashboardLayout>
      <div className="mx-auto flex h-[calc(100dvh-9rem)] min-h-0 w-full max-w-7xl flex-col gap-4 md:h-[calc(100dvh-7rem)]">
        <header className="shrink-0 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <MessagesSquare className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{pick("الرسائل", "Messages")}</h1>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {pick("محادثات الفصول والدعم المتاحة لك.", "Your available classroom and support conversations.")}
              </p>
            </div>
          </div>
        </header>

        <Card className="min-h-0 flex-1 overflow-hidden shadow-sm">
          <div className="grid h-full min-h-0 min-w-0 md:grid-cols-[minmax(13rem,18rem)_minmax(0,1fr)]">
            <aside className={`${selectedRoomId ? "hidden md:flex" : "flex"} min-h-0 min-w-0 flex-col overflow-hidden border-e bg-card`}>
              <div className="border-b p-3">
                <h2 className="font-semibold">{pick("المحادثات", "Conversations")}</h2>
                <div className="relative mt-3">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={roomSearch} onChange={(event) => setRoomSearch(event.target.value)} placeholder={pick("ابحث عن محادثة...", "Search conversations...")} className="ps-9" />
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {rooms.isLoading ? (
                  <div className="space-y-2 p-3" aria-label={pick("جاري تحميل المحادثات", "Loading conversations")}>
                    {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-20 w-full rounded-xl" />)}
                  </div>
                ) : rooms.isError ? (
                  <State icon={<RefreshCw className="h-9 w-9" />} text={pick("تعذر تحميل المحادثات.", "Unable to load conversations.")} action={<Button size="sm" variant="outline" onClick={() => void rooms.refetch()}>{pick("إعادة المحاولة", "Retry")}</Button>} />
                ) : roomItems.length === 0 ? (
                  <State icon={<MessageCircle className="h-10 w-10" />} text={pick("لا توجد محادثات متاحة حتى الآن.", "No conversations are available yet.")} />
                ) : filteredRooms.length === 0 ? (
                  <State icon={<Search className="h-9 w-9" />} text={pick("لا توجد محادثات مطابقة للبحث.", "No matching conversations.")} />
                ) : (
                  <ChatRoomList rooms={filteredRooms} selectedRoomId={selectedRoomId} onSelect={setSelectedRoomId} showPreview />
                )}
              </div>
            </aside>

            <section className={`${selectedRoomId ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-col overflow-hidden bg-muted/10`}>
              {selectedRoom && (
                <div className="flex min-w-0 items-center gap-3 border-b bg-card p-3 md:p-4">
                  <Button type="button" size="icon" variant="ghost" className="shrink-0 md:hidden" onClick={() => setSelectedRoomId(null)} aria-label={pick("العودة إلى المحادثات", "Back to conversations")}>
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                  <div className="min-w-0">
                    <h2 className="break-words text-sm font-semibold sm:text-base">{selectedRoom.displayName || pick("محادثة", "Conversation")}</h2>
                    {selectedRoom.subtitle && <p className="mt-0.5 break-words text-xs text-muted-foreground">{selectedRoom.subtitle}</p>}
                  </div>
                </div>
              )}
              {selectedRoom ? (
                <TeacherChatConversation
                  key={selectedRoom.id}
                  room={selectedRoom}
                  onRead={markRoomRead}
                  queryKeyPrefix={studentMessagesQueryKeyPrefix}
                  unknownMessageLabel={pick("رسالة غير مدعومة", "Unsupported message")}
                />
              ) : (
                <State
                  icon={<MessagesSquare className="h-12 w-12" />}
                  text={invalidRequestedRoom ? pick("المحادثة المطلوبة غير متاحة.", "The requested conversation is unavailable.") : pick("اختر محادثة لعرض الرسائل.", "Select a conversation to view messages.")}
                />
              )}
            </section>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

const State = ({ icon, text, action }: { icon: React.ReactNode; text: string; action?: React.ReactNode }) => (
  <div className="flex min-h-48 flex-1 flex-col items-center justify-center gap-3 p-5 text-center text-muted-foreground">
    <span className="opacity-50">{icon}</span>
    <p className="max-w-sm text-sm leading-6">{text}</p>
    {action}
  </div>
);

export default StudentMessages;
