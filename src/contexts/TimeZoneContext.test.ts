import { describe, expect, it } from "vitest";
import { DEFAULT_TIME_ZONE, detectTimeZone } from "./TimeZoneContext";

describe("detectTimeZone", () => {
  it.each([
    ["Asia/Riyadh", "ar-SA", "Asia/Riyadh"],
    ["Africa/Cairo", "ar-EG", "Africa/Cairo"],
    ["Asia/Qatar", "ar-QA", "Asia/Qatar"],
    ["Asia/Bahrain", "ar-BH", "Asia/Bahrain"],
    ["Asia/Dubai", "ar-AE", "Asia/Dubai"],
  ])("uses a supported browser zone %s", (zone, locale, expected) => {
    expect(detectTimeZone(zone, locale)).toBe(expected);
  });

  it("falls back to the locale country when the browser zone is unsupported", () => {
    expect(detectTimeZone("Europe/London", "ar-EG")).toBe("Africa/Cairo");
  });

  it("keeps Riyadh as the safe default for an unknown region", () => {
    expect(detectTimeZone("Europe/London", "en-GB")).toBe(DEFAULT_TIME_ZONE);
  });
});
