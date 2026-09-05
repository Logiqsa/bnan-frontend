import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronsUpDown, Loader2, X } from "lucide-react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
const TEACHER_SIGNUP_DRAFT_KEY = "bnan_teacher_signup_draft";

interface TeacherSignupDraft {
  step: number;
  curriculumStage: "grades" | "subjects";
  values: Record<string, string>;
  selectedCurriculum: string;
  selectedGrades: string[];
  assignments: Record<string, string[]>;
  activeGrade: string | null;
  additionalCurriculums: string[];
}

const readTeacherSignupDraft = (): Partial<TeacherSignupDraft> => {
  try {
    const raw = sessionStorage.getItem(TEACHER_SIGNUP_DRAFT_KEY);
    return raw ? JSON.parse(raw) as Partial<TeacherSignupDraft> : {};
  } catch {
    return {};
  }
};

export default function TeacherSignup() {
  const [savedDraft] = useState(readTeacherSignupDraft);
  // Browsers do not allow restoring File inputs. Return to the documents step
  // after a reload, while keeping every serializable answer and selection.
  const [step, setStep] = useState(() => Math.min(Math.max(savedDraft.step ?? 0, 0), 1));
  const [curriculumStage, setCurriculumStage] = useState<"grades" | "subjects">(savedDraft.curriculumStage ?? "grades");
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...initialValues, ...savedDraft.values }));
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  const [countriesError, setCountriesError] = useState("");
  const [curriculums, setCurriculums] = useState<CurriculumOption[]>([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState(savedDraft.selectedCurriculum ?? "");
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>(savedDraft.selectedGrades ?? []);
  const [activeGrade, setActiveGrade] = useState<string | null>(savedDraft.activeGrade ?? null);
  const [subjects, setSubjects] = useState<Record<string, SubjectOption[]>>({});
  const [assignments, setAssignments] = useState<Record<string, string[]>>(savedDraft.assignments ?? {});
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState<
    Record<string, boolean>
  >({});
  const [openGradeGroups, setOpenGradeGroups] = useState<Record<string, boolean>>({});
  const [openGradeStages, setOpenGradeStages] = useState<Record<string, boolean>>({});
  const [additionalCurriculums, setAdditionalCurriculums] = useState<string[]>(savedDraft.additionalCurriculums ?? []);
  const [experienceCertificates, setExperienceCertificates] = useState<File[]>(
    [],
  );
  const [termsPage, setTermsPage] = useState<LegalPage | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsLoading, setTermsLoading] = useState(false);
  const set = (name: string, value: string) =>
    setValues((current) => ({ ...current, [name]: value }));
  const previousCurriculum = useRef(selectedCurriculum);

  useEffect(() => {
    const draft: TeacherSignupDraft = {
      step,
      curriculumStage,
      values,
      selectedCurriculum,
      selectedGrades,
      assignments,
      activeGrade,
      additionalCurriculums,
    };
    sessionStorage.setItem(TEACHER_SIGNUP_DRAFT_KEY, JSON.stringify(draft));
  }, [step, curriculumStage, values, selectedCurriculum, selectedGrades, assignments, activeGrade, additionalCurriculums]);

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
    const curriculumChanged = previousCurriculum.current !== selectedCurriculum;
    previousCurriculum.current = selectedCurriculum;
    setLoadingGrades(true);
    if (curriculumChanged) {
      setCurriculumStage("grades");
      setSelectedGrades([]);
      setActiveGrade(null);
      setAssignments({});
      setSubjects({});
    }
    catalogApi
      .grades(selectedCurriculum)
      .then((result) => {
        const activeGrades = result.data.filter((grade) => grade.isActive !== false);
        setGrades(activeGrades);
        if (!curriculumChanged) {
          const validIds = new Set(activeGrades.map((grade) => grade.id));
          setSelectedGrades((current) => current.filter((id) => validIds.has(id)));
        }
      })
      .catch((value) => setError((value as ApiError).message))
      .finally(() => setLoadingGrades(false));
  }, [selectedCurriculum]);
  const toggleGrade = (gradeId: string, checked: boolean) => {
    if (!checked) {
      setSelectedGrades((current) => current.filter((id) => id !== gradeId));
      setActiveGrade((current) => current === gradeId ? null : current);
      setAssignments((current) => {
        const next = { ...current };
        delete next[gradeId];
        return next;
      });
      return;
    }
    setSelectedGrades((current) => [...current, gradeId]);
    setActiveGrade(gradeId);
  };
  useEffect(() => {
    selectedGrades.forEach((gradeId) => {
      if (subjects[gradeId] || loadingSubjects[gradeId]) return;
      setLoadingSubjects((current) => ({ ...current, [gradeId]: true }));
      catalogApi.subjects(gradeId)
        .then((result) => setSubjects((current) => ({ ...current, [gradeId]: result.data })))
        .catch((value) => setError((value as ApiError).message))
        .finally(() => setLoadingSubjects((current) => ({ ...current, [gradeId]: false })));
    });
  }, [selectedGrades, subjects, loadingSubjects]);
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
  const displayedGrade = activeGrade && selectedGrades.includes(activeGrade)
    ? activeGrade
    : selectedGrades[0];
  const gradeGroups = useMemo(() => {
    const languages = grades.filter((grade) => grade.name.includes("لغات"));
    const arabic = grades.filter((grade) => !grade.name.includes("لغات") && (grade.name.includes("عربي") || grade.name.includes("عربى")));
    const groupedIds = new Set([...languages, ...arabic].map((grade) => grade.id));
    const other = grades.filter((grade) => !groupedIds.has(grade.id));
    return [
      { key: "languages", label: "قسم اللغات", grades: languages },
      { key: "arabic", label: "القسم العربي", grades: arabic },
      ...(other.length ? [{ key: "other", label: "صفوف أخرى", grades: other }] : []),
    ];
  }, [grades]);
  const splitGradesByStage = (groupGrades: GradeOption[]) => {
    const normalize = (value: string) => value.replace(/[أإآ]/g, "ا").replace(/ى/g, "ي");
    const definitions = selectedCurriculumData?.registrationMode === "egyptian"
      ? [{ key: "primary", label: "المرحلة الابتدائية", keyword: "ابتدائي" }, { key: "preparatory", label: "المرحلة الإعدادية", keyword: "اعدادي" }, { key: "secondary", label: "المرحلة الثانوية", keyword: "ثانوي" }]
      : [{ key: "primary", label: "المرحلة الابتدائية", keyword: "ابتدائي" }, { key: "middle", label: "المرحلة المتوسطة", keyword: "متوسط" }, { key: "secondary", label: "المرحلة الثانوية", keyword: "ثانوي" }];
    const stages = definitions.map((stage) => ({
      ...stage,
      grades: groupGrades.filter((grade) => normalize(grade.name).includes(stage.keyword)),
    })).filter((stage) => stage.grades.length > 0);
    const stagedIds = new Set(stages.flatMap((stage) => stage.grades.map((grade) => grade.id)));
    const other = groupGrades.filter((grade) => !stagedIds.has(grade.id));
    return [...stages, ...(other.length ? [{ key: "other", label: "مراحل أخرى", keyword: "", grades: other }] : [])];
  };
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
      sessionStorage.removeItem(TEACHER_SIGNUP_DRAFT_KEY);
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
      <Card className="max-w-6xl w-full mx-auto min-h-[640px] flex flex-col">
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
                  {curriculumStage === "grades" && <><SelectField
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
                  )}</>}
                  {selectedCurriculum && (
                    <div>
                      {curriculumStage === "grades" ? <div className="mb-4">
                        <h3 className="font-bold">اختر الصفوف التي تدرّسها</h3>
                        <p className="mt-1 text-xs text-muted-foreground">يمكنك اختيار أكثر من صف، ثم تحديد المواد لكل صف بالأسفل.</p>
                      </div> : <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div><h3 className="font-bold">اختر المواد لكل صف</h3><p className="mt-1 text-xs text-muted-foreground">تنقل بين الصفوف المختارة وحدد مادة واحدة على الأقل لكل صف.</p></div>
                        <Button type="button" size="sm" variant="outline" onClick={() => { setError(""); setCurriculumStage("grades"); }}><ArrowRight className="ml-2 h-4 w-4" />تعديل الصفوف</Button>
                      </div>}
                      {loadingGrades ? (
                        <Loader />
                      ) : grades.length === 0 ? (
                        <p className="text-muted-foreground">
                          لا توجد صفوف نشطة لهذا المنهج.
                        </p>
                      ) : (
                        <div className="space-y-5">
                          {curriculumStage === "grades" && <div className="space-y-3">
                            {gradeGroups.map((group) => {
                              const isOpen = Boolean(openGradeGroups[group.key]);
                              const selectedCount = group.grades.filter((grade) => selectedGrades.includes(grade.id)).length;
                              return <Collapsible key={group.key} open={isOpen} onOpenChange={(open) => setOpenGradeGroups((current) => ({ ...current, [group.key]: open }))} className="overflow-hidden rounded-xl border bg-card">
                                <CollapsibleTrigger asChild>
                                  <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right transition-colors hover:bg-muted/50">
                                    <span><span className="block font-bold">{group.label}</span><span className="text-xs text-muted-foreground">{group.grades.length} صفوف{selectedCount ? ` — تم اختيار ${selectedCount}` : ""}</span></span>
                                    <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", isOpen && "rotate-180")} />
                                  </button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="space-y-4 border-t bg-muted/10 p-3">
                                    {splitGradesByStage(group.grades).map((stage) => {
                                      const stageId = `${group.key}-${stage.key}`;
                                      const isStageOpen = Boolean(openGradeStages[stageId]);
                                      const stageSelectedCount = stage.grades.filter((grade) => selectedGrades.includes(grade.id)).length;
                                      return <Collapsible key={stageId} open={isStageOpen} onOpenChange={(open) => setOpenGradeStages((current) => ({ ...current, [stageId]: open }))} className="overflow-hidden rounded-lg border bg-card">
                                        <CollapsibleTrigger asChild>
                                          <button type="button" className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-right transition-colors hover:bg-muted/50">
                                            <span className="flex items-center gap-2"><span className="text-sm font-bold">{stage.label}</span><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{stage.grades.length}{stageSelectedCount ? ` / مختار ${stageSelectedCount}` : ""}</span></span>
                                            <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", isStageOpen && "rotate-180")} />
                                          </button>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                          <div className="grid grid-cols-2 gap-2 border-t bg-muted/10 p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                            {stage.grades.map((grade) => {
                                              const selected = selectedGrades.includes(grade.id);
                                              return <button
                                                key={grade.id}
                                                type="button"
                                                aria-pressed={selected}
                                                onClick={() => toggleGrade(grade.id, !selected)}
                                                className={cn("relative flex min-h-20 items-center justify-center rounded-xl border-2 px-3 py-3 text-center text-sm font-semibold transition-colors", selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:border-primary/40 hover:bg-muted/40")}
                                              >
                                                {selected && <span className="absolute left-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-3.5 w-3.5" /></span>}
                                                {grade.name}
                                              </button>;
                                            })}
                                          </div>
                                        </CollapsibleContent>
                                      </Collapsible>;
                                    })}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>;
                            })}
                          </div>}

                          {curriculumStage === "grades" && <div className="flex justify-end border-t pt-4">
                            <Button type="button" disabled={selectedGrades.length === 0} onClick={() => { setError(""); setActiveGrade((current) => current && selectedGrades.includes(current) ? current : selectedGrades[0]); setCurriculumStage("subjects"); }}>
                              التالي: اختيار المواد<ArrowLeft className="mr-2 h-4 w-4" />
                            </Button>
                          </div>}

                          {curriculumStage === "subjects" && selectedGrades.length > 0 && <div className="rounded-2xl border bg-muted/20 p-4 sm:p-5">
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div><h4 className="font-bold">اختر المواد لكل صف</h4><p className="text-xs text-muted-foreground">اختر مادة واحدة على الأقل لكل صف محدد.</p></div>
                              <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{selectedGrades.length} صفوف مختارة</span>
                            </div>
                            {displayedGrade && <Tabs dir="rtl" value={displayedGrade} onValueChange={setActiveGrade}>
                              <TabsList className="mb-3 h-auto w-full flex-wrap justify-start gap-1 p-1.5">
                                {selectedGrades.map((gradeId) => {
                                  const grade = grades.find((item) => item.id === gradeId);
                                  const count = (assignments[gradeId] || []).length;
                                  return <TabsTrigger key={gradeId} value={gradeId} className="gap-2 border border-transparent data-[state=active]:border-border">
                                    {grade?.name || "الصف"}
                                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", count ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{count}</span>
                                  </TabsTrigger>;
                                })}
                              </TabsList>
                              {selectedGrades.map((gradeId) => <TabsContent key={gradeId} value={gradeId} className="mt-0 rounded-xl border bg-card p-4">
                                <p className="mb-3 font-semibold">مواد {grades.find((item) => item.id === gradeId)?.name}</p>
                                {loadingSubjects[gradeId] ? <Loader /> : (subjects[gradeId] || []).length === 0 ? <p className="text-sm text-muted-foreground">لا توجد مواد متاحة لهذا الصف.</p> : <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                  {(subjects[gradeId] || []).map((subject) => {
                                    const selected = (assignments[gradeId] || []).includes(subject.id);
                                    return <label key={subject.id} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors", selected ? "border-primary bg-primary/5" : "hover:bg-muted/50")}>
                                      <Checkbox checked={selected} onCheckedChange={(checked) => toggleSubject(gradeId, subject.id, checked === true)} />
                                      {subject.name}
                                    </label>;
                                  })}
                                </div>}
                              </TabsContent>)}
                            </Tabs>}
                          </div>}
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
              {step === 2 && curriculumStage === "grades" ? null : step < steps.length - 1 ? (
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
