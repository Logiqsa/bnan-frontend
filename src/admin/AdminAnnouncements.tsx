import { useMemo, useState } from "react";
import { Megaphone, Pencil, Plus, RefreshCw, Send, Trash2, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import DashboardLayout from "@/layouts/DashboardLayout";
import { announcementsApi, type AnnouncementItem, type AnnouncementPayload, type AnnouncementType } from "@/api/announcementsApi";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const emptyForm: AnnouncementPayload = { title: "", body: "", type: "normal", targetAudience: ["students", "parents", "teachers"], displayInBanner: true, bannerDismissible: true };
const pad = (value: number) => String(value).padStart(2, "0");
const dateInput = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const normalizeDate = (value?: string) => value ? new Date(value).toISOString() : undefined;

export default function AdminAnnouncements() {
  const { isArabic, pick } = useLanguage();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AnnouncementPayload>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const announcements = useQuery({ queryKey: ["admin-announcements"], queryFn: async () => (await announcementsApi.list()).data });
  const refreshAnnouncementQueries = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
    void queryClient.invalidateQueries({ queryKey: ["active-announcement-banner"] });
  };
  const save = useMutation({ mutationFn: () => {
    const payload = { ...form, bannerStartsAt: normalizeDate(form.bannerStartsAt), bannerEndsAt: normalizeDate(form.bannerEndsAt) };
    return editingId ? announcementsApi.update(editingId, payload) : announcementsApi.create(payload);
  }, onSuccess: () => { toast.success(pick("تم حفظ العرض.", "Offer saved.")); reset(); refreshAnnouncementQueries(); }, onError: () => toast.error(pick("تعذر حفظ العرض.", "Unable to save the offer.")) });
  const publish = useMutation({ mutationFn: announcementsApi.publish, onSuccess: () => { toast.success(pick("تم نشر العرض.", "Offer published.")); refreshAnnouncementQueries(); }, onError: () => toast.error(pick("تعذر نشر العرض.", "Unable to publish the offer.")) });
  const remove = useMutation({ mutationFn: announcementsApi.remove, onSuccess: () => { toast.success(pick("تم حذف العرض.", "Offer deleted.")); refreshAnnouncementQueries(); }, onError: () => toast.error(pick("تعذر حذف العرض.", "Unable to delete the offer.")) });
  const reset = () => { setForm(emptyForm); setEditingId(null); };
  const editing = useMemo(() => announcements.data?.find((item) => item.id === editingId), [announcements.data, editingId]);
  const edit = (item: AnnouncementItem) => setForm({ title: item.title, body: item.body, type: item.type === "important" ? "important" : "normal", targetAudience: ["students", "parents", "teachers"], displayInBanner: item.displayInBanner, bannerLink: item.bannerLink || undefined, bannerStartsAt: dateInput(item.bannerStartsAt), bannerEndsAt: dateInput(item.bannerEndsAt), bannerDismissible: item.bannerDismissible !== false });
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!form.title.trim() || !form.body.trim() || save.isPending) return; void save.mutate(); };
  return <DashboardLayout><main className="mx-auto max-w-6xl space-y-6" dir={isArabic ? "rtl" : "ltr"}>
    <header><h1 className="flex items-center gap-2 text-3xl font-bold"><Megaphone className="h-7 w-7 text-primary" />{pick("عروض الشريط العلوي", "Top banner offers")}</h1><p className="mt-1 text-muted-foreground">{pick("أنشئ عرضًا يظهر أعلى الموقع ويتحرك تلقائيًا.", "Create an offer that appears and moves across the top of the website.")}</p></header>
    <Card><CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle>{editing ? pick("تعديل العرض", "Edit offer") : pick("إضافة عرض", "Add offer")}</CardTitle>{editing && <Button type="button" variant="ghost" size="icon" onClick={reset} aria-label={pick("إلغاء التعديل", "Cancel edit")}><X className="h-4 w-4" /></Button>}</CardHeader><CardContent><form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="announcement-title">{pick("العنوان", "Title")}</Label><Input id="announcement-title" value={form.title} maxLength={200} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></div>
      <div className="space-y-2 md:col-span-2"><Label htmlFor="announcement-body">{pick("نص العرض", "Offer text")}</Label><Textarea id="announcement-body" value={form.body} maxLength={500} rows={3} onChange={(event) => setForm({ ...form, body: event.target.value })} required /></div>
      <div className="space-y-2"><Label htmlFor="announcement-start">{pick("يبدأ في", "Starts at")}</Label><Input id="announcement-start" type="datetime-local" value={form.bannerStartsAt || ""} onChange={(event) => setForm({ ...form, bannerStartsAt: event.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="announcement-end">{pick("ينتهي في", "Ends at")}</Label><Input id="announcement-end" type="datetime-local" value={form.bannerEndsAt || ""} onChange={(event) => setForm({ ...form, bannerEndsAt: event.target.value })} /></div>
      <div className="flex flex-wrap items-center gap-5 md:col-span-2"><label className="flex items-center gap-2 text-sm"><Switch checked={form.displayInBanner} onCheckedChange={(checked) => setForm({ ...form, displayInBanner: checked })} />{pick("إظهار في الشريط", "Show in banner")}</label><label className="flex items-center gap-2 text-sm"><Switch checked={form.type === "important"} onCheckedChange={(checked) => setForm({ ...form, type: checked ? "important" as AnnouncementType : "normal" })} />{pick("عرض مهم", "Important offer")}</label><label className="flex items-center gap-2 text-sm"><Switch checked={form.bannerDismissible} onCheckedChange={(checked) => setForm({ ...form, bannerDismissible: checked })} />{pick("السماح بالإغلاق", "Allow dismiss")}</label></div>
      <Button type="submit" disabled={save.isPending} className="gap-2 md:col-span-2">{editing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{save.isPending ? pick("جاري الحفظ...", "Saving...") : pick("حفظ العرض", "Save offer")}</Button>
    </form></CardContent></Card>
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>{pick("العروض", "Offers")} ({announcements.data?.length || 0})</CardTitle><Button type="button" variant="outline" size="icon" onClick={() => void announcements.refetch()} disabled={announcements.isFetching} aria-label={pick("تحديث", "Refresh")}><RefreshCw className={announcements.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} /></Button></CardHeader><CardContent className="space-y-3">{announcements.isLoading ? <p>{pick("جاري التحميل...", "Loading...")}</p> : !announcements.data?.length ? <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">{pick("لا توجد عروض بعد.", "No offers yet.")}</p> : announcements.data.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><div className="min-w-0"><p className="font-semibold">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.body}</p><div className="mt-2 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-muted px-2 py-1">{item.status === "published" ? pick("منشور", "Published") : pick("مسودة", "Draft")}</span>{item.displayInBanner && <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">{pick("يظهر في الشريط", "Banner enabled")}</span>}</div></div><div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => { setEditingId(item.id); edit(item); }}><Pencil className="ml-1 h-4 w-4" />{pick("تعديل", "Edit")}</Button>{item.status !== "published" && <Button type="button" size="sm" onClick={() => void publish.mutate(item.id)} disabled={publish.isPending}><Send className="ml-1 h-4 w-4" />{pick("نشر", "Publish")}</Button>}<Button type="button" variant="outline" size="sm" className="text-destructive" onClick={() => { if (window.confirm(pick("هل تريد حذف العرض؟", "Delete this offer?"))) void remove.mutate(item.id); }} disabled={remove.isPending}><Trash2 className="ml-1 h-4 w-4" />{pick("حذف", "Delete")}</Button></div></div>)}</CardContent></Card>
  </main></DashboardLayout>;
}
