import { useEffect, useState } from "react";
import { contentApi, type LegalPage as LegalPageData, type LegalPageSlug } from "@/api/contentApi";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { sanitizeLegalHtml } from "@/lib/legalContent";

const defaults: Record<LegalPageSlug, string> = {
  "privacy-policy": "سياسة الخصوصية",
  "terms-and-conditions": "الشروط والأحكام",
  "teacher-terms-and-conditions": "شروط وأحكام تسجيل وعمل المعلمين",
};

export default function LegalPage({ slug }: { slug: LegalPageSlug }) {
  const [page, setPage] = useState<LegalPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    contentApi.getLegalPage(slug)
      .then(({ data }) => setPage(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const title = page?.title || defaults[slug];

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${title} | BNAN Academy`} description={`${title} الخاصة بأكاديمية بنان.`} path={`/${slug}`} />
      <Navbar />
      <main className="container mx-auto min-h-[60vh] max-w-4xl px-4 pb-20 pt-32" dir="rtl">
        <h1 className="mb-8 text-3xl font-bold font-cairo text-foreground md:text-4xl">{title}</h1>
        {loading ? (
          <p className="py-16 text-center text-muted-foreground">جاري تحميل المحتوى...</p>
        ) : error || !page?.content ? (
          <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">المحتوى غير متاح حاليًا.</div>
        ) : (
          <article
            className="legal-rich-content rounded-2xl border bg-card p-6 font-tajawal text-foreground leading-8 shadow-sm md:p-10"
            dangerouslySetInnerHTML={{ __html: sanitizeLegalHtml(page.content) }}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
