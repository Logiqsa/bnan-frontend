import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { coursesApi, type Course, type CourseMode } from "@/api/coursesApi";
import { courseError } from "@/lib/courseUi";
import { usePortalAuth } from "@/portal/PortalAuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";

export default function CourseRegistrationDialog({
  course,
  onClose,
}: {
  course: Course;
  onClose: () => void;
}) {
  const modes = (Object.keys(course.enrollmentModes) as CourseMode[]).filter(
    (m) => course.enrollmentModes[m].enabled,
  );
  const [mode, setMode] = useState<CourseMode>(modes[0]);
  const [provider, setProvider] = useState<"paymob" | "tamara">("paymob");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [line1, setLine1] = useState("");
  const [busy, setBusy] = useState(false);
  const { user } = usePortalAuth();
  const nav = useNavigate();
  const location = useLocation();
  const price = course.enrollmentModes[mode]?.price || 0;
  const submit = async () => {
    if (!user) {
      nav("/portal/login", { state: { from: location.pathname } });
      return;
    }
    if (user.role !== "student") {
      toast.error("التسجيل متاح بحساب الطالب فقط.");
      return;
    }
    if (
      price > 0 &&
      provider === "tamara" &&
      (!city.trim() || !region.trim() || !line1.trim())
    ) {
      toast.error("أدخل عنوان الدفع المطلوب لـ Tamara.");
      return;
    }
    setBusy(true);
    try {
      if (price === 0) {
        await coursesApi.enrollFree(course.id, mode);
        toast.success("تم تفعيل تسجيلك في الدورة");
        nav("/portal/student/courses");
      } else {
        const r = await coursesApi.checkout(
          {
            courseId: course.id,
            mode,
            provider,
            locale: "ar_SA",
            isMobile: false,
            ...(provider === "tamara"
              ? {
                  paymentAddress: {
                    city: city.trim(),
                    region: region.trim(),
                    line1: line1.trim(),
                  },
                }
              : {}),
          },
          crypto.randomUUID(),
        );
        if (!r.data.checkoutUrl)
          throw new Error("لم يرجع مزود الدفع رابط إتمام العملية.");
        window.location.assign(r.data.checkoutUrl);
      }
    } catch (e) {
      toast.error(courseError(e));
      setBusy(false);
    }
  };
  return (
    <Dialog open onOpenChange={(x) => !x && onClose()}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>التسجيل في {course.name}</DialogTitle>
        </DialogHeader>
        {!course.enrollmentOpen ? (
          <p className="text-destructive">التسجيل مغلق حاليًا.</p>
        ) : (
          <div className="space-y-5">
            <RadioGroup
              value={mode}
              onValueChange={(x) => setMode(x as CourseMode)}
              className="grid gap-3"
            >
              {modes.map((m) => (
                <label
                  key={m}
                  className="flex cursor-pointer items-center justify-between rounded-lg border p-4"
                >
                  <span className="flex items-center gap-2">
                    <RadioGroupItem value={m} />
                    {m === "group" ? "جماعي" : "فردي"}
                  </span>
                  <b>
                    {course.enrollmentModes[m].price === 0
                      ? "مجاني"
                      : `${course.enrollmentModes[m].price} ${course.currency}`}
                  </b>
                </label>
              ))}
            </RadioGroup>
            {price > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium">وسيلة الدفع</span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    aria-pressed={provider === "paymob"}
                    onClick={() => setProvider("paymob")}
                    className={`rounded-xl border p-4 text-right transition-colors ${provider === "paymob" ? "border-secondary bg-secondary/10 ring-1 ring-secondary" : "hover:border-secondary/50"}`}
                  >
                    <span className="block font-semibold">بطاقة بنكية</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Visa / Mastercard / Mada
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={provider === "tamara"}
                    onClick={() => setProvider("tamara")}
                    className={`rounded-xl border p-4 text-right transition-colors ${provider === "tamara" ? "border-secondary bg-secondary/10 ring-1 ring-secondary" : "hover:border-secondary/50"}`}
                  >
                    <span className="block font-semibold">تمارا</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      الدفع المرن عبر تمارا
                    </span>
                  </button>
                </div>
              </div>
            )}
            {price > 0 && provider === "tamara" && (
              <div className="grid gap-3">
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="المدينة"
                />
                <Input
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="المنطقة"
                />
                <Input
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder="العنوان"
                />
              </div>
            )}
            <Button className="w-full" disabled={busy} onClick={submit}>
              {busy
                ? "جاري المتابعة..."
                : price
                  ? "الانتقال للدفع"
                  : "تفعيل التسجيل"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
