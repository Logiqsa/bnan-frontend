import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { homeStatisticsApi, type HomeStatistic } from "@/api/homeStatisticsApi";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function HomeStatisticsAdmin() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["home-statistics"], queryFn: homeStatisticsApi.admin });
  const [items, setItems] = useState<HomeStatistic[]>([]);
  useEffect(() => { if (query.data) setItems(query.data.statistics); }, [query.data]);
  const save = useMutation({
    mutationFn: () => homeStatisticsApi.update({ statistics: items.map((item) => ({ ...item, label: item.label.trim(), suffix: item.suffix.trim() })) }),
    onSuccess: (data) => { setItems(data.statistics); void client.invalidateQueries({ queryKey: ["home-statistics"] }); toast.success("تم حفظ إحصائيات الصفحة الرئيسية."); },
    onError: () => toast.error("تعذر حفظ الإحصائيات. راجع القيم المدخلة."),
  });
  const update = (index: number, field: keyof HomeStatistic, value: string | number) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  return <DashboardLayout><main className="mx-auto max-w-5xl space-y-6" dir="rtl"><div><h1 className="text-3xl font-bold">إحصائيات الصفحة الرئيسية</h1><p className="mt-1 text-muted-foreground">هذه الأرقام تظهر نفسها في Hero وبطاقات الإحصائيات أسفل الصفحة الرئيسية.</p></div>{query.isLoading ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : query.isError ? <Card><CardContent className="p-8 text-center"><p>تعذر تحميل الإحصائيات.</p><Button className="mt-3" variant="outline" onClick={() => void query.refetch()}>إعادة المحاولة</Button></CardContent></Card> : <Card><CardHeader><CardTitle>الأرقام المعروضة</CardTitle></CardHeader><CardContent className="space-y-4">{items.map((item, index) => <div key={item.key} className="grid gap-3 rounded-xl border p-4 md:grid-cols-[1.5fr_1fr_1fr_120px]"><div><Label>الوصف</Label><Input className="mt-2" value={item.label} onChange={(event) => update(index, "label", event.target.value)} /></div><div><Label>الرقم</Label><Input className="mt-2" type="number" min="0" step="any" value={item.value} onChange={(event) => update(index, "value", Number(event.target.value))} /></div><div><Label>اللاحقة</Label><Input className="mt-2" value={item.suffix} onChange={(event) => update(index, "suffix", event.target.value)} placeholder="مثال: + أو %" /></div><div><Label>منازل عشرية</Label><Input className="mt-2" type="number" min="0" max="2" value={item.decimals} onChange={(event) => update(index, "decimals", Number(event.target.value))} /></div></div>)}<div className="flex justify-end"><Button size="lg" disabled={save.isPending || !items.length} onClick={() => save.mutate()}>{save.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}حفظ الأرقام</Button></div></CardContent></Card>}</main></DashboardLayout>;
}
