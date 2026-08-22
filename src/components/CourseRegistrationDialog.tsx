import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Course } from "@/data/courses";

interface CourseRegistrationDialogProps {
  course: Course;
  onClose: () => void;
}

const CourseRegistrationDialog = ({ course, onClose }: CourseRegistrationDialogProps) => {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      toast.error("يرجى تعبئة جميع الحقول");
      return;
    }
    setSubmitting(true);
    // TODO: ربط التسجيل بمصدر البيانات الفعلي عند تحديده (بدون تخزين حقيقي حاليًا)
    setTimeout(() => {
      toast.success("تم استلام طلبك، سنتواصل معك قريبًا لإتمام التسجيل");
      setSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-cairo">التسجيل في: {course.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-tajawal space-y-1.5">
            <span>الاسم الكامل</span>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="اسمك الكامل" />
          </label>
          <label className="block text-sm font-tajawal space-y-1.5">
            <span>رقم الهاتف / واتساب</span>
            <Input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx" />
          </label>
          <Button type="submit" disabled={submitting} className="w-full font-cairo">
            {submitting ? "جاري الإرسال..." : "تأكيد التسجيل"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CourseRegistrationDialog;
