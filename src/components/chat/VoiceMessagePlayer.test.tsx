import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/i18n/LanguageContext";
import VoiceMessagePlayer from "./VoiceMessagePlayer";

describe("VoiceMessagePlayer", () => {
  it("does not download or decode audio while rendering the conversation", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { container } = render(<LanguageProvider><VoiceMessagePlayer src="https://example.com/voice.mp3" /></LanguageProvider>);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(container.querySelector("audio")).toHaveAttribute("preload", "none");
    expect(screen.getByRole("button", { name: "تشغيل الصوت" })).toBeInTheDocument();
    fetchSpy.mockRestore();
  });
});
