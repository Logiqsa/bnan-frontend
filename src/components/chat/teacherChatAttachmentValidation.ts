export const TEACHER_CHAT_MAX_ATTACHMENTS = 10;
export const TEACHER_CHAT_MAX_FILE_SIZE = 20 * 1024 * 1024;

export const TEACHER_CHAT_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "video/x-msvideo",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
  "audio/flac",
  "audio/x-flac",
  "audio/3gpp",
  "audio/amr",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
] as const;

const allowedMimeTypes = new Set<string>(TEACHER_CHAT_ALLOWED_MIME_TYPES);

export type TeacherChatAttachmentValidationError =
  | { kind: "count"; maximum: number }
  | { kind: "type"; fileName: string }
  | { kind: "size"; fileName: string; maximumBytes: number };

export const validateTeacherChatAttachments = (
  existing: File[],
  incoming: File[],
): TeacherChatAttachmentValidationError | null => {
  if (existing.length + incoming.length > TEACHER_CHAT_MAX_ATTACHMENTS) {
    return { kind: "count", maximum: TEACHER_CHAT_MAX_ATTACHMENTS };
  }
  const unsupported = incoming.find(
    (file) => !allowedMimeTypes.has(file.type.toLowerCase()),
  );
  if (unsupported) return { kind: "type", fileName: unsupported.name };
  const oversized = incoming.find(
    (file) => file.size > TEACHER_CHAT_MAX_FILE_SIZE,
  );
  if (oversized) {
    return {
      kind: "size",
      fileName: oversized.name,
      maximumBytes: TEACHER_CHAT_MAX_FILE_SIZE,
    };
  }
  return null;
};
