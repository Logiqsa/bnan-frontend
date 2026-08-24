import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Home, Loader2 } from "lucide-react";
import { authApi } from "@/api/authApi";
import { catalogApi, type CurriculumOption, type GradeOption, type SubjectOption, type PackageOption } from "@/api/catalogApi";
import { paymentApi } from "@/api/paymentApi";
import { ApiError, tokenStore } from "@/api/client";
import { tamaraDraftStore } from "@/lib/tamaraDraft";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo-bnan.png";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/i18n/LanguageContext";

const steps = ["بيانات ولي الأمر", "بيانات الطالب", "المنهج والصف والباقة", "الدفع والتأكيد"];

const ERROR_MESSAGES: Record<string, string> = {
  INCORRECT_LOGIN_DATA: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  EMAIL_ALREADY_EXISTS: "البريد الإلكتروني مسجل بالفعل.",
  GULF_PAYMENT_REQUIRED: "هذا المنهج يتطلب الدفع عبر Tamara.",
  PARENT_PAYMENT_PHONE_REQUIRED: "يرجى إضافة رقم هاتف موثق لحساب ولي الأمر قبل الدفع.",
  TAMARA_ADDRESS_REQUIRED: "يرجى إدخال عنوان صحيح لإتمام الدفع.",
  TAMARA_NOT_SUPPORTED: "عملة هذه الباقة غير مدعومة في الدفع حاليًا.",
  PAYMENT_ACCESS_DENIED: "لا يمكن إتمام هذه العملية بهذا الحساب.",
  CHILD_CURRICULUM_MISMATCH: "يجب أن يلتحق إخوة الطالب بنفس منهج أول طفل مسجّل.",
};

const friendlyError = (error: unknown) => {
  const apiError = error as ApiError;
  return ERROR_MESSAGES[apiError.code] || apiError.message || "حدث خطأ غير متوقع.";
};

const GULF_CURRENCIES = new Set(["SAR", "AED", "KWD"]);

