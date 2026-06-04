import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

/**
 * Captures a DOM element using html2canvas and returns a jsPDF A4 document.
 * Uses a ref directly — no cloning, no getElementById.
 */
export async function generatePDFFromRef(
  element: HTMLElement,
): Promise<jsPDF | null> {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight,
      imageTimeout: 0,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageWidth  = 210;
    const pageHeight = 297;
    const imgHeight  = (canvas.height * pageWidth) / canvas.width;

    let y = 0;
    while (y < imgHeight) {
      if (y > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, -y, pageWidth, imgHeight);
      y += pageHeight;
    }

    return pdf;
  } catch (error) {
    console.error('PDF generation failed:', error);
    alert(`PDF error: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/** Download PDF as a file */
export async function downloadPDF(element: HTMLElement, filename: string): Promise<void> {
  const pdf = await generatePDFFromRef(element);
  if (pdf) pdf.save(filename);
}

/** Open PDF in new tab (for printing via browser PDF viewer) */
export async function printPDF(element: HTMLElement): Promise<void> {
  const pdf = await generatePDFFromRef(element);
  if (!pdf) return;
  const url = pdf.output('bloburl');
  const win = window.open(url as unknown as string, '_blank');
  if (win) win.focus();
}
