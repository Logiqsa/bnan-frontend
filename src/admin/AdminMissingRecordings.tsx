import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, RotateCcw, VideoOff } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/layouts/DashboardLayout";
import { adminZoomRecordingApi, type MissingRecordingSession } from "@/api/adminZoomRecordingApi";
import { ApiError } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";

const statusLabels: Record<string, [string, string]> = {
  failed: ["فشل", "Failed"],
  unavailable: ["غير متاح", "Unavailable"],
  pending: ["معلق", "Pending"],
  processing: ["جاري المعالجة", "Processing"],
  queued: ["في الانتظار", "Queued"],
  downloading: ["جاري التحميل", "Downloading"],
  retrying: ["جاري إعادة المحاولة", "Retrying"],
  completed: ["تمت", "Completed"],
};

const label = (value: string | undefined, isArabic: boolean) => statusLabels[value || ""]?.[isArabic ? 0 : 1] || value || "—";
const dateLabel = (value: string | undefined, isArabic: boolean) => value ? new Intl.DateTimeFormat(isArabic ? "ar-EG" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const errorText = (error: unknown, isArabic: boolean) => {
  const apiError = error as ApiError;
  return apiError.status === 404
    ? (isArabic ? "الجلسة غير موجودة أو أصبح لها تسجيل بالفعل." : "The session was not found or already has a recording.")
    : (apiError.message || (isArabic ? "تعذر تنفيذ العملية." : "The operation failed."));
};

export default function AdminMissingRecordings() {
  const { isArabic, pick } = useLanguage();
  const [items, setItems] = useState<MissingRecordingSession[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [retryStates, setRetryStates] = useState<Record<string, "retrying" | "completed" | "failed">>({});

  const load = useCallback(async (background = false) => {
    background ? setRefreshing(true) : setLoading(true);
    try {
      const response = await adminZoomRecordingApi.listMissing();
      setItems(response.data || []);
      setTotal(response.pagination?.total || 0);
    } catch (error) {
      toast.error(errorText(error, isArabic));
    } finally {
      background ? setRefreshing(false) : setLoading(false);
    }
  }, [isArabic]);

  useEffect(() => { void load(); }, [load]);

  const watchRetry = async (sessionId: string) => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 4000));
      try {
        const response = await adminZoomRecordingApi.listMissing();
        const current = response.data || [];
        const item = current.find((entry) => entry.id === sessionId);
        if (!item || item.recording.status === "ready") {
          setRetryStates((states) => ({ ...states, [sessionId]: "completed" }));
          return;
        }
        if (item.recording.status === "failed" || item.recording.status === "unavailable") {
          setRetryStates((states) => ({ ...states, [sessionId]: "failed" }));
          setItems((items) => items.map((entry) => entry.id === sessionId ? item : entry));
          return;
        }
        setItems((items) => items.map((entry) => entry.id === sessionId ? item : entry));
      } catch {
        // Keep the retry state visible; the next manual refresh can update it.
      }
    }
  };

  const retry = async (item: MissingRecordingSession) => {
    setRetrying(item.id);
    setRetryStates((states) => ({ ...states, [item.id]: "retrying" }));
    try {
      await adminZoomRecordingApi.retry(item.id);
      toast.success(pick("تمت جدولة إعادة جلب التسجيل من Zoom.", "The recording retry was queued."));
      void watchRetry(item.id);
    } catch (error) {
      setRetryStates((states) => ({ ...states, [item.id]: "failed" }));
      toast.error(errorText(error, isArabic));
    } finally {
      setRetrying(null);
    }
  };

  return <DashboardLayout><main dir={isArabic ? "rtl" : "ltr"} className="mx-auto max-w-6xl space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl"><VideoOff className="h-7 w-7 text-primary" />{pick("التسجيلات غير المكتملة", "Missing recordings")}</h1><p className="mt-2 text-sm text-muted-foreground">{pick("الجلسات التي لم يكتمل جلب تسجيلها من Zoom.", "Sessions whose Zoom recording has not been recovered.")}</p></div>
      <Button variant="outline" className="gap-2" onClick={() => void load(true)} disabled={loading || refreshing}><RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />{pick("تحديث", "Refresh")}</Button>
    </header>
    <div className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="h-4 w-4 text-amber-600" />{pick(`${total} جلسة تحتاج مراجعة`, `${total} sessions need review`)}</div>
    {loading ? <div className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-36 rounded-xl" />)}</div> : !items.length ? <Card><CardContent className="grid min-h-56 place-items-center text-center text-muted-foreground"><div><VideoOff className="mx-auto mb-3 h-10 w-10 opacity-40" /><p>{pick("لا توجد جلسات بدون تسجيل حاليًا.", "There are no missing recordings right now.")}</p></div></CardContent></Card> : <div className="space-y-3">{items.map((item) => { const retryState = retryStates[item.id]; const displayStatus = retryState || item.recording.status; const isRetrying = retryState === "retrying" || retrying === item.id; const isCompleted = retryState === "completed"; return <Card key={item.id}><CardHeader className="flex-row items-start justify-between gap-3 space-y-0"><div className="min-w-0"><CardTitle className="truncate text-base">{item.title || pick("جلسة بدون اسم", "Untitled session")}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{[item.classroom?.name, item.subject?.name, item.teacher?.name].filter(Boolean).join(" — ") || "—"}</p></div><Badge variant="outline">{label(displayStatus, isArabic)}</Badge></CardHeader><CardContent className="grid gap-3 text-sm md:grid-cols-[1fr_auto] md:items-end"><div className="grid gap-1 text-muted-foreground sm:grid-cols-2"><p>{pick("انتهت:", "Ended:")} {dateLabel(item.actualEndedAt || item.startAt, isArabic)}</p><p>{pick("تقرير الحضور:", "Attendance report:")} {label(item.report.status, isArabic)}</p><p className="break-all">{pick("سبب التسجيل:", "Recording error:")} {item.recording.errorCode || item.jobs.recording?.lastError || "—"}</p><p>{pick("المحاولات:", "Attempts:")} {item.jobs.recording?.attempts ?? 0}</p></div><Button className="gap-2" onClick={() => void retry(item)} disabled={isRetrying || isCompleted}><RotateCcw className={isRetrying ? "h-4 w-4 animate-spin" : "h-4 w-4"} />{isRetrying ? pick("جاري المحاولة...", "Retrying...") : isCompleted ? pick("تمت", "Completed") : retryState === "failed" ? pick("إعادة المحاولة", "Retry again") : pick("إعادة المحاولة", "Retry")}</Button></CardContent></Card>; })}</div>}
  </main></DashboardLayout>;
}
