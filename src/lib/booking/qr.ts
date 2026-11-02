import "server-only";

import QRCode from "qrcode";

/** Inline SVG QR for a ticket code. The payload is the ticket code only (no personal data). */
export async function ticketQrSvg(code: string) {
  return QRCode.toString(`TASTABLE:${code}`, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#1f1d1bff", light: "#fffdf9ff" },
  });
}
