import { describe, expect, it } from "vitest";
import { displayWeeklySlot } from "@/lib/weeklyScheduleTime";

const slot = { day: "monday" as const, startTime: "17:00", endTime: "18:00" };
const monday = new Date("2026-11-02T12:00:00.000Z");

describe("displayWeeklySlot", () => {
  it("converts a Riyadh weekly slot for a Cairo viewer", () => {
    expect(displayWeeklySlot(slot, "Asia/Riyadh", "Africa/Cairo", monday)).toMatchObject({
      day: "monday",
      startTime: "16:00",
      endTime: "17:00",
    });
  });

  it("converts a Cairo weekly slot for a Riyadh viewer", () => {
    expect(displayWeeklySlot(slot, "Africa/Cairo", "Asia/Riyadh", monday)).toMatchObject({
      day: "monday",
      startTime: "18:00",
      endTime: "19:00",
    });
  });

  it("keeps source values when both time zones match", () => {
    expect(displayWeeklySlot(slot, "Asia/Riyadh", "Asia/Riyadh", monday)).toEqual(slot);
  });
});
