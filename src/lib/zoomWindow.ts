/**
 * Reserve a tab while the click is still a user gesture. Browsers commonly
 * block window.open when it runs after an awaited Start/entry API request.
 * The opener is removed before navigating to the provider URL.
 */
export const reserveZoomWindow = () => {
  const popup = window.open("about:blank", "_blank");
  if (popup) {
    popup.opener = null;
    popup.document.title = "BNAN Zoom";
  }
  return popup;
};

export const navigateReservedZoomWindow = (
  popup: Window | null,
  url: string,
) => {
  if (popup && !popup.closed) {
    popup.location.replace(url);
    return true;
  }
  return Boolean(window.open(url, "_blank", "noopener,noreferrer"));
};

export const closeReservedZoomWindow = (popup: Window | null) => {
  if (popup && !popup.closed) popup.close();
};
