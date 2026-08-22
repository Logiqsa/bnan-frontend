import { useEffect, useState } from "react";
import { toast } from "sonner";
import { contentApi, DEFAULT_LEGACY_VISIBILITY, type LegacyVisibility } from "@/api/contentApi";
import { Switch } from "@/components/ui/switch";

type LegacyContentKey = keyof LegacyVisibility;

export default function LegacyVisibilityToggle({ contentKey, label }: { contentKey: LegacyContentKey; label: string }) {
  const [checked, setChecked] = useState(DEFAULT_LEGACY_VISIBILITY[contentKey]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contentApi.getLegacyVisibility()
      .then(({ data }) => setChecked(data[contentKey]))
      .catch(() => toast.error("تعذر تحميل إعداد ظهور المحتوى القديم"))
      .finally(() => setLoading(false));
  }, [contentKey]);

  const update = async (value: boolean) => {
    const previous = checked;
    setChecked(value);
    setLoading(true);
    try {
      const { data } = await contentApi.admin.updateLegacyVisibility({ [contentKey]: value });
      setChecked(data[contentKey]);
      toast.success(value ? "سيظل المحتوى القديم ظاهرًا" : "تم إخفاء المحتوى القديم");
    } catch (error) {
      setChecked(previous);
      toast.error(error instanceof Error ? error.message : "تعذر حفظ الإعداد");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 p-4">
      <div>
        <p className="font-cairo font-semibold">إظهار المحتوى القديم</p>
        <p className="text-sm text-muted-foreground font-tajawal">{label}</p>
      </div>
      <Switch checked={checked} disabled={loading} onCheckedChange={update} aria-label="إظهار المحتوى القديم" />
    </div>
  );
}
