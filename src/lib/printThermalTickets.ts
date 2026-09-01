import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { createElement } from "react";
import { toast } from "sonner";
import { ThermalTicketPrint, type ThermalTicket } from "@/components/ThermalTicketPrint";

let printRootEl: HTMLDivElement | null = null;
let reactRoot: Root | null = null;

function cleanupPrintRoot() {
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
  if (printRootEl?.parentNode) {
    printRootEl.parentNode.removeChild(printRootEl);
  }
  printRootEl = null;
}

function assertTicketDomCount(expected: number): boolean {
  const count = document.querySelectorAll("#print-root .ticket").length;
  console.log(`[Print] DOM ticket count: ${count}, expected: ${expected}`);
  if (count !== expected) {
    const message = `Erreur d'impression: ${count} étiquette(s) DOM trouvée(s), ${expected} attendue(s). Impression annulée.`;
    toast.error(message);
    cleanupPrintRoot();
    return false;
  }
  return true;
}

export function printThermalTickets(tickets: ThermalTicket[]): void {
  if (tickets.length === 0) {
    toast.error("Aucune étiquette à imprimer");
    return;
  }

  cleanupPrintRoot();

  printRootEl = document.createElement("div");
  printRootEl.id = "print-root";
  document.body.appendChild(printRootEl);

  reactRoot = createRoot(printRootEl);
  flushSync(() => {
    reactRoot?.render(createElement(ThermalTicketPrint, { tickets }));
  });

  requestAnimationFrame(() => {
    if (!assertTicketDomCount(tickets.length)) {
      return;
    }

    const onAfterPrint = () => {
      window.removeEventListener("afterprint", onAfterPrint);
      cleanupPrintRoot();
    };
    window.addEventListener("afterprint", onAfterPrint);

    window.print();

    setTimeout(() => {
      cleanupPrintRoot();
    }, 3000);
  });
}

export type { ThermalTicket };
