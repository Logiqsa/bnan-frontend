import { MessageCircle } from "lucide-react";
import type { ChatRoomSummary } from "@/api/chatApi";
import { useLanguage } from "@/i18n/LanguageContext";
import { Badge } from "@/components/ui/badge";

interface ChatRoomListProps {
  rooms: ChatRoomSummary[];
  selectedRoomId: string | null;
  onSelect: (roomId: string) => void;
  showPreview?: boolean;
}

const ChatRoomList = ({
  rooms,
  selectedRoomId,
  onSelect,
  showPreview = false,
}: ChatRoomListProps) => {
  const { language, pick } = useLanguage();

  return (
    <ul className="divide-y" aria-label={pick("قائمة المحادثات", "Conversation list")}>
      {rooms.map((room) => {
        const selected = room.id === selectedRoomId;
        return (
          <li key={room.id}>
            <button
              type="button"
              onClick={() => onSelect(room.id)}
              aria-pressed={selected}
              className={`flex w-full min-w-0 items-start gap-3 p-4 text-start transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                selected ? "bg-primary/10" : ""
              }`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <MessageCircle className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-semibold leading-6">
                  {room.displayName || pick("محادثة", "Conversation")}
                </span>
                {room.subtitle && (
                  <span className="mt-0.5 block break-words text-xs leading-5 text-muted-foreground">
                    {room.subtitle}
                  </span>
                )}
                {showPreview && room.lastMessage && (
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {room.lastMessage}
                  </span>
                )}
                {showPreview && room.lastMessageAt && (
                  <span className="mt-1 block text-[10px] text-muted-foreground/80">
                    {new Date(room.lastMessageAt).toLocaleString(language === "ar" ? "ar-EG" : "en-US")}
                  </span>
                )}
              </span>
              {typeof room.unreadCount === "number" && room.unreadCount > 0 && (
                <Badge className="mt-1 min-w-6 shrink-0 justify-center px-1.5 tabular-nums">
                  {room.unreadCount > 99 ? "99+" : room.unreadCount}
                </Badge>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default ChatRoomList;
