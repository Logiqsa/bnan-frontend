import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import {
  BookOpen,
  Boxes,
  Edit,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import {
  egyptianGradeLanguage,
  type EgyptianGradeLanguage,
} from "@/lib/egyptianGradeLanguage";
import {
  catalogApi,
  type CurriculumInput,
  type CurriculumOption,
  type GradeOption,
  type PackageInput,
  type PackageOption,
  type RegistrationMode,
  type SubjectInput,
  type SubjectOption,
} from "@/api/catalogApi";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Resource = "curriculums" | "grades" | "subjects" | "packages";
const resources: Array<{
  key: Resource;
  label: string;
  path: string;
  icon: typeof BookOpen;
}> = [
  {
    key: "curriculums",
    label: "المناهج",
    path: "/admin/catalog/curriculums",
    icon: BookOpen,
  },
  {
    key: "grades",
    label: "الصفوف",
    path: "/admin/catalog/grades",
    icon: GraduationCap,
  },
  {
    key: "subjects",
    label: "المواد",
    path: "/admin/catalog/subjects",
    icon: BookOpen,
  },
  {
    key: "packages",
    label: "الباقات",
    path: "/admin/catalog/packages",
    icon: Boxes,
  },
];

const idOf = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const item = value as { id?: unknown; _id?: unknown };
    return String(item.id ?? item._id ?? "");
  }
  return "";
};
const errorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : "حدث خطأ غير متوقع. حاول مرة أخرى.";
const inputClass =
  "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm";

