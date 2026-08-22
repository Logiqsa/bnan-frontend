import { useEffect, useRef, useState } from "react";
import { contentApi, type TestimonialImage } from "@/api/contentApi";
import { ApiError } from "@/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Trash2, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import LegacyVisibilityToggle from "./LegacyVisibilityToggle";

const TestimonialImagesAdmin = () => {
  const [items, setItems] = useState<TestimonialImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await contentApi.admin.listTestimonialImages();
      setItems([...data].sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (error) {
      toast.error((error as ApiError).message || "فشل تحميل الصور");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      form.append("sortOrder", String(items.length));
      await contentApi.admin.createTestimonialImage(form);
      toast.success("تم رفع الصورة");
      load();
    } catch (error) {
      toast.error((error as ApiError).message || "فشل رفع الصورة");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const toggleActive = async (item: TestimonialImage) => {
    try {
      const form = new FormData();
      form.append("isActive", String(!item.isActive));
      await contentApi.admin.updateTestimonialImage(item.id, form);
      load();
    } catch (error) {
      toast.error((error as ApiError).message || "فشل تحديث الحالة");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذه الصورة؟")) return;
    try {
      await contentApi.admin.deleteTestimonialImage(id);
      toast.success("تم الحذف");
      load();
    } catch (error) {
      toast.error((error as ApiError).message || "فشل الحذف");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-cairo font-bold">صور آراء العملاء</h2>
          <p className="text-muted-foreground font-tajawal text-sm">الصور اللي بتظهر في شريط "آراء عملائنا" في الصفحة الرئيسية</p>
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            رفع صورة جديدة
          </Button>
        </div>
      </div>

      <LegacyVisibilityToggle contentKey="testimonialImages" label="الصور القديمة الموجودة داخل الموقع" />

      {loading ? (
        <p className="text-center text-muted-foreground py-12">جاري التحميل...</p>
      ) : items.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">لا توجد صور بعد</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <img src={item.imageUrl} alt="" className="w-full h-40 object-cover" />
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Switch checked={item.isActive} onCheckedChange={() => toggleActive(item)} />
                  <span className="text-xs text-muted-foreground">{item.isActive ? "ظاهرة" : "مخفية"}</span>
                </div>
                <Button size="sm" variant="destructive" onClick={() => remove(item.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TestimonialImagesAdmin;
