import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, School } from "lucide-react";
import { ApiError } from "@/api/client";
import { catalogApi, type CurriculumOption } from "@/api/catalogApi";
import { classroomRecordingsApi, type ClassroomOption } from "@/api/classroomRecordingsApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DashboardLayout from "@/layouts/DashboardLayout";
import { classroomKindLabel, sortClassroomsNewestFirst } from "./zoom/classroomManagement";
import { referenceId, referenceName } from "./zoom/classroomZoomNormalization";

const kindOptions: Array<{ value: NonNullable<ClassroomOption["classroomKind"]>; label: string }> = [
  { value: "general", label: "عام" },
  { value: "private", label: "خاص" },
  { value: "course", label: "دورة" },
];

const errorMessage = (error: unknown) => {
  if (error instanceof ApiError && error.code === "COURSE_CLASSROOM_KIND_IMMUTABLE") return "لا يمكن تغيير نوع فصل الدورة.";
  if (error instanceof ApiError && error.code === "INVALID_CLASSROOM_KIND") return "نوع الفصل غير صالح.";
  return "تعذر حفظ نوع الفصل. حاول مرة أخرى.";
};

export default function ClassroomKindManagement() {
  const [curriculums, setCurriculums] = useState<CurriculumOption[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [curriculumId, setCurriculumId] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [curriculumResponse, classroomResponse] = await Promise.all([
        catalogApi.curriculums(),
        classroomRecordingsApi.listAllClassrooms(),
      ]);
      setCurriculums(curriculumResponse.data || []);
      setClassrooms(Array.isArray(classroomResponse.data) ? classroomResponse.data : []);
    } catch {
      setError("تعذر تحميل المناهج والفصول.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => sortClassroomsNewestFirst(
    classrooms.filter((classroom) => referenceId(classroom.curriculum) === curriculumId),
  ), [classrooms, curriculumId]);

  const updateKind = async (classroom: ClassroomOption, kind: NonNullable<ClassroomOption["classroomKind"]>) => {
    setSavingId(classroom.id);
    setError("");
    try {
      const response = await classroomRecordingsApi.updateClassroom(classroom.id, { classroomKind: kind });
      setClassrooms((current) => current.map((item) => item.id === classroom.id ? { ...item, ...response.data, classroomKind: kind } : item));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSavingId("");
    }
  };

  return <DashboardLayout><div dir="rtl" className="mx-auto max-w-7xl space-y-5">
    <header className="rounded-2xl border bg-gradient-to-l from-primary/[0.09] via-card to-card p-5 sm:p-6">
      <h1 className="text-2xl font-bold sm:text-3xl">إدارة الفصول</h1>
      <p className="mt-2 text-sm text-muted-foreground">اختر المنهج لمراجعة أنواع الفصول وتعديلها بسرعة.</p>
    </header>

    <Card>
      <CardContent className="flex flex-wrap items-end gap-4 p-4">
        <label className="min-w-[min(100%,22rem)] flex-1 text-sm font-semibold">المنهج
          <select value={curriculumId} onChange={(event) => setCurriculumId(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3">
            <option value="">اختر المنهج</option>
            {curriculums.map((curriculum) => <option key={curriculum.id} value={curriculum.id}>{curriculum.name}</option>)}
          </select>
        </label>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} تحديث
        </Button>
      </CardContent>
    </Card>

    {error && <div role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
    {loading ? <Card><CardContent className="grid min-h-56 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></CardContent></Card> : !curriculumId ? <Card><CardContent className="grid min-h-56 place-items-center text-center text-muted-foreground"><School className="mb-2 h-10 w-10 opacity-40" /><p>اختر المنهج لعرض الفصول.</p></CardContent></Card> : <Card>
      <CardHeader><CardTitle>فصول {referenceName(curriculums.find((item) => item.id === curriculumId))}</CardTitle></CardHeader>
      <CardContent>{!visible.length ? <p className="py-10 text-center text-muted-foreground">لا توجد فصول لهذا المنهج.</p> : <Table><TableHeader><TableRow><TableHead>اسم الفصل</TableHead><TableHead>الصف</TableHead><TableHead>النوع الحالي</TableHead><TableHead>تعديل النوع</TableHead></TableRow></TableHeader><TableBody>{visible.map((classroom) => <TableRow key={classroom.id}><TableCell className="font-semibold">{classroom.name}</TableCell><TableCell>{referenceName(classroom.grade)}</TableCell><TableCell><Badge variant="outline">{classroomKindLabel(classroom.classroomKind)}</Badge></TableCell><TableCell><select aria-label={`نوع الفصل ${classroom.name}`} value={classroom.classroomKind || ""} disabled={savingId === classroom.id} onChange={(event) => { const value = event.target.value as NonNullable<ClassroomOption["classroomKind"]>; if (value) void updateKind(classroom, value); }} className="h-9 min-w-32 rounded-md border bg-background px-2 text-sm"><option value="" disabled>غير محدد</option>{kindOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{savingId === classroom.id && <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin text-primary" />}</TableCell></TableRow>)}</TableBody></Table>}</CardContent>
    </Card>}
  </div></DashboardLayout>;
}
