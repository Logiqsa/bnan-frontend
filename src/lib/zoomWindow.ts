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
    // Reserve the window during the click gesture so browsers do not block
    // it after the async start request, but never leave the teacher staring
    // at a blank white page while that request is in flight.
    popup.document.body.innerHTML = `
      <main style="margin:0;min-height:100vh;display:grid;place-items:center;background:#f8fafc;color:#10244b;font-family:system-ui,sans-serif">
        <section style="text-align:center;padding:24px">
          <div style="width:34px;height:34px;margin:0 auto 16px;border:4px solid #dbeafe;border-top-color:#10244b;border-radius:50%;animation:bnan-spin .8s linear infinite"></div>
          <strong>Opening Zoom…</strong>
          <p style="margin:8px 0 0;color:#64748b;font-size:14px">Please wait while we securely start the lesson.</p>
        </section>
      </main>
      <style>@keyframes bnan-spin { to { transform: rotate(360deg) } }</style>`;
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
