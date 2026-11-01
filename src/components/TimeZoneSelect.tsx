import { Clock3 } from "lucide-react";
import { TIME_ZONE_OPTIONS, useTimeZone, type SupportedTimeZone } from "@/contexts/TimeZoneContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function TimeZoneSelect({ className }: { className?: string }) {
  const { timeZone, setTimeZone } = useTimeZone();
  const { pick } = useLanguage();
  return (
    <Select value={timeZone} onValueChange={(value) => setTimeZone(value as SupportedTimeZone)}>
      <SelectTrigger aria-label={pick("المنطقة الزمنية", "Time zone")} className={cn("h-9 gap-1.5", className)}>
        <Clock3 className="h-3.5 w-3.5 shrink-0" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TIME_ZONE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>{pick(option.ar, option.en)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
