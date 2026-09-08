import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Clock3,
  ExternalLink,
  FileText,
  Loader2,
  MessageCircle,
  Send,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { chatApi, type ChatMessage } from "@/api/chatApi";
import { courseError } from "@/lib/courseUi";
import { getSocket } from "@/lib/socket";
import { usePortalAuth } from "@/portal/PortalAuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface MessagesResult {
  success: true;
  data: ChatMessage[];
  pagination: { hasMore: boolean; nextCursor?: string };
}

const normalizeSocketMessage = (
  value: ChatMessage & { _id?: string },
): ChatMessage => ({
  ...value,
  id: value.id || value._id || "",
});

const messageDate = (value?: string) =>
  value ? new Date(value).toLocaleString("ar-EG") : "";

function SessionSystemMessage({ message }: { message: ChatMessage }) {
  const footer = message.createdAt && (
    <p className="mt-3 border-t pt-2 text-[10px] text-muted-foreground">
      {messageDate(message.createdAt)}
    </p>
  );

  if (message.messageType === "session_summary") {
    return (
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-sky-200 bg-sky-50/60 p-4 text-foreground shadow-sm">
        <div className="flex items-start gap-3">
          <FileText className="mt-1 h-5 w-5 shrink-0 text-sky-700" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-sky-700">ملخص الحصة</p>
            <h3 className="mt-1 font-bold">
              {message.summaryTitle || message.sessionName || "ملخص الحصة"}
            </h3>
            <details className="mt-3 rounded-xl border bg-background/80">
              <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-sky-700">
                عرض الملخص
              </summary>
              <div className="border-t p-3">
                {message.summaryContent && (
                  <div className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-7">
                    {message.summaryContent}
                  </div>
                )}
                {message.summaryDocUrl && (
                  <Button asChild size="sm" variant="outline" className="mt-3">
                    <a
                      href={message.summaryDocUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="me-2 h-4 w-4" />
                      فتح مستند الملخص
                    </a>
                  </Button>
                )}
              </div>
            </details>
            {footer}
          </div>
        </div>
      </div>
    );
  }

  if (message.messageType === "session_report") {
    const report = message.reportSummary;
    return (
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-violet-200 bg-violet-50/60 p-4 text-foreground shadow-sm">
        <div className="flex items-center gap-2 text-violet-700">
          <BarChart3 className="h-5 w-5" />
          <p className="text-xs font-semibold">تقرير الحصة</p>
        </div>
        <h3 className="mt-2 font-bold">
          {message.sessionName || "تقرير الحصة"}
        </h3>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-xl bg-background/80 p-3">
            <Clock3 className="mb-1 h-4 w-4 text-violet-700" />
            المدة: {report?.durationMinutes ?? 0} دقيقة
          </div>
          <div className="rounded-xl bg-background/80 p-3">
            <Users className="mb-1 h-4 w-4 text-violet-700" />
            الحضور: {report?.uniqueParticipants ?? 0}
          </div>
          <div className="rounded-xl bg-background/80 p-3">
            بدأت: {messageDate(report?.startedAt) || "—"}
          </div>
        </div>
        {footer}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-foreground shadow-sm">
      <div className="flex items-center gap-3">
        <Video className="h-5 w-5 shrink-0 text-emerald-700" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-emerald-700">تسجيل الحصة</p>
          <h3 className="mt-1 truncate font-bold">
            {message.sessionName || "تسجيل الحصة"}
          </h3>
          {message.recordLink ? (
            <Button asChild size="sm" className="mt-3">
              <a href={message.recordLink} target="_blank" rel="noreferrer">
                <Video className="me-2 h-4 w-4" />
                مشاهدة التسجيل
              </a>
            </Button>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              جاري معالجة التسجيل
            </p>
          )}
          {footer}
        </div>
      </div>
    </div>
  );
}

export default function CourseClassroomChat({
  classroomId,
}: {
  classroomId: string;
}) {
  const { user } = usePortalAuth();
  const cache = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const rooms = useQuery({
    queryKey: ["course-chat-room", classroomId, user?.role],
    queryFn: async () => {
      const list =
        user?.role === "admin"
          ? await chatApi.adminRooms(classroomId)
          : await chatApi.rooms();
      return list.find((room) => room.classroomId === classroomId) || null;
    },
  });
  const roomId = rooms.data?.id;
  const messageKey = useMemo(
    () => ["course-chat-messages", roomId] as const,
    [roomId],
  );
  const messages = useQuery({
    queryKey: messageKey,
    queryFn: () => chatApi.messages(roomId!),
    enabled: Boolean(roomId),
  });

  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();
    const receiveMessage = (raw: ChatMessage & { _id?: string }) => {
      const incoming = normalizeSocketMessage(raw);
      cache.setQueryData<MessagesResult>(messageKey, (current) => {
        if (
          !current ||
          current.data.some((message) => message.id === incoming.id)
        )
          return current;
        return { ...current, data: [...current.data, incoming] };
      });
      socket.emit("markAsRead", roomId);
    };

    socket.on("newMessage", receiveMessage);
    socket.emit("joinRoom", roomId);
    socket.emit("markAsRead", roomId);

    return () => {
      socket.off("newMessage", receiveMessage);
      socket.emit("leaveRoom", roomId);
    };
  }, [cache, messageKey, roomId]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data?.data.length]);

  const send = async () => {
    const value = text.trim();
    if (!roomId || !value || sending) return;
    setSending(true);
    try {
      await chatApi.send(roomId, value);
      setText("");
      // The server emits newMessage to the joined room; no list refetch is needed.
    } catch (error) {
      toast.error(courseError(error));
    } finally {
      setSending(false);
    }
  };

  if (rooms.isLoading) {
    return (
      <div className="grid min-h-48 place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  if (rooms.error)
    return (
      <p className="p-6 text-center text-destructive">
        {courseError(rooms.error)}
      </p>
    );
  if (!roomId) {
    return (
      <div className="p-10 text-center text-muted-foreground">
        <MessageCircle className="mx-auto mb-3 h-9 w-9" />
        <p>محادثة الفصل غير متاحة بعد.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="border-b bg-muted/30 p-3 font-semibold">
        {rooms.data?.displayName || "محادثة الدورة"}
      </div>
      <div className="min-h-[55vh] flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
        {messages.isLoading ? (
          <Loader2 className="mx-auto animate-spin" />
        ) : messages.data?.data.length ? (
          messages.data.data.map((message) => {
            if (
              message.messageType === "session_report" &&
              user?.role !== "admin"
            )
              return null;
            const systemMessage = [
              "session_summary",
              "session_report",
              "session_record",
            ].includes(message.messageType || "");
            if (systemMessage) {
              return (
                <SessionSystemMessage key={message.id} message={message} />
              );
            }
            const mine =
              (message.sender?.id || message.sender?._id) === user?.id;
            return (
              <div
                key={message.id}
                className={`flex ${mine ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  <p className="mb-1 text-xs opacity-70">
                    {message.sender?.fullName || "مستخدم"}
                  </p>
                  <p className="whitespace-pre-wrap break-words">
                    {message.text}
                  </p>
                  {message.createdAt && (
                    <p className="mt-1 text-[10px] opacity-60">
                      {new Date(message.createdAt).toLocaleString("ar-EG")}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="py-16 text-center text-muted-foreground">
            ابدأ المحادثة.
          </p>
        )}
        <div ref={end} />
      </div>
      <div className="flex items-end gap-2 border-t p-3">
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          placeholder="اكتب رسالة..."
          rows={2}
        />
        <Button
          size="icon"
          disabled={!text.trim() || sending}
          onClick={() => void send()}
        >
          {sending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
