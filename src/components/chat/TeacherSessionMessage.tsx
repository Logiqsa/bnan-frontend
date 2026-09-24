import { useState } from "react";
import { BarChart3, Clock3, ExternalLink, FileText, Users, Video } from "lucide-react";
import type { ChatMessage } from "@/api/chatApi";
import RecordingPlayerModal, { type PlayerRecording } from "@/components/RecordingPlayerModal";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

interface TeacherSessionMessageProps {
  message: ChatMessage;
}

const messageDate = (value: string | undefined, locale: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString(locale);
};

const validNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const TeacherSessionReport = ({ message }: TeacherSessionMessageProps) => {
  const { language, pick } = useLanguage();
  const locale = language === "ar" ? "ar-EG" : "en-US";
  const report = message.reportSummary;
  const startedAt = messageDate(report?.startedAt, locale);
  const endedAt = messageDate(report?.endedAt, locale);
  const hasSummary = Boolean(
    startedAt || endedAt || validNumber(report?.durationMinutes) ||
      validNumber(report?.uniqueParticipants),
  );
  return (
    <div className="mx-auto w-full max-w-xl overflow-hidden rounded-xl border border-violet-200 bg-violet-50/60 text-foreground">
      <details>
        <summary className="flex min-w-0 cursor-pointer items-center gap-2 px-3 py-2 text-xs">
          <BarChart3 className="h-4 w-4 shrink-0 text-violet-700" />
          <span className="shrink-0 font-semibold text-violet-700">{pick("تقرير", "Report")}</span>
          <span className="min-w-0 flex-1 truncate font-medium" title={message.sessionName}>
            {message.sessionName || pick("تقرير الحصة", "Session report")}
          </span>
          <span className="shrink-0 text-violet-700">{pick("عرض", "View")}</span>
        </summary>
        <div className="space-y-3 border-t bg-background/80 p-3">
        {hasSummary ? (
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            {startedAt && <div className="rounded-lg bg-muted/50 p-2"><dt className="text-muted-foreground">{pick("بداية الحصة", "Session start")}</dt><dd className="mt-1 font-medium">{startedAt}</dd></div>}
            {endedAt && <div className="rounded-lg bg-muted/50 p-2"><dt className="text-muted-foreground">{pick("نهاية الحصة", "Session end")}</dt><dd className="mt-1 font-medium">{endedAt}</dd></div>}
            {validNumber(report?.durationMinutes) && <div className="rounded-lg bg-muted/50 p-2"><dt className="flex items-center gap-1 text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{pick("مدة الحصة", "Session duration")}</dt><dd className="mt-1 font-medium">{report.durationMinutes} {pick("دقيقة", "minutes")}</dd></div>}
            {validNumber(report?.uniqueParticipants) && <div className="rounded-lg bg-muted/50 p-2"><dt className="flex items-center gap-1 text-muted-foreground"><Users className="h-3.5 w-3.5" />{pick("عدد المشاركين", "Participants")}</dt><dd className="mt-1 font-medium">{report.uniqueParticipants}</dd></div>}
          </dl>
        ) : (
          <p className="text-xs text-muted-foreground">{pick("تفاصيل تقرير الحصة غير متاحة حاليًا.", "Session report details are not currently available.")}</p>
        )}

        </div>
      </details>
    </div>
  );
};

const TeacherSessionMessage = ({ message }: TeacherSessionMessageProps) => {
  const { language, pick } = useLanguage();
  const [selectedRecording, setSelectedRecording] = useState<PlayerRecording | null>(null);
  const locale = language === "ar" ? "ar-EG" : "en-US";
  const createdAt = messageDate(message.createdAt, locale);

  if (message.messageType === "session_record") {
    const recordingLink = message.recordLink?.trim();
    const sessionName = message.sessionName || pick("تسجيل الحصة", "Session recording");
    return (
      <>
        <div className="mx-auto w-full max-w-xl overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-foreground" title={createdAt || undefined}>
          <div className="flex min-w-0 items-center gap-2">
            <Video className="h-4 w-4 shrink-0 text-emerald-700" />
            <span className="shrink-0 text-xs font-semibold text-emerald-700">
              {pick("تسجيل", "Recording")}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-medium" title={message.sessionName}>
              {sessionName}
            </span>
            {recordingLink ? (
              <Button
                type="button"
                size="sm"
                className="h-7 shrink-0 px-2 text-xs"
                onClick={() => setSelectedRecording({ sessionName, recordingLink })}
              >
                {pick("مشاهدة", "Watch")}
              </Button>
            ) : (
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {pick("قيد المعالجة", "Processing")}
              </span>
            )}
          </div>
        </div>
        <RecordingPlayerModal
          recording={selectedRecording}
          onClose={() => setSelectedRecording(null)}
        />
      </>
    );
  }

  if (message.messageType === "session_summary") {
    const nextSteps = Array.isArray(message.nextSteps)
      ? message.nextSteps.filter((step): step is string => typeof step === "string" && Boolean(step.trim())).map((step) => step.trim())
      : [];
    const hasSummaryDetails = Boolean(
      message.summaryContent || message.summaryDocUrl || nextSteps.length,
    );

    return (
      <div className="mx-auto w-full max-w-xl overflow-hidden rounded-xl border border-sky-200 bg-sky-50/60 text-foreground" title={createdAt || undefined}>
        <details>
          <summary className="flex min-w-0 cursor-pointer items-center gap-2 px-3 py-2 text-xs">
            <FileText className="h-4 w-4 shrink-0 text-sky-700" />
            <span className="shrink-0 font-semibold text-sky-700">
              {pick("ملخص", "Summary")}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium" title={message.summaryTitle || message.sessionName}>
              {message.summaryTitle || message.sessionName || pick("ملخص الحصة", "Session summary")}
            </span>
            {hasSummaryDetails && <span className="shrink-0 text-sky-700">{pick("عرض", "View")}</span>}
          </summary>
          <div className="min-w-0 border-t bg-background/80 p-3">
            {hasSummaryDetails ? (
              <>
                  {message.summaryContent && (
                    <div className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-6">
                      {message.summaryContent}
                    </div>
                  )}
                  {message.summaryDocUrl && (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="mt-2 h-8 max-w-full text-xs"
                    >
                      <a
                        href={message.summaryDocUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="gap-2"
                      >
                        <ExternalLink className="h-4 w-4 shrink-0" />
                        <span className="break-words">
                          {pick("فتح مستند الملخص", "Open summary document")}
                        </span>
                      </a>
                    </Button>
                  )}
                  {nextSteps.length > 0 && (
                    <div className="mt-3 border-t pt-3">
                      <p className="text-xs font-semibold text-sky-700">{pick("الخطوات التالية", "Next steps")}</p>
                      <ul className="mt-2 list-disc space-y-1 ps-5 text-xs leading-6">
                        {nextSteps.map((step, index) => <li key={`${index}-${step}`} className="break-words">{step}</li>)}
                      </ul>
                    </div>
                  )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                {pick(
                  "تفاصيل الملخص غير متاحة حاليًا",
                  "Summary details are not currently available",
                )}
              </p>
            )}
            {createdAt && <p className="mt-2 text-[10px] text-muted-foreground">{createdAt}</p>}
          </div>
        </details>
      </div>
    );
  }

  if (message.messageType === "session_report") {
    return <TeacherSessionReport message={message} />;
  }

  return null;
};

export default TeacherSessionMessage;
