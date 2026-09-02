import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Upload, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import DashboardLayout from "@/layouts/DashboardLayout";
import { ApiError } from "@/api/client";
import {
  classroomRecordingsApi,
  type ClassroomOption,
  type ClassroomSubjectOption,
} from "@/api/classroomRecordingsApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";

const MAX_FILE_SIZE = 500 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ["mp4", "webm", "mov", "mkv", "avi"];

const errorMessage = (error: unknown, pick: (arabic: string, english: string) => string) => {
  const apiError = error as ApiError;
  const messages: Record<string, string> = {
    SESSION_RECORDING_FILE_REQUIRED: pick("اختر ملف التسجيل", "Select a recording file"),
    CLASSROOM_SUBJECT_REQUIRED: pick("اختر المادة", "Select a subject"),
    TITLE_REQUIRED: pick("اكتب اسم الحصة", "Enter the lesson name"),
    START_AT_REQUIRED: pick("اختر تاريخ ووقت الحصة", "Select the lesson date and time"),
    INVALID_UPLOAD_FILE_TYPE: pick("نوع الفيديو غير مدعوم", "Unsupported video format"),
    SESSION_NOT_FOUND_IN_CLASSROOM: pick("المادة أو البيانات لا تتبع الفصل المختار", "The subject or data does not belong to the selected class"),
  };
  if (apiError.status === 403) return pick("ليس لديك صلاحية لرفع التسجيل", "You do not have permission to upload recordings");
  if (apiError.status === 413 || /size|large|limit/i.test(apiError.message || "")) return pick("حجم التسجيل أكبر من الحد المسموح", "The recording exceeds the allowed size");
  return messages[apiError.code] || apiError.message || pick("تعذر رفع التسجيل", "Unable to upload the recording");
};

