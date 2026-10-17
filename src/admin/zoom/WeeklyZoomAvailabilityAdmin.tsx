import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CalendarClock, Loader2, RefreshCw, ShieldCheck, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { ApiError } from "@/api/client";
import { zoomAccountsApi, type WeeklyZoomPoolAvailability } from "@/api/zoomAccountsApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DAYS = [
  ["saturday", "السبت"], ["sunday", "الأحد"], ["monday", "الاثنين"], ["tuesday", "الثلاثاء"],
  ["wednesday", "الأربعاء"], ["thursday", "الخميس"], ["friday", "الجمعة"],
] as const;

const errorMessage = (error: unknown) => {
  const apiError = error as ApiError;
  if (apiError?.status === 403) return "هذه الصفحة متاحة لمدير النظام فقط.";
  return "تعذر تحميل توافر حسابات Zoom. حاول مرة أخرى.";
};

export default function WeeklyZoomAvailabilityAdmin() {
  const navigate = useNavigate();
  const [day, setDay] = useState<(typeof DAYS)[number][0]>("saturday");
  const [duration, setDuration] = useState(60);
  const [data, setData] = useState<WeeklyZoomPoolAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await zoomAccountsApi.getWeeklyPoolAvailability(day, duration || undefined);
      setData(response.data);
    } catch (caught) {
      setData(null); setError(errorMessage(caught));
    } finally { setLoading(false); }
  }, [day, duration]);

  useEffect(() => { void load(); }, [load]);

  return <DashboardLayout><main dir="rtl" className="mx-auto max-w-7xl space-y-6">
    <Button variant="ghost" className="gap-2 px-1" onClick={() => navigate("/admin?tab=zoom-accounts")}><ArrowRight className="h-4 w-4" />العودة إلى حسابات Zoom</Button>
    <header className="rounded-2xl border bg-gradient-to-l from-primary/[0.09] via-card to-card p-5 shadow-sm sm:p-6">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary"><CalendarClock className="h-4 w-4" />توافر Zoom الأسبوعي</p>
      <h1 className="text-2xl font-bold sm:text-3xl">الأوقات المتاحة لكل حساب Zoom</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">عرض للقراءة فقط مبني على الحجوزات الأسبوعية وحماية السعة القديمة. لا يخصص حسابًا ولا ينشئ اجتماعًا.</p>
    </header>
    <Card><CardContent className="flex flex-wrap items-end gap-3 p-4">
      <label className="grid gap-1 text-sm font-medium"><span>اليوم</span><select aria-label="اليوم" value={day} onChange={(event) => setDay(event.target.value as typeof day)} className="h-10 rounded-md border bg-background px-3">{DAYS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-medium"><span>المدة المطلوبة بالدقائق</span><input aria-label="المدة المطلوبة بالدقائق" type="number" min="1" max="1440" value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="h-10 w-44 rounded-md border bg-background px-3" /></label>
      <Button onClick={() => void load()} disabled={loading}><RefreshCw className={`me-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />تحديث</Button>
    </CardContent></Card>
    {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : error ? <Card><CardContent className="py-14 text-center"><p className="font-semibold text-destructive">{error}</p><Button className="mt-4" onClick={() => void load()}>إعادة المحاولة</Button></CardContent></Card> : <section className="grid gap-4 lg:grid-cols-2">
      {(data?.accounts || []).map((item) => <Card key={item.account.id} className={!item.account.eligible ? "border-amber-300" : ""}><CardHeader className="space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="flex items-center gap-2 text-lg"><Video className="h-5 w-5 text-primary" />{item.account.name}</CardTitle><Badge variant="outline" className={item.account.eligible ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-amber-300 bg-amber-50 text-amber-800"}>{item.account.eligible ? "متاح للتوزيع" : "غير متاح للتوزيع"}</Badge></div><p className="text-xs text-muted-foreground">معرّف مضيف مختصر: {item.account.hostFingerprint || "غير موثق"} · {item.account.safetyStatus}</p>{!item.account.eligible && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">لن يظهر هذا الحساب كخيار توزيع حتى تكتمل متطلبات الأمان: {item.account.safetyReason || item.account.legacyMaterialization}.</p>}</CardHeader><CardContent className="space-y-4"><section><h2 className="mb-2 flex items-center gap-2 font-semibold text-emerald-700"><ShieldCheck className="h-4 w-4" />الفترات المتاحة{item.account.eligible ? " للتوزيع" : " (عرض فقط)"}</h2>{item.freeWindows.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد فترة خالية في هذا اليوم.</p> : <div className="flex flex-wrap gap-2">{item.freeWindows.map((window) => <Badge key={`${window.startTime}-${window.endTime}`} variant={item.account.eligible && window.fitsRequestedDuration !== false ? "default" : "outline"} className={item.account.eligible && window.fitsRequestedDuration !== false ? "bg-emerald-600" : ""} dir="ltr">{window.startTime} – {window.endTime} ({window.durationMinutes} د)</Badge>)}</div>}</section><section><h2 className="mb-2 font-semibold">الحجوزات التي تحجب السعة</h2>{item.busyBookings.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد حجوزات مسجلة في هذا اليوم.</p> : <div className="space-y-2">{item.busyBookings.map((booking, index) => <div key={`${booking.source}-${booking.classroomId}-${index}`} className="rounded-lg border p-3 text-sm"><div className="flex justify-between gap-3"><span className="font-semibold">{booking.classroomName || "سجل قديم"}</span><span dir="ltr">{booking.startTime} – {booking.endTime}</span></div><p className="mt-1 text-xs text-muted-foreground">{booking.source === "legacy_capacity" ? "حجز سعة قديم" : "موعد أسبوعي"}{booking.unknown ? " — نطاق محجوب احترازيًا" : ""}</p></div>)}</div>}</section></CardContent></Card>)}
    </section>}
  </main></DashboardLayout>;
}
