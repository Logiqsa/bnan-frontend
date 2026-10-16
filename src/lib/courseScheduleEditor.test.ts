import { describe, expect, it, vi } from "vitest";
import {
  hasLegacyCourseScheduleSlots,
  newEditableCourseScheduleSlot,
  serializeCourseScheduleSlots,
  toEditableCourseScheduleSlots,
} from "./courseScheduleEditor";

describe("course schedule slot identity helpers", () => {
  it("round-trips identified slots and removes only the UI key", () => {
    const slots = toEditableCourseScheduleSlots([{ slotId: "csl_abcdefghijklmnopqrstuv", day: "sunday", startTime: "18:00", endTime: "19:00" }]);
    slots[0] = { ...slots[0], startTime: "18:30" };
    expect(serializeCourseScheduleSlots(slots)).toEqual([{ slotId: "csl_abcdefghijklmnopqrstuv", day: "sunday", startTime: "18:30", endTime: "19:00" }]);
  });

  it("never generates or sends a slotId for a new slot", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "client-only-key" });
    const slot = newEditableCourseScheduleSlot({ day: "monday", startTime: "10:00", endTime: "11:00" });
    expect(slot.clientKey).toBe("client-only-key");
    expect(slot).not.toHaveProperty("slotId");
    expect(serializeCourseScheduleSlots([slot])).toEqual([{ day: "monday", startTime: "10:00", endTime: "11:00" }]);
    vi.unstubAllGlobals();
  });

  it("preserves identities through delete and reorder", () => {
    const rows = toEditableCourseScheduleSlots([
      { slotId: "csl_aaaaaaaaaaaaaaaaaaaaaa", day: "sunday", startTime: "10:00" },
      { slotId: "csl_bbbbbbbbbbbbbbbbbbbbbb", day: "monday", startTime: "11:00" },
      { slotId: "csl_cccccccccccccccccccccc", day: "tuesday", startTime: "12:00" },
    ]);
    const changed = [rows[2], rows[0]];
    expect(serializeCourseScheduleSlots(changed).map((slot) => slot.slotId)).toEqual([
      "csl_cccccccccccccccccccccc", "csl_aaaaaaaaaaaaaaaaaaaaaa",
    ]);
  });

  it("recognizes an ID-less legacy schedule without changing read data", () => {
    const slots = [{ day: "sunday" as const, startTime: "18:00" }];
    expect(hasLegacyCourseScheduleSlots(slots)).toBe(true);
    expect(toEditableCourseScheduleSlots(slots)[0]).toMatchObject(slots[0]);
  });
});
