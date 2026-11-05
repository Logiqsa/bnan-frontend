import type { CourseScheduleSlot } from "@/api/coursesApi";
import { useTimeZone } from "@/contexts/TimeZoneContext";
import { displayWeeklySlot } from "@/lib/weeklyScheduleTime";
import ScheduleRangeText from "@/components/ScheduleRangeText";

export default function WeeklyScheduleSlotText({ slot, sourceTimeZone, dayNames }: { slot: CourseScheduleSlot; sourceTimeZone?: string; dayNames: Record<string, string> }) {
  const { timeZone } = useTimeZone();
  const displayed = displayWeeklySlot(slot, sourceTimeZone || "Africa/Cairo", timeZone);
  return <><p className="font-bold">{dayNames[displayed.day] || displayed.day}</p><p className="mt-1 text-muted-foreground"><ScheduleRangeText startTime={displayed.startTime} endTime={displayed.endTime}/></p></>;
}
