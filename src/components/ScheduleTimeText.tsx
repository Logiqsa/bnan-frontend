import { formatScheduleTimeParts } from "@/admin/zoom/classroomManagement";
import { useLanguage } from "@/i18n/LanguageContext";

export default function ScheduleTimeText({ value }: { value: string }) {
  const { isArabic } = useLanguage();
  const time = formatScheduleTimeParts(value, isArabic);
  return <span dir="ltr" className="inline-flex items-baseline gap-1 whitespace-nowrap"><span>{time.clock}</span><span>{time.period}</span></span>;
}
