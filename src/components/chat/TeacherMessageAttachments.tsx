import { ExternalLink, File } from "lucide-react";
import { useState } from "react";
import type { ChatMessage } from "@/api/chatApi";
import { useLanguage } from "@/i18n/LanguageContext";
import MediaPreviewDialog, { type MediaPreview } from "@/components/MediaPreviewDialog";
import VoiceMessagePlayer from "@/components/chat/VoiceMessagePlayer";

interface TeacherMessageAttachmentsProps {
  attachments?: ChatMessage["attachments"];
}

const isSafeFileUrl = (value: unknown): value is string => {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value, window.location.origin);
    return ["http:", "https:", "blob:"].includes(url.protocol);
  } catch {
    return false;
  }
};

const TeacherMessageAttachments = ({
  attachments,
}: TeacherMessageAttachmentsProps) => {
  const { pick } = useLanguage();
  const [preview, setPreview] = useState<MediaPreview | null>(null);
  if (!attachments?.length) return null;

  const seen = new Set<string>();
  const validAttachments = attachments.filter((attachment) => {
    if (!isSafeFileUrl(attachment?.fileUrl)) return false;
    if (seen.has(attachment.fileUrl)) return false;
    seen.add(attachment.fileUrl);
    return true;
  });

  if (!validAttachments.length) return null;

  return (
    <>
      <div className="mt-3 grid min-w-0 gap-2">
        {validAttachments.map((attachment) => {
        const mimeType = attachment.mimeType?.trim().toLowerCase() || "";
        const label = attachment.fileName || pick("ملف مرفق", "Attached file");
        const key = attachment.fileUrl;

        if (mimeType.startsWith("image/")) {
          return (
            <button
              type="button"
              key={key}
              onClick={() => setPreview({ title: label, url: attachment.fileUrl, kind: "image" })}
              className="block min-w-0 overflow-hidden rounded-xl border bg-background/80 text-start"
              aria-label={pick(`فتح ${label}`, `Open ${label}`)}
            >
              <img
                src={attachment.fileUrl}
                alt={label}
                loading="lazy"
                className="max-h-72 w-full object-contain"
              />
              <span className="block break-words px-3 py-2 text-xs text-foreground">
                {label}
              </span>
            </button>
          );
        }

        if (mimeType.startsWith("video/")) {
          return (
            <div
              key={key}
              className="min-w-0 overflow-hidden rounded-xl border bg-background/80 p-2"
            >
              <video
                src={attachment.fileUrl}
                controls
                preload="none"
                className="max-h-72 w-full rounded-lg bg-black"
              >
                {pick(
                  "المتصفح لا يدعم تشغيل الفيديو.",
                  "Your browser does not support video playback.",
                )}
              </video>
              <button
                type="button"
                onClick={() => setPreview({ title: label, url: attachment.fileUrl, kind: "video" })}
                className="mt-2 flex min-w-0 items-center gap-2 text-xs font-medium text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span className="break-words">{label}</span>
              </button>
            </div>
          );
        }

        if (mimeType.startsWith("audio/")) {
          return (
            <div
              key={key}
              className="min-w-0"
            >
              <VoiceMessagePlayer src={attachment.fileUrl} label={pick("رسالة صوتية", "Voice message")} />
            </div>
          );
        }

        return (
          <button
            type="button"
            key={key}
            onClick={() => setPreview({ title: label, url: attachment.fileUrl, kind: "document" })}
            className="flex min-w-0 items-center gap-3 rounded-xl border bg-background/80 p-3 text-foreground transition-colors hover:bg-background"
          >
            <File className="h-5 w-5 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 break-words text-sm font-medium">
              {label}
            </span>
            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        );
        })}
      </div>
      <MediaPreviewDialog preview={preview} onClose={() => setPreview(null)} />
    </>
  );
};

export default TeacherMessageAttachments;
