import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, MessageCircle, MessagesSquare, PanelLeftClose, PanelLeftOpen, RefreshCw, Search } from "lucide-react";
import {
  chatApi,
  type ChatMessage,
} from "@/api/chatApi";
import ChatRoomList from "@/components/chat/ChatRoomList";
import TeacherChatConversation from "@/components/chat/TeacherChatConversation";
import { removeTeacherChatMessage, type TeacherMessagesData } from "@/components/chat/removeTeacherChatMessage";
import { updateTeacherChatMessage } from "@/components/chat/updateTeacherChatMessage";
import type { ChatRoomSummary } from "@/api/chatApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/i18n/LanguageContext";
import DashboardLayout from "@/layouts/DashboardLayout";
import { getSocket } from "@/lib/socket";
import { usePortalAuth } from "@/portal/PortalAuthContext";

const teacherChatRoomsQueryKey = ["teacher-chat-rooms"] as const;
const adminChatRoomsQueryKey = ["admin-chat-rooms"] as const;
type MessagesResult = TeacherMessagesData;
type RealtimeChatMessage = ChatMessage & { _id?: string };

interface TeacherMessagesProps {
  mode?: "teacher" | "admin";
}

const referenceId = (value: ChatMessage["room"]) =>
  typeof value === "string"
    ? value
    : value?.id || value?._id || "";

