import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Star, Check, X, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { testimonialApi, type Testimonial } from "@/api/testimonialApi";
import LegacyVisibilityToggle from "./LegacyVisibilityToggle";

type Filter = "all" | "pending" | "approved";

const TestimonialRatingsAdmin = () => {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total: 0, hasNextPage: false });
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(false);
    testimonialApi.admin.list(filter, page)
      .then((result) => {
        setItems(result.data);
        setPagination({ page: result.page, total: result.total, hasNextPage: result.hasNextPage });
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [filter, page, retryKey]);

  const changeFilter = (value: Filter) => {
    setFilter(value);
    setPage(1);
  };

  const approve = async (id: string, approved: boolean) => {
    setBusyId(id);
    try {
      if (approved) await testimonialApi.admin.approve(id);
      else await testimonialApi.admin.unapprove(id);
      if (filter === "all") setItems((current) => current.map((item) => item.id === id ? { ...item, approved } : item));
      else setItems((current) => current.filter((item) => item.id !== id));
      toast.success(approved ? "تم اعتماد التقييم" : "تم إلغاء اعتماد التقييم");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث التقييم");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-cairo font-bold">تقييمات العملاء</h2>
        <p className="text-muted-foreground font-tajawal text-sm">
          مراجعة واعتماد التقييمات المُرسلة من نموذج "شاركنا رأيك" في الصفحة الرئيسية
        </p>
      </div>

      <LegacyVisibilityToggle contentKey="testimonialRatings" label="التقييمات النصية القديمة الموجودة داخل الموقع" />

      <div className="flex gap-2">
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => changeFilter("all")}>
          الكل
        </Button>
        <Button size="sm" variant={filter === "pending" ? "default" : "outline"} onClick={() => changeFilter("pending")}>
          قيد المراجعة
        </Button>
        <Button size="sm" variant={filter === "approved" ? "default" : "outline"} onClick={() => changeFilter("approved")}>
          معتمد
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <div role="alert" className="flex flex-col items-center gap-3 py-12 text-center"><p className="text-destructive">تعذر تحميل التقييمات</p><Button variant="outline" onClick={() => setRetryKey((current) => current + 1)}><RefreshCw className="h-4 w-4" />إعادة المحاولة</Button></div>
      ) : items.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">لا توجد تقييمات</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-cairo font-bold">{t.full_name}</span>
                  <Badge variant={t.approved ? "default" : "outline"}>{t.approved ? "معتمد" : "قيد المراجعة"}</Badge>
                </div>
                <div className="flex items-center gap-1" dir="ltr">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${star <= t.rating ? "fill-secondary text-secondary" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>
                <p className="text-sm font-tajawal text-muted-foreground leading-relaxed">{t.message}</p>
                <div className="flex items-center gap-2 pt-1">
                  <Button disabled={busyId === t.id} size="sm" variant="outline" className="gap-1" onClick={() => approve(t.id, !t.approved)}>
                    {t.approved ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    {t.approved ? "إلغاء الاعتماد" : "اعتماد"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {!loading && !error && pagination.total > 0 && <div className="flex items-center justify-between border-t pt-4"><span className="text-sm text-muted-foreground">صفحة {pagination.page}{pagination.hasNextPage ? " — توجد صفحات أخرى" : ""}</span><div className="flex gap-2"><Button size="icon" variant="outline" aria-label="الصفحة السابقة" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronRight /></Button><Button size="icon" variant="outline" aria-label="الصفحة التالية" disabled={!pagination.hasNextPage} onClick={() => setPage((current) => current + 1)}><ChevronLeft /></Button></div></div>}
    </div>
  );
};

export default TestimonialRatingsAdmin;
