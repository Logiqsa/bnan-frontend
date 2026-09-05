import { ChevronDown, ExternalLink, FileText, Image } from "lucide-react";
import { useState, type ReactNode } from "react";
import type {
  NamedEntity,
  TeacherApplication,
  TeacherAssignment,
} from "@/api/teacherApplicationsApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const graduationLabels: Record<string, string> = {
  excellent: "ممتاز",
  "very-good": "جيد جدًا",
  good: "جيد",
  pass: "مقبول",
};
const computerLabels: Record<string, string> = {
  excellent: "ممتاز",
  "very-good": "جيد جدًا",
  good: "جيد",
};
const degreeLabels: Record<string, string> = {
  "bachelor-student": "طالب بكالوريوس",
  bachelor: "بكالوريوس",
  "master-student": "طالب ماجستير",
  master: "ماجستير",
  "phd-student": "طالب دكتوراه",
  phd: "دكتوراه",
};
const entityName = (value?: NamedEntity | string) =>
  typeof value === "string" ? value : value?.name || "—";
const yesNo = (value?: boolean | string | number | null) => {
  if (value === undefined || value === null || value === "") return "—";
  return value === true || value === "true" || value === 1 ? "نعم" : "لا";
};
const assignmentFallback = (item: TeacherApplication): TeacherAssignment[] => {
  if (item.teacherAssignments?.length) return item.teacherAssignments;
  if (!item.grades?.length) return [];
  return item.grades.map((grade) => ({ grade, subjects: item.subjects || [] }));
};
const entityKey = (value?: NamedEntity | string) =>
  typeof value === "string" ? value : value?.id || value?.name || "";
const groupGradesBySubject = (assignments: TeacherAssignment[]) => {
  const grouped = new Map<
    string,
    {
      subject: NamedEntity | string;
      grades: Map<string, NamedEntity | string>;
    }
  >();
  assignments.forEach((assignment) => {
    if (!assignment.grade) return;
    assignment.subjects?.forEach((subject) => {
      const subjectKey = entityKey(subject);
      const gradeKey = entityKey(assignment.grade);
      if (!subjectKey || !gradeKey) return;
      const current = grouped.get(subjectKey) || {
        subject,
        grades: new Map<string, NamedEntity | string>(),
      };
      current.grades.set(gradeKey, assignment.grade!);
      grouped.set(subjectKey, current);
    });
  });
  return [...grouped.values()].map(({ subject, grades }) => ({
    subject,
    grades: [...grades.values()],
  }));
};
const fileUrl = (
  item: TeacherApplication,
  key: "cv" | "certificate" | "identityDocument" | "stableInternetProof",
) => item[`${key}Url`] || item[key];
const date = (value?: string) =>
  value ? new Date(value).toLocaleString("ar-EG-u-ca-gregory") : "—";

export const applicantName = (item: TeacherApplication) =>
  item.fullName || item.user?.fullName || "بدون اسم";
export const applicantEmail = (item: TeacherApplication) =>
  item.email || item.user?.email || "—";
export const applicantPhone = (item: TeacherApplication) =>
  item.phone || item.user?.phone || "—";
export const applicantWhatsapp = (item: TeacherApplication) =>
  item.whatsapp || applicantPhone(item);

