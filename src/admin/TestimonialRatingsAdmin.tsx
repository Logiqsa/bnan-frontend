import { useState } from "react";
import { toast } from "sonner";
import { Star, Check, X, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MOCK_TESTIMONIALS, type Testimonial } from "@/data/testimonialRatings";

type Filter = "all" | "pending" | "approved";

const TestimonialRatingsAdmin = () => {
  // TODO: يستبدل بمصدر البيانات الفعلي عند تحديده (بدون تخزين حقيقي حاليًا)
  const [items, setItems] = useState<Testimonial[]>(MOCK_TESTIMONIALS);
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = items.filter((t) => {
    if (filter === "pending") return !t.approved;
    if (filter === "approved") return t.approved;
    return true;
  });

  const approve = (id: string, approved: boolean) => {
    setItems((current) => current.map((t) => (t.id === id ? { ...t, approved } : t)));
    toast.success(approved ? "تم اعتماد التقييم" : "تم إلغاء اعتماد التقييم");
  };

  const remove = (id: string) => {
    if (!confirm("حذف هذا التقييم؟")) return;
    setItems((current) => current.filter((t) => t.id !== id));
    toast.success("تم الحذف");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-cairo font-bold">تقييمات العملاء</h2>
        <p className="text-muted-foreground font-tajawal text-sm">
          مراجعة واعتماد التقييمات المُرسلة من نموذج "شاركنا رأيك" في الصفحة الرئيسية
        </p>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
          الكل
        </Button>
        <Button size="sm" variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>
          قيد المراجعة
        </Button>
        <Button size="sm" variant={filter === "approved" ? "default" : "outline"} onClick={() => setFilter("approved")}>
          معتمد
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">لا توجد تقييمات</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((t) => (
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
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => approve(t.id, !t.approved)}>
                    {t.approved ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    {t.approved ? "إلغاء الاعتماد" : "اعتماد"}
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-1" onClick={() => remove(t.id)}>
                    <Trash2 className="w-4 h-4" />
                    حذف
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TestimonialRatingsAdmin;
