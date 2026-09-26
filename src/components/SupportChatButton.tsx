import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MessageCircle } from "lucide-react";
import { chatApi } from "@/api/chatApi";
import { courseError } from "@/lib/courseUi";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";

export default function SupportChatButton({ path }: { path: string }) {
  const navigate = useNavigate();
  const { pick } = useLanguage();
  const [busy, setBusy] = useState(false);
  const openSupport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const room = await chatApi.createSupportRoom();
      navigate(`${path}?roomId=${encodeURIComponent(room.id)}`);
    } catch (error) {
      toast.error(courseError(error));
    } finally {
      setBusy(false);
    }
  };
  return <Button type="button" variant="outline" onClick={() => void openSupport()} disabled={busy}>
    {busy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <MessageCircle className="me-2 h-4 w-4" />}
    {pick("تواصل مع الإدارة", "Contact administration")}
  </Button>;
}
