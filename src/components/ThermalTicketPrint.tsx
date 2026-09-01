import { formatDZD } from "@/lib/store";
import {
  generateBarcodeSvgMarkup,
  TICKET_BARCODE_MAX_HEIGHT_MM,
  TICKET_CONTENT_WIDTH_MM,
  TICKET_HEIGHT_MM,
  TICKET_SAFE_MARGIN_MM,
  TICKET_WIDTH_MM,
} from "@/lib/thermalBarcode";

export type ThermalTicket = {
  name: string;
  price: number;
  barcode: string;
};

/**
 * Global print CSS — defined once, not per ticket.
 * WebView2: page-break-* is the safer primary; break-* added as modern alias.
 */
export const THERMAL_PRINT_CSS = `
@page {
  size: ${TICKET_WIDTH_MM}mm ${TICKET_HEIGHT_MM}mm;
  margin: 0;
}

#print-root {
  position: fixed;
  left: -9999px;
  top: 0;
  width: 0;
  height: 0;
  overflow: hidden;
  margin: 0;
  padding: 0;
}

.print-area {
  margin: 0;
  padding: 0;
  width: ${TICKET_WIDTH_MM}mm;
}

.ticket {
  width: ${TICKET_WIDTH_MM}mm;
  height: ${TICKET_HEIGHT_MM}mm;
  max-width: ${TICKET_WIDTH_MM}mm;
  max-height: ${TICKET_HEIGHT_MM}mm;
  overflow: hidden !important;
  box-sizing: border-box;
  margin: 0;
  padding: ${TICKET_SAFE_MARGIN_MM}mm;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-between;
  font-family: Arial, Helvetica, sans-serif;
  background: #fff;
  color: #000;
  position: relative;
  left: auto;
  right: auto;
  transform: none;
  isolation: isolate;
  contain: layout style paint;
}

.ticket-name {
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;
  transform: none;
  text-align: center;
  line-height: 1.1;
  flex-shrink: 0;
}

.ticket-price {
  font-size: 9px;
  font-weight: 900;
  text-align: center;
  line-height: 1.1;
  flex-shrink: 0;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;
  transform: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ticket-barcode {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin: 0;
  padding: 0;
  transform: none;
}

.ticket-barcode svg {
  display: block;
  width: 100%;
  max-width: ${TICKET_CONTENT_WIDTH_MM}mm;
  height: auto;
  max-height: ${TICKET_BARCODE_MAX_HEIGHT_MM}mm;
  overflow: hidden;
  transform: none;
}

.ticket-barcode-value {
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  color: #000;
  font-family: "Courier New", Courier, monospace;
  font-size: 8px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.2px;
  text-align: center;
  white-space: nowrap;
  transform: none;
}

@media print {
  #print-root {
    position: absolute;
    left: 0;
    top: 0;
    width: auto;
    height: auto;
    overflow: visible;
  }

  body * {
    visibility: hidden;
  }

  .print-area,
  .print-area * {
    visibility: visible;
  }

  .print-area {
    position: absolute;
    top: 0;
    left: 0;
    width: ${TICKET_WIDTH_MM}mm;
    overflow: hidden;
  }

  .ticket {
    display: flex;
    flex-direction: column;
    width: ${TICKET_WIDTH_MM}mm;
    height: ${TICKET_HEIGHT_MM}mm;
    max-width: ${TICKET_WIDTH_MM}mm;
    max-height: ${TICKET_HEIGHT_MM}mm;
    overflow: hidden !important;
    box-sizing: border-box;
    padding: ${TICKET_SAFE_MARGIN_MM}mm;
    page-break-after: always;
    page-break-inside: avoid;
    break-after: page;
    break-inside: avoid;
  }

  .ticket:last-child {
    page-break-after: auto;
    break-after: auto;
  }
}
`;

type Props = {
  tickets: ThermalTicket[];
};

export function ThermalTicketPrint({ tickets }: Props) {
  return (
    <>
      <style>{THERMAL_PRINT_CSS}</style>
      <div className="print-area">
        {tickets.map((ticket, index) => (
          <div className="ticket" key={`${ticket.barcode}-${index}`}>
            <span className="ticket-name">{ticket.name}</span>
            {ticket.price > 0 && (
              <span className="ticket-price">{formatDZD(ticket.price)}</span>
            )}
            <div
              className="ticket-barcode"
              dangerouslySetInnerHTML={{
                __html: generateBarcodeSvgMarkup(ticket.barcode, {
                  maxWidthMm: TICKET_CONTENT_WIDTH_MM,
                  maxHeightMm: TICKET_BARCODE_MAX_HEIGHT_MM,
                }),
              }}
            />
            <span className="ticket-barcode-value">{ticket.barcode}</span>
          </div>
        ))}
      </div>
    </>
  );
}
