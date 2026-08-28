import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface ExportZone {
  id: number;
  label: string;
  type: string;
  note: string;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Genera y descarga un archivo PDF con formularios interactivos reales AcroForms usando pdf-lib.
 */
export async function generateInteractiveAcroFormPdf(
  fileName: string,
  zones: ExportZone[],
  printedLines: string[],
  totalPages: number = 1
): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const form = pdfDoc.getForm();

  const pagesCount = Math.max(1, Math.min(totalPages, 10));

  for (let p = 1; p <= pagesCount; p++) {
    const page = pdfDoc.addPage([595.28, 841.89]); // Tamaño A4 (puntos)
    const { height } = page.getSize();

    // Encabezado del documento
    page.drawText(`DocScan Inteligente · ${fileName}`, {
      x: 40,
      y: height - 40,
      size: 14,
      font: boldFont,
      color: rgb(0.12, 0.16, 0.23),
    });

    page.drawText(`Página ${p} de ${pagesCount} · Apariencia y Formato Preservados`, {
      x: 40,
      y: height - 56,
      size: 9,
      font,
      color: rgb(0.4, 0.45, 0.55),
    });

    page.drawLine({
      start: { x: 40, y: height - 64 },
      end: { x: 555, y: height - 64 },
      thickness: 1,
      color: rgb(0.8, 0.85, 0.9),
    });

    // Líneas de texto impreso
    let currentY = height - 90;
    const pagePrinted = printedLines.length > 0 ? printedLines.slice(0, 12) : [
      'DECÁLOGO SOBRE EL ACCESO A LOS DOCUMENTOS EN ARCHIVOS PÚBLICOS',
      'Mesa de Trabajo de Archivos de la Administración Local (MTAAL)',
      'Texto normativo impreso original de conservación permanente.'
    ];

    pagePrinted.forEach((line) => {
      if (currentY > 100) {
        page.drawText(line.slice(0, 85), {
          x: 40,
          y: currentY,
          size: 10,
          font,
          color: rgb(0.2, 0.25, 0.3),
        });
        currentY -= 18;
      }
    });

    // Zonas editables y texto estático asignados a esta página
    const currentZones = zones.filter((z) => z.page === p || (p === 1 && !z.page));

    currentZones.forEach((z) => {
      const fieldX = 40 + Math.max(0, Math.min(420, (z.x / 100) * 500));
      const fieldY = Math.max(60, height - 120 - Math.min(650, (z.y / 100) * 700));

      if (z.type === 'Estatico') {
        page.drawRectangle({
          x: fieldX,
          y: fieldY - 5,
          width: Math.max(120, (z.w / 100) * 450),
          height: 22,
          color: rgb(0.92, 0.97, 0.94),
          borderColor: rgb(0.1, 0.6, 0.35),
          borderWidth: 1,
        });
        page.drawText(`🔒 ${z.label}`, {
          x: fieldX + 6,
          y: fieldY + 2,
          size: 9,
          font: boldFont,
          color: rgb(0.05, 0.45, 0.25),
        });
      } else if (z.type === 'Fecha') {
        const textField = form.createTextField(`fecha_p${p}_${z.id}`);
        textField.setText('2024-09-23');
        textField.addToPage(page, {
          x: fieldX,
          y: fieldY,
          width: Math.max(120, (z.w / 100) * 350),
          height: 22,
        });
      } else if (z.type === 'Casilla') {
        const checkBox = form.createCheckBox(`casilla_p${p}_${z.id}`);
        checkBox.check();
        checkBox.addToPage(page, {
          x: fieldX,
          y: fieldY,
          width: 18,
          height: 18,
        });
        page.drawText(z.label, {
          x: fieldX + 24,
          y: fieldY + 3,
          size: 9,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
      } else {
        const textField = form.createTextField(`campo_p${p}_${z.id}`);
        textField.setText(`[ ${z.label} ]`);
        textField.addToPage(page, {
          x: fieldX,
          y: fieldY,
          width: Math.max(160, (z.w / 100) * 450),
          height: 24,
        });
      }
    });

    page.drawText(`DocScan Inteligente · PDF Interactivo AcroForm`, {
      x: 40,
      y: 30,
      size: 8,
      font,
      color: rgb(0.6, 0.65, 0.7),
    });
  }

  // Guardar binario PDF y desencadenar descarga
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Plantilla_Editable_${fileName.replace(/\.[^/.]+$/, '')}.pdf`;
  link.click();
}
