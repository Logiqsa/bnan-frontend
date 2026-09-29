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
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [voiceLevels, setVoiceLevels] = useState<number[]>(() => Array.from({ length: 30 }, () => 0.12));
  const [voicePeak, setVoicePeak] = useState(0.12);

  const stopVisualization = () => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    analyserRef.current = null;
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") void context.close();
  };

  const releaseStream = () => {
    stopVisualization();
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
      setVoiceLevels(Array.from({ length: 30 }, () => 0.12));
      setVoicePeak(0.12);
      try {
        const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContextConstructor) {
          const context = new AudioContextConstructor();
          const analyser = context.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.72;
          context.createMediaStreamSource(stream).connect(analyser);
          audioContextRef.current = context;
          analyserRef.current = analyser;
          const samples = new Uint8Array(analyser.fftSize);
          const animate = () => {
            const activeAnalyser = analyserRef.current;
            if (!activeAnalyser) return;
            activeAnalyser.getByteTimeDomainData(samples);
            let sum = 0;
            samples.forEach((sample) => {
              const normalized = (sample - 128) / 128;
              sum += normalized * normalized;
            });
            const level = Math.min(1, Math.max(0.08, Math.sqrt(sum / samples.length) * 3.2));
            setVoicePeak(level);
            setVoiceLevels((current) => [...current.slice(1), level]);
            animationFrameRef.current = window.requestAnimationFrame(animate);
          };
          animationFrameRef.current = window.requestAnimationFrame(animate);
        }
      } catch {
        // Recording still works when the browser does not expose Web Audio.
      }
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
      <div
        className={`flex h-11 min-w-0 flex-1 items-center gap-2 rounded-md border bg-sky-50 px-2 transition-shadow ${className}`}
        style={{
          borderColor: `rgba(14, 165, 233, ${0.3 + voicePeak * 0.65})`,
          boxShadow: `0 0 ${Math.round(3 + voicePeak * 10)}px rgba(14, 165, 233, ${0.12 + voicePeak * 0.25})`,
        }}
      >
        <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => stopRecording(true)} aria-label={pick("إلغاء التسجيل", "Cancel recording")}>
          <X className="h-4 w-4" />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-[2px]" aria-label={pick("مستوى الصوت", "Voice level")}>
          {voiceLevels.map((level, index) => (
            <span
              key={index}
              className="min-w-[2px] flex-1 rounded-full bg-sky-500 transition-[height,opacity] duration-75"
              style={{ height: `${Math.max(4, Math.round(level * 22))}px`, opacity: 0.35 + level * 0.65 }}
            />
          ))}
        </div>
        <span className="min-w-12 text-center text-xs font-medium text-sky-700" aria-live="polite">{formatDuration(elapsed)}</span>
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
