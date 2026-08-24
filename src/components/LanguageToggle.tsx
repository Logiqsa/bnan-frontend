import { Globe } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export default function LanguageToggle({ className = "" }: { className?: string }) {
  const { isArabic, toggleLanguage, pick } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-cairo transition-colors ${className}`}
      aria-label={pick("التبديل إلى الإنجليزية", "Switch to Arabic")}
    >
      <Globe className="h-4 w-4" aria-hidden="true" />
      {isArabic ? "EN" : "عربي"}
    </button>
  );
}
