import ScheduleTimeText from "@/components/ScheduleTimeText";
import { useLanguage } from "@/i18n/LanguageContext";

export default function ScheduleRangeText({ startTime, endTime, className = "" }: { startTime: string; endTime?: string; className?: string }) {
  const { pick } = useLanguage();
  return <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}><span>{pick("من", "From")}</span><ScheduleTimeText value={startTime}/>{endTime && <><span>{pick("إلى", "to")}</span><ScheduleTimeText value={endTime}/></>}</span>;
}
