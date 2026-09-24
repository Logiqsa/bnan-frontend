import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  chatApi,
  type ChatMessage,
  type ChatRoomSummary,
} from "@/api/chatApi";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import TeacherMessageAttachments from "@/components/chat/TeacherMessageAttachments";
import TeacherChatComposer from "@/components/chat/TeacherChatComposer";
import TeacherSessionMessage from "@/components/chat/TeacherSessionMessage";
import { removeTeacherChatMessage, type TeacherMessagesData } from "@/components/chat/removeTeacherChatMessage";
import { updateTeacherChatMessage } from "@/components/chat/updateTeacherChatMessage";
import { useLanguage } from "@/i18n/LanguageContext";
import { courseError } from "@/lib/courseUi";
import { getSocket } from "@/lib/socket";
import { usePortalAuth } from "@/portal/PortalAuthContext";

interface TeacherChatConversationProps {
  room: ChatRoomSummary;
  onRead: (roomId: string) => void;
  queryKeyPrefix?: string;
  unknownMessageLabel?: string;
}

const isSessionCardMessage = (message: ChatMessage) =>
  message.messageType === "session_record" ||
  message.messageType === "session_summary" ||
  message.messageType === "session_report";

const messageSessionId = (message: ChatMessage) =>
  typeof message.session === "string"
    ? message.session
    : message.session?.id || message.session?._id || "";

