import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Home, Loader2 } from "lucide-react";
import { authApi } from "@/api/authApi";
import { catalogApi, type CurriculumOption, type GradeOption, type SubjectOption, type PackageOption } from "@/api/catalogApi";
import { paymentApi } from "@/api/paymentApi";
import type { GulfPaymentProvider } from "@/api/types";
import { ApiError, tokenStore } from "@/api/client";
import { gulfPaymentDraftStore } from "@/lib/tamaraDraft";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo-bnan.png";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/i18n/LanguageContext";
import AccountVerification from "@/components/AccountVerification";
import { STUDENT_SIGNUP_DRAFT_KEY, studentSignupSession } from "@/lib/studentSignupSession";
import { cn } from "@/lib/utils";

const steps = ["بيانات ولي الأمر", "بيانات الطالب", "المنهج والصف والباقة", "الدفع والتأكيد"];

const ERROR_MESSAGES: Record<string, string> = {
  INCORRECT_LOGIN_DATA: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  EMAIL_ALREADY_EXISTS: "البريد الإلكتروني مسجل بالفعل.",
  GULF_PAYMENT_REQUIRED: "هذا المنهج يتطلب الدفع الإلكتروني.",
  PARENT_PAYMENT_PHONE_REQUIRED: "يرجى إضافة رقم هاتف موثق لحساب ولي الأمر قبل الدفع.",
  TAMARA_ADDRESS_REQUIRED: "يرجى إدخال عنوان صحيح لإتمام الدفع.",
  TAMARA_NOT_SUPPORTED: "عملة هذه الباقة غير مدعومة في الدفع حاليًا.",
  PAYMENT_PROVIDER_NOT_SUPPORTED: "وسيلة الدفع المختارة غير متاحة.",
  PAYMENT_PROVIDER_CURRENCY_NOT_SUPPORTED: "وسيلة الدفع المختارة لا تدعم عملة هذه الباقة.",
  PAYMOB_NOT_CONFIGURED: "الدفع بالبطاقة غير متاح مؤقتًا. يمكنك اختيار Tamara.",
  PAYMOB_CHECKOUT_FAILED: "تعذر فتح صفحة الدفع بالبطاقة. حاول مرة أخرى.",
  INVALID_PAYMENT_PHONE: "رقم هاتف ولي الأمر غير صالح للدفع. أدخل رقمًا سعوديًا صحيحًا.",
  IDEMPOTENCY_KEY_REQUIRED: "تعذر بدء محاولة الدفع. أعد تحميل الصفحة وحاول مجددًا.",
  IDEMPOTENCY_KEY_REUSED: "بيانات محاولة الدفع تغيرت. أعد تحميل الصفحة وحاول مجددًا.",
  GULF_PRIVATE_PURCHASE_ITEMS_REQUIRED: "تعذر تحديد الباقة الخاصة بكل مادة. راجع المواد والباقة المختارة ثم حاول مجددًا.",
  PAYMENT_ACCESS_DENIED: "لا يمكن إتمام هذه العملية بهذا الحساب.",
  CHILD_CURRICULUM_MISMATCH: "يجب أن يلتحق إخوة الطالب بنفس منهج أول طفل مسجّل.",
  WRONG_PARENT_ACCOUNT: "هذه البيانات لا تخص حساب ولي أمر.",
};

const friendlyError = (error: unknown) => {
  const apiError = error as ApiError;
  return apiError.message || ERROR_MESSAGES[apiError.code] || "حدث خطأ غير متوقع.";
};

const GULF_CURRENCIES = new Set(["SAR", "AED", "KWD"]);

export const normalizeRegistrationPhone = (value: string): string | null => {
  let digits = value.replace(/[^\d]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);

  // Saudi mobile numbers: 05xxxxxxxx / 5xxxxxxxx / 9665xxxxxxxx
  if (digits.startsWith("05")) digits = `966${digits.slice(1)}`;
  if (digits.startsWith("5")) digits = `966${digits}`;
  if (/^9665\d{8}$/.test(digits)) return digits;

  // Egyptian mobile numbers: 01xxxxxxxxx / 1xxxxxxxxx / 20xxxxxxxxxx
  if (digits.startsWith("01")) digits = `20${digits.slice(1)}`;
  if (/^1(?:0|1|2|5)\d{8}$/.test(digits)) digits = `20${digits}`;
  return /^201(?:0|1|2|5)\d{8}$/.test(digits) ? digits : null;
};

