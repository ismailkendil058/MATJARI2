import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export function BarcodeSvg({ value, width = 1.5, height = 40 }: { value: string; width?: number; height?: number }) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        const barcodeFn = typeof JsBarcode === "function" ? JsBarcode : (JsBarcode as any)?.default;
        if (barcodeFn) {
          barcodeFn(svgRef.current, value, {
            format: "CODE128",
            width,
            height,
            displayValue: false,
            margin: 0,
          });
          const svgEl = svgRef.current;
          const wAttr = svgEl.getAttribute("width") || "200";
          const hAttr = svgEl.getAttribute("height") || `${height}`;
          svgEl.setAttribute("viewBox", `0 0 ${wAttr} ${hAttr}`);
          svgEl.removeAttribute("width");
          svgEl.removeAttribute("height");
          svgEl.setAttribute("style", "width:100%;height:100%;max-width:100%;max-height:100%;display:block;object-fit:contain;");
        }
      } catch (e) {
        console.error("Barcode rendering error:", e);
      }
    }
  }, [value, width, height]);

  return <svg ref={svgRef} style={{ width: "100%", height: "100%", maxWidth: "100%", display: "block" }} />;
}