const Detail = ({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) => (
  <div className="rounded-xl border bg-muted/20 p-3">
    <p className="mb-1 text-xs text-muted-foreground">{label}</p>
    <p className="break-words text-sm font-medium">{value ?? "—"}</p>
  </div>
);
const FileButton = ({
  label,
  url,
  image = false,
}: {
  label: string;
  url?: string;
  image?: boolean;
}) =>
  url ? (
    <Button asChild variant="outline" className="justify-start gap-2">
      <a href={url} target="_blank" rel="noopener noreferrer">
        {image ? (
          <Image className="h-4 w-4" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        {label}
        <ExternalLink className="mr-auto h-3.5 w-3.5" />
      </a>
    </Button>
  ) : (
    <Button variant="outline" disabled className="justify-start gap-2">
      <FileText className="h-4 w-4" />
      {label} — غير مرفق
    </Button>
  );

const DetailsSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="overflow-hidden rounded-xl border bg-card"
    >
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-4 font-bold transition-colors hover:bg-muted/40">
        <span className="font-cairo">{title}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden border-t data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="p-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export function TeacherApplicationDetails({
  application,
}: {
  application: TeacherApplication;
}) {
  const teacherAssignments = assignmentFallback(application);
  const subjectsWithGrades = groupGradesBySubject(teacherAssignments);
  return (
    <div className="space-y-5">
      <DetailsSection title="البيانات الشخصية والتواصل">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="الاسم" value={applicantName(application)} />
          <Detail
            label="البريد الإلكتروني"
            value={applicantEmail(application)}
          />
          <Detail label="الهاتف" value={applicantPhone(application)} />
          <Detail
            label="تاريخ الميلاد"
            value={
              application.dateOfBirth
                ? new Date(application.dateOfBirth).toLocaleDateString(
                    "ar-EG-u-ca-gregory",
                  )
                : "—"
            }
          />
          <Detail label="واتساب" value={application.whatsapp} />
          <Detail label="الجنسية" value={application.nationality} />
          <Detail
            label="الموقع"
            value={
              [application.city, application.country]
                .filter(Boolean)
                .join("، ") || "—"
            }
          />
        </div>
      </DetailsSection>
      <DetailsSection title="المؤهلات والخبرة">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Detail
            label="المؤهل"
            value={
              application.degree
                ? degreeLabels[application.degree] || application.degree
                : "—"
            }
          />
          <Detail label="التخصص" value={application.specialization} />
          <Detail label="سنة التخرج" value={application.graduationYear} />
          <Detail
            label="التقدير"
            value={
              application.graduationGrade
                ? graduationLabels[application.graduationGrade] ||
                  application.graduationGrade
                : "—"
            }
          />
          <Detail
            label="خبرة تدريس"
            value={yesNo(application.hasTeachingExperience)}
          />
          <Detail
            label="خبرة تدريس أونلاين"
            value={yesNo(application.hasOnlineTeachingExperience)}
          />
          <Detail
            label="الساعات المتاحة أسبوعيًا"
            value={application.availableHoursPerWeek}
          />
        </div>
      </DetailsSection>
      <DetailsSection title="التجهيز التقني">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Detail
            label="استخدام الكمبيوتر"
            value={
              application.computerSkillLevel
                ? computerLabels[application.computerSkillLevel] ||
                  application.computerSkillLevel
                : "—"
            }
          />
          <Detail label="حاسوب" value={yesNo(application.hasLaptop)} />
          <Detail
            label="إنترنت مستقر"
            value={yesNo(application.hasStableInternet)}
          />
          <Detail
            label="كاميرا جيدة"
            value={yesNo(application.hasGoodCamera)}
          />
          <Detail label="ميكروفون" value={yesNo(application.hasMicrophone)} />
          <Detail
            label="يمكنه تقديم حصة تجريبية"
            value={yesNo(application.canProvideDemoSession)}
          />
        </div>
      </DetailsSection>
      <DetailsSection title="المناهج والمواد">
        <p className="mb-2 text-sm">
          <strong>المنهج الأساسي:</strong>{" "}
          {application.curriculums?.map(entityName).join("، ") || "—"}
        </p>
        <p className="mb-3 text-sm">
          <strong>المناهج الإضافية المطلوبة:</strong>{" "}
          {application.additionalCurriculums?.map(entityName).join("، ") || "—"}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {subjectsWithGrades.length ? (
            subjectsWithGrades.map(({ subject, grades }) => (
              <div
                key={entityKey(subject)}
                className="rounded-xl border bg-muted/20 p-4"
              >
                <p className="font-bold text-primary">{entityName(subject)}</p>
                <p className="mb-2 mt-3 text-xs text-muted-foreground">
                  الصفوف التي يدرّسها
                </p>
                <div className="flex flex-wrap gap-2">
                  {grades.map((grade) => (
                    <Badge key={entityKey(grade)} variant="secondary">
                      {entityName(grade)}
                    </Badge>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              لا توجد صفوف أو مواد مسجلة.
            </p>
          )}
        </div>
      </DetailsSection>
      <DetailsSection title="الموافقة على الشروط">
        <div className="grid gap-3 sm:grid-cols-3">
          <Detail
            label="وافق على الشروط"
            value={yesNo(application.termsAccepted)}
          />
          <Detail
            label="تاريخ الموافقة"
            value={date(application.termsAcceptedAt)}
          />
          <Detail label="نسخة الشروط" value={application.termsVersion} />
        </div>
      </DetailsSection>
      <DetailsSection title="إجابات المتقدم">
        <div className="space-y-3">
          <Detail label="سبب الانضمام" value={application.joiningReason} />
          <Detail
            label="طريقة التعامل مع الطالب الضعيف"
            value={application.weakStudentHandling}
          />
          {application.introVideoUrl && (
            <Button asChild variant="outline">
              <a
                href={application.introVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                فتح الفيديو التعريفي
                <ExternalLink className="mr-2 h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </DetailsSection>
      <DetailsSection title="الملفات المرفقة">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <FileButton
            label="السيرة الذاتية CV"
            url={fileUrl(application, "cv")}
          />
          <FileButton
            label="الشهادة"
            url={fileUrl(application, "certificate")}
          />
          <FileButton
            label="إثبات الهوية"
            url={fileUrl(application, "identityDocument")}
          />
          <FileButton
            label="إثبات استقرار الإنترنت"
            image
            url={fileUrl(application, "stableInternetProof")}
          />
          {application.experienceCertificates?.map((url, index) => (
            <FileButton key={url} label={`شهادة خبرة ${index + 1}`} url={url} />
          ))}
        </div>
      </DetailsSection>
    </div>
  );
}
