import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, ExternalLink, ImageOff, RefreshCw } from "lucide-react";
import { certificateFilesApi } from "@/api/certificateFilesApi";
import { useProtectedCertificateFile } from "@/hooks/useProtectedCertificateFile";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  studentCertificatesApi,
  studentModernCertificatesQueryKey,
  type ModernStudentCertificate,
} from "@/api/studentCertificatesApi";
import { useLanguage } from "@/i18n/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const dateText = (value: string | undefined, locale: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
};

const periodText = (period: ModernStudentCertificate["period"], locale: string) => {
  if (!period || !Number.isInteger(period.month) || !Number.isInteger(period.year)) return null;
  const date = new Date(Date.UTC(period.year, period.month - 1, 1));
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
};

function ModernCertificateCard({ certificate }: { certificate: ModernStudentCertificate }) {
  const { isArabic, pick } = useLanguage();
  const preview = useProtectedCertificateFile(
    certificate._id,
    "preview",
    Boolean(certificate.previewImagePath),
  );
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const locale = isArabic ? "ar-EG-u-ca-gregory" : "en-US-u-ca-gregory";
  const period = periodText(certificate.period, locale);
  const issuedAt = dateText(certificate.issuedAt, locale);
  const supported = certificate.certificateType === "student_monthly";

  const openPdf = async () => {
    const popup = window.open("about:blank", "_blank");
    if (!popup) {
      setPdfError(pick("تعذر فتح نافذة الشهادة. اسمح بالنوافذ المنبثقة ثم حاول مجددًا.", "Unable to open the certificate window. Allow pop-ups and try again."));
      return;
    }

    setPdfLoading(true);
    setPdfError(null);

    try {
      const blob = await certificateFilesApi.getCertificateFile(certificate._id, "pdf");
      const objectUrl = URL.createObjectURL(blob);
      let revoked = false;
      const revokeObjectUrl = () => {
        if (revoked) return;
        revoked = true;
        if (typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(objectUrl);
      };

      popup.location.href = objectUrl;
      window.setTimeout(revokeObjectUrl, 60_000);
    } catch {
      setPdfError(pick("تعذر تحميل الشهادة. حاول مرة أخرى.", "Unable to load the certificate. Please try again."));
      if (!popup.closed) popup.close();
    } finally {
      setPdfLoading(false);
    }
  };

  return <Card className="min-w-0 overflow-hidden shadow-sm">
    {certificate.previewImagePath && preview.isLoading ? <div className="grid aspect-[16/9] place-items-center bg-muted/50 text-sm text-muted-foreground" role="status">{pick("جاري تحميل المعاينة...", "Loading preview...")}</div>
      : certificate.previewImagePath && preview.error ? <div className="grid aspect-[16/9] gap-2 bg-muted/50 p-4 text-center text-sm text-destructive" role="alert"><p>{pick("تعذر تحميل المعاينة.", "Unable to load preview.")}</p><Button type="button" variant="outline" size="sm" onClick={preview.retry}>{pick("إعادة تحميل المعاينة", "Retry preview")}</Button></div>
      : preview.url ? <img src={preview.url} alt={pick("معاينة الشهادة", "Certificate preview")} className="aspect-[16/9] w-full bg-muted object-contain" />
      : <div className="grid aspect-[16/9] place-items-center bg-muted/50 text-muted-foreground"><div className="text-center"><ImageOff className="mx-auto mb-2 h-8 w-8 opacity-50" /><p className="text-sm">{pick("لا توجد معاينة", "No preview available")}</p></div></div>}
    <CardHeader className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2"><CardTitle className="break-words text-lg">{supported ? pick("شهادة التقييم الشهري", "Monthly certificate") : pick("نوع شهادة غير مدعوم", "Unsupported certificate type")}</CardTitle><Badge variant={supported ? "default" : "secondary"}>{supported ? pick("رسمية", "Official") : certificate.certificateType}</Badge></div>
      <p className="break-all text-sm text-muted-foreground">{pick("رقم الشهادة", "Certificate number")}: <span dir="ltr">{certificate.certificateNumber}</span></p>
    </CardHeader>
    <CardContent className="space-y-4">
      <dl className="grid gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-2">
        {certificate.recipientSnapshot?.fullName && <div><dt className="text-xs text-muted-foreground">{pick("اسم الطالب", "Student")}</dt><dd className="mt-1 break-words font-semibold">{certificate.recipientSnapshot.fullName}</dd></div>}
        {period && <div><dt className="text-xs text-muted-foreground">{pick("الفترة", "Period")}</dt><dd className="mt-1 font-semibold">{period}</dd></div>}
        {certificate.academicContext?.curriculumNameSnapshot && <div><dt className="text-xs text-muted-foreground">{pick("المنهج", "Curriculum")}</dt><dd className="mt-1 break-words font-semibold">{certificate.academicContext.curriculumNameSnapshot}</dd></div>}
        {certificate.academicContext?.gradeNameSnapshot && <div><dt className="text-xs text-muted-foreground">{pick("الصف", "Grade")}</dt><dd className="mt-1 break-words font-semibold">{certificate.academicContext.gradeNameSnapshot}</dd></div>}
        {certificate.academicContext?.classroomNameSnapshot && <div><dt className="text-xs text-muted-foreground">{pick("الفصل", "Classroom")}</dt><dd className="mt-1 break-words font-semibold">{certificate.academicContext.classroomNameSnapshot}</dd></div>}
        {issuedAt && <div><dt className="text-xs text-muted-foreground">{pick("تاريخ الإصدار", "Issued at")}</dt><dd className="mt-1 font-semibold">{issuedAt}</dd></div>}
        {typeof certificate.totalScore === "number" && <div><dt className="text-xs text-muted-foreground">{pick("المجموع", "Total score")}</dt><dd className="mt-1 font-semibold tabular-nums">{certificate.totalScore}{typeof certificate.totalMaxScore === "number" ? ` / ${certificate.totalMaxScore}` : ""}</dd></div>}
        {typeof certificate.percentage === "number" && <div><dt className="text-xs text-muted-foreground">{pick("النسبة", "Percentage")}</dt><dd className="mt-1 font-semibold tabular-nums">{certificate.percentage}%</dd></div>}
      </dl>
      {!!certificate.subjects?.length && <div><p className="mb-2 text-sm font-semibold">{pick("المواد والدرجات", "Subjects and scores")}</p><ul className="space-y-2">{certificate.subjects.map((subject) => <li key={subject.subject} className="flex min-w-0 justify-between gap-3 rounded-lg border p-3 text-sm"><span className="break-words">{subject.nameSnapshot}</span><span className="shrink-0 tabular-nums">{subject.score} / {subject.maxScore}</span></li>)}</ul></div>}
      {certificate.pdfPath && <div className="space-y-2"><Button type="button" onClick={() => void openPdf()} disabled={pdfLoading}><ExternalLink className="h-4 w-4" />{pdfLoading ? pick("جاري التحميل...", "Loading...") : pick("عرض الشهادة", "Open certificate")}</Button>{pdfError && <p className="text-sm text-destructive" role="alert">{pdfError}</p>}</div>}
    </CardContent>
  </Card>;
}

const SectionState = ({ message, retry, fetching }: { message: string; retry: () => void; fetching: boolean }) => <Card><CardContent className="flex flex-col items-center gap-4 p-8 text-center"><p className="text-destructive">{message}</p><Button variant="outline" onClick={retry} disabled={fetching}><RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />إعادة المحاولة</Button></CardContent></Card>;

export default function StudentCertificates() {
  const { pick } = useLanguage();
  const modern = useQuery({ queryKey: studentModernCertificatesQueryKey, queryFn: studentCertificatesApi.getMyCertificates, staleTime: 60_000, retry: 1 });

  return <DashboardLayout><div className="mx-auto w-full max-w-6xl space-y-8">
    <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6"><div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Award className="h-5 w-5" /></span><div className="min-w-0"><h1 className="text-2xl font-bold">{pick("الشهادات", "Certificates")}</h1><p className="mt-1 break-words text-sm text-muted-foreground">{pick("كل شهاداتك المتاحة.", "All your available certificates.")}</p></div></div></header>

    <section className="space-y-4" aria-label={pick("الشهادات", "Certificates")}>
      {modern.isLoading ? <div className="grid gap-4 md:grid-cols-2" aria-label={pick("جاري تحميل الشهادات", "Loading certificates")}>{[0, 1].map((item) => <Skeleton key={item} className="h-96 rounded-2xl" />)}</div>
        : modern.isError ? <SectionState message={pick("تعذر تحميل الشهادات", "Unable to load certificates")} retry={() => void modern.refetch()} fetching={modern.isFetching} />
        : !modern.data?.length ? <Card><CardContent className="p-10 text-center text-muted-foreground">{pick("لا توجد شهادات حاليًا", "No certificates are currently available")}</CardContent></Card>
        : <div className="grid gap-4 md:grid-cols-2">{modern.data.map((certificate) => <ModernCertificateCard key={certificate._id} certificate={certificate} />)}</div>}
    </section>
  </div></DashboardLayout>;
}
