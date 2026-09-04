import { ExternalLink, FileText, Image } from "lucide-react";
import type { NamedEntity, TeacherApplication, TeacherAssignment } from "@/api/teacherApplicationsApi";
import { Button } from "@/components/ui/button";

const graduationLabels: Record<string, string> = { excellent: "ممتاز", "very-good": "جيد جدًا", good: "جيد", pass: "مقبول" };
const computerLabels: Record<string, string> = { excellent: "ممتاز", "very-good": "جيد جدًا", good: "جيد" };
const degreeLabels: Record<string, string> = { "bachelor-student": "طالب بكالوريوس", bachelor: "بكالوريوس", "master-student": "طالب ماجستير", master: "ماجستير", "phd-student": "طالب دكتوراه", phd: "دكتوراه" };
const entityName = (value?: NamedEntity | string) => typeof value === "string" ? value : value?.name || "—";
const yesNo = (value?: boolean | string | number | null) => {
  if (value === undefined || value === null || value === "") return "—";
  return value === true || value === "true" || value === 1 ? "نعم" : "لا";
};
const assignmentFallback = (item: TeacherApplication): TeacherAssignment[] => {
  if (item.teacherAssignments?.length) return item.teacherAssignments;
  if (!item.grades?.length) return [];
  return item.grades.map((grade) => ({ grade, subjects: item.subjects || [] }));
};
const fileUrl = (item: TeacherApplication, key: "cv" | "certificate" | "identityDocument" | "stableInternetProof") => item[`${key}Url`] || item[key];
const date = (value?: string) => value ? new Date(value).toLocaleString("ar-EG-u-ca-gregory") : "—";

export const applicantName = (item: TeacherApplication) => item.fullName || item.user?.fullName || "بدون اسم";
export const applicantEmail = (item: TeacherApplication) => item.email || item.user?.email || "—";
export const applicantPhone = (item: TeacherApplication) => item.phone || item.user?.phone || "—";
export const applicantWhatsapp = (item: TeacherApplication) => item.whatsapp || applicantPhone(item);

const Detail = ({ label, value }: { label: string; value?: string | number | null }) => <div className="rounded-xl border bg-muted/20 p-3"><p className="mb-1 text-xs text-muted-foreground">{label}</p><p className="break-words text-sm font-medium">{value ?? "—"}</p></div>;
const FileButton = ({ label, url, image = false }: { label: string; url?: string; image?: boolean }) => url ? <Button asChild variant="outline" className="justify-start gap-2"><a href={url} target="_blank" rel="noopener noreferrer">{image ? <Image className="h-4 w-4" /> : <FileText className="h-4 w-4" />}{label}<ExternalLink className="mr-auto h-3.5 w-3.5" /></a></Button> : <Button variant="outline" disabled className="justify-start gap-2"><FileText className="h-4 w-4" />{label} — غير مرفق</Button>;

export function TeacherApplicationDetails({ application }: { application: TeacherApplication }) {
  const teacherAssignments = assignmentFallback(application);
  return <div className="space-y-5">
    <section><h3 className="mb-3 font-bold font-cairo">البيانات الشخصية والتواصل</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Detail label="الاسم" value={applicantName(application)} /><Detail label="البريد الإلكتروني" value={applicantEmail(application)} /><Detail label="الهاتف" value={applicantPhone(application)} /><Detail label="تاريخ الميلاد" value={application.dateOfBirth ? new Date(application.dateOfBirth).toLocaleDateString("ar-EG-u-ca-gregory") : "—"} /><Detail label="واتساب" value={application.whatsapp} /><Detail label="الجنسية" value={application.nationality} /><Detail label="الموقع" value={[application.city, application.country].filter(Boolean).join("، ") || "—"} /></div></section>
    <section><h3 className="mb-3 font-bold font-cairo">المؤهلات والخبرة</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Detail label="المؤهل" value={application.degree ? degreeLabels[application.degree] || application.degree : "—"} /><Detail label="التخصص" value={application.specialization} /><Detail label="سنة التخرج" value={application.graduationYear} /><Detail label="التقدير" value={application.graduationGrade ? graduationLabels[application.graduationGrade] || application.graduationGrade : "—"} /><Detail label="خبرة تدريس" value={yesNo(application.hasTeachingExperience)} /><Detail label="خبرة تدريس أونلاين" value={yesNo(application.hasOnlineTeachingExperience)} /><Detail label="الساعات المتاحة أسبوعيًا" value={application.availableHoursPerWeek} /></div></section>
    <section><h3 className="mb-3 font-bold font-cairo">التجهيز التقني</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Detail label="استخدام الكمبيوتر" value={application.computerSkillLevel ? computerLabels[application.computerSkillLevel] || application.computerSkillLevel : "—"} /><Detail label="حاسوب" value={yesNo(application.hasLaptop)} /><Detail label="إنترنت مستقر" value={yesNo(application.hasStableInternet)} /><Detail label="كاميرا جيدة" value={yesNo(application.hasGoodCamera)} /><Detail label="ميكروفون" value={yesNo(application.hasMicrophone)} /><Detail label="يمكنه تقديم حصة تجريبية" value={yesNo(application.canProvideDemoSession)} /></div></section>
    <section><h3 className="mb-3 font-bold font-cairo">المناهج والمواد</h3><p className="mb-2 text-sm"><strong>المنهج الأساسي:</strong> {application.curriculums?.map(entityName).join("، ") || "—"}</p><p className="mb-3 text-sm"><strong>المناهج الإضافية المطلوبة:</strong> {application.additionalCurriculums?.map(entityName).join("، ") || "—"}</p><div className="space-y-2">{teacherAssignments.length ? teacherAssignments.map((assignment, index) => <div key={index} className="rounded-xl border p-3 text-sm"><strong>{entityName(assignment.grade)}:</strong> {assignment.subjects?.map(entityName).join("، ") || "—"}</div>) : <p className="text-sm text-muted-foreground">لا توجد صفوف أو مواد مسجلة.</p>}</div></section>
    <section><h3 className="mb-3 font-bold font-cairo">الموافقة على الشروط</h3><div className="grid gap-3 sm:grid-cols-3"><Detail label="وافق على الشروط" value={yesNo(application.termsAccepted)} /><Detail label="تاريخ الموافقة" value={date(application.termsAcceptedAt)} /><Detail label="نسخة الشروط" value={application.termsVersion} /></div></section>
    <section><h3 className="mb-3 font-bold font-cairo">إجابات المتقدم</h3><div className="space-y-3"><Detail label="سبب الانضمام" value={application.joiningReason} /><Detail label="طريقة التعامل مع الطالب الضعيف" value={application.weakStudentHandling} />{application.introVideoUrl && <Button asChild variant="outline"><a href={application.introVideoUrl} target="_blank" rel="noopener noreferrer">فتح الفيديو التعريفي<ExternalLink className="mr-2 h-4 w-4" /></a></Button>}</div></section>
    <section><h3 className="mb-3 font-bold font-cairo">الملفات المرفقة</h3><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><FileButton label="السيرة الذاتية CV" url={fileUrl(application, "cv")} /><FileButton label="الشهادة" url={fileUrl(application, "certificate")} /><FileButton label="إثبات الهوية" url={fileUrl(application, "identityDocument")} /><FileButton label="إثبات استقرار الإنترنت" image url={fileUrl(application, "stableInternetProof")} />{application.experienceCertificates?.map((url, index) => <FileButton key={url} label={`شهادة خبرة ${index + 1}`} url={url} />)}</div></section>
  </div>;
}
