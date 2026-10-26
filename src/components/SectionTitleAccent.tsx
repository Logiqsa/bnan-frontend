import type { ReactNode } from "react";

const SectionTitleAccent = ({ children }: { children: ReactNode }) => (
  <span className="relative inline-block pb-2 text-gradient-sky">
    {children}
    <svg
      aria-hidden="true"
      viewBox="0 0 200 18"
      preserveAspectRatio="none"
      className="pointer-events-none absolute -bottom-1 left-0 h-3 w-full overflow-visible text-secondary"
    >
      <path d="M4 13 C58 5, 142 5, 196 13" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M10 17 C64 11, 136 11, 190 17" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
    </svg>
  </span>
);

export default SectionTitleAccent;