export default function StudentSignup() {
  const { isArabic } = useLanguage();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  // Step 0: parent
  const [parentFullName, setParentFullName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentPassword, setParentPassword] = useState("");
  const [parentBusy, setParentBusy] = useState(false);
  const [parentCreds, setParentCreds] = useState<{ email: string; password: string } | null>(null);

  // Step 1: student
  const [studentFullName, setStudentFullName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPassword, setStudentPassword] = useState("");

  // Step 2: curriculum / grade / package / subjects
  const [curriculums, setCurriculums] = useState<CurriculumOption[]>([]);
  const [curriculumsLoading, setCurriculumsLoading] = useState(true);
  const [curriculumId, setCurriculumId] = useState(() => searchParams.get("curriculum") || "");
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradeId, setGradeId] = useState("");
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);

  // Step 3: payment
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packageId, setPackageId] = useState(() => searchParams.get("package") || "");
  const [discountCode, setDiscountCode] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [line1, setLine1] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedPending, setSubmittedPending] = useState(false);

  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const selectedCurriculum = curriculums.find((c) => c.id === curriculumId);
  const mode = selectedCurriculum?.registrationMode;
  const selectedPackage = packages.find((p) => p.id === packageId);
  const selectedAccessScope = selectedPackage?.accessScope;
  const isSingleSubjectPackage = selectedAccessScope === "single_subject";
  const isAllSubjectsPackage = selectedAccessScope === "all_subjects";

  useEffect(() => {
    catalogApi.curriculums()
      .then((result) => setCurriculums(result.data))
      .catch((value) => setError(friendlyError(value)))
      .finally(() => setCurriculumsLoading(false));
  }, []);

  useEffect(() => {
    if (!curriculumId) { setGrades([]); setGradeId(""); return; }
    setGradesLoading(true);
    setGradeId("");
    setSubjects([]);
    setSubjectIds([]);
    catalogApi.grades(curriculumId)
      .then((result) => setGrades(result.data.filter((g) => g.isActive !== false)))
      .catch((value) => setError(friendlyError(value)))
      .finally(() => setGradesLoading(false));
  }, [curriculumId]);

  useEffect(() => {
    if (!gradeId) { setSubjects([]); return; }
    setSubjectsLoading(true);
    setSubjectIds([]);
    catalogApi.subjects(gradeId)
      .then((result) => setSubjects(result.data))
      .catch((value) => setError(friendlyError(value)))
      .finally(() => setSubjectsLoading(false));
  }, [gradeId]);

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
    if (step === 0) return parentFullName.trim().length >= 3 && !!parentEmail && parentPhone.trim().length >= 8 && parentPassword.length >= 8;
    if (step === 1) return studentFullName.trim().length >= 3 && !!studentEmail && studentPassword.length >= 8;
    if (step === 2) {
      if (!curriculumId || !gradeId || !packageId || subjects.length === 0) return false;
      if (mode === "gulf") return subjectIds.length >= 1;
      if (isSingleSubjectPackage) return subjectIds.length === 1;
      if (isAllSubjectsPackage) return subjectIds.length === subjects.length;
      return false;
    }
    if (step === 3) {
      if (!packageId) return false;
      if (mode === "gulf") return !!city.trim() && !!region.trim() && !!line1.trim();
      return true;
    }
    return true;
  }, [step, parentFullName, parentEmail, parentPhone, parentPassword, studentFullName, studentEmail, studentPassword, curriculumId, gradeId, subjectIds, subjects.length, packageId, isSingleSubjectPackage, isAllSubjectsPackage, mode, city, region, line1]);

  const submitParentStep = async () => {
    setError("");
    setParentBusy(true);
    try {
      const response = await authApi.registerParent({
        fullName: parentFullName.trim(),
        email: parentEmail.trim(),
        phone: parentPhone.trim(),
        whatsappNumber: parentPhone.trim(),
        password: parentPassword,
      });
      tokenStore.set(response.token, response.refreshToken);
      setParentCreds({ email: parentEmail.trim(), password: parentPassword });
      setStep(1);
    } catch (value) {
      setError(friendlyError(value));
    } finally {
      setParentBusy(false);
    }
  };

  const next = async () => {
    if (!validStep) {
      setError("أكمل الحقول المطلوبة قبل المتابعة.");
      return;
    }
    setError("");
    if (step === 0) { await submitParentStep(); return; }
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
        setSubmittedPending(true);
      } else {
        const { data } = await paymentApi.tamaraCheckout(
          {
            parent: parentCreds,
            student: studentPayload,
            curriculum: curriculumId,
            packageId,
            paymentAddress: { city: city.trim(), region: region.trim(), line1: line1.trim() },
            locale: "ar_SA",
          },
          idempotencyKey,
        );
        tamaraDraftStore.save({ paymentId: data.paymentId, idempotencyKey, createdAt: new Date().toISOString() });
        window.location.href = data.checkoutUrl;
      }
    } catch (value) {
      setError(friendlyError(value));
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedPending) {
    return (
      <main className="relative min-h-screen bg-hero-gradient grid place-items-center p-4" dir={isArabic ? "rtl" : "ltr"}>
        <LanguageToggle className="fixed left-4 top-4 z-20 border border-white/20 bg-white/10 text-white hover:bg-white/20" />
        <Card className="max-w-lg text-center">
          <CardContent className="p-8 space-y-4">
            <div className="h-14 w-14 rounded-full bg-green-100 text-green-700 grid place-items-center mx-auto">
              <Check />
            </div>
            <h1 className="text-2xl font-cairo font-bold">تم استلام طلب التسجيل</h1>
            <p className="text-muted-foreground font-tajawal">
              سيتم تفعيل حساب الطالب بعد تأكيد الدفع من فريق الإدارة عبر واتساب.
            </p>
            <Button asChild>
              <Link to="/">العودة إلى الصفحة الرئيسية</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-hero-gradient flex items-center justify-center py-16 px-4" dir={isArabic ? "rtl" : "ltr"}>
      <LanguageToggle className="fixed left-4 top-4 z-20 border border-white/20 bg-white/10 text-white hover:bg-white/20" />
      <Card className="max-w-3xl w-full mx-auto min-h-[640px] flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Link to="/" aria-label="العودة إلى الصفحة الرئيسية">
              <img src={logo} alt="أكاديمية بنان" className="h-10 w-auto" />
            </Link>
            <Link to="/" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
              <Home className="w-4 h-4" />
              الرئيسية
            </Link>
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
              <LabeledInput label="البريد الإلكتروني *" type="email" dir="ltr" value={parentEmail} onChange={setParentEmail} />
              <LabeledInput label="رقم الهاتف / واتساب *" dir="ltr" value={parentPhone} onChange={setParentPhone} />
              <LabeledInput label="كلمة المرور *" type="password" dir="ltr" value={parentPassword} onChange={setParentPassword} />
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
                          {c.registrationMode === "gulf" ? "دفع فوري عبر Tamara" : "مراجعة وتفعيل يدوي"}
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
                    <div className="grid sm:grid-cols-3 gap-3">
                      {grades.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setGradeId(g.id)}
                          className={`rounded-xl border p-3 text-sm font-tajawal transition-colors ${
                            gradeId === g.id ? "border-secondary bg-secondary/10" : "hover:border-secondary/50"
                          }`}
                        >
                          {g.name}
                        </button>
                      ))}
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
                <div>
                  <h3 className="font-cairo font-bold mb-3">عنوان الدفع (مطلوب لـ Tamara) *</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <LabeledInput label="المدينة *" value={city} onChange={setCity} />
                    <LabeledInput label="المنطقة *" value={region} onChange={setRegion} />
                    <div className="sm:col-span-2">
                      <LabeledInput label="العنوان التفصيلي *" value={line1} onChange={setLine1} />
                    </div>
                  </div>
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
                ? "إنشاء الحساب والمتابعة"
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
