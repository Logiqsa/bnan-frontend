import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_TIME_ZONE, detectTimeZone, installUserTimeZoneFormatting, restoreNativeTimeZoneFormatting, TIME_ZONE_STORAGE_KEY } from "./TimeZoneContext";

afterEach(() => {
  restoreNativeTimeZoneFormatting();
  window.localStorage.clear();
});

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

describe("site-wide time zone formatting", () => {
  it("uses the saved user zone for Intl and Date locale formatting", () => {
    window.localStorage.setItem(TIME_ZONE_STORAGE_KEY, "Africa/Cairo");
    installUserTimeZoneFormatting();
    const value = new Date("2026-01-01T21:30:00.000Z");

    expect(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(value)).toBe("23:30");
    expect(value.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })).toBe("23:30");
    expect(value.toLocaleString("en-GB")).toContain("23:30");

    window.localStorage.setItem(TIME_ZONE_STORAGE_KEY, "Asia/Riyadh");
    expect(value.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })).toBe("00:30");
  });

  it("does not override an explicitly requested source zone", () => {
    window.localStorage.setItem(TIME_ZONE_STORAGE_KEY, "Asia/Riyadh");
    installUserTimeZoneFormatting();
    const value = new Date("2026-01-01T21:30:00.000Z");

    expect(new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(value)).toBe("21:30");
  });
});
