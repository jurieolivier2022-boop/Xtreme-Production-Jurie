import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Job, Quote, Client, CompanySettings, QuoteItem } from '../types';

// Extend jsPDF with autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
};

const addHeader = (doc: jsPDF, company: CompanySettings | undefined, title: string, number: string) => {
  // Logo area
  if (company?.logoUrl) {
    try {
      // Attempt to add the image. We specify 'PNG' as a default format hint.
      // Positioned at top left.
      doc.addImage(company.logoUrl, 'PNG', 15, 12, 35, 18, undefined, 'FAST');
    } catch (e) {
      // Fallback to text if image fails
      doc.setFontSize(22);
      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'bold');
      doc.text(company?.name || 'DYNAMIC PRINT HUB', 15, 25);
    }
  } else {
    doc.setFontSize(22);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.text(company?.name || 'DYNAMIC PRINT HUB', 15, 25);
  }

  // Company Details (Left) - Always show text details below logo area
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.setFont('helvetica', 'normal');
  let y = 35; // Start below the logo (which is 12+18=30)
  
  if (company) {
    if (company.registrationNumber) {
      doc.text(`Company ID : ${company.registrationNumber}`, 15, y);
      y += 4;
    }
    doc.text(company.address || '', 15, y);
    y += 4;
    if (company.vatNumber) {
      doc.text(`VAT ${company.vatNumber}`, 15, y);
      y += 4;
    }
    doc.text(company.phone || '', 15, y);
    y += 4;
    doc.text(company.email || '', 15, y);
    y += 4;
    if (company.website) {
      doc.text(company.website, 15, y);
    }
  }

  // Title (Right)
  doc.setFontSize(32);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 195, 25, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`# ${number}`, 195, 33, { align: 'right' });
};

const addFooter = (doc: jsPDF) => {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 280, 195, 280);
    doc.text(`${i}`, 195, 285, { align: 'right' });
  }
};

