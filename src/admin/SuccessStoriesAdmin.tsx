import { useEffect, useRef, useState } from "react";
import { contentApi, type SuccessStory } from "@/api/contentApi";
import { ApiError } from "@/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Trash2, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import LegacyVisibilityToggle from "./LegacyVisibilityToggle";

const SuccessStoriesAdmin = () => {
  const [items, setItems] = useState<SuccessStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await contentApi.admin.listSuccessStories();
      setItems([...data].sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (error) {
      toast.error((error as ApiError).message || "فشل تحميل القصص");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const upload = async (file: File) => {
    if (!name.trim()) {
      toast.error("اكتب اسم صاحب القصة أولاً");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("name", name.trim());
      form.append("audio", file);
      form.append("sortOrder", String(items.length));
      await contentApi.admin.createSuccessStory(form);
      toast.success("تم رفع القصة الصوتية");
      setName("");
      load();
    } catch (error) {
      toast.error((error as ApiError).message || "فشل رفع القصة");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const toggleActive = async (item: SuccessStory) => {
    try {
      const form = new FormData();
      form.append("isActive", String(!item.isActive));
      await contentApi.admin.updateSuccessStory(item.id, form);
      load();
    } catch (error) {
      toast.error((error as ApiError).message || "فشل تحديث الحالة");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذه القصة؟")) return;
    try {
      await contentApi.admin.deleteSuccessStory(id);
      toast.success("تم الحذف");
      load();
    } catch (error) {
      toast.error((error as ApiError).message || "فشل الحذف");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-cairo font-bold">قصص نجاح صوتية</h2>
        <p className="text-muted-foreground font-tajawal text-sm">التسجيلات الصوتية اللي بتظهر في "قصص نجاح بدأت مع بنان خطوة بخطوة"</p>
      </div>

      <LegacyVisibilityToggle contentKey="successStories" label="التسجيلات الصوتية القديمة الموجودة داخل الموقع" />

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <Input placeholder="اسم صاحب القصة" value={name} onChange={(e) => setName(e.target.value)} className="font-cairo sm:max-w-xs" />
          <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            رفع تسجيل صوتي
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-center text-muted-foreground py-12">جاري التحميل...</p>
      ) : items.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">لا توجد قصص بعد</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-cairo font-bold">{item.name}</h3>
                  <Button size="sm" variant="destructive" onClick={() => remove(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <audio src={item.audioUrl} controls className="w-full" />
                <div className="flex items-center gap-2">
                  <Switch checked={item.isActive} onCheckedChange={() => toggleActive(item)} />
                  <span className="text-xs text-muted-foreground">{item.isActive ? "ظاهرة" : "مخفية"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuccessStoriesAdmin;
