import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { classroomRecordingsApi } from "@/api/classroomRecordingsApi";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/i18n/LanguageContext";

export default function DeleteRecordingButton({
  classroomId,
  sessionId,
  sessionName,
  onDeleted,
}: {
  classroomId: string;
  sessionId: string;
  sessionName?: string;
  onDeleted: () => void | Promise<void>;
}) {
  const { pick } = useLanguage();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await classroomRecordingsApi.deleteRecording(classroomId, sessionId);
      setOpen(false);
      await onDeleted();
      toast.success(pick("تم حذف التسجيل نهائيًا.", "Recording permanently deleted."));
    } catch {
      toast.error(pick("تعذر حذف التسجيل.", "Unable to delete the recording."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={(event) => { event.stopPropagation(); setOpen(true); }}
        aria-label={pick("حذف التسجيل", "Delete recording")}
      >
        <Trash2 className="me-1 h-4 w-4" />
        {pick("حذف", "Delete")}
      </Button>
      <AlertDialog open={open} onOpenChange={(next) => !deleting && setOpen(next)}>
        <AlertDialogContent onClick={(event) => event.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>{pick("هل أنت متأكد من حذف التسجيل نهائيًا؟", "Permanently delete this recording?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pick(
                `سيتم حذف تسجيل ${sessionName || "الحصة"} من الفصل والشات والتخزين، ولا يمكن التراجع عن هذا الإجراء.`,
                `The ${sessionName || "lesson"} recording will be removed from the classroom, chat, and storage. This cannot be undone.`,
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{pick("إلغاء", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(event) => { event.preventDefault(); void remove(); }}
            >
              {deleting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {pick("حذف نهائي", "Delete permanently")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
