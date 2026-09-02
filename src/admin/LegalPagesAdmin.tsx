import { useEffect, useState } from "react";
import { FileText, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import { contentApi, type LegalPage, type LegalPageSlug } from "@/api/contentApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RichTextEditor from "@/components/RichTextEditor";
import { legalHtmlHasContent, sanitizeLegalHtml } from "@/lib/legalContent";

const pageLabels: Record<LegalPageSlug, string> = {
  "privacy-policy": "سياسة الخصوصية",
  "terms-and-conditions": "الشروط والأحكام",
  "teacher-terms-and-conditions": "شروط وأحكام المعلمين",
};

const emptyPage = (slug: LegalPageSlug): LegalPage => ({
  slug,
  title: pageLabels[slug],
  content: "",
  updatedAt: null,
});

const LegalPageEditor = ({ slug }: { slug: LegalPageSlug }) => {
  const [page, setPage] = useState<LegalPage>(() => emptyPage(slug));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    contentApi.admin.getLegalPage(slug)
      .then(({ data }) => active && setPage(data))
      .catch((error: ApiError) => toast.error(error.message || `فشل تحميل ${pageLabels[slug]}`))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [slug]);

  const save = async () => {
    if (!page.title.trim() || !legalHtmlHasContent(page.content)) {
      toast.error("العنوان والمحتوى مطلوبان");
      return;
    }
    setSaving(true);
    try {
      const { data } = await contentApi.admin.updateLegalPage(slug, {
        title: page.title.trim(),
        content: sanitizeLegalHtml(page.content),
      });
      setPage(data);
      toast.success("تم حفظ المحتوى بنجاح");
    } catch (error) {
      toast.error((error as ApiError).message || "فشل حفظ المحتوى");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-16 text-center text-muted-foreground">جاري تحميل المحتوى...</div>;

  return (
    <Card>
      <CardHeader className="sticky top-0 z-20 flex-row items-center justify-between gap-3 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <CardTitle className="flex items-center gap-2 font-cairo text-lg">
          <FileText className="h-5 w-5 text-primary" />
          {pageLabels[slug]}
        </CardTitle>
        <Button onClick={save} disabled={saving} className="shrink-0 gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          حفظ التغييرات
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor={`${slug}-title`}>عنوان الصفحة</Label>
          <Input id={`${slug}-title`} value={page.title} onChange={(event) => setPage({ ...page, title: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${slug}-content`}>المحتوى</Label>
          <RichTextEditor
            value={page.content}
            onChange={(content) => setPage({ ...page, content })}
          />
          <p className="text-xs text-muted-foreground">يمكنك تنسيق العناوين والفقرات والقوائم وإضافة الروابط.</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {page.updatedAt ? `آخر تحديث: ${new Date(page.updatedAt).toLocaleString("ar-SA-u-ca-gregory")}` : "لم يتم الحفظ بعد"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default function LegalPagesAdmin() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-cairo font-bold">الصفحات القانونية</h2>
        <p className="text-sm font-tajawal text-muted-foreground">تعديل المحتوى الذي يظهر لزوار الموقع.</p>
      </div>
      <Tabs defaultValue="privacy-policy" dir="rtl">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="privacy-policy">سياسة الخصوصية</TabsTrigger>
          <TabsTrigger value="terms-and-conditions">الشروط والأحكام</TabsTrigger>
          <TabsTrigger value="teacher-terms-and-conditions">شروط المعلمين</TabsTrigger>
        </TabsList>
        <TabsContent value="privacy-policy"><LegalPageEditor slug="privacy-policy" /></TabsContent>
        <TabsContent value="terms-and-conditions"><LegalPageEditor slug="terms-and-conditions" /></TabsContent>
        <TabsContent value="teacher-terms-and-conditions"><LegalPageEditor slug="teacher-terms-and-conditions" /></TabsContent>
      </Tabs>
    </div>
  );
}
