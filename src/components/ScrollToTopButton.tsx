import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

const SHOW_AFTER_PX = 8;

export default function ScrollToTopButton() {
  const { pick } = useLanguage();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const container = document.querySelector<HTMLElement>("[data-scroll-container]");
    setScrollContainer(container);
    const scrollTarget: Window | HTMLElement = container || window;
    const updateVisibility = () => setVisible((container?.scrollTop || window.scrollY) > SHOW_AFTER_PX);
    updateVisibility();
    scrollTarget.addEventListener("scroll", updateVisibility, { passive: true });
    return () => scrollTarget.removeEventListener("scroll", updateVisibility);
  }, [location.pathname, location.search]);

  const isDashboard = location.pathname.startsWith("/admin")
    || /^\/portal\/(teacher|student|supervisor)\/(schedule|settings|sessions|classrooms)(?:\/|$)/.test(location.pathname);
  const shouldRender = location.pathname === "/" || isDashboard;
  if (!shouldRender) return null;

  return (
    <button
      type="button"
      aria-label={pick("العودة إلى أعلى الصفحة", "Back to top")}
      title={pick("العودة إلى الأعلى", "Back to top")}
      onClick={() => (scrollContainer || window).scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed bottom-4 left-[18px] z-40 grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:bottom-5 sm:left-[30px]",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