const TeacherMessages = ({ mode = "teacher" }: TeacherMessagesProps) => {
  const { pick } = useLanguage();
  const { user } = usePortalAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const requestedRoomId = searchParams.get("roomId")?.trim() || null;
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomsCollapsed, setRoomsCollapsed] = useState(false);
  const [roomSearch, setRoomSearch] = useState("");
  const [roomType, setRoomType] = useState("all");
  const [curriculumId, setCurriculumId] = useState("all");
  const [gradeId, setGradeId] = useState("all");
  const selectedRoomIdRef = useRef<string | null>(null);
  const handledRequestedRoomId = useRef<string | null>(null);
  const processedMessageIds = useRef(new Set<string>());
  const roomsQueryKey = mode === "admin" ? adminChatRoomsQueryKey : teacherChatRoomsQueryKey;
  const messagesQueryKeyPrefix = mode === "admin"
    ? "admin-chat-messages"
    : "teacher-chat-messages";
  const rooms = useQuery({
    queryKey: roomsQueryKey,
    queryFn: mode === "admin" ? chatApi.allAdminRooms : chatApi.rooms,
    staleTime: 30_000,
    retry: 1,
  });
  const classroomMetadata = useQuery({
    queryKey: ["admin-chat-classroom-metadata"],
    queryFn: chatApi.adminClassroomMetadata,
    enabled: mode === "admin",
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const roomItems = useMemo(() => rooms.data || [], [rooms.data]);
  const metadataByClassroom = useMemo(
    () => new Map(
      (classroomMetadata.data || []).map((item) => [item.classroomId, item]),
    ),
    [classroomMetadata.data],
  );
  const curricula = useMemo(() => {
    const values = new Map<string, string>();
    (classroomMetadata.data || []).forEach((item) => {
      if (item.curriculumId && item.curriculumName) {
        values.set(item.curriculumId, item.curriculumName);
      }
    });
    return [...values.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [classroomMetadata.data]);
  const grades = useMemo(() => {
    const values = new Map<string, string>();
    (classroomMetadata.data || []).forEach((item) => {
      if (
        item.gradeId &&
        item.gradeName &&
        (curriculumId === "all" || item.curriculumId === curriculumId)
      ) {
        values.set(item.gradeId, item.gradeName);
      }
    });
    return [...values.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [classroomMetadata.data, curriculumId]);
  const filteredRooms = useMemo(() => {
    const search = roomSearch.trim().toLocaleLowerCase();
    return roomItems.filter((room) => {
      const metadata = room.classroomId
        ? metadataByClassroom.get(room.classroomId)
        : undefined;
      const matchesSearch = !search || [room.displayName, room.subtitle]
        .some((value) => value?.toLocaleLowerCase().includes(search));
      if (!matchesSearch) return false;
      if (mode !== "admin") return true;
      const matchesType = roomType === "all" ||
        (roomType === "course"
          ? room.type === "classroom" && metadata?.sourceType === "course"
          : roomType === "classroom"
            ? room.type === "classroom" && metadata?.sourceType !== "course"
            : room.type === roomType);
      const matchesCurriculum = curriculumId === "all" || metadata?.curriculumId === curriculumId;
      const matchesGrade = gradeId === "all" || metadata?.gradeId === gradeId;
      return matchesType && matchesCurriculum && matchesGrade;
    });
  }, [curriculumId, gradeId, metadataByClassroom, mode, roomItems, roomSearch, roomType]);
  const roomIdsKey = roomItems.map((room) => room.id).join("|");
  const selectedRoom = roomItems.find((room) => room.id === selectedRoomId);
  const markRoomRead = useCallback(
    (roomId: string) => {
      queryClient.setQueryData<ChatRoomSummary[]>(
        roomsQueryKey,
        (current) =>
          current?.map((room) =>
            room.id === roomId ? { ...room, unreadCount: 0 } : room,
          ),
      );
    },
    [queryClient, roomsQueryKey],
  );

  useEffect(() => {
    selectedRoomIdRef.current = selectedRoomId;
  }, [selectedRoomId]);

  useEffect(() => {
    if (!requestedRoomId || !rooms.isSuccess) return;
    if (handledRequestedRoomId.current === requestedRoomId) return;
    handledRequestedRoomId.current = requestedRoomId;
    if (roomItems.some((room) => room.id === requestedRoomId)) {
      setSelectedRoomId(requestedRoomId);
    }
  }, [requestedRoomId, roomIdsKey, roomItems, rooms.isSuccess]);

  useEffect(() => {
    const roomIds = roomIdsKey.split("|").filter(Boolean);
    if (!roomIds.length) return;
    const socket = getSocket();
    const joinRooms = () => {
      roomIds.forEach((roomId) => socket.emit("joinRoom", roomId));
      if (selectedRoomIdRef.current) {
        socket.emit("markAsRead", selectedRoomIdRef.current);
      }
    };
    const receiveMessage = (raw: RealtimeChatMessage) => {
      const messageId = raw.id || raw._id || "";
      const roomId = referenceId(raw.room);
      if (!messageId || !roomId || !roomIds.includes(roomId)) return;
      if (processedMessageIds.current.has(messageId)) return;

      const messageKey = [messagesQueryKeyPrefix, roomId] as const;
      const cachedMessages = queryClient.getQueryData<MessagesResult>(messageKey);
      if (
        cachedMessages?.pages.some((page) =>
          page.data.some((message) => message.id === messageId),
        )
      ) {
        processedMessageIds.current.add(messageId);
        return;
      }
      processedMessageIds.current.add(messageId);

      const incoming: ChatMessage = {
        ...raw,
        id: messageId,
      };
      const activeRoomId = selectedRoomIdRef.current;
      if (roomId === activeRoomId) {
        if (cachedMessages) {
          queryClient.setQueryData<MessagesResult>(messageKey, (current) =>
            current
              ? {
                  ...current,
                  pages: current.pages.map((page, index) =>
                    index === 0
                      ? { ...page, data: [...page.data, incoming] }
                      : page,
                  ),
                }
              : current,
          );
        } else {
          void queryClient.invalidateQueries({ queryKey: messageKey });
        }
        markRoomRead(roomId);
        socket.emit("markAsRead", roomId);
        return;
      }

      const senderId = raw.sender?.id || raw.sender?._id;
      if (senderId === user?.id) return;
      queryClient.setQueryData<ChatRoomSummary[]>(
        roomsQueryKey,
        (current) =>
          current?.map((room) =>
            room.id === roomId
              ? { ...room, unreadCount: (room.unreadCount ?? 0) + 1 }
              : room,
          ),
      );
    };

    const removeDeletedMessage = (payload: { roomId?: string; messageId?: string }) => {
      const roomId = String(payload?.roomId || "");
      const messageId = String(payload?.messageId || "");
      if (!roomId || !messageId || !roomIds.includes(roomId)) return;
      queryClient.setQueryData<MessagesResult>(
        [messagesQueryKeyPrefix, roomId],
        (current) => removeTeacherChatMessage(current, messageId),
      );
    };

    // The backend emits the populated message itself, not a wrapper object.
    const receiveEditedMessage = (raw: RealtimeChatMessage) => {
      const messageId = raw?.id || raw?._id || "";
      const roomId = referenceId(raw?.room);
      if (!messageId || !roomId || !roomIds.includes(roomId)) return;
      queryClient.setQueryData<MessagesResult>(
        [messagesQueryKeyPrefix, roomId],
        (current) => updateTeacherChatMessage(current, { ...raw, id: messageId }),
      );
    };

    socket.on("newMessage", receiveMessage);
    socket.on("messageDeleted", removeDeletedMessage);
    socket.on("messageEdited", receiveEditedMessage);
    socket.on("connect", joinRooms);
    if (socket.connected) joinRooms();

    return () => {
      socket.off("newMessage", receiveMessage);
      socket.off("messageDeleted", removeDeletedMessage);
      socket.off("messageEdited", receiveEditedMessage);
      socket.off("connect", joinRooms);
      roomIds.forEach((roomId) => socket.emit("leaveRoom", roomId));
    };
  }, [markRoomRead, messagesQueryKeyPrefix, queryClient, roomIdsKey, roomsQueryKey, user?.id]);

  return (
    <DashboardLayout>
      <div className="mx-auto flex h-[calc(100dvh-9rem)] min-h-0 w-full max-w-7xl flex-col gap-4 md:h-[calc(100dvh-7rem)]">
        <header className="shrink-0 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <MessagesSquare className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {pick("الرسائل", "Messages")}
              </h1>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {pick(
                  mode === "admin"
                    ? "كل محادثات الفصول المتاحة للإدارة."
                    : "محادثات الفصول المتاحة لك.",
                  mode === "admin"
                    ? "All available classroom conversations."
                    : "Your available classroom conversations.",
                )}
              </p>
            </div>
          </div>
        </header>

        {mode === "admin" && (
          <section className="shrink-0 rounded-xl border bg-card p-3 shadow-sm sm:p-4" aria-label={pick("فلترة المحادثات", "Conversation filters")}>
            <div className="grid gap-2 sm:grid-cols-3">
              <select
                value={roomType}
                onChange={(event) => setRoomType(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                aria-label={pick("نوع المحادثة", "Conversation type")}
              >
                <option value="all">{pick("كل أنواع المحادثات", "All conversation types")}</option>
                <option value="classroom">{pick("فصل دراسي", "Classroom")}</option>
                <option value="course">{pick("دورة", "Course")}</option>
                <option value="teacher_parent">{pick("معلم وولي أمر", "Teacher and parent")}</option>
                <option value="supervisor_student">{pick("مشرف وطالب", "Supervisor and student")}</option>
                <option value="support">{pick("دعم", "Support")}</option>
              </select>
              <select
                value={curriculumId}
                onChange={(event) => {
                  setCurriculumId(event.target.value);
                  setGradeId("all");
                }}
                disabled={classroomMetadata.isPending}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
                aria-label={pick("المنهج", "Curriculum")}
              >
                <option value="all">{pick("كل المناهج", "All curricula")}</option>
                {curricula.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
              <select
                value={gradeId}
                onChange={(event) => setGradeId(event.target.value)}
                disabled={classroomMetadata.isPending}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
                aria-label={pick("الصف", "Grade")}
              >
                <option value="all">{pick("كل الصفوف", "All grades")}</option>
                {grades.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </div>
            {classroomMetadata.isError && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <span>{pick("تعذر تحميل فلاتر الفصول.", "Unable to load classroom filters.")}</span>
                <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => void classroomMetadata.refetch()}>
                  {pick("إعادة المحاولة", "Retry")}
                </Button>
              </div>
            )}
          </section>
        )}

        <Card className="min-h-0 flex-1 overflow-hidden shadow-sm">
          <div className={`grid h-full min-h-0 min-w-0 ${roomsCollapsed ? "md:grid-cols-[3.5rem_minmax(0,1fr)]" : "md:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)]"}`}>
            <aside
              className={`${selectedRoomId ? "hidden md:flex" : "flex"} min-h-0 min-w-0 flex-col overflow-hidden border-e bg-card`}
              aria-label={pick("المحادثات", "Conversations")}
            >
              <div className="flex items-center justify-between gap-2 border-b p-3">
                <div className={`min-w-0 ${roomsCollapsed ? "md:hidden" : ""}`}>
                  <h2 className="font-semibold">{pick("المحادثات", "Conversations")}</h2>
                  {!rooms.isLoading && !rooms.isError && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pick(`${roomItems.length} محادثة`, `${roomItems.length} conversations`)}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="hidden h-8 w-8 shrink-0 md:inline-flex"
                  onClick={() => setRoomsCollapsed((collapsed) => !collapsed)}
                  aria-label={roomsCollapsed ? pick("إظهار المحادثات", "Expand conversations") : pick("طي المحادثات", "Collapse conversations")}
                  aria-expanded={!roomsCollapsed}
                >
                  {roomsCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </Button>
              </div>
              <div className={`min-h-0 flex-1 overflow-y-auto ${roomsCollapsed ? "md:hidden" : ""}`}>
                <div className="space-y-2 border-b p-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={roomSearch}
                      onChange={(event) => setRoomSearch(event.target.value)}
                      placeholder={pick("ابحث عن محادثة...", "Search conversations...")}
                      className="ps-9"
                    />
                  </div>
                </div>
                {rooms.isLoading ? (
                  <div className="space-y-1 p-2" aria-label={pick("جاري تحميل المحادثات", "Loading conversations")}>
                    {[0, 1, 2, 3, 4].map((item) => (
                      <div key={item} className="flex items-center gap-3 p-3">
                        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-3 w-4/5" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : rooms.isError ? (
                  <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-5 text-center">
                    <p className="text-sm text-destructive">
                      {pick("تعذر تحميل المحادثات.", "Unable to load conversations.")}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      disabled={rooms.isFetching}
                      onClick={() => void rooms.refetch()}
                    >
                      <RefreshCw className={`h-4 w-4 ${rooms.isFetching ? "animate-spin" : ""}`} />
                      {pick("إعادة المحاولة", "Try again")}
                    </Button>
                  </div>
                ) : roomItems.length === 0 ? (
                  <div className="flex min-h-64 flex-col items-center justify-center p-5 text-center">
                    <MessageCircle className="h-10 w-10 text-muted-foreground/50" />
                    <h2 className="mt-3 font-semibold">
                      {pick("لا توجد محادثات", "No conversations")}
                    </h2>
                    <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                      {pick(
                        "لا توجد محادثات متاحة لك حتى الآن.",
                        "There are no conversations available to you yet.",
                      )}
                    </p>
                  </div>
                ) : filteredRooms.length === 0 ? (
                  <div className="flex min-h-48 flex-col items-center justify-center p-5 text-center">
                    <Search className="h-9 w-9 text-muted-foreground/50" />
                    <p className="mt-3 text-sm font-medium">{pick("لا توجد محادثات مطابقة", "No matching conversations")}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setRoomSearch("");
                        setRoomType("all");
                        setCurriculumId("all");
                        setGradeId("all");
                      }}
                    >
                      {pick("مسح الفلاتر", "Clear filters")}
                    </Button>
                  </div>
                ) : (
                  <ChatRoomList
                    rooms={filteredRooms}
                    selectedRoomId={selectedRoomId}
                    onSelect={setSelectedRoomId}
                  />
                )}
              </div>
            </aside>

            <section
              className={`${selectedRoomId ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-col overflow-hidden bg-muted/10`}
              aria-label={pick("المحادثة المحددة", "Selected conversation")}
            >
              {selectedRoomId && (
                <div className="flex min-w-0 items-center gap-3 border-b bg-card p-3 md:p-4">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="shrink-0 md:hidden"
                    onClick={() => setSelectedRoomId(null)}
                    aria-label={pick("العودة إلى المحادثات", "Back to conversations")}
                  >
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                  <div className="min-w-0">
                    <h2 className="break-words text-sm font-semibold sm:text-base">
                      {selectedRoom?.displayName || pick("محادثة", "Conversation")}
                    </h2>
                    {selectedRoom?.subtitle && (
                      <p className="mt-0.5 break-words text-xs text-muted-foreground">
                        {selectedRoom.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {selectedRoom ? (
                <TeacherChatConversation
                  key={selectedRoom.id}
                  room={selectedRoom}
                  onRead={markRoomRead}
                  queryKeyPrefix={messagesQueryKeyPrefix}
                />
              ) : (
                <div className="flex min-h-64 flex-1 items-center justify-center p-6 text-center">
                  <div className="max-w-sm">
                    <MessagesSquare className="mx-auto h-12 w-12 text-muted-foreground/40" />
                    <p className="mt-4 font-semibold">
                      {pick(
                        "اختر محادثة لعرض الرسائل.",
                        "Select a conversation to view messages.",
                      )}
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TeacherMessages;
