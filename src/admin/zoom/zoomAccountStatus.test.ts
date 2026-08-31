import { describe, expect, it } from "vitest";
import type { ZoomAccount } from "@/api/zoomAccountsApi";
import { getZoomAccountCounters, getZoomAccountStatus } from "./zoomAccountStatus";

const account = (isActive: boolean, isConfigured: boolean): ZoomAccount => ({
  id: `${isActive}-${isConfigured}`,
  name: "Zoom",
  isActive,
  isConfigured,
});

describe("Zoom account status", () => {
  it("uses backend activity and configuration fields as authoritative", () => {
    expect(getZoomAccountStatus(account(false, true))).toBe("inactive");
    expect(getZoomAccountStatus(account(true, true))).toBe("ready");
    expect(getZoomAccountStatus(account(true, false))).toBe("pending");
  });

  it("counts only active configured accounts as ready", () => {
    expect(getZoomAccountCounters([
      account(true, true), account(true, false), account(false, true), account(false, false),
    ])).toEqual({ total: 4, active: 2, ready: 1, pending: 2 });
  });
});
