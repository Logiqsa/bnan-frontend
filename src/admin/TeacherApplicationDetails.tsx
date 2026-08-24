import { ExternalLink, FileText } from "lucide-react";
import type { NamedEntity, TeacherApplication } from "@/api/teacherApplicationsApi";
import { Button } from "@/components/ui/button";

const graduationLabels: Record<string, string> = { excellent: "ممتاز", "very-good": "جيد جدًا", good: "جيد", pass: "مقبول" };
const computerLabels: Record<string, string> = { excellent: "ممتاز", "very-good": "جيد جدًا", good: "جيد" };
const entityName = (value?: NamedEntity | string) => typeof value === "string" ? value : value?.name || "—";
const yesNo = (value?: boolean) => value === undefined ? "—" : value ? "نعم" : "لا";
const fileUrl = (item: TeacherApplication, key: "cv" | "certificate" | "identityDocument") => item[`${key}Url`] || item[key];

export const applicantName = (item: TeacherApplication) => item.fullName || item.user?.fullName || "بدون اسم";
export const applicantEmail = (item: TeacherApplication) => item.email || item.user?.email || "—";
export const applicantPhone = (item: TeacherApplication) => item.phone || item.user?.phone || "—";

const Detail = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="rounded-xl border bg-muted/20 p-3">
    <p className="mb-1 text-xs text-muted-foreground">{label}</p>
    <p className="break-words text-sm font-medium">{value ?? "—"}</p>
  </div>
);

const FileButton = ({ label, url }: { label: string; url?: string }) => url ? (
  <Button asChild variant="outline" className="justify-start gap-2">
    <a href={url} target="_blank" rel="noopener noreferrer"><FileText className="h-4 w-4" />{label}<ExternalLink className="mr-auto h-3.5 w-3.5" /></a>
  </Button>
) : <Button variant="outline" disabled className="justify-start gap-2"><FileText className="h-4 w-4" />{label} — غير مرفق</Button>;

export function TeacherApplicationDetails({ application }: { application: TeacherApplication }) {
  return <div className="space-y-5">
    <section><h3 className="mb-3 font-bold font-cairo">البيانات الشخصية والتواصل</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Detail label="الاسم" value={applicantName(application)} /><Detail label="البريد الإلكتروني" value={applicantEmail(application)} /><Detail label="الهاتف" value={applicantPhone(application)} /><Detail label="واتساب" value={application.whatsapp} /><Detail label="الجنسية" value={application.nationality} /><Detail label="الموقع" value={[application.city, application.country].filter(Boolean).join("، ") || "—"} /><Detail label="البريد مفعّل" value={yesNo(application.isVerified ?? application.user?.isVerified)} /></div></section>
    <section><h3 className="mb-3 font-bold font-cairo">المؤهلات والخبرة</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Detail label="المؤهل" value={application.degree} /><Detail label="التخصص" value={application.specialization} /><Detail label="جهة التخرج" value={application.institutionName} /><Detail label="سنة التخرج" value={application.graduationYear} /><Detail label="التقدير" value={application.graduationGrade ? graduationLabels[application.graduationGrade] || application.graduationGrade : "—"} /><Detail label="خبرة تدريس" value={yesNo(application.hasTeachingExperience)} /><Detail label="خبرة تدريس أونلاين" value={yesNo(application.hasOnlineTeachingExperience)} /><Detail label="الساعات المتاحة أسبوعيًا" value={application.availableHoursPerWeek} /></div></section>
    <section><h3 className="mb-3 font-bold font-cairo">التجهيز التقني</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Detail label="استخدام الكمبيوتر" value={application.computerSkillLevel ? computerLabels[application.computerSkillLevel] || application.computerSkillLevel : "—"} /><Detail label="حاسوب" value={yesNo(application.hasLaptop)} /><Detail label="إنترنت مستقر" value={yesNo(application.hasStableInternet)} /><Detail label="كاميرا جيدة" value={yesNo(application.hasGoodCamera)} /><Detail label="ميكروفون" value={yesNo(application.hasMicrophone)} /><Detail label="يمكنه تقديم حصة تجريبية" value={yesNo(application.canProvideDemoSession)} /></div></section>
    <section><h3 className="mb-3 font-bold font-cairo">المناهج والمواد</h3><p className="mb-3 text-sm"><strong>المناهج:</strong> {application.curriculums?.map(entityName).join("، ") || "—"}</p><div className="space-y-2">{application.teacherAssignments?.length ? application.teacherAssignments.map((assignment, index) => <div key={index} className="rounded-xl border p-3 text-sm"><strong>{entityName(assignment.grade)}:</strong> {assignment.subjects?.map(entityName).join("، ") || "—"}</div>) : <p className="text-sm text-muted-foreground">لا توجد صفوف أو مواد مسجلة.</p>}</div></section>
    <section><h3 className="mb-3 font-bold font-cairo">إجابات المتقدم</h3><div className="space-y-3"><Detail label="سبب الانضمام" value={application.joiningReason} /><Detail label="طريقة التعامل مع الطالب الضعيف" value={application.weakStudentHandling} />{application.introVideoUrl && <Button asChild variant="outline"><a href={application.introVideoUrl} target="_blank" rel="noopener noreferrer">فتح الفيديو التعريفي<ExternalLink className="mr-2 h-4 w-4" /></a></Button>}</div></section>
    <section><h3 className="mb-3 font-bold font-cairo">الملفات المرفقة</h3><div className="grid gap-2 sm:grid-cols-3"><FileButton label="السيرة الذاتية CV" url={fileUrl(application, "cv")} /><FileButton label="الشهادة" url={fileUrl(application, "certificate")} /><FileButton label="إثبات الهوية" url={fileUrl(application, "identityDocument")} /></div></section>
  </div>;
}