export const generateJobCardPDF = (job: Job, client: Client | undefined, company: CompanySettings | undefined) => {
  const doc = new jsPDF();

  addHeader(doc, company, 'Job Card', job.jobNumber);

  // Bill To / Date section
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('Job For', 15, 75);
  doc.text('Job Date :', 140, 75);

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(client?.companyName || client?.name || job.clientName, 15, 80);
  doc.text(new Date(job.createdAt).toLocaleDateString('en-ZA'), 195, 75, { align: 'right' });
  doc.text(`Due Date: ${new Date(job.dueDate).toLocaleDateString('en-ZA')}`, 140, 80);

  // Items Table
  const tableData = (job.items || []).map((item, idx) => [
    (idx + 1).toString(),
    item.description,
    item.length?.toString() || '-',
    item.width?.toString() || '-',
    item.type || '-',
    item.quantity.toString(),
    formatCurrency(item.unitCost).replace('ZAR', '').trim(),
    '0.00%',
    '15.00',
    formatCurrency(item.totalPrice * 0.15).replace('ZAR', '').trim(),
    formatCurrency(item.totalPrice).replace('ZAR', '').trim()
  ]);

  autoTable(doc, {
    startY: 90,
    head: [['#', 'Item & Description', 'Length_mm', 'Width_mm', 'Type', 'Qty', 'Rate', 'Disc', 'VAT %', 'VAT', 'Amount']],
    body: tableData,
    headStyles: { fillColor: [31, 41, 55], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 'auto' },
      10: { halign: 'right' }
    },
    theme: 'striped'
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;

  // Production Details
  if (job.ncrDetails) {
    if (finalY > 230) { doc.addPage(); finalY = 20; }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('NCR PRODUCTION DETAILS', 15, finalY);
    doc.setDrawColor(200, 200, 200);
    doc.line(15, finalY + 2, 195, finalY + 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    finalY += 8;
    doc.text(`Paper Colors: ${job.ncrDetails.paperColors}`, 15, finalY);
    finalY += 5;
    doc.text(`Numbering: ${job.ncrDetails.startNumber} to ${job.ncrDetails.endNumber}`, 15, finalY);
    finalY += 5;
    if (job.ncrDetails.perforationPosition) {
      doc.text(`Perforation: ${job.ncrDetails.perforationPosition}`, 15, finalY);
      finalY += 5;
    }
    if (job.ncrDetails.bindingType) {
      doc.text(`Binding: ${job.ncrDetails.bindingType} at ${job.ncrDetails.bindingPosition}`, 15, finalY);
      finalY += 5;
    }
  }

  addFooter(doc);
  return doc;
};

export const generateQuotePDF = (quote: Quote, client: Client | undefined, company: CompanySettings | undefined) => {
  const doc = new jsPDF();

  addHeader(doc, company, 'Quote', quote.quoteNumber);

  // Bill To / Date section
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('Bill To', 15, 75);
  doc.text('Quote Date :', 140, 75);

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(client?.companyName || client?.name || 'Valued Client', 15, 80);
  doc.text(new Date(quote.createdAt).toLocaleDateString('en-ZA'), 195, 75, { align: 'right' });

  // Items Table
  const tableData = quote.items.map((item, idx) => [
    (idx + 1).toString(),
    item.description,
    item.length?.toString() || '-',
    item.width?.toString() || '-',
    item.type || '-',
    item.quantity.toString(),
    formatCurrency(item.unitCost).replace('ZAR', '').trim(),
    '0.00%',
    '15.00',
    formatCurrency(item.totalPrice * 0.15).replace('ZAR', '').trim(),
    formatCurrency(item.totalPrice).replace('ZAR', '').trim()
  ]);

  autoTable(doc, {
    startY: 90,
    head: [['#', 'Item & Description', 'Length_mm', 'Width_mm', 'Type', 'Qty', 'Rate', 'Disc', 'VAT %', 'VAT', 'Amount']],
    body: tableData,
    headStyles: { fillColor: [31, 41, 55], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 'auto' },
      10: { halign: 'right' }
    },
    theme: 'striped'
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;

  // Totals Summary
  if (finalY > 230) { doc.addPage(); finalY = 20; }
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  
  const rightX = 195;
  const labelX = 160;

  doc.setFont('helvetica', 'normal');
  doc.text('Sub Total', labelX, finalY, { align: 'right' });
  doc.text(formatCurrency(quote.subtotal).replace('ZAR', '').trim(), rightX, finalY, { align: 'right' });
  finalY += 8;

  doc.text('Standard Rate (15%)', labelX, finalY, { align: 'right' });
  doc.text(formatCurrency(quote.vat).replace('ZAR', '').trim(), rightX, finalY, { align: 'right' });
  finalY += 8;

  // Total with Background
  doc.setFillColor(243, 244, 246); // gray-100
  doc.rect(130, finalY - 5, 75, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Total', 160, finalY + 2.5, { align: 'right' });
  doc.text(formatCurrency(quote.total), rightX, finalY + 2.5, { align: 'right' });
  finalY += 25;

  // VAT Summary
  if (finalY > 230) { doc.addPage(); finalY = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('VAT Summary', 15, finalY);
  finalY += 5;

  autoTable(doc, {
    startY: finalY,
    head: [['VAT Details', 'Taxable Amount (R)', 'VAT Amount (R)']],
    body: [
      ['Standard Rate (15%)', formatCurrency(quote.subtotal).replace('ZAR', '').trim(), formatCurrency(quote.vat).replace('ZAR', '').trim()],
      ['Total', formatCurrency(quote.subtotal).replace('ZAR', '').trim(), formatCurrency(quote.vat).replace('ZAR', '').trim()]
    ],
    headStyles: { fillColor: [31, 41, 55], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 15, right: 15 },
    theme: 'striped'
  });

  finalY = (doc as any).lastAutoTable.finalY + 15;

  // Notes & Banking
  if (finalY > 240) { doc.addPage(); finalY = 20; }
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Notes', 15, finalY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  finalY += 5;
  doc.text('Banking Details:', 15, finalY);
  finalY += 4;
  doc.text(company?.name || 'Dynamic Print Hub', 15, finalY);
  if (company?.bankName) {
    finalY += 4;
    doc.text(company.bankName, 15, finalY);
  }
  if (company?.branchCode) {
    finalY += 4;
    doc.text(`Branch: ${company.branchCode}`, 15, finalY);
  }
  if (company?.accountNumber) {
    finalY += 4;
    doc.text(`Account No: ${company.accountNumber}`, 15, finalY);
  }
  if (company?.vatNumber) {
    finalY += 4;
    doc.text(`VAT: ${company.vatNumber}`, 15, finalY);
  }

  // Terms & Conditions Page
  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Terms & Conditions', 15, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const termsText = [
    'Lead Time on standard orders is 3-5 business days. Litho and Large signs 10-15 business days. All COD orders require a mandatory 70% deposit of total order value. Deposit is payable on acceptance of quote and the outstanding balance prior to collection. Orders requiring overtime (weekends and public holidays) will be charged accordingly.'
  ];
  doc.text(termsText, 15, 30, { maxWidth: 180 });

  addFooter(doc);
  return doc;
};
