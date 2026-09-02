import { Clock3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/i18n/LanguageContext";

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

const parseTime = (value: string) => {
  const [hoursValue = "0", minutes = "00"] = value.split(":");
  const hours24 = Number(hoursValue) || 0;
  return { hour: String(hours24 % 12 || 12), minute: minutes, period: hours24 < 12 ? "am" : "pm" };
};

export default function Time12Input({ value, onChange, allowEmpty = false }: { value: string; onChange: (value: string) => void; allowEmpty?: boolean }) {
  const { isArabic, pick } = useLanguage();
  if (!value) return <Button type="button" variant="outline" className="w-full justify-start gap-2 font-normal text-muted-foreground" onClick={() => onChange("12:00")}><Clock3 className="h-4 w-4"/>{pick("تحديد الوقت", "Set time")}</Button>;
  const parsed = parseTime(value);
  const update = (hour: string, minute: string, period: string) => {
    const hour12 = Number(hour);
    const hour24 = period === "am" ? hour12 % 12 : (hour12 % 12) + 12;
    onChange(`${String(hour24).padStart(2, "0")}:${minute}`);
  };
  return <div dir="ltr" className="flex min-w-0 items-center gap-1.5">
    <Select value={parsed.hour} onValueChange={(hour) => update(hour, parsed.minute, parsed.period)}><SelectTrigger aria-label="الساعة" className="min-w-0 flex-1 px-2"><SelectValue/></SelectTrigger><SelectContent>{HOURS.map((hour) => <SelectItem key={hour} value={hour}>{hour}</SelectItem>)}</SelectContent></Select>
    <span className="font-bold text-muted-foreground">:</span>
    <Select value={parsed.minute} onValueChange={(minute) => update(parsed.hour, minute, parsed.period)}><SelectTrigger aria-label="الدقائق" className="min-w-0 flex-1 px-2"><SelectValue/></SelectTrigger><SelectContent>{MINUTES.map((minute) => <SelectItem key={minute} value={minute}>{minute}</SelectItem>)}</SelectContent></Select>
    <Select value={parsed.period} onValueChange={(period) => update(parsed.hour, parsed.minute, period)}><SelectTrigger aria-label={pick("الفترة", "Period")} className="w-[6.5rem] shrink-0 px-2" dir={isArabic ? "rtl" : "ltr"}><SelectValue/></SelectTrigger><SelectContent dir={isArabic ? "rtl" : "ltr"}><SelectItem value="am">{isArabic ? "صباحا" : "AM"}</SelectItem><SelectItem value="pm">{isArabic ? "مساءا" : "PM"}</SelectItem></SelectContent></Select>
    {allowEmpty && <Button type="button" size="icon" variant="ghost" className="shrink-0 text-muted-foreground" onClick={() => onChange("")} aria-label={pick("إزالة وقت النهاية", "Remove end time")}><X className="h-4 w-4"/></Button>}
  </div>;
}
