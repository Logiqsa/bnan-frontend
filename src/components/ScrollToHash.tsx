import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { scrollToSection } from "@/lib/hash-scroll";

export default function ScrollToHash() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }
    if (pathname !== "/") return;
    let attempts = 0;
    let frame = 0;
    const scroll = () => {
      attempts += 1;
      if (!scrollToSection(hash) && attempts < 10) frame = window.requestAnimationFrame(scroll);
    };
    frame = window.requestAnimationFrame(scroll);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return null;
}
