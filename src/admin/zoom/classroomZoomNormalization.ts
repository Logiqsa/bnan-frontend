export type IdReference = string | { id?: string; _id?: string; name?: string } | null | undefined;
export type ZoomAccountReference = string | { id?: string; _id?: string; name?: string } | null | undefined;

export interface ZoomStateSource {
  zoomAccount?: ZoomAccountReference;
  zoomMeetingId?: string | null;
  meetingLink?: string | null;
  zoomProvisioning?: { status?: string | null } | null;
  provisioningStatus?: string | null;
  zoomMeeting?: {
    zoomAccount?: ZoomAccountReference;
    zoomMeetingId?: string | null;
    meetingLink?: string | null;
    provisioningStatus?: string | null;
    status?: string | null;
    link?: string | null;
    url?: string | null;
  } | null;
}

export const referenceId = (value: IdReference) =>
  typeof value === "string" ? value : value?.id || value?._id || "";

export const referenceName = (value: IdReference) =>
  typeof value === "string" ? "" : value?.name || "";

export const normalizeZoomState = (classroom?: ZoomStateSource | null) => {
  const nested = classroom?.zoomMeeting;
  const account = nested?.zoomAccount ?? classroom?.zoomAccount;
  return {
    accountId: referenceId(account),
    accountName: referenceName(account),
    meetingId: nested?.zoomMeetingId || classroom?.zoomMeetingId || "",
    meetingLink: nested?.meetingLink || nested?.link || nested?.url || classroom?.meetingLink || "",
    provisioningStatus: nested?.provisioningStatus || nested?.status || classroom?.zoomProvisioning?.status || classroom?.provisioningStatus || "",
  };
};

export const hasCompleteZoomMeeting = (classroom?: ZoomStateSource | null) => {
  const state = normalizeZoomState(classroom);
  return Boolean(state.accountId && state.meetingId && state.meetingLink);
};

export const hasZoomMeetingLink = (classroom?: ZoomStateSource | null) =>
  Boolean(normalizeZoomState(classroom).meetingLink);

export const zoomDisplayState = (classroom?: ZoomStateSource | null) => {
  if (hasZoomMeetingLink(classroom)) return "ready" as const;
  const status = normalizeZoomState(classroom).provisioningStatus;
  if (status === "creating" || status === "failed") return status;
  return "unlinked" as const;
};
