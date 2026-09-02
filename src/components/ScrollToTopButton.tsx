import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

const SHOW_AFTER_PX = 400;

export default function ScrollToTopButton() {
  const { pick } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  return (
    <button
      type="button"
      aria-label={pick("العودة إلى أعلى الصفحة", "Back to top")}
      title={pick("العودة إلى الأعلى", "Back to top")}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed bottom-6 right-6 z-50 grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