function LoadingOrError({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: boolean;
  retry: () => void;
}) {
  if (loading)
    return (
      <div className="grid min-h-48 place-items-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  if (error)
    return (
      <div role="alert" className="grid gap-3 p-10 text-center">
        <p>تعذر تحميل البيانات.</p>
        <Button variant="outline" onClick={retry}>
          إعادة المحاولة
        </Button>
      </div>
    );
  return null;
}

function ConfirmDelete({
  open,
  name,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  name: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => !value && !busy && onCancel()}
    >
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
          <AlertDialogDescription>
            هل تريد حذف «{name}»؟ إذا كان مرتبطًا بسجلات أخرى سيرفض الخادم
            العملية ويعرض سبب الرفض.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {busy ? "جاري الحذف..." : "حذف"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CatalogShell({
  resource,
  children,
}: {
  resource: Resource;
  children: ReactNode;
}) {
  return (
    <DashboardLayout>
      <main className="mx-auto max-w-7xl space-y-5" dir="rtl">
        <div>
          <h1 className="text-3xl font-bold">إدارة الكتالوج</h1>
          <p className="mt-1 text-muted-foreground">
            إدارة المناهج والصفوف والمواد والباقات من العقود الحالية للنظام.
          </p>
        </div>
        <nav className="grid gap-2 sm:grid-cols-4">
          {resources.map(({ key, label, path, icon: Icon }) => (
            <Button
              key={key}
              asChild
              variant={key === resource ? "default" : "outline"}
              className="justify-start"
            >
              <Link to={path}>
                <Icon className="ml-2 h-4 w-4" />
                {label}
              </Link>
            </Button>
          ))}
        </nav>
        {children}
      </main>
    </DashboardLayout>
  );
}

function SectionHeader({
  title,
  count,
  onRefresh,
  onAdd,
  addLabel,
  addDisabled = false,
}: {
  title: string;
  count?: number;
  onRefresh: () => void;
  onAdd: () => void;
  addLabel: string;
  addDisabled?: boolean;
}) {
  return (
    <CardHeader className="flex flex-row items-center justify-between gap-3">
      <CardTitle>
        {title}{" "}
        {typeof count === "number" && (
          <span className="text-sm font-normal text-muted-foreground">
            ({count})
          </span>
        )}
      </CardTitle>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="ml-1 h-4 w-4" />
          تحديث
        </Button>
        <Button size="sm" onClick={onAdd} disabled={addDisabled}>
          <Plus className="ml-1 h-4 w-4" />
          {addLabel}
        </Button>
      </div>
    </CardHeader>
  );
}

function CurriculumForm({
  initial,
  saving,
  onCancel,
  onSave,
}: {
  initial?: CurriculumOption;
  saving: boolean;
  onCancel: () => void;
  onSave: (value: CurriculumInput) => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [mode, setMode] = useState<RegistrationMode>(
    initial?.registrationMode || "egyptian",
  );
  const [icon, setIcon] = useState<File>();
  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle>{initial ? "تعديل منهج" : "إضافة منهج"}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>اسم المنهج</Label>
          <Input
            className="mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label>نوع التسجيل</Label>
          <select
            className={inputClass}
            value={mode}
            onChange={(e) => setMode(e.target.value as RegistrationMode)}
          >
            <option value="egyptian">مصري</option>
            <option value="gulf">خليجي</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <Label>الوصف</Label>
          <Textarea
            className="mt-1"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <Label>الأيقونة {initial ? "(اختياري عند التعديل)" : ""}</Label>
          <Input
            className="mt-1"
            type="file"
            accept="image/*"
            onChange={(e) => setIcon(e.target.files?.[0])}
          />
        </div>
        <div className="flex gap-2 md:col-span-2">
          <Button
            disabled={
              saving ||
              !name.trim() ||
              !description.trim() ||
              (!initial && !icon)
            }
            onClick={() =>
              onSave({
                name: name.trim(),
                description: description.trim(),
                registrationMode: mode,
                icon,
              })
            }
          >
            {saving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}حفظ
          </Button>
          <Button variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Curriculums() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-catalog", "curriculums"],
    queryFn: () => catalogApi.curriculums(),
  });
  const [editing, setEditing] = useState<CurriculumOption | "new" | null>(null);
  const [deleting, setDeleting] = useState<CurriculumOption | null>(null);
  const mutation = useMutation({
    mutationFn: (value: { id?: string; body: CurriculumInput }) =>
      value.id
        ? catalogApi.updateCurriculum(value.id, value.body)
        : catalogApi.createCurriculum(value.body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-catalog"] });
      setEditing(null);
      toast.success("تم حفظ المنهج.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => catalogApi.deleteCurriculum(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-catalog"] });
      setDeleting(null);
      toast.success("تم حذف المنهج.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <CatalogShell resource="curriculums">
      {editing && (
        <CurriculumForm
          initial={editing === "new" ? undefined : editing}
          saving={mutation.isPending}
          onCancel={() => setEditing(null)}
          onSave={(body) =>
            mutation.mutate({
              id: editing === "new" ? undefined : editing.id,
              body,
            })
          }
        />
      )}
      <Card>
        <SectionHeader
          title="المناهج"
          count={query.data?.data.length}
          onRefresh={() => void query.refetch()}
          onAdd={() => setEditing("new")}
          addLabel="إضافة منهج"
        />
        <CardContent>
          <LoadingOrError
            loading={query.isLoading}
            error={query.isError}
            retry={() => void query.refetch()}
          />
          {!query.isLoading &&
            !query.isError &&
            (!query.data?.data.length ? (
              <p className="p-8 text-center text-muted-foreground">
                لا توجد مناهج.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {query.data.data.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 rounded-xl border p-4"
                  >
                    {item.icon && (
                      <img
                        src={item.icon}
                        alt=""
                        className="h-14 w-14 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                      <Badge variant="outline" className="mt-2">
                        {item.registrationMode === "gulf" ? "خليجي" : "مصري"}
                      </Badge>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="تعديل"
                        onClick={() => setEditing(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        aria-label="حذف"
                        onClick={() => setDeleting(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
        </CardContent>
      </Card>
      <ConfirmDelete
        open={Boolean(deleting)}
        name={deleting?.name || ""}
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </CatalogShell>
  );
}

function CurriculumSelect({
  curriculums,
  value,
  onChange,
}: {
  curriculums: CurriculumOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      className={inputClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">اختر المنهج</option>
      {curriculums.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </select>
  );
}

function Grades() {
  const qc = useQueryClient();
  const curricula = useQuery({
    queryKey: ["admin-catalog", "curriculums"],
    queryFn: () => catalogApi.curriculums(),
  });
  const [curriculum, setCurriculum] = useState("");
  const [studyLanguage, setStudyLanguage] = useState<
    EgyptianGradeLanguage | ""
  >("");
  const query = useQuery({
    queryKey: ["admin-catalog", "grades", curriculum],
    queryFn: () => catalogApi.grades(curriculum),
    enabled: Boolean(curriculum),
  });
  const [editing, setEditing] = useState<GradeOption | "new" | null>(null);
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState<GradeOption | null>(null);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const selectedCurriculum = curricula.data?.data.find(
    (item) => item.id === curriculum,
  );
  const egyptian = selectedCurriculum?.registrationMode === "egyptian";
  const languageOptions = (query.data?.data || []).reduce<
    EgyptianGradeLanguage[]
  >((options, item) => {
    const language = egyptianGradeLanguage(item.name);
    return language && !options.includes(language)
      ? [...options, language]
      : options;
  }, []);
  const languageRequired = egyptian && languageOptions.length > 0;
  const visibleGrades =
    languageRequired && studyLanguage
      ? (query.data?.data || []).filter(
          (item) => egyptianGradeLanguage(item.name) === studyLanguage,
        )
      : query.data?.data || [];
  const save = useMutation({
    mutationFn: (value: { id?: string; name: string }) =>
      value.id
        ? catalogApi.updateGrade(value.id, { name: value.name })
        : catalogApi.createGrade({ name: value.name, curriculum }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-catalog", "grades"] });
      setEditing(null);
      setName("");
      toast.success("تم حفظ الصف.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => catalogApi.deleteGrade(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-catalog", "grades"] });
      setDeleting(null);
      toast.success("تم حذف الصف.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const subjectQuery = useQuery({
    queryKey: [
      "admin-catalog",
      "grade-subjects",
      editing && editing !== "new" ? editing.id : "",
    ],
    queryFn: () =>
      catalogApi.subjects(editing && editing !== "new" ? editing.id : ""),
    enabled: Boolean(editing && editing !== "new"),
  });
  const allSubjects = useQuery({
    queryKey: ["admin-catalog", "subjects", curriculum],
    queryFn: () => catalogApi.subjectsByCurriculum(curriculum),
    enabled: Boolean(curriculum),
  });
  const addSubjects = useMutation({
    mutationFn: () =>
      catalogApi.addSubjectsToGrade(
        editing && editing !== "new" ? editing.id : "",
        subjectIds,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["admin-catalog", "grade-subjects"],
      });
      setSubjectIds([]);
      toast.success("تم ربط المواد بالصف.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const begin = (item: GradeOption | "new") => {
    setEditing(item);
    setName(item === "new" ? "" : item.name);
    setSubjectIds([]);
  };
  const currentIds = new Set(
    (subjectQuery.data?.data || []).map((item) => idOf(item)),
  );
  return (
    <CatalogShell resource="grades">
      <Card>
        <CardContent className="grid gap-2 p-4">
          <Label>المنهج</Label>
          <CurriculumSelect
            curriculums={curricula.data?.data || []}
            value={curriculum}
            onChange={(value) => {
              setCurriculum(value);
              setStudyLanguage("");
              setEditing(null);
            }}
          />
          {languageRequired && (
            <>
              <Label className="mt-2">لغة الدراسة</Label>
              <select
                className={inputClass}
                value={studyLanguage}
                disabled={query.isLoading}
                onChange={(event) => {
                  setStudyLanguage(event.target.value as EgyptianGradeLanguage);
                  setEditing(null);
                }}
              >
                <option value="">اختر لغة الدراسة</option>
                {languageOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "languages" ? "لغات" : "عربي"}
                  </option>
                ))}
              </select>
            </>
          )}
        </CardContent>
      </Card>
      {editing && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>
              {editing === "new" ? "إضافة صف" : "تعديل الصف وربط المواد"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <Label>اسم الصف</Label>
              <Input
                className="mt-1 max-w-md"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                disabled={save.isPending || !name.trim() || !curriculum}
                onClick={() =>
                  save.mutate({
                    id: editing === "new" ? undefined : editing.id,
                    name: name.trim(),
                  })
                }
              >
                {save.isPending && (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                )}
                حفظ
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>
                إلغاء
              </Button>
            </div>
            {editing !== "new" && (
              <div className="space-y-3 border-t pt-4">
                <div>
                  <Label>إضافة مواد للصف</Label>
                  <p className="text-sm text-muted-foreground">
                    الإزالة متاحة من تعديل المادة، لأن الـ backend لا يوفر
                    endpoint حذف منفصل للعلاقة.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(allSubjects.data?.data || [])
                    .filter((item) => !currentIds.has(idOf(item)))
                    .map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={subjectIds.includes(item.id)}
                          onChange={(e) =>
                            setSubjectIds((ids) =>
                              e.target.checked
                                ? [...ids, item.id]
                                : ids.filter((id) => id !== item.id),
                            )
                          }
                        />
                        {item.name}
                      </label>
                    ))}
                </div>
                <Button
                  disabled={!subjectIds.length || addSubjects.isPending}
                  onClick={() => addSubjects.mutate()}
                >
                  ربط المواد المحددة
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <Card>
        <SectionHeader
          title="الصفوف"
          count={query.data?.data.length}
          onRefresh={() => void query.refetch()}
          onAdd={() => begin("new")}
          addLabel="إضافة صف"
          addDisabled={!curriculum || (languageRequired && !studyLanguage)}
        />
        <CardContent>
          <LoadingOrError
            loading={query.isLoading || curricula.isLoading}
            error={query.isError || curricula.isError}
            retry={() => void query.refetch()}
          />
          {!query.isLoading && !query.isError && !curriculum ? (
            <p className="p-8 text-center text-muted-foreground">
              اختر المنهج لعرض الصفوف.
            </p>
          ) : !query.isLoading &&
            !query.isError &&
            languageRequired &&
            !studyLanguage ? (
            <p className="p-8 text-center text-muted-foreground">
              اختر لغة الدراسة لعرض الصفوف.
            </p>
          ) : !query.isLoading && !query.isError && !visibleGrades.length ? (
            <p className="p-8 text-center text-muted-foreground">
              {languageRequired && studyLanguage
                ? "لا توجد صفوف لهذه اللغة."
                : "لا توجد صفوف."}
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {visibleGrades.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border p-4"
                >
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.isActive === false ? "غير نشط" : "نشط"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="تعديل"
                      onClick={() => begin(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      aria-label="حذف"
                      onClick={() => setDeleting(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <ConfirmDelete
        open={Boolean(deleting)}
        name={deleting?.name || ""}
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </CatalogShell>
  );
}

function Subjects() {
  const qc = useQueryClient();
  const curricula = useQuery({
    queryKey: ["admin-catalog", "curriculums"],
    queryFn: () => catalogApi.curriculums(),
  });
  const [curriculum, setCurriculum] = useState("");
  const [studyLanguage, setStudyLanguage] = useState<
    EgyptianGradeLanguage | ""
  >("");
  const [grade, setGrade] = useState("");
  const query = useQuery({
    queryKey: ["admin-catalog", "grade-subjects", grade],
    queryFn: () => catalogApi.subjects(grade),
    enabled: Boolean(grade),
  });
  const grades = useQuery({
    queryKey: ["admin-catalog", "grades", curriculum],
    queryFn: () => catalogApi.grades(curriculum),
    enabled: Boolean(curriculum),
  });
  const [editing, setEditing] = useState<SubjectOption | "new" | null>(null);
  const [form, setForm] = useState<SubjectInput>({
    name: "",
    curriculum: "",
    grades: [],
  });
  const [deleting, setDeleting] = useState<SubjectOption | null>(null);
  const selectedCurriculum = curricula.data?.data.find(
    (item) => item.id === curriculum,
  );
  const egyptian = selectedCurriculum?.registrationMode === "egyptian";
  const languageOptions = (grades.data?.data || []).reduce<
    EgyptianGradeLanguage[]
  >((options, item) => {
    const language = egyptianGradeLanguage(item.name);
    return language && !options.includes(language)
      ? [...options, language]
      : options;
  }, []);
  const languageRequired = egyptian && languageOptions.length > 0;
  const visibleGrades =
    languageRequired && studyLanguage
      ? (grades.data?.data || []).filter(
          (item) => egyptianGradeLanguage(item.name) === studyLanguage,
        )
      : grades.data?.data || [];
  const save = useMutation({
    mutationFn: (value: { id?: string; body: SubjectInput }) =>
      value.id
        ? catalogApi.updateSubject(value.id, {
            name: value.body.name,
            grades: value.body.grades,
          })
        : catalogApi.createSubject(value.body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-catalog"] });
      setEditing(null);
      toast.success("تم حفظ المادة.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => catalogApi.deleteSubject(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-catalog"] });
      setDeleting(null);
      toast.success("تم حذف المادة.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const begin = (item: SubjectOption | "new") => {
    setEditing(item);
    setForm({
      name: item === "new" ? "" : item.name,
      curriculum,
      grades:
        item === "new"
          ? grade
            ? [grade]
            : []
          : (item.grades || []).map((itemGrade) => idOf(itemGrade)).length
            ? (item.grades || []).map((itemGrade) => idOf(itemGrade))
            : grade
              ? [grade]
              : [],
    });
  };
  return (
    <CatalogShell resource="subjects">
      <Card>
        <CardContent className="grid gap-2 p-4">
          <Label>المنهج</Label>
          <CurriculumSelect
            curriculums={curricula.data?.data || []}
            value={curriculum}
            onChange={(value) => {
              setCurriculum(value);
              setStudyLanguage("");
              setGrade("");
              setEditing(null);
            }}
          />
          {languageRequired && (
            <>
              <Label className="mt-2">لغة الدراسة</Label>
              <select
                className={inputClass}
                value={studyLanguage}
                disabled={grades.isLoading}
                onChange={(event) => {
                  setStudyLanguage(event.target.value as EgyptianGradeLanguage);
                  setGrade("");
                  setEditing(null);
                }}
              >
                <option value="">اختر لغة الدراسة</option>
                {languageOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "languages" ? "لغات" : "عربي"}
                  </option>
                ))}
              </select>
            </>
          )}
          <Label className="mt-2">الصف</Label>
          <select
            className={inputClass}
            value={grade}
            disabled={
              !curriculum ||
              grades.isLoading ||
              (languageRequired && !studyLanguage)
            }
            onChange={(event) => {
              setGrade(event.target.value);
              setEditing(null);
            }}
          >
            <option value="">
              {curriculum ? "اختر الصف" : "اختر المنهج أولًا"}
            </option>
            {visibleGrades.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {curriculum &&
            !grades.isLoading &&
            !grades.isError &&
            !visibleGrades.length && (
              <p className="text-sm text-muted-foreground">
                {languageRequired && studyLanguage
                  ? "لا توجد صفوف لهذه اللغة."
                  : "لا توجد صفوف لهذا المنهج."}
              </p>
            )}
        </CardContent>
      </Card>
      {editing && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>
              {editing === "new" ? "إضافة مادة" : "تعديل المادة"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <Label>اسم المادة</Label>
              <Input
                className="mt-1 max-w-md"
                value={form.name}
                onChange={(e) =>
                  setForm((current) => ({ ...current, name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>الصفوف المرتبطة</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {visibleGrades.map((grade) => (
                  <label
                    key={grade.id}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={form.grades.includes(grade.id)}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          grades: e.target.checked
                            ? [...current.grades, grade.id]
                            : current.grades.filter((id) => id !== grade.id),
                        }))
                      }
                    />
                    {grade.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                disabled={
                  save.isPending || !form.name.trim() || !form.grades.length
                }
                onClick={() =>
                  save.mutate({
                    id: editing === "new" ? undefined : editing.id,
                    body: { ...form, name: form.name.trim() },
                  })
                }
              >
                {save.isPending && (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                )}
                حفظ
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <SectionHeader
          title="المواد"
          count={query.data?.data.length}
          onRefresh={() => void query.refetch()}
          onAdd={() => begin("new")}
          addLabel="إضافة مادة"
          addDisabled={
            !curriculum || !grade || (languageRequired && !studyLanguage)
          }
        />
        <CardContent>
          <LoadingOrError
            loading={query.isLoading || curricula.isLoading || grades.isLoading}
            error={query.isError || curricula.isError || grades.isError}
            retry={() => void query.refetch()}
          />
          {!curriculum ? (
            <p className="p-8 text-center text-muted-foreground">
              اختر المنهج لعرض الصفوف.
            </p>
          ) : languageRequired && !studyLanguage ? (
            <p className="p-8 text-center text-muted-foreground">
              اختر لغة الدراسة لعرض الصفوف.
            </p>
          ) : !grade ? (
            <p className="p-8 text-center text-muted-foreground">
              اختر الصف لعرض المواد.
            </p>
          ) : !query.isLoading && !query.isError && !query.data?.data.length ? (
            <p className="p-8 text-center text-muted-foreground">
              لا توجد مواد مرتبطة بهذا الصف.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {(query.data?.data || []).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border p-4"
                >
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">الصف المحدد</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="تعديل"
                      onClick={() => begin(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      aria-label="حذف"
                      onClick={() => setDeleting(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <ConfirmDelete
        open={Boolean(deleting)}
        name={deleting?.name || ""}
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </CatalogShell>
  );
}

const currencies = ["EGP", "SAR", "AED", "KWD", "QAR", "BHD", "OMR"];
function Packages() {
  const qc = useQueryClient();
  const curricula = useQuery({
    queryKey: ["admin-catalog", "curriculums"],
    queryFn: () => catalogApi.curriculums(),
  });
  const [curriculum, setCurriculum] = useState("");
  const query = useQuery({
    queryKey: ["admin-catalog", "packages", curriculum],
    queryFn: () => catalogApi.packages(curriculum),
    enabled: Boolean(curriculum),
  });
  const [editing, setEditing] = useState<PackageOption | "new" | null>(null);
  const blank = (): PackageInput => ({
    name: "",
    curriculum,
    type: "hours",
    accessScope: "all_subjects",
    hours: 1,
    oldPrice: 0,
    price: 0,
    currency: "EGP",
    isPopular: false,
    isActive: true,
  });
  const [form, setForm] = useState<PackageInput>(blank());
  const [deleting, setDeleting] = useState<PackageOption | null>(null);
  const save = useMutation({
    mutationFn: (value: { id?: string; body: PackageInput }) =>
      value.id
        ? catalogApi.updatePackage(value.id, value.body)
        : catalogApi.createPackage(value.body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-catalog"] });
      setEditing(null);
      toast.success("تم حفظ الباقة.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => catalogApi.deletePackage(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-catalog"] });
      setDeleting(null);
      toast.success("تم حذف الباقة.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const begin = (item: PackageOption | "new") => {
    setEditing(item);
    setForm(
      item === "new"
        ? blank()
        : {
            ...blank(),
            ...item,
            curriculum: idOf(item.curriculum),
            oldPrice: item.oldPrice || 0,
            price: item.price || 0,
          },
    );
  };
  const setField = <K extends keyof PackageInput>(
    key: K,
    value: PackageInput[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  return (
    <CatalogShell resource="packages">
      <Card>
        <CardContent className="grid gap-2 p-4">
          <Label>المنهج</Label>
          <CurriculumSelect
            curriculums={curricula.data?.data || []}
            value={curriculum}
            onChange={(value) => {
              setCurriculum(value);
              setEditing(null);
            }}
          />
        </CardContent>
      </Card>
      {editing && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>
              {editing === "new" ? "إضافة باقة" : "تعديل الباقة"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>اسم الباقة</Label>
              <Input
                className="mt-1"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
              />
            </div>
            <div>
              <Label>النوع</Label>
              <select
                className={inputClass}
                value={form.type}
                onChange={(e) =>
                  setField("type", e.target.value as PackageInput["type"])
                }
              >
                <option value="hours">ساعات</option>
                <option value="monthly">شهري</option>
              </select>
            </div>
            <div>
              <Label>نطاق الوصول</Label>
              <select
                className={inputClass}
                value={form.accessScope}
                onChange={(e) =>
                  setField(
                    "accessScope",
                    e.target.value as PackageInput["accessScope"],
                  )
                }
              >
                <option value="all_subjects">كل المواد</option>
                <option value="single_subject">مادة واحدة</option>
              </select>
            </div>
            <div>
              <Label>العملة</Label>
              <select
                className={inputClass}
                value={form.currency}
                onChange={(e) => setField("currency", e.target.value)}
              >
                {currencies.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>
                الساعات {form.type === "monthly" ? "(لا تنطبق)" : ""}
              </Label>
              <Input
                className="mt-1"
                type="number"
                min="1"
                disabled={form.type === "monthly"}
                value={form.hours || ""}
                onChange={(e) => setField("hours", Number(e.target.value))}
              />
            </div>
            <div>
              <Label>السعر القديم</Label>
              <Input
                className="mt-1"
                type="number"
                min="0"
                value={form.oldPrice}
                onChange={(e) => setField("oldPrice", Number(e.target.value))}
              />
            </div>
            <div>
              <Label>السعر</Label>
              <Input
                className="mt-1"
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setField("price", Number(e.target.value))}
              />
            </div>
            <div>
              <Label>عنوان الخصم</Label>
              <Input
                className="mt-1"
                value={form.discountTitle || ""}
                onChange={(e) => setField("discountTitle", e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label>الوصف</Label>
              <Textarea
                className="mt-1"
                value={form.description || ""}
                onChange={(e) => setField("description", e.target.value)}
              />
            </div>
            <div className="flex gap-4 md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(form.isPopular)}
                  onChange={(e) => setField("isPopular", e.target.checked)}
                />
                الأكثر شيوعًا
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive !== false}
                  onChange={(e) => setField("isActive", e.target.checked)}
                />
                نشطة
              </label>
            </div>
            <div className="flex gap-2 md:col-span-2">
              <Button
                disabled={save.isPending || !form.name.trim() || !curriculum}
                onClick={() =>
                  save.mutate({
                    id: editing === "new" ? undefined : editing.id,
                    body: { ...form, curriculum },
                  })
                }
              >
                {save.isPending && (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                )}
                حفظ
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <SectionHeader
          title="الباقات"
          count={query.data?.data.length}
          onRefresh={() => void query.refetch()}
          onAdd={() => begin("new")}
          addLabel="إضافة باقة"
        />
        <CardContent>
          <LoadingOrError
            loading={query.isLoading || curricula.isLoading}
            error={query.isError || curricula.isError}
            retry={() => void query.refetch()}
          />
          {!query.isLoading && !query.isError && !curriculum ? (
            <p className="p-8 text-center text-muted-foreground">
              اختر منهجًا لعرض باقاته.
            </p>
          ) : !query.isLoading && !query.isError && !query.data?.data.length ? (
            <p className="p-8 text-center text-muted-foreground">
              لا توجد باقات.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {(query.data?.data || []).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border p-4"
                >
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.type === "monthly"
                        ? "شهري"
                        : `${item.hours || 0} ساعة`}{" "}
                      · {item.price} {item.currency}
                    </p>
                    <Badge
                      variant={item.isActive === false ? "outline" : "default"}
                      className="mt-2"
                    >
                      {item.isActive === false ? "غير نشطة" : "نشطة"}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="تعديل"
                      onClick={() => begin(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      aria-label="حذف"
                      onClick={() => setDeleting(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <ConfirmDelete
        open={Boolean(deleting)}
        name={deleting?.name || ""}
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </CatalogShell>
  );
}

export default function AdminCatalog() {
  const { pathname } = useLocation();
  const resource = (resources.find((item) => pathname.startsWith(item.path))
    ?.key || "curriculums") as Resource;
  if (resource === "grades") return <Grades />;
  if (resource === "subjects") return <Subjects />;
  if (resource === "packages") return <Packages />;
  return <Curriculums />;
}
