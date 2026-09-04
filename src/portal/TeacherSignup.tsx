import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { authApi } from "@/api/authApi";
import { ApiError } from "@/api/client";
import {
  catalogApi,
  type CurriculumOption,
  type GradeOption,
  type SubjectOption,
} from "@/api/catalogApi";
import { getCountries, type CountryOption } from "@/api/countriesApi";
import { contentApi, type LegalPage } from "@/api/contentApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { pastedLegalHtml } from "@/lib/legalContent";
import { cn } from "@/lib/utils";
import AccountVerification from "@/components/AccountVerification";

const steps = [
  "البيانات الشخصية",
  "الوثائق الرسمية",
  "المناهج والمواد",
  "التقييم والاستعداد التقني",
];
const yesNo = [
  { value: "true", label: "نعم" },
  { value: "false", label: "لا" },
];
const initialValues: Record<string, string> = {};

export default function TeacherSignup() {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(initialValues);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  const [countriesError, setCountriesError] = useState("");
  const [curriculums, setCurriculums] = useState<CurriculumOption[]>([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState("");
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<Record<string, SubjectOption[]>>({});
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState<
    Record<string, boolean>
  >({});
  const [additionalCurriculums, setAdditionalCurriculums] = useState<string[]>(
    [],
  );
  const [experienceCertificates, setExperienceCertificates] = useState<File[]>(
    [],
  );
  const [termsPage, setTermsPage] = useState<LegalPage | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsLoading, setTermsLoading] = useState(false);
  const set = (name: string, value: string) =>
    setValues((current) => ({ ...current, [name]: value }));

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getCountries(controller.signal)
        .then(setCountries)
        .catch(() => setCountriesError("تعذر تحميل الدول.")),
      catalogApi.curriculums().then((result) => setCurriculums(result.data)),
    ])
      .catch((value) => setError((value as Error).message))
      .finally(() => setCatalogsLoading(false));
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!selectedCurriculum) {
      setGrades([]);
      return;
    }
    setLoadingGrades(true);
    setSelectedGrades([]);
    setAssignments({});
    catalogApi
      .grades(selectedCurriculum)
      .then((result) =>
        setGrades(result.data.filter((grade) => grade.isActive !== false)),
      )
      .catch((value) => setError((value as ApiError).message))
      .finally(() => setLoadingGrades(false));
  }, [selectedCurriculum]);
  const toggleGrade = async (gradeId: string, checked: boolean) => {
    if (!checked) {
      setSelectedGrades((current) => current.filter((id) => id !== gradeId));
      setAssignments((current) => {
        const next = { ...current };
        delete next[gradeId];
        return next;
      });
      return;
    }
    setSelectedGrades((current) => [...current, gradeId]);
    if (subjects[gradeId]) return;
    setLoadingSubjects((current) => ({ ...current, [gradeId]: true }));
    try {
      const result = await catalogApi.subjects(gradeId);
      setSubjects((current) => ({ ...current, [gradeId]: result.data }));
    } catch (value) {
      setError((value as ApiError).message);
    } finally {
      setLoadingSubjects((current) => ({ ...current, [gradeId]: false }));
    }
  };
  const toggleSubject = (
    gradeId: string,
    subjectId: string,
    checked: boolean,
  ) =>
    setAssignments((current) => ({
      ...current,
      [gradeId]: checked
        ? [...(current[gradeId] || []), subjectId]
        : (current[gradeId] || []).filter((id) => id !== subjectId),
    }));
  const selectedCurriculumData = curriculums.find(
    (item) => item.id === selectedCurriculum,
  );
  const progress = useMemo(() => {
    const required = [
      values.fullName?.trim().length >= 3,
      Boolean(values.email),
      values.password?.length >= 8,
      Boolean(values.phone),
      values.termsAccepted === "true",
      Boolean(values.dateOfBirth),
      Boolean(values.whatsapp),
      Boolean(values.nationality),
      Boolean(values.country),
      Boolean(values.city),
      Boolean(values.degree),
      Boolean(values.specialization),
      Boolean(values.graduationYear),
      Boolean(values.graduationGrade),
      Number(values.availableHoursPerWeek) >= 1,
      Boolean(files.cv),
      Boolean(files.certificate),
      Boolean(files.identityDocument),
      Boolean(selectedCurriculum),
      selectedGrades.length > 0,
      selectedGrades.length > 0 &&
        selectedGrades.every((id) => (assignments[id] || []).length > 0),
      Boolean(values.computerSkillLevel),
      Boolean(values.hasTeachingExperience),
      Boolean(values.hasOnlineTeachingExperience),
      Boolean(values.hasLaptop),
      Boolean(values.hasStableInternet),
      Boolean(values.hasGoodCamera),
      Boolean(values.hasMicrophone),
      Boolean(values.canProvideDemoSession),
      Boolean(values.introVideoUrl),
      Boolean(values.joiningReason),
      Boolean(values.weakStudentHandling),
      Boolean(files.stableInternetProof),
    ];
    return Math.round(
      (required.filter(Boolean).length / required.length) * 100,
    );
  }, [values, files, selectedCurriculum, selectedGrades, assignments]);
  const validStep = useMemo(() => {
    if (step === 0)
      return !!(
        values.fullName?.trim().length >= 3 &&
        values.email &&
        values.password?.length >= 8 &&
        values.phone &&
        values.termsAccepted === "true"
      );
    if (step === 1)
      return !!(
        values.dateOfBirth &&
        values.dateOfBirth <= new Date().toISOString().slice(0, 10) &&
        values.nationality &&
        values.country &&
        values.city &&
        values.whatsapp &&
        values.degree &&
        values.specialization &&
        values.graduationYear &&
        values.graduationGrade &&
        values.availableHoursPerWeek &&
        Number(values.availableHoursPerWeek) >= 1 &&
        files.cv &&
        files.certificate &&
        files.identityDocument
      );
    if (step === 2)
      return !!(
        selectedCurriculum &&
        selectedGrades.length &&
        selectedGrades.every((id) => (assignments[id] || []).length)
      );
    if (step === 3)
      return !!(
        values.computerSkillLevel &&
        values.hasTeachingExperience &&
        values.hasOnlineTeachingExperience &&
        values.hasLaptop &&
        values.hasStableInternet &&
        values.hasGoodCamera &&
        values.hasMicrophone &&
        values.canProvideDemoSession &&
        values.introVideoUrl &&
        values.joiningReason &&
        values.weakStudentHandling &&
        files.stableInternetProof
      );
    return true;
  }, [step, values, selectedCurriculum, selectedGrades, assignments, files]);
  const next = () => {
    if (!validStep) {
      setError(
        step === 2
          ? "اختر منهجًا وصفًا واحدًا على الأقل ومادة واحدة لكل صف."
          : "أكمل الحقول المطلوبة قبل المتابعة.",
      );
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validStep) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      Object.entries(values).forEach(
        ([key, value]) => value && body.append(key, value),
      );
      body.append("curriculum", selectedCurriculum);
      body.append(
        "additionalCurriculums",
        JSON.stringify(
          additionalCurriculums.filter((id) => id !== selectedCurriculum),
        ),
      );
      body.append(
        "teacherAssignments",
        JSON.stringify(
          selectedGrades.map((grade) => ({
            grade,
            subjects: assignments[grade],
          })),
        ),
      );
      Object.entries(files).forEach(
        ([key, value]) => value && body.append(key, value),
      );
      experienceCertificates.forEach((file) =>
        body.append("experienceCertificates", file),
      );
      const response = await authApi.registerTeacher(body);
      setVerificationEmail(response.data.email || values.email);
    } catch (value) {
      const apiError = value as ApiError;
      setError(
        apiError.code === "EMAIL_ALREADY_EXISTS"
          ? "البريد الإلكتروني مسجل بالفعل."
          : apiError.message,
      );
    } finally {
      setBusy(false);
    }
  };
  const openTerms = async () => {
    setTermsOpen(true);
    if (termsPage) return;
    setTermsLoading(true);
    try {
      const result = await contentApi.getLegalPage(
        "teacher-terms-and-conditions",
      );
      setTermsPage(result.data);
    } catch (value) {
      setError((value as ApiError).message || "تعذر تحميل شروط المعلمين.");
      setTermsOpen(false);
    } finally {
      setTermsLoading(false);
    }
  };
  const chooseStableProof = (file?: File) => {
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError(
        "إثبات استقرار الإنترنت يجب أن يكون صورة PNG أو JPG أو JPEG أو WEBP.",
      );
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("حجم صورة إثبات الإنترنت يجب ألا يتجاوز 5MB.");
      return;
    }
    setError("");
    setFiles((current) => ({ ...current, stableInternetProof: file }));
  };
  const chooseExperienceFiles = (list: FileList | null) => {
    if (!list) return;
    const selected = Array.from(list);
    if (selected.length > 10) {
      setError("يمكن إرفاق 10 شهادات خبرة بحد أقصى.");
      return;
    }
    setError("");
    setExperienceCertificates(selected);
  };

  if (verificationEmail)
    return (
      <AccountVerification
        email={verificationEmail}
        onVerified={() => {
          window.location.href = `/portal/login?email=${encodeURIComponent(verificationEmail)}&verified=1`;
        }}
      />
    );

  return (
    <main
      className="min-h-screen bg-hero-gradient flex items-center justify-center py-8 px-4"
      dir="rtl"
    >
      <Card className="max-w-4xl w-full mx-auto min-h-[640px] flex flex-col">
        <CardHeader>
          <CardTitle>التسجيل كمعلم</CardTitle>
          <div
            className="space-y-2 pt-4"
            aria-label={`مستوى التقدم ${progress}%`}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">مستوى التقدم</span>
              <span className="font-bold text-primary">{progress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-secondary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 pt-4">
            {steps.map((title, index) => (
              <div key={title} className="text-center">
                <div
                  className={`h-2 rounded-full ${index <= step ? "bg-secondary" : "bg-muted"}`}
                />
                <span
                  className={`hidden md:block text-xs mt-2 ${index === step ? "font-bold" : "text-muted-foreground"}`}
                >
                  {title}
                </span>
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <form onSubmit={submit} className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col justify-center space-y-5">
              {error && (
                <div
                  role="alert"
                  className="rounded-xl bg-destructive/10 text-destructive p-3 text-sm"
                >
                  {error}
                </div>
              )}
              {step === 0 && (
                <div className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="الاسم الكامل *">
                      <Input
                        value={values.fullName || ""}
                        onChange={(e) => set("fullName", e.target.value)}
                      />
                    </Field>
                    <Field label="البريد الإلكتروني *">
                      <Input
                        type="email"
                        dir="ltr"
                        value={values.email || ""}
                        onChange={(e) => set("email", e.target.value)}
                      />
                    </Field>
                    <Field label="رقم الهاتف *">
                      <Input
                        dir="ltr"
                        value={values.phone || ""}
                        onChange={(e) => set("phone", e.target.value)}
                      />
                    </Field>
                    <Field label="كلمة المرور *">
                      <Input
                        type="password"
                        dir="ltr"
                        minLength={8}
                        value={values.password || ""}
                        onChange={(e) => set("password", e.target.value)}
                      />
                    </Field>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border p-4">
                    <Checkbox
                      checked={values.termsAccepted === "true"}
                      onCheckedChange={(checked) =>
                        set(
                          "termsAccepted",
                          checked === true ? "true" : "false",
                        )
                      }
                    />
                    <span>
                      أوافق على{" "}
                      <button
                        type="button"
                        onClick={() => void openTerms()}
                        className="font-semibold text-primary underline underline-offset-4"
                      >
                        شروط وأحكام تسجيل وعمل المعلمين
                      </button>
                      .
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    بعد إنشاء الطلب سيُرسل رمز OTP إلى بريدك الإلكتروني لتفعيل
                    الحساب.
                  </p>
                </div>
              )}
              {step === 1 && (
                <div className="space-y-5">
                  <div className="rounded-xl bg-secondary/10 p-4">
                    <h2 className="font-cairo text-xl font-bold">
                      أهلًا بك يا {values.fullName?.trim()} 👋
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      أكمل بياناتك المهنية وارفع وثائقك الرسمية.
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="تاريخ الميلاد *">
                      <Input
                        type="date"
                        dir="ltr"
                        max={new Date().toISOString().slice(0, 10)}
                        value={values.dateOfBirth || ""}
                        onChange={(e) => set("dateOfBirth", e.target.value)}
                      />
                    </Field>
                    <Field label="رقم واتساب *">
                      <Input
                        dir="ltr"
                        value={values.whatsapp || ""}
                        onChange={(e) => set("whatsapp", e.target.value)}
                      />
                    </Field>
                    <CountrySelect
                      label="الجنسية *"
                      value={values.nationality || ""}
                      loading={catalogsLoading}
                      countries={countries}
                      onChange={(value) => set("nationality", value)}
                    />
                    <CountrySelect
                      label="الدولة *"
                      value={values.country || ""}
                      loading={catalogsLoading}
                      countries={countries}
                      onChange={(value) => set("country", value)}
                    />
                    <Field label="المدينة *">
                      <Input
                        value={values.city || ""}
                        onChange={(e) => set("city", e.target.value)}
                      />
                    </Field>
                    <SelectField
                      label="المؤهل *"
                      value={values.degree || ""}
                      onChange={(value) => set("degree", value)}
                      options={[
                        { value: "bachelor-student", label: "طالب بكالوريوس" },
                        { value: "bachelor", label: "بكالوريوس" },
                        { value: "master-student", label: "طالب ماجستير" },
                        { value: "master", label: "ماجستير" },
                        { value: "phd-student", label: "طالب دكتوراه" },
                        { value: "phd", label: "دكتوراه" },
                      ]}
                    />
                    <Field label="التخصص *">
                      <Input
                        value={values.specialization || ""}
                        onChange={(e) => set("specialization", e.target.value)}
                      />
                    </Field>
                    <Field label="سنة التخرج *">
                      <Input
                        type="number"
                        min="1950"
                        max={new Date().getFullYear()}
                        value={values.graduationYear || ""}
                        onChange={(e) => set("graduationYear", e.target.value)}
                      />
                    </Field>
                    <SelectField
                      label="التقدير *"
                      value={values.graduationGrade || ""}
                      onChange={(value) => set("graduationGrade", value)}
                      options={[
                        { value: "excellent", label: "ممتاز" },
                        { value: "very-good", label: "جيد جدًا" },
                        { value: "good", label: "جيد" },
                        { value: "pass", label: "مقبول" },
                      ]}
                    />
                    <Field label="الساعات المتاحة أسبوعيًا *">
                      <Input
                        type="number"
                        min="1"
                        value={values.availableHoursPerWeek || ""}
                        onChange={(e) =>
                          set("availableHoursPerWeek", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="السيرة الذاتية *">
                      <Input
                        type="file"
                        onChange={(e) =>
                          setFiles((current) => ({
                            ...current,
                            cv: e.target.files?.[0] || null,
                          }))
                        }
                      />
                    </Field>
                    <Field label="شهادة التخرج *">
                      <Input
                        type="file"
                        onChange={(e) =>
                          setFiles((current) => ({
                            ...current,
                            certificate: e.target.files?.[0] || null,
                          }))
                        }
                      />
                    </Field>
                    <Field label="البطاقة الشخصية *">
                      <Input
                        type="file"
                        onChange={(e) =>
                          setFiles((current) => ({
                            ...current,
                            identityDocument: e.target.files?.[0] || null,
                          }))
                        }
                      />
                    </Field>
                    <Field label="شهادات الخبرة (اختياري، حتى 10 ملفات)">
                      <Input
                        type="file"
                        multiple
                        onChange={(e) => chooseExperienceFiles(e.target.files)}
                      />
                    </Field>
                    {countriesError && (
                      <p className="sm:col-span-2 text-sm text-destructive">
                        {countriesError}
                      </p>
                    )}
                  </div>
                  {experienceCertificates.length > 0 && (
                    <div className="space-y-1">
                      {experienceCertificates.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs"
                        >
                          <span className="truncate">{file.name}</span>
                          <button
                            type="button"
                            aria-label="حذف الملف"
                            onClick={() =>
                              setExperienceCertificates((current) =>
                                current.filter((_, i) => i !== index),
                              )
                            }
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {step === 2 && (
                <div className="space-y-5">
                  <SelectField
                    label="المنهج الأساسي *"
                    value={selectedCurriculum}
                    onChange={(value) => {
                      setSelectedCurriculum(value);
                      setAdditionalCurriculums((current) =>
                        current.filter((id) => id !== value),
                      );
                    }}
                    loading={catalogsLoading}
                    options={curriculums.map((item) => ({
                      value: item.id,
                      label: `${item.name} — ${item.registrationMode === "egyptian" ? "مصري" : "خليجي"}`,
                    }))}
                  />
                  {selectedCurriculum && (
                    <div className="rounded-xl border p-4">
                      <h3 className="font-bold mb-1">مناهج إضافية</h3>
                      <p className="mb-3 text-xs text-muted-foreground">
                        اختياري — اخترها فقط إذا كنت ترغب في تدريس مناهج أخرى.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {curriculums
                          .filter((item) => item.id !== selectedCurriculum)
                          .map((item) => (
                            <label
                              key={item.id}
                              className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm"
                            >
                              <Checkbox
                                checked={additionalCurriculums.includes(
                                  item.id,
                                )}
                                onCheckedChange={(checked) =>
                                  setAdditionalCurriculums((current) =>
                                    checked === true
                                      ? [...current, item.id]
                                      : current.filter((id) => id !== item.id),
                                  )
                                }
                              />
                              {item.name}
                            </label>
                          ))}
                      </div>
                    </div>
                  )}
                  {selectedCurriculum && (
                    <div>
                      <h3 className="font-bold mb-3">
                        اختر الصفوف والمواد لكل صف
                      </h3>
                      {loadingGrades ? (
                        <Loader />
                      ) : grades.length === 0 ? (
                        <p className="text-muted-foreground">
                          لا توجد صفوف نشطة لهذا المنهج.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {grades.map((grade) => (
                            <div
                              key={grade.id}
                              className="rounded-xl border p-4"
                            >
                              <label className="flex items-center gap-3 font-semibold">
                                <Checkbox
                                  checked={selectedGrades.includes(grade.id)}
                                  onCheckedChange={(checked) =>
                                    void toggleGrade(grade.id, checked === true)
                                  }
                                />
                                {grade.name}
                              </label>
                              {selectedGrades.includes(grade.id) && (
                                <div className="mt-4 pr-7">
                                  <p className="text-sm text-muted-foreground mb-2">
                                    المواد التي تستطيع تدريسها:
                                  </p>
                                  {loadingSubjects[grade.id] ? (
                                    <Loader />
                                  ) : (
                                    <div className="flex flex-wrap gap-3">
                                      {(subjects[grade.id] || []).map(
                                        (subject) => (
                                          <label
                                            key={subject.id}
                                            className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm"
                                          >
                                            <Checkbox
                                              checked={(
                                                assignments[grade.id] || []
                                              ).includes(subject.id)}
                                              onCheckedChange={(checked) =>
                                                toggleSubject(
                                                  grade.id,
                                                  subject.id,
                                                  checked === true,
                                                )
                                              }
                                            />
                                            {subject.name}
                                          </label>
                                        ),
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {step === 3 && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <SelectField
                    label="مستوى استخدام الكمبيوتر *"
                    value={values.computerSkillLevel || ""}
                    onChange={(value) => set("computerSkillLevel", value)}
                    options={[
                      { value: "excellent", label: "ممتاز" },
                      { value: "very-good", label: "جيد جدًا" },
                      { value: "good", label: "جيد" },
                    ]}
                  />
                  {[
                    ["hasTeachingExperience", "هل لديك خبرة تدريس؟ *"],
                    [
                      "hasOnlineTeachingExperience",
                      "هل لديك خبرة بالتدريس عن بُعد؟ *",
                    ],
                    ["hasLaptop", "هل لديك حاسوب؟ *"],
                    ["hasStableInternet", "هل الإنترنت مستقر؟ *"],
                    ["hasGoodCamera", "هل لديك كاميرا جيدة؟ *"],
                    ["hasMicrophone", "هل لديك ميكروفون؟ *"],
                    ["canProvideDemoSession", "هل يمكنك تقديم حصة تجريبية؟ *"],
                  ].map(([name, label]) => (
                    <SelectField
                      key={name}
                      label={label}
                      value={values[name]}
                      onChange={(value) => set(name, value)}
                      options={yesNo}
                    />
                  ))}
                  <Field label="رابط الفيديو التعريفي *">
                    <Input
                      dir="ltr"
                      type="url"
                      value={values.introVideoUrl || ""}
                      onChange={(e) => set("introVideoUrl", e.target.value)}
                    />
                  </Field>
                  <Field label="لماذا تريد الانضمام؟ *">
                    <Textarea
                      value={values.joiningReason || ""}
                      onChange={(e) => set("joiningReason", e.target.value)}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="كيف تتعامل مع الطالب الضعيف؟ *">
                      <Textarea
                        value={values.weakStudentHandling || ""}
                        onChange={(e) =>
                          set("weakStudentHandling", e.target.value)
                        }
                      />
                    </Field>
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-5">
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <h3 className="font-bold">اختبر سرعة الإنترنت أولًا</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      افتح اختبار السرعة، انتظر ظهور النتيجة، ثم التقط صورة
                      للشاشة وارفعها هنا.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3"
                      asChild
                    >
                      <a
                        href="https://fast.com"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        اختبار السرعة عبر Fast.com
                      </a>
                    </Button>
                  </div>
                  <Field label="إثبات سرعة واستقرار الإنترنت * (صورة، حتى 5MB)">
                    <Input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                      onChange={(e) => chooseStableProof(e.target.files?.[0])}
                    />
                    {files.stableInternetProof && (
                      <div className="mt-2 rounded-xl border p-2">
                        <img
                          className="h-40 w-full rounded-lg object-contain"
                          src={URL.createObjectURL(files.stableInternetProof)}
                          alt="معاينة إثبات سرعة الإنترنت"
                        />
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {files.stableInternetProof.name}
                        </p>
                      </div>
                    )}
                  </Field>
                  <div className="rounded-xl bg-muted p-4 text-sm space-y-1">
                    <p>
                      <strong>الاسم:</strong> {values.fullName}
                    </p>
                    <p>
                      <strong>المؤهل:</strong> {values.degree}
                    </p>
                    <p>
                      <strong>المنهج الأساسي:</strong>{" "}
                      {selectedCurriculumData?.name}
                    </p>
                    <p>
                      <strong>المناهج الإضافية:</strong>{" "}
                      {additionalCurriculums
                        .map(
                          (id) =>
                            curriculums.find((item) => item.id === id)?.name,
                        )
                        .filter(Boolean)
                        .join("، ") || "لا توجد"}
                    </p>
                    <p>
                      <strong>الصفوف المختارة:</strong> {selectedGrades.length}
                    </p>
                    <p>
                      <strong>إجمالي المواد:</strong>{" "}
                      {Object.values(assignments).reduce(
                        (total, list) => total + list.length,
                        0,
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-between border-t pt-5 mt-6">
              <div>
                {step > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setError("");
                      setStep((current) => current - 1);
                    }}
                  >
                    <ArrowRight className="h-4 w-4 ml-2" />
                    السابق
                  </Button>
                ) : (
                  <Button type="button" variant="outline" asChild>
                    <Link to="/portal/login">إلغاء</Link>
                  </Button>
                )}
              </div>
              {step < steps.length - 1 ? (
                <Button type="button" onClick={next}>
                  التالي
                  <ArrowLeft className="h-4 w-4 mr-2" />
                </Button>
              ) : (
                <Button disabled={busy || !validStep} type="submit">
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    "إرسال طلب التسجيل"
                  )}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent
          dir="rtl"
          className="max-h-[85vh] max-w-3xl overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>
              {termsPage?.title || "شروط وأحكام تسجيل وعمل المعلمين"}
            </DialogTitle>
          </DialogHeader>
          {termsLoading ? (
            <Loader />
          ) : termsPage?.content ? (
            <article
              className="legal-rich-content whitespace-pre-wrap leading-8"
              dangerouslySetInnerHTML={{
                __html: pastedLegalHtml("", termsPage.content) || "",
              }}
            />
          ) : (
            <p className="text-muted-foreground">المحتوى غير متاح حاليًا.</p>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-sm space-y-1.5 block">
      <span>{label}</span>
      {children}
    </label>
  );
}
function SelectField({
  label,
  value,
  onChange,
  options,
  loading = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  loading?: boolean;
}) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onChange} disabled={loading}>
        <SelectTrigger>
          <SelectValue placeholder={loading ? "جاري التحميل..." : "اختر"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
function CountrySelect({
  label,
  value,
  onChange,
  countries,
  loading,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  countries: CountryOption[];
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedCountry = countries.find((country) => country.name === value);

  return (
    <div className="block space-y-1.5 text-sm">
      <span>{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={loading}
            className="w-full justify-between font-normal"
          >
            <span className={cn("truncate", !selectedCountry && "text-muted-foreground")}>
              {loading
                ? "جاري التحميل..."
                : selectedCountry
                  ? `${selectedCountry.flag} ${selectedCountry.name}`
                  : "اختر"}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] p-0"
        >
          <Command dir="rtl">
            <CommandInput placeholder="ابحث عن دولة..." />
            <CommandList>
              <CommandEmpty>لا توجد دولة مطابقة.</CommandEmpty>
              <CommandGroup>
                {countries.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={`${country.name} ${country.code}`}
                    onSelect={() => {
                      onChange(country.name);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "ml-2 h-4 w-4",
                        value === country.name ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">
                      {country.flag} {country.name}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
function Loader() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      جاري التحميل...
    </div>
  );
}