interface SignupDraft {
  step: number;
  parentFullName: string;
  parentEmail: string;
  parentPhone: string;
  parentPassword: string;
  parentCreds: { email: string; password: string } | null;
  studentFullName: string;
  studentEmail: string;
  studentPassword: string;
  curriculumId: string;
  gradeId: string;
  subjectIds: string[];
  packageId: string;
  discountCode: string;
  paymentProvider: GulfPaymentProvider;
  city: string;
  region: string;
  line1: string;
  verification: { email: string; kind: "parent" | "student" } | null;
  idempotencyKey: string;
}

const readSignupDraft = (): Partial<SignupDraft> => {
  try {
    const raw = sessionStorage.getItem(STUDENT_SIGNUP_DRAFT_KEY);
    return raw ? JSON.parse(raw) as Partial<SignupDraft> : {};
  } catch {
    return {};
  }
};

export default function StudentSignup() {
  const { isArabic, pick } = useLanguage();
  const [searchParams] = useSearchParams();
  const [savedDraft] = useState(readSignupDraft);
  const [step, setStep] = useState(() => Math.min(Math.max(savedDraft.step ?? 0, 0), steps.length - 1));
  const [error, setError] = useState("");

  // Step 0: parent
  const [parentFullName, setParentFullName] = useState(savedDraft.parentFullName ?? "");
  const [parentEmail, setParentEmail] = useState(savedDraft.parentEmail ?? "");
  const [parentPhone, setParentPhone] = useState(savedDraft.parentPhone ?? "");
  const [parentPassword, setParentPassword] = useState(savedDraft.parentPassword ?? "");
  const [parentBusy, setParentBusy] = useState(false);
  const [parentCreds, setParentCreds] = useState<{ email: string; password: string } | null>(savedDraft.parentCreds ?? null);

  // Step 1: student
  const [studentFullName, setStudentFullName] = useState(savedDraft.studentFullName ?? "");
  const [studentEmail, setStudentEmail] = useState(savedDraft.studentEmail ?? "");
  const [studentPassword, setStudentPassword] = useState(savedDraft.studentPassword ?? "");

  // Step 2: curriculum / grade / package / subjects
  const [curriculums, setCurriculums] = useState<CurriculumOption[]>([]);
  const [curriculumsLoading, setCurriculumsLoading] = useState(true);
  const [curriculumId, setCurriculumId] = useState(() => savedDraft.curriculumId || searchParams.get("curriculum") || "");
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradeId, setGradeId] = useState(savedDraft.gradeId ?? "");
  const [openGradeGroups,setOpenGradeGroups]=useState<Record<string,boolean>>({});
  const [openGradeStages,setOpenGradeStages]=useState<Record<string,boolean>>({});
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectIds, setSubjectIds] = useState<string[]>(savedDraft.subjectIds ?? []);

  // Step 3: payment
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packageId, setPackageId] = useState(() => savedDraft.packageId || searchParams.get("package") || "");
  const [discountCode, setDiscountCode] = useState(savedDraft.discountCode ?? "");
  const [paymentProvider, setPaymentProvider] = useState<GulfPaymentProvider>(savedDraft.paymentProvider ?? "paymob");
  const [city, setCity] = useState(savedDraft.city ?? "");
  const [region, setRegion] = useState(savedDraft.region ?? "");
  const [line1, setLine1] = useState(savedDraft.line1 ?? "");
  const [submitting, setSubmitting] = useState(false);
  // Student registrations remain pending until admin approval, so an old student
  // verification draft must not reopen the OTP screen on a later registration.
  const [verification, setVerification] = useState<{ email: string; kind: "parent" | "student" } | null>(
    savedDraft.verification?.kind === "parent" ? savedDraft.verification : null,
  );

  const [idempotencyKey] = useState(() => savedDraft.idempotencyKey || crypto.randomUUID());
  const previousCurriculumId = useRef(curriculumId);
  const previousGradeId = useRef(gradeId);

  const selectedCurriculum = curriculums.find((c) => c.id === curriculumId);
  const mode = selectedCurriculum?.registrationMode;
  const selectedPackage = packages.find((p) => p.id === packageId);
  const selectedAccessScope = selectedPackage?.accessScope;
  const isSingleSubjectPackage = selectedAccessScope === "single_subject";
  const isAllSubjectsPackage = selectedAccessScope === "all_subjects";
  const gradeGroups=useMemo(()=>{const languages=grades.filter(grade=>grade.name.includes("لغات"));const arabic=grades.filter(grade=>!grade.name.includes("لغات")&&(grade.name.includes("عربي")||grade.name.includes("عربى")));const groupedIds=new Set([...languages,...arabic].map(grade=>grade.id));const other=grades.filter(grade=>!groupedIds.has(grade.id));return [{key:"languages",label:"قسم اللغات",grades:languages},{key:"arabic",label:"القسم العربي",grades:arabic},...(other.length?[{key:"other",label:"صفوف أخرى",grades:other}]:[])].filter(group=>group.grades.length);},[grades]);
  const splitGradesByStage=(groupGrades:GradeOption[])=>{const normalize=(value:string)=>value.replace(/[أإآ]/g,"ا").replace(/ى/g,"ي");const definitions=mode==="egyptian"?[{key:"primary",label:"المرحلة الابتدائية",keyword:"ابتدائي"},{key:"preparatory",label:"المرحلة الإعدادية",keyword:"اعدادي"},{key:"secondary",label:"المرحلة الثانوية",keyword:"ثانوي"}]:[{key:"primary",label:"المرحلة الابتدائية",keyword:"ابتدائي"},{key:"middle",label:"المرحلة المتوسطة",keyword:"متوسط"},{key:"secondary",label:"المرحلة الثانوية",keyword:"ثانوي"}];const stages=definitions.map(stage=>({...stage,grades:groupGrades.filter(grade=>normalize(grade.name).includes(stage.keyword))})).filter(stage=>stage.grades.length);const stagedIds=new Set(stages.flatMap(stage=>stage.grades.map(grade=>grade.id)));const other=groupGrades.filter(grade=>!stagedIds.has(grade.id));return [...stages,...(other.length?[{key:"other",label:"مراحل أخرى",keyword:"",grades:other}]:[])];};

  useEffect(() => {
    catalogApi.curriculums()
      .then((result) => setCurriculums(result.data))
      .catch((value) => setError(friendlyError(value)))
      .finally(() => setCurriculumsLoading(false));
  }, []);

  useEffect(() => {
    if (!curriculumId) { setGrades([]); setGradeId(""); return; }
    const curriculumChanged = previousCurriculumId.current !== curriculumId;
    previousCurriculumId.current = curriculumId;
    setGradesLoading(true);
    if (curriculumChanged) {
      setGradeId("");
      setOpenGradeGroups({});
      setOpenGradeStages({});
      setSubjects([]);
      setSubjectIds([]);
    }
    catalogApi.grades(curriculumId)
      .then((result) => setGrades(result.data.filter((g) => g.isActive !== false)))
      .catch((value) => setError(friendlyError(value)))
      .finally(() => setGradesLoading(false));
  }, [curriculumId]);

  useEffect(() => {
    if (!gradeId) { setSubjects([]); return; }
    const gradeChanged = previousGradeId.current !== gradeId;
    previousGradeId.current = gradeId;
    setSubjectsLoading(true);
    if (gradeChanged) setSubjectIds([]);
    catalogApi.subjects(gradeId)
      .then((result) => setSubjects(result.data))
      .catch((value) => setError(friendlyError(value)))
      .finally(() => setSubjectsLoading(false));
  }, [gradeId]);

  useEffect(() => {
    const draft: SignupDraft = {
      step, parentFullName, parentEmail, parentPhone, parentPassword, parentCreds,
      studentFullName, studentEmail, studentPassword, curriculumId, gradeId,
      subjectIds, packageId, discountCode, paymentProvider, city, region, line1,
      verification, idempotencyKey,
    };
    sessionStorage.setItem(STUDENT_SIGNUP_DRAFT_KEY, JSON.stringify(draft));
  }, [step, parentFullName, parentEmail, parentPhone, parentPassword, parentCreds, studentFullName, studentEmail, studentPassword, curriculumId, gradeId, subjectIds, packageId, discountCode, paymentProvider, city, region, line1, verification, idempotencyKey]);

  useEffect(() => {
    if (!curriculumId) { setPackages([]); setPackageId(""); return; }
    setPackagesLoading(true);
    catalogApi.packages(curriculumId)
      .then((result) => {
        const allowedCurrency = mode === "gulf" ? GULF_CURRENCIES : new Set(["EGP"]);
        const filtered = result.data.filter((p) => p.isActive !== false && allowedCurrency.has(p.currency));
        setPackages(filtered);
        setPackageId((current) => (filtered.some((p) => p.id === current) ? current : ""));
      })
      .catch((value) => setError(friendlyError(value)))
      .finally(() => setPackagesLoading(false));
  }, [curriculumId, mode]);

  useEffect(() => {
    if (!selectedPackage || subjectsLoading) return;
    if (mode === "gulf") {
      setSubjectIds((current) => current.filter((id) => subjects.some((subject) => subject.id === id)));
      return;
    }
    if (selectedAccessScope === "all_subjects") {
      setSubjectIds(subjects.map((subject) => subject.id));
      return;
    }
    if (selectedAccessScope === "single_subject") {
      setSubjectIds((current) => current.filter((id) => subjects.some((subject) => subject.id === id)).slice(0, 1));
    }
  }, [selectedPackage, selectedAccessScope, subjects, subjectsLoading, mode]);

  const selectSubject = (id: string) => setSubjectIds([id]);
  const toggleSubject = (id: string) =>
    setSubjectIds((current) => current.includes(id) ? current.filter((subjectId) => subjectId !== id) : [...current, id]);

  const validStep = useMemo(() => {
    if (step === 0) return parentFullName.trim().length >= 3 && !!parentEmail && !!normalizeRegistrationPhone(parentPhone) && !!parentPassword;
    if (step === 1) return studentFullName.trim().length >= 3 && !!studentEmail && !!studentPassword;
    if (step === 2) {
      if (!curriculumId || !gradeId || !packageId || subjects.length === 0) return false;
      if (mode === "gulf") return subjectIds.length >= 1;
      if (isSingleSubjectPackage) return subjectIds.length === 1;
      if (isAllSubjectsPackage) return subjectIds.length === subjects.length;
      return false;
    }
    if (step === 3) {
      if (!packageId) return false;
      if (mode === "gulf" && paymentProvider === "tamara") return !!city.trim() && !!region.trim() && !!line1.trim();
      return true;
    }
    return true;
  }, [step, parentFullName, parentEmail, parentPhone, parentPassword, studentFullName, studentEmail, studentPassword, curriculumId, gradeId, subjectIds, subjects.length, packageId, isSingleSubjectPackage, isAllSubjectsPackage, mode, paymentProvider, city, region, line1]);

  const submitParentStep = async () => {
    setError("");
    const registrationPhone = normalizeRegistrationPhone(parentPhone);
    if (!registrationPhone) {
      setError("أدخل رقم موبايل مصري أو سعودي صحيحًا.");
      return;
    }
    setParentBusy(true);
    try {
      const credentials = { email: parentEmail.trim(), password: parentPassword };
      try {
        const login = await authApi.login(credentials.email, credentials.password);
        if ((login.data as { role?: string }).role !== "parent") {
          throw new ApiError(403, "WRONG_PARENT_ACCOUNT", "هذه البيانات لا تخص حساب ولي أمر.");
        }
        tokenStore.set(login.token, login.refreshToken);
        setParentCreds(credentials);
        setStep(1);
        return;
      } catch (value) {
        const loginError = value as ApiError;
        // فشل بيانات الدخول قد يعني أن ولي الأمر جديد، لذا نحاول إنشاءه.
        // أخطاء الشبكة والخادم ونوع الحساب لا يصح تحويلها إلى محاولة تسجيل.
        if (loginError.code !== "INCORRECT_LOGIN_DATA") throw value;
      }

      const response = await authApi.registerParent({
        fullName: parentFullName.trim(),
        email: credentials.email,
        phone: registrationPhone,
        whatsappNumber: registrationPhone,
        password: credentials.password,
      });
      if (response.token) tokenStore.set(response.token, response.refreshToken || "");
      setParentCreds(credentials);
      setVerification({ email: response.data.email || credentials.email, kind: "parent" });
    } catch (value) {
      const apiError = value as ApiError;
      setError(apiError.code === "EMAIL_ALREADY_EXISTS" ? ERROR_MESSAGES.INCORRECT_LOGIN_DATA : friendlyError(value));
    } finally {
      setParentBusy(false);
    }
  };

  const next = async () => {
    if (!validStep) {
      setError(step === 0 && parentPhone.trim() && !normalizeRegistrationPhone(parentPhone)
        ? "أدخل رقم موبايل مصري أو سعودي صحيحًا."
        : "أكمل الحقول المطلوبة قبل المتابعة.");
      return;
    }
    setError("");
    if (step === 0) { if (parentCreds) setStep(1); else await submitParentStep(); return; }
    if (step === steps.length - 1) { await submit(); return; }
    setStep((current) => current + 1);
  };

  const submit = async () => {
    if (!parentCreds || !mode) return;
    setSubmitting(true);
    setError("");
    try {
      const studentPayload = {
        fullName: studentFullName.trim(),
        email: studentEmail.trim(),
        password: studentPassword,
        grade: gradeId,
        subjects: mode !== "gulf" && isAllSubjectsPackage ? subjects.map((subject) => subject.id) : subjectIds,
      };
      if (mode === "egyptian") {
        await authApi.registerStudent({
          parent: parentCreds,
          student: studentPayload,
          curriculum: curriculumId,
          packageId,
          discountCode: discountCode.trim() || undefined,
        });
        const pendingStudentEmail = studentEmail.trim();
        sessionStorage.removeItem(STUDENT_SIGNUP_DRAFT_KEY);
        window.location.href = `/portal/login?email=${encodeURIComponent(pendingStudentEmail)}&pending=1`;
      } else {
        const { data } = await paymentApi.checkout(
          {
            provider: paymentProvider,
            parent: parentCreds,
            student: studentPayload,
            curriculum: curriculumId,
            packageId,
            items: subjectIds.map((subjectId) => ({ subjectId, packageId })),
            discountCode: discountCode.trim() || undefined,
            ...(paymentProvider === "tamara" ? {
              paymentAddress: { city: city.trim(), region: region.trim(), line1: line1.trim() },
            } : {}),
            locale: "ar_SA",
            isMobile: false,
          },
          idempotencyKey,
        );
        gulfPaymentDraftStore.save({
          paymentId: data.paymentId,
          provider: paymentProvider,
          checkoutUrl: data.checkoutUrl,
          purpose: "registration",
          idempotencyKey,
          studentEmail: studentEmail.trim(),
          createdAt: new Date().toISOString(),
        });
        if (paymentProvider === "tamara") localStorage.setItem("tamaraPaymentId", data.paymentId);
        studentSignupSession.savePaymentCredentials(data.paymentId, studentEmail.trim(), studentPassword);
        window.location.href = data.checkoutUrl;
      }
    } catch (value) {
      setError(friendlyError(value));
    } finally {
      setSubmitting(false);
    }
  };

  if (verification) return <AccountVerification email={verification.email} onVerified={async () => {
    if (verification.kind === "parent") {
      if (!parentCreds) throw new Error("تعذر استعادة بيانات دخول ولي الأمر.");
      const login = await authApi.login(parentCreds.email, parentCreds.password);
      tokenStore.set(login.token, login.refreshToken);
      setVerification(null);
      setStep(1);
    } else {
      const verifiedStudentEmail = verification.email || studentEmail.trim();
      sessionStorage.removeItem(STUDENT_SIGNUP_DRAFT_KEY);
      window.location.href = `/portal/login?email=${encodeURIComponent(verifiedStudentEmail)}&pending=1`;
    }
  }} />;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-x-hidden bg-hero-gradient px-3 py-6 sm:px-4 sm:py-16" dir={isArabic ? "rtl" : "ltr"}>
      <Card className="max-w-3xl w-full mx-auto min-h-[640px] flex flex-col">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link to="/" aria-label="العودة إلى الصفحة الرئيسية">
              <img src={logo} alt="أكاديمية بنان" className="h-10 w-auto" />
            </Link>
            <div className="flex items-center gap-1 sm:gap-2">
              <LanguageToggle className="h-9 border bg-muted/50 px-2.5 text-foreground hover:bg-muted" />
              <Link to="/" className="flex items-center gap-1 whitespace-nowrap text-sm text-muted-foreground hover:text-primary">
                <Home className="w-4 h-4" />
                {pick("الرئيسية", "Home")}
              </Link>
            </div>
          </div>
          <CardTitle className="font-cairo mt-4">إنشاء حساب طالب</CardTitle>
          <div className="grid grid-cols-4 gap-2 pt-4">
            {steps.map((title, index) => (
              <div key={title} className="text-center">
                <div className={`h-2 rounded-full ${index <= step ? "bg-secondary" : "bg-muted"}`} />
                <span className={`hidden sm:block text-xs mt-2 font-tajawal ${index === step ? "font-bold" : "text-muted-foreground"}`}>
                  {title}
                </span>
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col justify-center space-y-5">
          {error && (
            <div role="alert" className="rounded-xl bg-destructive/10 text-destructive p-3 text-sm font-tajawal">
              {error}
            </div>
          )}

          {step === 0 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <LabeledInput label="اسم ولي الأمر الكامل *" value={parentFullName} onChange={setParentFullName} />
              <LabeledInput label="البريد الإلكتروني *" type="email" dir="ltr" value={parentEmail} onChange={(value) => { setParentEmail(value); setParentCreds(null); }} />
              <LabeledInput label="رقم الهاتف / واتساب *" dir="ltr" value={parentPhone} onChange={setParentPhone} />
              <LabeledInput label="كلمة المرور *" type="password" dir="ltr" value={parentPassword} onChange={(value) => { setParentPassword(value); setParentCreds(null); }} />
            </div>
          )}

          {step === 1 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <LabeledInput label="اسم الطالب الكامل *" value={studentFullName} onChange={setStudentFullName} />
              <LabeledInput label="البريد الإلكتروني للطالب *" type="email" dir="ltr" value={studentEmail} onChange={setStudentEmail} />
              <LabeledInput label="كلمة مرور الطالب *" type="password" dir="ltr" value={studentPassword} onChange={setStudentPassword} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="font-cairo font-bold mb-3">اختر المنهج الدراسي *</h3>
                {curriculumsLoading ? <LoaderRow /> : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {curriculums.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCurriculumId(c.id)}
                        className={`text-right rounded-xl border p-4 transition-colors ${
                          curriculumId === c.id ? "border-secondary bg-secondary/10" : "hover:border-secondary/50"
                        }`}
                      >
                        <span className="font-cairo font-semibold">{c.name}</span>
                        <span className="block text-xs text-muted-foreground mt-1">
                          {c.registrationMode === "gulf" ? "دفع فوري عبر البطاقة أو Tamara" : "مراجعة وتفعيل يدوي"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {curriculumId && (
                <div>
                  <h3 className="font-cairo font-bold mb-3">اختر الصف *</h3>
                  {gradesLoading ? <LoaderRow /> : grades.length === 0 ? (
                    <p className="text-muted-foreground font-tajawal text-sm">لا توجد صفوف نشطة لهذا المنهج.</p>
                  ) : (
                    <div className="space-y-3">
                      {gradeGroups.map((group) => { const isOpen=Boolean(openGradeGroups[group.key]);const selectedInGroup=group.grades.some(grade=>grade.id===gradeId);return <Collapsible key={group.key} open={isOpen} onOpenChange={(open)=>setOpenGradeGroups(current=>({...current,[group.key]:open}))} className="overflow-hidden rounded-xl border bg-card">
                        <CollapsibleTrigger asChild><button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right transition-colors hover:bg-muted/50"><span><span className="block font-cairo font-bold">{group.label}</span><span className="text-xs text-muted-foreground">{group.grades.length} صفوف{selectedInGroup?" — تم اختيار صف":""}</span></span><ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform",isOpen&&"rotate-180")}/></button></CollapsibleTrigger>
                        <CollapsibleContent><div className="space-y-3 border-t bg-muted/10 p-3">{splitGradesByStage(group.grades).map((stage)=>{const stageId=`${group.key}-${stage.key}`;const isStageOpen=Boolean(openGradeStages[stageId]);const selectedInStage=stage.grades.some(grade=>grade.id===gradeId);return <Collapsible key={stageId} open={isStageOpen} onOpenChange={(open)=>setOpenGradeStages(current=>({...current,[stageId]:open}))} className="overflow-hidden rounded-lg border bg-card">
                          <CollapsibleTrigger asChild><button type="button" className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-right transition-colors hover:bg-muted/50"><span className="flex items-center gap-2"><span className="text-sm font-cairo font-bold">{stage.label}</span><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{stage.grades.length}{selectedInStage?" / تم الاختيار":""}</span></span><ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform",isStageOpen&&"rotate-180")}/></button></CollapsibleTrigger>
                          <CollapsibleContent><div className="grid grid-cols-2 gap-2 border-t bg-muted/10 p-3 sm:grid-cols-3">{stage.grades.map((grade)=>{const selected=grade.id===gradeId;return <button key={grade.id} type="button" aria-pressed={selected} onClick={()=>setGradeId(grade.id)} className={cn("relative flex min-h-20 items-center justify-center rounded-xl border-2 px-3 py-3 text-center text-sm font-semibold transition-colors",selected?"border-secondary bg-secondary/10 text-secondary-foreground":"border-border bg-card hover:border-secondary/40 hover:bg-muted/40")}>{selected&&<span className="absolute left-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-secondary text-secondary-foreground"><Check className="h-3.5 w-3.5"/></span>}{grade.name}</button>;})}</div></CollapsibleContent>
                        </Collapsible>;})}</div></CollapsibleContent>
                      </Collapsible>;})}
                    </div>
                  )}
                </div>
              )}

              {gradeId && (
                <div>
                  <h3 className="font-cairo font-bold mb-3">اختر الباقة أولًا *</h3>
                  {packagesLoading ? <LoaderRow /> : packages.length === 0 ? (
                    <p className="text-muted-foreground font-tajawal text-sm">لا توجد باقات متاحة لهذا المنهج حاليًا.</p>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {packages.map((p) => (
                        <button key={p.id} type="button" onClick={() => setPackageId(p.id)} className={`text-right rounded-xl border p-4 transition-colors ${packageId === p.id ? "border-secondary bg-secondary/10" : "hover:border-secondary/50"}`}>
                          <span className="font-cairo font-semibold block">{p.name}</span>
                          <span className="block text-xs text-muted-foreground mt-1">
                            {mode === "gulf" ? "اختر مادة واحدة أو أكثر" : p.accessScope === "single_subject" ? "تشمل مادة واحدة من اختيارك" : "تشمل جميع مواد الصف"}
                          </span>
                          {(p.hours || p.months) && <span className="block text-xs text-muted-foreground mt-1">{p.hours ? `${p.hours} ساعات` : `${p.months} شهر`}</span>}
                          <span className="flex items-baseline gap-2 mt-2">
                            {p.oldPrice && <span className="text-xs line-through text-muted-foreground">{p.oldPrice} {p.currency}</span>}
                            <span className="text-lg font-cairo font-bold">{p.price} {p.currency}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {gradeId && packageId && (
                <div>
                  <h3 className="font-cairo font-bold mb-1">{mode === "gulf" ? "اختر مادة أو أكثر *" : isSingleSubjectPackage ? "اختر مادة واحدة *" : "المواد المشمولة في الباقة"}</h3>
                  <p className="text-sm text-muted-foreground font-tajawal mb-3">
                    {mode === "gulf" ? "حدد المواد التي يرغب الطالب في دراستها." : isSingleSubjectPackage ? "يمكنك اختيار مادة واحدة فقط ضمن هذه الباقة." : isAllSubjectsPackage ? "هذه جميع مواد الصف التي سيحصل عليها الطالب." : "تعذر تحديد المواد لأن نوع الباقة غير مدعوم."}
                  </p>
                  {subjectsLoading ? <LoaderRow /> : subjects.length === 0 ? (
                    <p className="text-muted-foreground font-tajawal text-sm">لا توجد مواد متاحة لهذا الصف.</p>
                  ) : mode === "gulf" ? (
                    <div className="flex flex-wrap gap-3">
                      {subjects.map((s) => {
                        const checked = subjectIds.includes(s.id);
                        return (
                          <label key={s.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-tajawal ${checked ? "border-secondary bg-secondary/10" : "bg-muted"}`}>
                            <input type="checkbox" checked={checked} onChange={() => toggleSubject(s.id)} />
                            {s.name}
                          </label>
                        );
                      })}
                    </div>
                  ) : isSingleSubjectPackage ? (
                    <div className="flex flex-wrap gap-3">
                      {subjects.map((s) => {
                        const checked = subjectIds.includes(s.id);
                        return (
                          <label key={s.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-tajawal ${checked ? "border-secondary bg-secondary/10" : "bg-muted"}`}>
                            <input type="radio" name="registration-subject" checked={checked} onChange={() => selectSubject(s.id)} />
                            {s.name}
                          </label>
                        );
                      })}
                    </div>
                  ) : isAllSubjectsPackage ? (
                    <div className="flex flex-wrap gap-3">
                      {subjects.map((s) => (
                        <span key={s.id} className="rounded-lg border border-secondary/40 bg-secondary/10 px-3 py-2 text-sm font-tajawal">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-destructive font-tajawal text-sm">نوع الباقة غير مدعوم.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="rounded-xl border bg-muted/40 p-4">
                <h3 className="font-cairo font-bold">ملخص الاشتراك</h3>
                <p className="font-tajawal mt-2">الباقة: <span className="font-semibold">{selectedPackage?.name}</span></p>
                <p className="text-sm text-muted-foreground font-tajawal mt-2 mb-2">المواد التي سيحصل عليها الطالب:</p>
                <div className="flex flex-wrap gap-2">
                  {subjects.filter((subject) => subjectIds.includes(subject.id)).map((subject) => (
                    <span key={subject.id} className="rounded-full bg-secondary/15 px-3 py-1 text-sm font-tajawal"><Check className="inline h-3.5 w-3.5 ml-1" />{subject.name}</span>
                  ))}
                </div>
              </div>

              {mode === "gulf" ? (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-cairo font-bold mb-3">طريقة الدفع *</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <PaymentProviderOption provider="paymob" selected={paymentProvider} onSelect={setPaymentProvider} title="بطاقة بنكية" description="Visa / Mastercard / Mada" />
                      <PaymentProviderOption provider="tamara" selected={paymentProvider} onSelect={setPaymentProvider} title="Tamara" description="الدفع المرن عبر Tamara" />
                    </div>
                  </div>
                  <LabeledInput label="كود الخصم (اختياري)" dir="ltr" value={discountCode} onChange={setDiscountCode} />
                  {paymentProvider === "tamara" && (
                    <div>
                      <h3 className="font-cairo font-bold mb-3">عنوان الدفع لـ Tamara *</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <LabeledInput label="المدينة *" value={city} onChange={setCity} />
                        <LabeledInput label="المنطقة *" value={region} onChange={setRegion} />
                        <div className="sm:col-span-2"><LabeledInput label="العنوان التفصيلي *" value={line1} onChange={setLine1} /></div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <LabeledInput label="كود الخصم (اختياري)" dir="ltr" value={discountCode} onChange={setDiscountCode} />
              )}
            </div>
          )}
        </div>

          <div className="flex justify-between border-t pt-5 mt-6">
            <div>
              {step > 0 ? (
                <Button type="button" variant="outline" onClick={() => { setError(""); setStep((current) => current - 1); }}>
                  <ArrowRight className="h-4 w-4 ml-2" />
                  السابق
                </Button>
              ) : (
                <Button type="button" variant="outline" asChild>
                  <Link to="/register">إلغاء</Link>
                </Button>
              )}
            </div>
            <Button onClick={next} disabled={parentBusy || submitting}>
              {parentBusy || submitting ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : step === steps.length - 1 ? null : (
                <ArrowLeft className="h-4 w-4 mr-2" />
              )}
              {step === 0
                ? "التحقق والمتابعة"
                : step === steps.length - 1
                  ? (mode === "gulf" ? "المتابعة للدفع" : "إرسال الطلب")
                  : "التالي"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <label className="text-sm font-tajawal space-y-1.5 block">
      <span>{label}</span>
      <Input type={type} dir={dir} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function LoaderRow() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground font-tajawal">
      <Loader2 className="h-4 w-4 animate-spin" />
      جاري التحميل...
    </div>
  );
}

function PaymentProviderOption({
  provider,
  selected,
  onSelect,
  title,
  description,
}: {
  provider: GulfPaymentProvider;
  selected: GulfPaymentProvider;
  onSelect: (provider: GulfPaymentProvider) => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(provider)}
      className={`rounded-xl border p-4 text-right transition-colors ${selected === provider ? "border-secondary bg-secondary/10" : "hover:border-secondary/50"}`}
    >
      <span className="block font-cairo font-semibold">{title}</span>
      <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
    </button>
  );
}
