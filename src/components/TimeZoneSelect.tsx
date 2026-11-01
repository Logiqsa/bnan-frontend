import { Clock3 } from "lucide-react";
import { TIME_ZONE_OPTIONS, useTimeZone, type SupportedTimeZone } from "@/contexts/TimeZoneContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TimeZoneSelectProps {
  className?: string;
  value?: SupportedTimeZone;
  onValueChange?: (value: SupportedTimeZone) => void;
}

export default function TimeZoneSelect({ className, value, onValueChange }: TimeZoneSelectProps) {
  const { timeZone, setTimeZone } = useTimeZone();
  const { pick } = useLanguage();
  return (
    <Select
      value={value ?? timeZone}
      onValueChange={(next) => (onValueChange ?? setTimeZone)(next as SupportedTimeZone)}
    >
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
