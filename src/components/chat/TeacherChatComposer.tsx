import { useEffect, useRef, useState } from "react";
import { File, Loader2, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/i18n/LanguageContext";
import { courseError } from "@/lib/courseUi";
import {
  TEACHER_CHAT_ALLOWED_MIME_TYPES,
  validateTeacherChatAttachments,
  type TeacherChatAttachmentValidationError,
} from "./teacherChatAttachmentValidation";

interface TeacherChatComposerProps {
  onSend: (text: string, attachments: File[]) => Promise<unknown>;
}

const formatFileSize = (bytes: number, locale: string) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / 1024)} KB`;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} MB`;
};

const FilePreview = ({ file }: { file: File }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file.type.startsWith("image/") || typeof URL.createObjectURL !== "function") return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return previewUrl
    ? <img src={previewUrl} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
    : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-muted"><File className="h-4 w-4" /></span>;
};

const validationMessage = (
  error: TeacherChatAttachmentValidationError,
  pick: (arabic: string, english: string) => string,
) => {
  if (error.kind === "count") {
    return pick(
      `يمكن إرفاق ${error.maximum} ملفات بحد أقصى.`,
      `You can attach up to ${error.maximum} files.`,
    );
  }
  if (error.kind === "type") {
    return pick(
      `نوع الملف غير مدعوم: ${error.fileName}`,
      `Unsupported file type: ${error.fileName}`,
    );
  }
  return pick(
    `حجم الملف ${error.fileName} يتجاوز 20MB.`,
    `${error.fileName} exceeds the 20MB file limit.`,
  );
};

const TeacherChatComposer = ({ onSend }: TeacherChatComposerProps) => {
  const { language, pick } = useLanguage();
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [validationError, setValidationError] = useState("");
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locale = language === "ar" ? "ar-EG" : "en-US";

  const selectFiles = (files: File[]) => {
    const error = validateTeacherChatAttachments(attachments, files);
    if (error) {
      setValidationError(validationMessage(error, pick));
      return;
    }
    setAttachments((current) => [...current, ...files]);
    setValidationError("");
  };

  const send = async () => {
    const value = text.trim();
    if ((!value && attachments.length === 0) || sendingRef.current) return;
    const error = validateTeacherChatAttachments([], attachments);
    if (error) {
      setValidationError(validationMessage(error, pick));
      return;
    }
    sendingRef.current = true;
    setSending(true);
    try {
      await onSend(value, attachments);
      setText("");
      setAttachments([]);
      setValidationError("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      toast.error(courseError(error));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <div className="shrink-0 border-t bg-card p-3">
      {attachments.length > 0 && (
        <ul className="mb-3 grid min-w-0 gap-2 sm:grid-cols-2" aria-label={pick("المرفقات المختارة", "Selected attachments")}>
          {attachments.map((file, index) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}-${index}`} className="flex min-w-0 items-center gap-2 rounded-lg border bg-background p-2">
              <FilePreview file={file} />
              <div className="min-w-0 flex-1">
                <p dir="ltr" className="truncate text-start text-xs font-medium" title={file.name}>{file.name}</p>
                <p dir="ltr" className="mt-0.5 text-start text-[10px] text-muted-foreground">{formatFileSize(file.size, locale)}</p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                disabled={sending}
                onClick={() => {
                  setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
                  setValidationError("");
                }}
                aria-label={pick(`إزالة ${file.name}`, `Remove ${file.name}`)}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {validationError && <p role="alert" className="mb-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{validationError}</p>}
      <div className="flex min-w-0 items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={TEACHER_CHAT_ALLOWED_MIME_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            selectFiles(Array.from(event.target.files || []));
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-11 w-11 shrink-0"
          disabled={sending}
          onClick={() => fileInputRef.current?.click()}
          aria-label={pick("إرفاق ملفات", "Attach files")}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          placeholder={pick("اكتب رسالة...", "Write a message...")}
          aria-label={pick("نص الرسالة", "Message text")}
          rows={2}
          disabled={sending}
          className="min-h-11 min-w-0 resize-none"
        />
        <Button
          type="button"
          size="icon"
          className="h-11 w-11 shrink-0"
          disabled={(!text.trim() && attachments.length === 0) || sending}
          onClick={() => void send()}
          aria-label={pick("إرسال الرسالة", "Send message")}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

export default TeacherChatComposer;
