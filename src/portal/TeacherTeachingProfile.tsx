import { BookOpen } from "lucide-react";
import TeachingProfileEditor from "@/components/TeachingProfileEditor";
import { useLanguage } from "@/i18n/LanguageContext";
import DashboardLayout from "@/layouts/DashboardLayout";

export default function TeacherTeachingProfile() {
  const { pick } = useLanguage();
  return <DashboardLayout><main className="mx-auto w-full max-w-5xl space-y-6"><header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><BookOpen className="h-5 w-5" /></span><div><h1 className="text-2xl font-bold">{pick("بيانات تدريسي", "My teaching profile")}</h1><p className="mt-1 text-sm text-muted-foreground">{pick("حدّث المناهج والصفوف والمواد التي يمكنك تدريسها.", "Update the curriculums, grades and subjects you can teach.")}</p></div></div></header><TeachingProfileEditor /></main></DashboardLayout>;
}
