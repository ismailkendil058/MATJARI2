import JsBarcode from "jsbarcode";

const MM_TO_PX = 96 / 25.4;

function mmToPx(mm: number): number {
  return mm * MM_TO_PX;
}

type BarcodeFitOptions = {
  maxWidthMm?: number;
  maxHeightMm?: number;
};

/**
 * Generates a CODE128 SVG scaled to fit inside the ticket's printable area.
 * Module width is reduced iteratively until the native SVG width fits maxWidthMm.
 */
export function generateBarcodeSvgMarkup(
  value: string,
  options: BarcodeFitOptions = {}
): string {
  if (!value) return "";

  const maxWidthMm = options.maxWidthMm ?? TICKET_CONTENT_WIDTH_MM;
  const maxHeightMm = options.maxHeightMm ?? 9;
  const maxWidthPx = mmToPx(maxWidthMm);
  const barHeightPx = Math.max(14, Math.round(mmToPx(maxHeightMm) * 0.9));
  const quietZonePx = Math.max(1, Math.round(mmToPx(BARCODE_QUIET_ZONE_MM)));

  try {
    const barcodeFn = typeof JsBarcode === "function" ? JsBarcode : (JsBarcode as any)?.default;
    if (!barcodeFn) return "";

    let svgEl: SVGSVGElement | null = null;

    for (let moduleWidth = 1.2; moduleWidth >= 0.35; moduleWidth -= 0.05) {
      const candidate = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      barcodeFn(candidate, value, {
        format: "CODE128",
        width: moduleWidth,
        height: barHeightPx,
        displayValue: false,
        margin: quietZonePx,
      });

      svgEl = candidate;
      const nativeW = parseFloat(candidate.getAttribute("width") || "9999");
      if (nativeW <= maxWidthPx) {
        break;
      }
    }

    if (!svgEl) return "";

    const nativeW = svgEl.getAttribute("width") || "100";
    const nativeH = svgEl.getAttribute("height") || `${barHeightPx}`;
    svgEl.setAttribute("viewBox", `0 0 ${nativeW} ${nativeH}`);
    svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svgEl.removeAttribute("width");
    svgEl.removeAttribute("height");
    svgEl.setAttribute(
      "style",
      [
        "display:block",
        "width:100%",
        `max-width:${maxWidthMm}mm`,
        "height:auto",
        `max-height:${maxHeightMm}mm`,
        "overflow:hidden",
      ].join(";")
    );

    return svgEl.outerHTML;
  } catch (e) {
    console.error("Barcode SVG generation error:", e);
  }

  return "";
}

export const TICKET_WIDTH_MM = 40;
export const TICKET_HEIGHT_MM = 20;
export const TICKET_SAFE_MARGIN_MM = 2;
/** Usable width after the required 2mm safe margin on both sides. */
export const TICKET_CONTENT_WIDTH_MM = TICKET_WIDTH_MM - TICKET_SAFE_MARGIN_MM * 2;
/** Usable height after the required 2mm safe margin on the top and bottom. */
export const TICKET_CONTENT_HEIGHT_MM = TICKET_HEIGHT_MM - TICKET_SAFE_MARGIN_MM * 2;
/** Space kept either side of the bars inside the barcode SVG. */
export const BARCODE_QUIET_ZONE_MM = 0.5;
/** Max vertical space reserved for barcode bars within the 16mm content area. */
export const TICKET_BARCODE_MAX_HEIGHT_MM = 9;