const TeacherChatConversation = ({
  room,
  onRead,
  queryKeyPrefix = "teacher-chat-messages",
  unknownMessageLabel,
}: TeacherChatConversationProps) => {
  const { user } = usePortalAuth();
  const queryClient = useQueryClient();
  const { language, pick } = useLanguage();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const savingRef = useRef(false);
  const deletingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);
  const wasNearBottom = useRef(true);
  const lastMessageId = useRef("");
  const pendingScrollRestore = useRef<{
    scrollHeight: number;
    scrollTop: number;
  } | null>(null);
  const messageKey = useMemo(
    () => [queryKeyPrefix, room.id] as const,
    [queryKeyPrefix, room.id],
  );
  const messages = useInfiniteQuery({
    queryKey: messageKey,
    queryFn: ({ pageParam }) => chatApi.messages(room.id, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore
        ? lastPage.pagination.nextCursor || undefined
        : undefined,
    staleTime: 15_000,
    retry: 1,
  });
  const messageItems = useMemo(() => {
    const seen = new Set<string>();
    return [...(messages.data?.pages || [])]
      .reverse()
      .flatMap((page) => page.data)
      .filter((message) => {
        if (!message.id || seen.has(message.id)) return false;
        seen.add(message.id);
        return true;
      });
  }, [messages.data?.pages]);
  const visibleMessages = useMemo(() => messageItems.filter((message) => {
    if (message.messageType === "session_record") {
      return Boolean(message.recordLink?.trim() || message.attachments?.length);
    }
    if (message.messageType === "session_summary") {
      const hasMeaningfulNextStep = Array.isArray(message.nextSteps) &&
        message.nextSteps.some(
          (step) => typeof step === "string" && Boolean(step.trim()),
        );
      return Boolean(
        message.summaryContent?.trim() ||
        message.summaryDocUrl?.trim() ||
        message.attachments?.length ||
        hasMeaningfulNextStep,
      );
    }
    if (!message.messageType || message.messageType === "text") {
      return Boolean(message.text?.trim() || message.attachments?.length);
    }
    return true;
  }), [messageItems]);
  const sessionGroups = useMemo(() => {
    const groups = new Map<string, ChatMessage[]>();
    const groupedIds = new Set<string>();
    for (let index = 0; index < visibleMessages.length; index += 1) {
      const first = visibleMessages[index];
      if (!isSessionCardMessage(first)) continue;
      const group = [first];
      const sessionId = messageSessionId(first);
      const messageTypes = new Set([first.messageType]);
      let nextIndex = index + 1;
      while (nextIndex < visibleMessages.length) {
        const candidate = visibleMessages[nextIndex];
        if (!isSessionCardMessage(candidate) || messageTypes.has(candidate.messageType)) break;
        const candidateSessionId = messageSessionId(candidate);
        if (sessionId && candidateSessionId && sessionId !== candidateSessionId) break;
        group.push(candidate);
        messageTypes.add(candidate.messageType);
        nextIndex += 1;
      }
      groups.set(first.id, group);
      group.slice(1).forEach((message) => groupedIds.add(message.id));
      index = nextIndex - 1;
    }
    return { groups, groupedIds };
  }, [visibleMessages]);

  useEffect(() => {
    onRead(room.id);
    void chatApi.read(room.id).catch(() => undefined);

    const socket = getSocket();
    const markRoomRead = () => {
      socket.emit("markAsRead", room.id);
    };
    socket.on("connect", markRoomRead);
    if (socket.connected) markRoomRead();

    return () => {
      socket.off("connect", markRoomRead);
    };
  }, [onRead, room.id]);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container || !messages.data) return;
    if (pendingScrollRestore.current) {
      const previous = pendingScrollRestore.current;
      pendingScrollRestore.current = null;
      container.scrollTop =
        previous.scrollTop + (container.scrollHeight - previous.scrollHeight);
      return;
    }
    const newestId = messageItems[messageItems.length - 1]?.id || "";
    if (!didInitialScroll.current) {
      container.scrollTop = container.scrollHeight;
      didInitialScroll.current = true;
      wasNearBottom.current = true;
    } else if (newestId && newestId !== lastMessageId.current && wasNearBottom.current) {
      container.scrollTop = container.scrollHeight;
    }
    lastMessageId.current = newestId;
  }, [messageItems, messages.data]);

  const loadOlder = async () => {
    const container = scrollRef.current;
    if (!container || !messages.hasNextPage || messages.isFetchingNextPage) return;
    pendingScrollRestore.current = {
      scrollHeight: container.scrollHeight,
      scrollTop: container.scrollTop,
    };
    const result = await messages.fetchNextPage();
    if (result.isError) pendingScrollRestore.current = null;
  };

  const deleteMessage = async () => {
    if (!deleteTarget || deletingRef.current) return;
    const target = messageItems.find((message) => message.id === deleteTarget);
    if (!target || target.systemGenerated || !user?.id ||
      (target.sender?.id || target.sender?._id) !== user.id) {
      setDeleteTarget(null);
      return;
    }
    deletingRef.current = true;
    setDeletingId(deleteTarget);
    try {
      await chatApi.deleteMessage(room.id, deleteTarget);
      queryClient.setQueryData<TeacherMessagesData>(messageKey, (current) =>
        removeTeacherChatMessage(current, deleteTarget),
      );
      setDeleteTarget(null);
      toast.success(pick("تم حذف الرسالة", "Message deleted"));
    } catch (error) {
      toast.error(courseError(error));
    } finally {
      deletingRef.current = false;
      setDeletingId(null);
    }
  };

  const saveEdit = async () => {
    if (!editingId || savingRef.current) return;
    const target = messageItems.find((message) => message.id === editingId);
    const senderId = target?.sender?.id || target?.sender?._id;
    if (!target || !user?.id || senderId !== user.id || target.systemGenerated ||
      target.messageType !== "text" || !target.text?.trim() || target.attachments?.length) {
      setEditingId(null);
      return;
    }
    const value = editText.trim();
    if (!value) return;
    if (value === target.text) {
      setEditingId(null);
      return;
    }
    savingRef.current = true;
    setSavingId(editingId);
    try {
      const updated = await chatApi.editMessage(editingId, value);
      queryClient.setQueryData<TeacherMessagesData>(messageKey, (current) =>
        updateTeacherChatMessage(current, updated),
      );
      setEditingId(null);
      toast.success(pick("تم تعديل الرسالة", "Message edited"));
    } catch (error) {
      toast.error(courseError(error));
    } finally {
      savingRef.current = false;
      setSavingId(null);
    }
  };

  const locale = language === "ar" ? "ar-EG" : "en-US";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5"
        onScroll={(event) => {
          const container = event.currentTarget;
          wasNearBottom.current =
            container.scrollHeight - container.scrollTop - container.clientHeight < 80;
          if (
            didInitialScroll.current &&
            container.scrollHeight > container.clientHeight + 1 &&
            container.scrollTop < 80
          ) {
            void loadOlder();
          }
        }}
      >
        {messages.isLoading ? (
          <div className="grid min-h-64 place-items-center" aria-label={pick("جاري تحميل الرسائل", "Loading messages")}>
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : messages.isError && !messages.data ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-destructive">
              {pick("تعذر تحميل الرسائل.", "Unable to load messages.")}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={messages.isFetching}
              onClick={() => void messages.refetch()}
            >
              <RefreshCw className={`h-4 w-4 ${messages.isFetching ? "animate-spin" : ""}`} />
              {pick("إعادة المحاولة", "Try again")}
            </Button>
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="grid min-h-64 place-items-center text-center text-sm text-muted-foreground">
            {pick("ابدأ المحادثة بإرسال رسالة.", "Start the conversation by sending a message.")}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex min-h-7 items-center justify-center">
              {messages.isFetchingNextPage ? (
                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {pick("جاري تحميل الرسائل الأقدم...", "Loading older messages...")}
                </span>
              ) : messages.isFetchNextPageError ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1.5 text-xs text-destructive"
                  onClick={() => void loadOlder()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {pick("تعذر التحميل، حاول مرة أخرى", "Unable to load. Try again")}
                </Button>
              ) : !messages.hasNextPage ? (
                <span className="text-xs text-muted-foreground">
                  {pick("بداية المحادثة", "Beginning of conversation")}
                </span>
              ) : null}
            </div>
            {visibleMessages.map((message) => {
              if (sessionGroups.groupedIds.has(message.id)) return null;
              if (isSessionCardMessage(message)) {
                const group = sessionGroups.groups.get(message.id) || [message];
                const columns = group.length >= 3
                  ? "sm:grid-cols-3"
                  : group.length === 2
                    ? "sm:grid-cols-2"
                    : "max-w-xl";
                return (
                  <div key={message.id} className={`mx-auto grid w-full min-w-0 grid-cols-1 gap-2 ${columns}`}>
                    {group.map((item) => (
                      <div key={item.id} className="min-w-0">
                        <TeacherSessionMessage message={item} />
                        <TeacherMessageAttachments attachments={item.attachments} />
                      </div>
                    ))}
                  </div>
                );
              }
              const mine =
                (message.sender?.id || message.sender?._id) === user?.id;
              const systemMessage = Boolean(message.systemGenerated);
              const canDelete = Boolean(message.id && user?.id && mine && !systemMessage);
              const canEdit = Boolean(
                message.id && user?.id && mine && !systemMessage &&
                message.messageType === "text" && message.text?.trim() &&
                !message.attachments?.length,
              );
              const knownMessageType = !message.messageType || [
                "text", "image", "video", "audio", "file",
              ].includes(message.messageType);
              const content = message.text || message.summaryTitle || message.sessionName ||
                (!knownMessageType ? unknownMessageLabel || "" : "");
              return (
                <div
                  key={message.id}
                  className={`flex min-w-0 ${
                    systemMessage
                      ? "justify-center"
                      : mine
                        ? "justify-start"
                        : "justify-end"
                  }`}
                >
                  {(canDelete || canEdit) && (
                    <div className="mx-1 flex shrink-0 flex-col items-center justify-center gap-1 self-center">
                    {canEdit && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9"
                        disabled={Boolean(savingId || deletingId)}
                        onClick={() => { setEditingId(message.id); setEditText(message.text || ""); }}
                        aria-label={pick("تعديل الرسالة", "Edit message")}
                      >
                        {savingId === message.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                      </Button>
                    )}
                    {canDelete && <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-destructive hover:text-destructive"
                      disabled={Boolean(deletingId || savingId)}
                      onClick={() => setDeleteTarget(message.id)}
                      aria-label={pick("حذف الرسالة", "Delete message")}
                    >
                      {deletingId === message.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>}
                    </div>
                  )}
                  <div
                    className={`min-w-0 max-w-[80%] break-words rounded-xl px-3 py-1.5 text-xs sm:max-w-[70%] ${
                      systemMessage
                        ? "border bg-card text-foreground"
                        : mine
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                    }`}
                  >
                    {!systemMessage && message.sender?.fullName && (
                      <p className="mb-1 break-words text-xs opacity-70">
                        {message.sender.fullName}
                      </p>
                    )}
                    {editingId === message.id ? (
                      <div className="min-w-0 space-y-2">
                        <Textarea
                          value={editText}
                          onChange={(event) => setEditText(event.target.value)}
                          disabled={Boolean(savingId)}
                          aria-label={pick("تعديل نص الرسالة", "Edit message text")}
                          className="min-h-20 w-full min-w-0 resize-y bg-background text-foreground"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" disabled={Boolean(savingId) || !editText.trim()} onClick={() => void saveEdit()}>
                            {savingId === message.id && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                            {pick("حفظ", "Save")}
                          </Button>
                          <Button type="button" size="sm" variant="outline" className="bg-background text-foreground hover:text-foreground" disabled={Boolean(savingId)} onClick={() => setEditingId(null)}>
                            {pick("إلغاء", "Cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : content && (
                      <p className="whitespace-pre-wrap break-words leading-5">
                        {content}
                      </p>
                    )}
                    <TeacherMessageAttachments attachments={message.attachments} />
                    {message.createdAt && (
                      <p className="mt-1.5 text-[10px] opacity-60">
                        {new Date(message.createdAt).toLocaleString(locale)}
                        {message.editedAt && <> · {pick("تم التعديل", "Edited")}</>}
                      </p>
                    )}
                    {!message.createdAt && message.editedAt && (
                      <p className="mt-1.5 text-[10px] opacity-60">{pick("تم التعديل", "Edited")}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TeacherChatComposer
        onSend={(messageText, attachments) =>
          chatApi.send(room.id, messageText, attachments)
        }
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => {
        if (!open && !deletingRef.current) setDeleteTarget(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pick("حذف الرسالة", "Delete message")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pick("هل تريد حذف هذه الرسالة؟", "Do you want to delete this message?")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingId)}>{pick("إلغاء", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => { event.preventDefault(); void deleteMessage(); }}
            >
              {deletingId && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {pick("حذف", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeacherChatConversation;
