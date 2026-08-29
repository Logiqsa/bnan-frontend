import { describe, expect, it } from "vitest";
import { hasCompleteZoomMeeting, hasZoomMeetingLink, referenceId, zoomDisplayState } from "./classroomZoomNormalization";

describe("classroom Zoom normalization", () => {
  it("accepts string and populated IDs", () => {
    expect(referenceId("account-id")).toBe("account-id");
    expect(referenceId({ _id: "mongo-id" })).toBe("mongo-id");
    expect(referenceId({ id: "json-id" })).toBe("json-id");
  });

  it("treats a legacy complete meeting as ready without provisioning metadata", () => {
    const classroom = { zoomAccount: "account-id", zoomMeetingId: "meeting-id", meetingLink: "https://zoom.test/meeting" };
    expect(hasCompleteZoomMeeting(classroom)).toBe(true);
    expect(zoomDisplayState(classroom)).toBe("ready");
  });

  it("prioritizes complete meetings over stale provisioning state", () => {
    const classroom = { zoomAccount: { id: "account-id", name: "Zoom 1" }, zoomMeetingId: "meeting-id", meetingLink: "https://zoom.test/meeting", zoomProvisioning: { status: "failed" } };
    expect(zoomDisplayState(classroom)).toBe("ready");
  });

  it("uses provisioning state only for incomplete meetings", () => {
    expect(zoomDisplayState({ zoomProvisioning: { status: "creating" } })).toBe("creating");
    expect(zoomDisplayState({ zoomProvisioning: { status: "failed" } })).toBe("failed");
    expect(zoomDisplayState({ zoomMeetingId: "partial" })).toBe("unlinked");
  });

  it("treats an existing meeting link as linked while keeping complete-meeting validation strict", () => {
    const classroom = { meetingLink: "https://zoom.test/existing" };
    expect(hasZoomMeetingLink(classroom)).toBe(true);
    expect(hasCompleteZoomMeeting(classroom)).toBe(false);
    expect(zoomDisplayState(classroom)).toBe("ready");
  });
});
