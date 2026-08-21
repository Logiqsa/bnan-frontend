import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Render an off-screen DOM node to a PDF Blob (landscape A4).
 */
export async function renderNodeToPdfBlob(node: HTMLElement): Promise<Blob> {
  // Make sure all webfonts (Cairo / Pinyon Script) are fully loaded before capture,
  // otherwise html2canvas falls back to a non-Arabic-shaping font and letters
  // render disconnected (broken Arabic).
  if ((document as any).fonts?.ready) {
    try { await (document as any).fonts.ready; } catch {}
  }
  // Tiny extra tick so the browser flushes any pending text shaping.
  await new Promise((r) => setTimeout(r, 50));

  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });
  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  // Fit image into page preserving aspect ratio
  const imgRatio = canvas.width / canvas.height;
  const pageRatio = pageW / pageH;
  let drawW = pageW, drawH = pageH;
  if (imgRatio > pageRatio) {
    drawH = pageW / imgRatio;
  } else {
    drawW = pageH * imgRatio;
  }
  const x = (pageW - drawW) / 2;
  const y = (pageH - drawH) / 2;
  pdf.addImage(imgData, "JPEG", x, y, drawW, drawH);
  return pdf.output("blob");
}
