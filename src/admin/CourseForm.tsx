import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  CircleHelp,
  ImagePlus,
  Loader2,
  X,
} from "lucide-react";
import {
  catalogApi,
  type CurriculumOption,
  type GradeOption,
  type SubjectOption,
} from "@/api/catalogApi";
import { courseStaffApi, type CourseStaffOption } from "@/api/courseStaffApi";
import type { Course, CourseInput, CourseStatus } from "@/api/coursesApi";
import { courseImageUrl, refId } from "@/lib/courseUi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SearchableTeacherSelect from "./SearchableTeacherSelect";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export default function CourseForm({
  course,
  submitting,
  onSubmit,
}: {
  course?: Course;
  submitting: boolean;
  onSubmit: (body: CourseInput, imageFile?: File) => void;
}) {
  const [name, setName] = useState(course?.name || "");
  const [description, setDescription] = useState(course?.description || "");
  const [requiredHours, setRequiredHours] = useState(
    course?.requiredMinutes
      ? String(course.requiredMinutes / 60)
      : course?.durationHours
        ? String(course.durationHours)
        : "",
  );
  const [image, setImage] = useState(course?.image || "");
  const [imageFile, setImageFile] = useState<File>();
  const [imagePreview, setImagePreview] = useState(
    courseImageUrl(course?.image),
  );
  const [imageError, setImageError] = useState("");
  const [teacher, setTeacher] = useState(refId(course?.teacher));
  const [supervisor, setSupervisor] = useState(refId(course?.supervisor));
  const [curriculum, setCurriculum] = useState("");
  const [gradeIds, setGradeIds] = useState<string[]>(
    course?.eligibleGrades.map(refId) || [],
  );
  const [subject, setSubject] = useState(refId(course?.subject));
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [groupEnabled, setGroupEnabled] = useState(
    course?.enrollmentModes.group.enabled ?? true,
  );
  const [groupPrice, setGroupPrice] = useState(
    String(course?.enrollmentModes.group.price ?? 0),
  );
  const [individualEnabled, setIndividualEnabled] = useState(
    course?.enrollmentModes.individual.enabled ?? false,
  );
  const [individualPrice, setIndividualPrice] = useState(
    String(course?.enrollmentModes.individual.price ?? 0),
  );
  const [isFree, setIsFree] = useState(
    Boolean(
      course &&
        course.enrollmentModes.group.enabled &&
        Number(course.enrollmentModes.group.price) === 0 &&
        !course.enrollmentModes.individual.enabled,
    ),
  );
  const [currency, setCurrency] = useState(course?.currency || "EGP");
  const [published, setPublished] = useState(course?.isPublished ?? false);
  const [open, setOpen] = useState(course?.enrollmentOpen ?? true);
  const [status, setStatus] = useState<CourseStatus>(
    course?.status || "active",
  );
  const [groupManagementMode, setGroupManagementMode] = useState<
    "automatic" | "manual"
  >(course?.groupManagementMode || "automatic");
  const [groupCapacity, setGroupCapacity] = useState(
    String(course?.groupCapacity || ""),
  );
  const [groupHelpOpen, setGroupHelpOpen] = useState(false);
  const [openGradeGroups, setOpenGradeGroups] = useState<
    Record<string, boolean>
  >({});
  const [openGradeStages, setOpenGradeStages] = useState<
    Record<string, boolean>
  >({});
  const [curricula, setCurricula] = useState<CurriculumOption[]>([]);
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [teachers, setTeachers] = useState<CourseStaffOption[]>([]);
  const [supervisors, setSupervisors] = useState<CourseStaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      catalogApi.curriculums(),
      courseStaffApi.teachers(),
      courseStaffApi.supervisors(),
    ])
      .then(([c, t, s]) => {
        setCurricula(c.data);
        setTeachers(t);
        setSupervisors(s);
        const existingCurriculum =
          course?.curriculum ||
          (
            course?.eligibleGrades[0] as {
              curriculum?: string | { id?: string; _id?: string };
            }
          )?.curriculum;
        setCurriculum(
          typeof existingCurriculum === "string"
            ? existingCurriculum
            : existingCurriculum?.id || existingCurriculum?._id || "",
        );
      })
      .catch(() => toast.error("تعذر تحميل بيانات المعلمين والمشرفين."))
      .finally(() => setLoading(false));
  }, [course]);
  useEffect(() => {
    if (!curriculum) {
      setGrades([]);
      return;
    }
    catalogApi
      .grades(curriculum)
      .then((r) => setGrades(r.data.filter((g) => g.isActive !== false)));
  }, [curriculum]);
  useEffect(() => {
    let active = true;
    if (!gradeIds.length) {
      setSubjects([]);
      setSubject("");
      setSubjectsLoading(false);
      return () => {
        active = false;
      };
    }
    setSubjectsLoading(true);
    Promise.all(gradeIds.map((gradeId) => catalogApi.subjects(gradeId)))
      .then((results) => {
        if (!active) return;
        const available = [
          ...new Map(
            results
              .flatMap((result) => result.data)
              .map((item) => [item.id, item]),
          ).values(),
        ];
        setSubjects(available);
        setSubject((current) =>
          available.some((item) => item.id === current) ? current : "",
        );
      })
      .catch(() => {
        if (active) {
          setSubjects([]);
          setSubject("");
          toast.error("تعذر تحميل المواد المتاحة للصفوف المختارة.");
        }
      })
      .finally(() => {
        if (active) setSubjectsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [gradeIds]);
  const allowedTeachers = useMemo(
    () =>
      teachers.filter(
        (item) => !curriculum || item.curriculumIds?.includes(curriculum),
      ),
    [teachers, curriculum],
  );
  const allowedSupervisors = useMemo(
    () =>
      supervisors.filter(
        (item) => !curriculum || item.curriculumIds?.includes(curriculum),
      ),
    [supervisors, curriculum],
  );
  const previewTeacher =
    teachers.find((item) => item.id === teacher)?.name || "اسم المعلم";
  const previewGrades = grades.filter((grade) => gradeIds.includes(grade.id));
  const selectedCurriculumData = curricula.find(
    (item) => item.id === curriculum,
  );
  const gradeGroups = useMemo(() => {
    const languages = grades.filter((grade) => grade.name.includes("لغات"));
    const arabic = grades.filter(
      (grade) =>
        !grade.name.includes("لغات") &&
        (grade.name.includes("عربي") || grade.name.includes("عربى")),
    );
    const groupedIds = new Set(
      [...languages, ...arabic].map((grade) => grade.id),
    );
    const other = grades.filter((grade) => !groupedIds.has(grade.id));
    return [
      { key: "languages", label: "قسم اللغات", grades: languages },
      { key: "arabic", label: "القسم العربي", grades: arabic },
      ...(other.length
        ? [{ key: "other", label: "صفوف أخرى", grades: other }]
        : []),
    ].filter((group) => group.grades.length);
  }, [grades]);
  const splitGradesByStage = (groupGrades: GradeOption[]) => {
    const normalize = (value: string) =>
      value.replace(/[أإآ]/g, "ا").replace(/ى/g, "ي");
    const definitions =
      selectedCurriculumData?.registrationMode === "egyptian"
        ? [
            { key: "primary", label: "المرحلة الابتدائية", keyword: "ابتدائي" },
            {
              key: "preparatory",
              label: "المرحلة الإعدادية",
              keyword: "اعدادي",
            },
            { key: "secondary", label: "المرحلة الثانوية", keyword: "ثانوي" },
          ]
        : [
            { key: "primary", label: "المرحلة الابتدائية", keyword: "ابتدائي" },
            { key: "middle", label: "المرحلة المتوسطة", keyword: "متوسط" },
            { key: "secondary", label: "المرحلة الثانوية", keyword: "ثانوي" },
          ];
    const stages = definitions
      .map((stage) => ({
        ...stage,
        grades: groupGrades.filter((grade) =>
          normalize(grade.name).includes(stage.keyword),
        ),
      }))
      .filter((stage) => stage.grades.length);
    const stagedIds = new Set(
      stages.flatMap((stage) => stage.grades.map((grade) => grade.id)),
    );
    const other = groupGrades.filter((grade) => !stagedIds.has(grade.id));
    return [
      ...stages,
      ...(other.length
        ? [{ key: "other", label: "مراحل أخرى", keyword: "", grades: other }]
        : []),
    ];
  };
  useEffect(
    () => () => {
      if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    },
    [imagePreview],
  );
  const chooseImage = (file?: File) => {
    setImageError("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setImageError("اختر صورة JPG أو PNG أو WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError("حجم الصورة يجب ألا يتجاوز 5MB.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFree && !groupEnabled && !individualEnabled) return;
    const hours = Number(requiredHours);
    if (!Number.isFinite(hours) || hours <= 0) {
      toast.error("مدة الدورة بالساعات مطلوبة ويجب أن تكون أكبر من صفر.");
      return;
    }
    const requiredMinutes = Math.round(hours * 60);
    if (requiredMinutes <= 0) {
      toast.error(
        "مدة الدورة قصيرة جدًا. أدخل مدة تعادل دقيقة واحدة على الأقل.",
      );
      return;
    }
    onSubmit(
      {
        name: name.trim(),
        description: description.trim(),
        ...(image.trim() ? { image: image.trim() } : {}),
        teacher,
        supervisor: supervisor || null,
        grades: gradeIds,
        subject,
        requiredMinutes,
        enrollmentModes: {
          group: {
            enabled: isFree || groupEnabled,
            price: isFree ? 0 : groupEnabled ? Number(groupPrice) : 0,
          },
          individual: {
            enabled: isFree ? false : individualEnabled,
            price: isFree ? 0 : individualEnabled ? Number(individualPrice) : 0,
          },
        },
        currency,
        isPublished: published,
        enrollmentOpen: open,
        status,
        groupManagementMode,
        ...(groupCapacity ? { groupCapacity: Number(groupCapacity) } : {}),
      },
      imageFile,
    );
  };
  if (loading)
    return (
      <div className="grid min-h-48 place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  return (
    <form
      onSubmit={submit}
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)]"
    >
      <Card>
        <CardContent className="space-y-6 pt-6 [&_.max-w-md]:max-w-none [&>div:nth-child(3)>label:first-child]:hidden">
          <div className="grid items-start gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <label className="block space-y-2">
                <span>اسم الدورة *</span>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
              <label className="block space-y-2">
                <span>الوصف *</span>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                />
              </label>
              <label className="block space-y-2">
                <span>مدة الدورة (بالساعات) *</span>
                <Input
                  type="number"
                  min="0.01"
                  step="any"
                  inputMode="decimal"
                  value={requiredHours}
                  onChange={(e) => setRequiredHours(e.target.value)}
                  placeholder="مثال: 12 أو 1.5"
                  required
                />
                <small className="text-muted-foreground">
                  يمكن إدخال قيمة عشرية؛ مثال: 1.5 ساعة تساوي 90 دقيقة.
                </small>
              </label>
            </div>
            <div className="space-y-2">
              <span>صورة الدورة</span>
              <div className="relative">
                <label className="flex h-48 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed bg-muted/30 transition hover:border-primary">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => chooseImage(e.target.files?.[0])}
                  />
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="معاينة صورة الدورة"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
                      <ImagePlus className="h-7 w-7" />
                      <strong className="font-medium text-foreground">
                        اختر صورة
                      </strong>
                      <small>JPG أو PNG أو WebP — بحد أقصى 5MB</small>
                    </span>
                  )}
                </label>
                {imagePreview && (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute left-2 top-2 h-8 w-8 rounded-full shadow-sm"
                    aria-label="إزالة الصورة"
                    title="إزالة الصورة"
                    onClick={() => {
                      setImageFile(undefined);
                      setImagePreview("");
                      setImage("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {imageError && (
                <p className="text-sm text-destructive">{imageError}</p>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <label className="block space-y-2">
              <span>المنهج *</span>
              <Select
                value={curriculum}
                onValueChange={(x) => {
                  setCurriculum(x);
                  setGradeIds([]);
                  setTeacher("");
                  setSupervisor("");
                  setOpenGradeGroups({});
                  setOpenGradeStages({});
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المنهج" />
                </SelectTrigger>
                <SelectContent>
                  {curricula.map((x) => (
                    <SelectItem key={x.id} value={x.id}>
                      {x.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span>المعلم *</span>
                <SearchableTeacherSelect
                  value={teacher}
                  options={allowedTeachers}
                  onChange={setTeacher}
                />
                {curriculum && allowedTeachers.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    لا يوجد معلمون مرتبطون بهذا المنهج.
                  </p>
                )}
              </label>
              <label className="space-y-2">
                <span>المشرف (اختياري)</span>
                <Select
                  value={supervisor || "none"}
                  onValueChange={(x) => setSupervisor(x === "none" ? "" : x)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مشرف</SelectItem>
                    {allowedSupervisors.map((x) => (
                      <SelectItem key={x.id} value={x.id}>
                        {x.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {curriculum && allowedSupervisors.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    لا يوجد مشرفون مرتبطون بهذا المنهج.
                  </p>
                )}
              </label>
            </div>
            {grades.length > 0 && (
              <label className="flex items-center justify-between gap-4 rounded-xl border bg-muted/20 px-4 py-3">
                <span>
                  <span className="block text-sm font-bold">
                    كل صفوف المنهج
                  </span>
                  <span className="text-xs text-muted-foreground">
                    تحديد أو إلغاء تحديد جميع الصفوف مرة واحدة
                  </span>
                </span>
                <Switch
                  checked={gradeIds.length === grades.length}
                  onCheckedChange={(checked) =>
                    setGradeIds(checked ? grades.map((grade) => grade.id) : [])
                  }
                />
              </label>
            )}
          </div>
          <div className="space-y-4">
            <label className="block max-w-md space-y-2">
              <span>المنهج *</span>
              <Select
                value={curriculum}
                onValueChange={(x) => {
                  setCurriculum(x);
                  setGradeIds([]);
                  setSupervisor("");
                  setOpenGradeGroups({});
                  setOpenGradeStages({});
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المنهج" />
                </SelectTrigger>
                <SelectContent>
                  {curricula.map((x) => (
                    <SelectItem key={x.id} value={x.id}>
                      {x.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span>الصفوف المؤهلة *</span>
                {gradeIds.length > 0 && (
                  <Badge variant="secondary">تم اختيار {gradeIds.length}</Badge>
                )}
              </div>
              {grades.length ? (
                <div className="space-y-3">
                  {gradeGroups.map((group) => {
                    const isOpen = Boolean(openGradeGroups[group.key]);
                    const selectedCount = group.grades.filter((grade) =>
                      gradeIds.includes(grade.id),
                    ).length;
                    return (
                      <Collapsible
                        key={group.key}
                        open={isOpen}
                        onOpenChange={(value) =>
                          setOpenGradeGroups((current) => ({
                            ...current,
                            [group.key]: value,
                          }))
                        }
                        className="overflow-hidden rounded-xl border bg-card"
                      >
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right transition-colors hover:bg-muted/50"
                          >
                            <span>
                              <span className="block font-bold">
                                {group.label}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {group.grades.length} صفوف
                                {selectedCount
                                  ? ` — تم اختيار ${selectedCount}`
                                  : ""}
                              </span>
                            </span>
                            <ChevronDown
                              className={cn(
                                "h-5 w-5 shrink-0 transition-transform",
                                isOpen && "rotate-180",
                              )}
                            />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-3 border-t bg-muted/10 p-3">
                            {splitGradesByStage(group.grades).map((stage) => {
                              const stageId = `${group.key}-${stage.key}`;
                              const isStageOpen = Boolean(
                                openGradeStages[stageId],
                              );
                              const stageSelectedCount = stage.grades.filter(
                                (grade) => gradeIds.includes(grade.id),
                              ).length;
                              return (
                                <Collapsible
                                  key={stageId}
                                  open={isStageOpen}
                                  onOpenChange={(value) =>
                                    setOpenGradeStages((current) => ({
                                      ...current,
                                      [stageId]: value,
                                    }))
                                  }
                                  className="overflow-hidden rounded-lg border bg-card"
                                >
                                  <CollapsibleTrigger asChild>
                                    <button
                                      type="button"
                                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-right transition-colors hover:bg-muted/50"
                                    >
                                      <span className="flex items-center gap-2">
                                        <span className="text-sm font-bold">
                                          {stage.label}
                                        </span>
                                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                          {stage.grades.length}
                                          {stageSelectedCount
                                            ? ` / مختار ${stageSelectedCount}`
                                            : ""}
                                        </span>
                                      </span>
                                      <ChevronDown
                                        className={cn(
                                          "h-4 w-4 shrink-0 transition-transform",
                                          isStageOpen && "rotate-180",
                                        )}
                                      />
                                    </button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="grid grid-cols-2 gap-2 border-t bg-muted/10 p-3 sm:grid-cols-3">
                                      {stage.grades.map((grade) => {
                                        const selected = gradeIds.includes(
                                          grade.id,
                                        );
                                        return (
                                          <button
                                            key={grade.id}
                                            type="button"
                                            aria-pressed={selected}
                                            onClick={() =>
                                              setGradeIds((ids) =>
                                                selected
                                                  ? ids.filter(
                                                      (id) => id !== grade.id,
                                                    )
                                                  : [...ids, grade.id],
                                              )
                                            }
                                            className={cn(
                                              "relative flex min-h-20 items-center justify-center rounded-xl border-2 px-3 py-3 text-center text-sm font-semibold transition-colors",
                                              selected
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-border bg-card hover:border-primary/40 hover:bg-muted/40",
                                            )}
                                          >
                                            {selected && (
                                              <span className="absolute left-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                                                <Check className="h-3.5 w-3.5" />
                                              </span>
                                            )}
                                            {grade.name}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                  {curriculum
                    ? "لا توجد صفوف متاحة لهذا المنهج"
                    : "اختر المنهج أولاً لعرض الصفوف"}
                </div>
              )}
            </div>
          </div>
          <label className="block space-y-2">
            <span>Subject / المادة *</span>
            <Select
              value={subject}
              onValueChange={setSubject}
              disabled={!gradeIds.length || subjectsLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    subjectsLoading
                      ? "جاري تحميل المواد..."
                      : !gradeIds.length
                        ? "اختر الصفوف أولاً"
                        : "اختر المادة"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {gradeIds.length > 0 &&
              !subjectsLoading &&
              subjects.length === 0 && (
                <p className="text-xs text-destructive">
                  لا توجد مواد متاحة للصفوف المختارة.
                </p>
              )}
          </label>
          <div className="rounded-xl border bg-muted/20 p-4">
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <span><span className="block font-semibold">دورة مجانية</span><span className="mt-1 block text-xs text-muted-foreground">عند التفعيل ستكون الدورة جماعية فقط وسعرها صفر.</span></span>
              <Switch checked={isFree} onCheckedChange={setIsFree} aria-label="دورة مجانية" />
            </label>
          </div>
          {!isFree && <div className="grid gap-4 md:grid-cols-2">
            {[
              [
                "التسجيل الجماعي",
                groupEnabled,
                setGroupEnabled,
                groupPrice,
                setGroupPrice,
              ],
              [
                "التسجيل الفردي",
                individualEnabled,
                setIndividualEnabled,
                individualPrice,
                setIndividualPrice,
              ],
            ].map(([label, enabled, setEnabled, price, setPrice]) => (
              <div key={label as string} className="rounded-xl border p-4">
                <label className="mb-4 flex items-center justify-between">
                  <span>{label as string}</span>
                  <Switch
                    checked={enabled as boolean}
                    onCheckedChange={setEnabled as (x: boolean) => void}
                  />
                </label>
                <label className="space-y-2">
                  <span>السعر</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price as string}
                    disabled={!enabled}
                    onChange={(e) =>
                      (setPrice as (x: string) => void)(e.target.value)
                    }
                    required={enabled as boolean}
                  />
                </label>
              </div>
            ))}
          </div>}
          {!isFree && !groupEnabled && !individualEnabled && (
            <p className="text-sm text-destructive">
              فعّل نمط تسجيل واحدًا على الأقل.
            </p>
          )}
          {(isFree || groupEnabled) && (
            <div className="grid gap-4 rounded-xl border p-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="flex items-center gap-2">
                  إدارة المجموعات
                  <Tooltip
                    open={groupHelpOpen}
                    onOpenChange={setGroupHelpOpen}
                    delayDuration={0}
                  >
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="شرح إدارة المجموعات"
                        onClick={(event) => {
                          event.preventDefault();
                          setGroupHelpOpen((value) => !value);
                        }}
                        className="text-muted-foreground transition-colors hover:text-primary"
                      >
                        <CircleHelp className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-72 leading-6" side="top">
                      <p>
                        <strong>تلقائية:</strong> النظام ينشئ المجموعات ويوزع
                        الطلاب حسب السعة.
                      </p>
                      <p>
                        <strong>يدوية:</strong> الأدمن ينشئ المجموعة ويفتحها قبل
                        تسجيل الطلاب.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </span>
                <Select
                  value={groupManagementMode}
                  onValueChange={(x) =>
                    setGroupManagementMode(x as "automatic" | "manual")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="automatic">تلقائية</SelectItem>
                    <SelectItem value="manual">يدوية</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-2">
                <span>سعة المجموعة</span>
                <Input
                  type="number"
                  min="1"
                  value={groupCapacity}
                  onChange={(e) => setGroupCapacity(e.target.value)}
                  placeholder="اختياري"
                />
              </label>
            </div>
          )}
          <div
            className={`grid gap-4 ${course ? "md:grid-cols-3" : "md:grid-cols-2"}`}
          >
            {!isFree && <label className="space-y-2">
              <span>العملة</span>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EGP">مصري — جنيه مصري (EGP)</SelectItem>
                  <SelectItem value="SAR">سعودي — ريال سعودي (SAR)</SelectItem>
                </SelectContent>
              </Select>
            </label>}
            {course && (
              <label className="space-y-2">
                <span>حالة الدورة</span>
                <Select
                  value={status}
                  onValueChange={(x) => setStatus(x as CourseStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشطة</SelectItem>
                    <SelectItem value="completed">مكتملة</SelectItem>
                    <SelectItem value="cancelled">ملغاة</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            )}
            <div className="space-y-3 pt-1">
              <label className="flex items-center justify-between">
                منشورة{" "}
                <Switch checked={published} onCheckedChange={setPublished} />
              </label>
              <label className="flex items-center justify-between">
                التسجيل مفتوح{" "}
                <Switch checked={open} onCheckedChange={setOpen} />
              </label>
            </div>
          </div>
          <Button
            type="submit"
            disabled={
              submitting ||
              subjectsLoading ||
              !name.trim() ||
              !description.trim() ||
              !Number.isFinite(Number(requiredHours)) ||
              Number(requiredHours) <= 0 ||
              !teacher ||
              !curriculum ||
              !gradeIds.length ||
              !subject ||
              (!groupEnabled && !individualEnabled)
            }
          >
            {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {course ? "حفظ التعديلات" : "إنشاء الدورة"}
          </Button>
        </CardContent>
      </Card>
      <Card className="lg:sticky lg:top-6">
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-lg">معاينة كارت الدورة</CardTitle>
            <CardDescription className="mt-1">
              هذا هو الشكل التقريبي الذي سيظهر للطلاب بعد نشر الدورة.
            </CardDescription>
          </div>
          <Badge
            className="shrink-0"
            variant={published ? "default" : "secondary"}
          >
            {published ? "جاهزة للنشر" : "غير منشورة"}
          </Badge>
        </CardHeader>
        <CardContent>
          <Card className="mx-auto overflow-hidden bg-background text-right">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="معاينة صورة الدورة"
                className="h-44 w-full object-cover"
              />
            ) : (
              <div className="m-3 flex h-40 items-center justify-center rounded-xl border border-dashed bg-muted/30 text-muted-foreground">
                <span className="flex flex-col items-center gap-2 text-sm">
                  <ImagePlus className="h-7 w-7" />
                  اختر صورة للدورة
                </span>
              </div>
            )}
            <CardHeader>
              <CardTitle>{name.trim() || "اسم الدورة"}</CardTitle>
              <p className="text-sm text-muted-foreground">
                المعلم: {previewTeacher}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="line-clamp-3 min-h-16 text-sm text-muted-foreground">
                {description.trim() || "سيظهر وصف الدورة هنا بعد كتابته."}
              </p>
              <div>
                {grades.length > 0 && previewGrades.length === grades.length ? (
                  <Badge variant="outline">كل الصفوف</Badge>
                ) : previewGrades.length ? (
                  <div className="space-y-2">
                    {splitGradesByStage(previewGrades).map((stage) => (
                      <div key={stage.key} className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground">
                          {stage.label}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {stage.grades.map((grade) => (
                            <Badge key={grade.id} variant="outline">
                              {grade.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Badge variant="outline">الصفوف المؤهلة</Badge>
                )}
              </div>
              <div className="space-y-1 text-sm">
                {(isFree || groupEnabled) && (
                  <p>
                    جماعي:{" "}
                    <b>
                      {!isFree && Number(groupPrice) > 0
                        ? `${Number(groupPrice)} ${currency}`
                        : "مجاني"}
                    </b>
                  </p>
                )}
                {!isFree && individualEnabled && (
                  <p>
                    فردي:{" "}
                    <b>
                      {Number(individualPrice) > 0
                        ? `${Number(individualPrice)} ${currency}`
                        : "مجاني"}
                    </b>
                  </p>
                )}
                {!isFree && !groupEnabled && !individualEnabled && (
                  <p className="text-muted-foreground">
                    لم يتم تفعيل نمط تسجيل.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled
                >
                  التفاصيل
                </Button>
                <Button type="button" className="flex-1" disabled={!open}>
                  {open ? "سجّل الآن" : "غير متاح حاليًا"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </form>
  );
}
