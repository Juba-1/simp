import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

type PdfDoc = InstanceType<typeof PDFDocument>;

@Injectable()
export class PdfGeneratorService {
  createBuffer(build: (doc: PdfDoc) => void): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      build(doc);
      doc.end();
    });
  }

  drawHeader(doc: PdfDoc, title: string, subtitle?: string): void {
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('SIMP Platform', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(14).font('Helvetica-Bold').text(title);
    if (subtitle) {
      doc.fontSize(10).font('Helvetica').fillColor('#555555').text(subtitle);
      doc.fillColor('#000000');
    }
    doc.moveDown();
    this.drawRule(doc);
  }

  drawRule(doc: PdfDoc): void {
    const y = doc.y;
    doc
      .strokeColor('#cccccc')
      .moveTo(50, y)
      .lineTo(doc.page.width - 50, y)
      .stroke();
    doc.moveDown();
  }

  drawKeyValue(doc: PdfDoc, label: string, value: string): void {
    doc.font('Helvetica-Bold').fontSize(10).text(`${label}: `, {
      continued: true,
    });
    doc.font('Helvetica').text(value);
  }

  drawJsonSection(
    doc: PdfDoc,
    title: string,
    data: Record<string, unknown>,
  ): void {
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold').text(title);
    doc.moveDown(0.3);

    for (const [key, value] of Object.entries(data)) {
      const display =
        value === null || value === undefined
          ? '—'
          : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value);
      this.drawKeyValue(doc, key, display);
    }
  }
}
