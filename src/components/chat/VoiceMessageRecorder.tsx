import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

interface VoiceMessageRecorderProps {
  disabled?: boolean;
  className?: string;
  onRecordingChange?: (recording: boolean) => void;
  onRecorded: (file: File) => Promise<void>;
}

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

const extensionFor = (mimeType: string) => {
  if (mimeType === "audio/mp4") return "m4a";
  if (mimeType === "audio/ogg") return "ogg";
  return "webm";
};

const formatDuration = (seconds: number) =>
  `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

export default function VoiceMessageRecorder({
  disabled = false,
  className = "",
  onRecordingChange,
  onRecorded,
}: VoiceMessageRecorderProps) {
  const { pick } = useLanguage();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [processing, setProcessing] = useState(false);

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  };

  useEffect(() => () => releaseStream(), []);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)));
    }, 500);
    return () => window.clearInterval(timer);
  }, [recording]);

  const stopRecording = (discard = false) => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (discard) {
      recorder.onstop = null;
      recorder.stop();
      chunksRef.current = [];
      setRecording(false);
      onRecordingChange?.(false);
      releaseStream();
      return;
    }
    recorder.stop();
  };

  const startRecording = async () => {
    if (disabled || recording || processing) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error(pick("المتصفح لا يدعم تسجيل الصوت.", "This browser does not support voice recording."));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MIME_CANDIDATES.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsed(0);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const recordedForMs = Date.now() - startedAtRef.current;
        chunksRef.current = [];
        setRecording(false);
        onRecordingChange?.(false);
        releaseStream();
        if (!blob.size || recordedForMs < 300) {
          toast.error(pick("التسجيل قصير جدًا ولم يتم إرساله.", "The recording was too short and was not sent."));
          return;
        }
        setProcessing(true);
        try {
          await onRecorded(new File([blob], `voice-message.${extensionFor(type.split(";")[0])}`, { type: type.split(";")[0] }));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : pick("تعذر إرسال الرسالة الصوتية.", "Unable to send the voice message."));
        } finally {
          setProcessing(false);
        }
      };
      recorder.start();
      setRecording(true);
      onRecordingChange?.(true);
    } catch (error) {
      releaseStream();
      toast.error(error instanceof DOMException && error.name === "NotAllowedError"
        ? pick("اسمح بالوصول إلى الميكروفون لإرسال رسالة صوتية.", "Allow microphone access to send a voice message.")
        : pick("تعذر تشغيل الميكروفون.", "Unable to access the microphone."));
    }
  };

  if (recording) {
    return (
      <div className={`flex h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2 ${className}`}>
        <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => stopRecording(true)} aria-label={pick("إلغاء التسجيل", "Cancel recording")}>
          <X className="h-4 w-4" />
        </Button>
        <span className="min-w-12 text-center text-xs font-medium text-destructive" aria-live="polite">{formatDuration(elapsed)}</span>
        <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => stopRecording()} aria-label={pick("إيقاف وإرسال التسجيل", "Stop and send recording")}>
          <Square className="h-4 w-4 fill-current" />
        </Button>
      </div>
    );
  }

  return (
    <Button type="button" size="icon" variant="outline" className={`h-11 w-11 shrink-0 ${className}`} disabled={disabled || processing} onClick={() => void startRecording()} aria-label={pick("تسجيل رسالة صوتية", "Record voice message")}>
      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}