export default function ClassroomRecordingsAdmin() {
  const navigate = useNavigate();
  const { isArabic, pick } = useLanguage();
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [subjects, setSubjects] = useState<ClassroomSubjectOption[]>([]);
  const [classroomId, setClassroomId] = useState("");
  const [classroomSubjectId, setClassroomSubjectId] = useState("");
  const [classroomOpen, setClassroomOpen] = useState(false);
  const [curriculumId, setCurriculumId] = useState("all");
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const curricula = useMemo(() => Array.from(new Map(
    classrooms.filter((item) => item.curriculum).map((item) => [item.curriculum!.id, item.curriculum!]),
  ).values()), [classrooms]);
  const filteredClassrooms = useMemo(() => classrooms.filter((item) =>
    (curriculumId === "all" || item.curriculum?.id === curriculumId)
  ), [classrooms, curriculumId]);
  const selectedClassroom = classrooms.find((item) => item.id === classroomId);

  useEffect(() => {
    setLoadingClassrooms(true);
    classroomRecordingsApi.listClassrooms()
      .then((response) => setClassrooms(response.data || []))
      .catch((error) => toast.error((error as Error).message || pick("تعذر تحميل الفصول", "Unable to load classes")))
      .finally(() => setLoadingClassrooms(false));
  }, [pick]);

  useEffect(() => {
    setClassroomSubjectId("");
    setSubjects([]);
    if (!classroomId) return;
    setLoadingSubjects(true);
    classroomRecordingsApi.listSubjects(classroomId)
      .then((response) => setSubjects((response.data.subjects || []).filter((item) => item.isActive !== false)))
      .catch((error) => toast.error((error as Error).message || pick("تعذر تحميل المواد", "Unable to load subjects")))
      .finally(() => setLoadingSubjects(false));
  }, [classroomId, pick]);

  useEffect(() => {
    if (!uploading) return;
    const preventExit = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventExit);
    return () => window.removeEventListener("beforeunload", preventExit);
  }, [uploading]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return toast.error(pick("اختر ملف التسجيل", "Select a recording file"));
    if (!title.trim()) return toast.error(pick("اكتب اسم الحصة", "Enter the lesson name"));
    if (!classroomId) return toast.error(pick("اختر الفصل", "Select a class"));
    if (!classroomSubjectId) return toast.error(pick("اختر المادة", "Select a subject"));
    if (!startAt || Number.isNaN(new Date(startAt).getTime())) return toast.error(pick("اختر تاريخ ووقت الحصة", "Select the lesson date and time"));
    if (file.size > MAX_FILE_SIZE) return toast.error(pick("حجم التسجيل يجب ألا يتجاوز 500MB", "The recording must not exceed 500MB"));
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !ACCEPTED_EXTENSIONS.includes(extension)) return toast.error(pick("نوع الفيديو غير مدعوم", "Unsupported video format"));

    const body = new FormData();
    body.append("recording", file);
    body.append("title", title.trim());
    body.append("classroomSubjectId", classroomSubjectId);
    body.append("startAt", new Date(startAt).toISOString());
    if (notes.trim()) body.append("notes", notes.trim());

    setUploading(true);
    setProgress(0);
    try {
      const response = await classroomRecordingsApi.upload(classroomId, body, setProgress);
      setProgress(100);
      toast.success(pick("تم رفع الحصة بنجاح", "Lesson uploaded successfully"));
      setTitle("");
      setStartAt("");
      setNotes("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      const sessionId = response.data.session._id;
      navigate(`/admin/classroom-sessions?classroomId=${encodeURIComponent(classroomId)}&sessionId=${encodeURIComponent(sessionId)}`);
    } catch (error) {
      toast.error(errorMessage(error, pick));
    } finally {
      setUploading(false);
    }
  };

  return <DashboardLayout>
    <div className="mx-auto max-w-3xl" dir={isArabic ? "rtl" : "ltr"}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{pick("رفع تسجيل حصة قديمة", "Upload a previous lesson recording")}</h1>
        <p className="mt-1 text-muted-foreground">{pick("أنشئ حصة جديدة من تسجيل موجود.", "Create a new lesson from an existing recording.")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Video className="h-5 w-5" />{pick("بيانات الحصة", "Lesson details")}</CardTitle>
          <CardDescription>{pick("الحد الأقصى للفيديو 500MB، والأنواع المدعومة MP4 وWEBM وMOV وMKV وAVI.", "Maximum video size is 500MB. Supported formats: MP4, WEBM, MOV, MKV and AVI.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <fieldset disabled={uploading} className="space-y-5">
              <div className="space-y-2">
                <div className="space-y-2">
                  <Label>{pick("المنهج", "Curriculum")}</Label>
                  <Select value={curriculumId} onValueChange={(value) => { setCurriculumId(value); setClassroomId(""); }} disabled={loadingClassrooms}>
                    <SelectTrigger><SelectValue placeholder={pick("كل المناهج", "All curricula")} /></SelectTrigger>
                    <SelectContent><SelectItem value="all">{pick("كل المناهج", "All curricula")}</SelectItem>{curricula.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{pick("الفصل", "Class")}</Label>
                <Popover open={classroomOpen} onOpenChange={setClassroomOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" role="combobox" aria-expanded={classroomOpen} disabled={loadingClassrooms} className="w-full justify-between font-normal">
                      <span className="truncate">{loadingClassrooms ? pick("جاري التحميل...", "Loading...") : selectedClassroom?.name || pick("اختر أو ابحث عن الفصل", "Select or search for a class")}</span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command dir={isArabic ? "rtl" : "ltr"}>
                      <CommandInput placeholder={pick("ابحث باسم الفصل...", "Search by class name...")} />
                      <CommandList>
                        <CommandEmpty>{pick("لا توجد فصول مطابقة.", "No matching classes.")}</CommandEmpty>
                        <CommandGroup>
                          {filteredClassrooms.map((item) => <CommandItem
                            key={item.id}
                            value={`${item.name} ${item.curriculum?.name || ""} ${item.grade?.name || ""}`}
                            onSelect={() => { setClassroomId(item.id); setClassroomOpen(false); }}
                          >
                            <Check className={cn("ml-2 h-4 w-4", classroomId === item.id ? "opacity-100" : "opacity-0")} />
                            <span className="flex-1"><span className="block">{item.name}</span><span className="text-xs text-muted-foreground">{[item.curriculum?.name, item.grade?.name].filter(Boolean).join(" — ")}</span></span>
                          </CommandItem>)}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>{pick("المادة", "Subject")}</Label>
                <Select value={classroomSubjectId} onValueChange={setClassroomSubjectId} disabled={!classroomId || loadingSubjects}>
                  <SelectTrigger><SelectValue placeholder={loadingSubjects ? pick("جاري التحميل...", "Loading...") : pick("اختر المادة", "Select a subject")} /></SelectTrigger>
                  <SelectContent>{subjects.map((item) => <SelectItem key={item.classroomSubjectId} value={item.classroomSubjectId}>{item.name || item.subject?.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label htmlFor="session-title">{pick("اسم الحصة", "Lesson name")}</Label><Input id="session-title" value={title} onChange={(event) => setTitle(event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="start-at">{pick("تاريخ ووقت الحصة", "Lesson date and time")}</Label><Input id="start-at" type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="notes">{pick("ملاحظات (اختياري)", "Notes (optional)")}</Label><Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="recording">{pick("ملف الفيديو", "Video file")}</Label><Input ref={fileInput} id="recording" type="file" accept=".mp4,.webm,.mov,.mkv,.avi" onChange={(event) => setFile(event.target.files?.[0] || null)} /></div>
            </fieldset>
            {uploading && <div className="space-y-2" aria-live="polite"><div className="flex justify-between text-sm"><span>{pick("جاري رفع التسجيل...", "Uploading recording...")}</span><span>{progress}%</span></div><Progress value={progress} /></div>}
            <Button type="submit" disabled={uploading} className="w-full gap-2"><Upload className="h-4 w-4" />{uploading ? pick("جاري الرفع...", "Uploading...") : pick("رفع التسجيل", "Upload recording")}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  </DashboardLayout>;
}
