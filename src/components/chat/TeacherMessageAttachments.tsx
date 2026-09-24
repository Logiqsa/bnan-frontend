import { ExternalLink, File } from "lucide-react";
import type { ChatMessage } from "@/api/chatApi";
import { useLanguage } from "@/i18n/LanguageContext";

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
    <div className="mt-3 grid min-w-0 gap-2">
      {validAttachments.map((attachment) => {
        const mimeType = attachment.mimeType?.trim().toLowerCase() || "";
        const label = attachment.fileName || pick("ملف مرفق", "Attached file");
        const key = attachment.fileUrl;

        if (mimeType.startsWith("image/")) {
          return (
            <a
              key={key}
              href={attachment.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="block min-w-0 overflow-hidden rounded-xl border bg-background/80"
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
            </a>
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
                preload="metadata"
                className="max-h-72 w-full rounded-lg bg-black"
              >
                {pick(
                  "المتصفح لا يدعم تشغيل الفيديو.",
                  "Your browser does not support video playback.",
                )}
              </video>
              <a
                href={attachment.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex min-w-0 items-center gap-2 text-xs font-medium text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span className="break-words">{label}</span>
              </a>
            </div>
          );
        }

        if (mimeType.startsWith("audio/")) {
          return (
            <div
              key={key}
              className="min-w-0 rounded-xl border bg-background/80 p-3"
            >
              <p className="mb-2 break-words text-xs font-medium text-foreground">
                {label}
              </p>
              <audio
                src={attachment.fileUrl}
                controls
                preload="metadata"
                className="h-10 w-full max-w-full"
              >
                {pick(
                  "المتصفح لا يدعم تشغيل الصوت.",
                  "Your browser does not support audio playback.",
                )}
              </audio>
            </div>
          );
        }

        return (
          <a
            key={key}
            href={attachment.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="flex min-w-0 items-center gap-3 rounded-xl border bg-background/80 p-3 text-foreground transition-colors hover:bg-background"
          >
            <File className="h-5 w-5 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 break-words text-sm font-medium">
              {label}
            </span>
            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
          </a>
        );
      })}
    </div>
  );
};

export default TeacherMessageAttachments;
