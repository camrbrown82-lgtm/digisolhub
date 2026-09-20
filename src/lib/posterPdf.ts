import { PDFDocument } from "pdf-lib";

export async function posterSlidesToPdf(images: Buffer[]) {
  const pdf = await PDFDocument.create();
  for (const image of images) {
    let embedded;
    try {
      embedded = await pdf.embedPng(image);
    } catch {
      embedded = await pdf.embedJpg(image);
    }
    const page = pdf.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: embedded.width,
      height: embedded.height,
    });
  }
  return Buffer.from(await pdf.save());
}
