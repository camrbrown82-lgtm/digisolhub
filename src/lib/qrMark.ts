import QRCode from "qrcode";

/** A real QR code. Image models draw codes that do not scan. */
export function renderQrPng(url: string, size = 640) {
  return QRCode.toBuffer(url, {
    type: "png",
    width: size,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#111111", light: "#ffffff" },
  });
}
