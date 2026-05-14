import { Quote, Job, Client, CompanySettings, PurchaseOrder, Supplier } from '../types';

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(amount);
};

export const getWhatsAppUrl = (phone: string, message: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  // Ensure it has a country code, default to ZA (27) if it starts with 0
  const formattedPhone = cleanPhone.startsWith('0') ? '27' + cleanPhone.substring(1) : cleanPhone;
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
};

export const getEmailUrl = (email: string, subject: string, body: string) => {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

const replacePlaceholders = (template: string, replacements: Record<string, string>) => {
  let result = template;
  Object.entries(replacements).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  return result;
};

export const generateQuoteMessage = (quote: Quote, client: Client, company: CompanySettings | undefined, isWhatsapp = false) => {
  let baseUrl = process.env.APP_URL || window.location.origin;
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
  const companyName = company?.name || 'Dynamic Print Hub';
  const itemsSummary = quote.items.map(item => `- ${item.quantity}x ${item.description}: ${formatCurrency(item.totalPrice)}`).join('\n');
  const approvalUrl = `${baseUrl}/approval/q/${quote.id}`;
  const totalAmount = formatCurrency(quote.total);

  const template = isWhatsapp 
    ? (company?.quoteWhatsappTemplate || `Hi {{clientName}},\n\nHere is your quote {{quoteNumber}} from {{companyName}}.\n\nTotal: {{totalAmount}}\n\nView here: {{approvalUrl}}`)
    : (company?.quoteEmailTemplate || `Hi {{clientName}},\n\nHere is your quote {{quoteNumber}} from {{companyName}}.\n\nSummary:\n{{itemsSummary}}\n\nTotal: {{totalAmount}}\n\nYou can view and approve the quote here: {{approvalUrl}}\n\nRegards,\n{{companyName}}`);

  return replacePlaceholders(template, {
    clientName: client.name,
    quoteNumber: quote.quoteNumber,
    companyName,
    itemsSummary,
    totalAmount,
    approvalUrl
  });
};

export const generateJobMessage = (job: Job, client: Client, company: CompanySettings | undefined, isWhatsapp = false) => {
  let baseUrl = process.env.APP_URL || window.location.origin;
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
  const companyName = company?.name || 'Dynamic Print Hub';
  const trackingUrl = `${baseUrl}/approval/${job.id}`;
  const dueDate = new Date(job.dueDate).toLocaleDateString();

  const template = isWhatsapp
    ? (company?.jobWhatsappTemplate || `Hi {{clientName}},\n\nUpdate on your order {{jobNumber}} from {{companyName}}.\nStage: {{jobStage}}\nReady: {{dueDate}}\n\nTrack: {{trackingUrl}}`)
    : (company?.jobEmailTemplate || `Hi {{clientName}},\n\nUpdate on your order {{jobNumber}} from {{companyName}}:\n\nCurrent Stage: {{jobStage}}\nProduct: {{productName}}\nEstimated Completion: {{dueDate}}\n\nTrack your order status here: {{trackingUrl}}\n\nRegards,\n{{companyName}}`);

  return replacePlaceholders(template, {
    clientName: client.name,
    jobNumber: job.jobNumber,
    companyName,
    jobStage: job.stage,
    productName: job.productName,
    dueDate,
    trackingUrl
  });
};

export const generateArtworkApprovalMessage = (job: Job, client: Client, company: CompanySettings | undefined, isWhatsapp = false) => {
  let baseUrl = process.env.APP_URL || window.location.origin;
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
  const companyName = company?.name || 'Dynamic Print Hub';
  const approvalUrl = `${baseUrl}/approval/${job.id}`;

  const template = isWhatsapp
    ? (company?.artworkWhatsappTemplate || `Hi {{clientName}},\n\nYour artwork for order {{jobNumber}} is ready! 🎨\n\nView and approve here: {{approvalUrl}}`)
    : (company?.artworkEmailTemplate || `Hi {{clientName}},\n\nYour artwork for order {{jobNumber}} is ready for review!\n\nYou can view and approve the artwork here: {{approvalUrl}}\n\nPlease let us know if any changes are required.\n\nRegards,\n{{companyName}}`);

  return replacePlaceholders(template, {
    clientName: client.name,
    jobNumber: job.jobNumber,
    companyName,
    approvalUrl
  });
};

export const generatePOMessage = (po: PurchaseOrder, supplier: Supplier, company: CompanySettings | undefined) => {
  const companyName = company?.name || 'Dynamic Print Hub';
  
  return `Hi ${supplier.contactPerson || supplier.name},

Please find our Purchase Order ${po.poNumber} from ${companyName}.

Total Value: ${formatCurrency(po.totalCost)}
Order Date: ${new Date(po.orderDate).toLocaleDateString()}

Please acknowledge receipt and advise on delivery.

Regards,
${companyName}`;
};

export const shareViaWhatsApp = (type: 'quote' | 'job' | 'po' | 'artwork', data: Quote | Job | PurchaseOrder, contact: Client | Supplier, company: CompanySettings | undefined) => {
  let message = '';
  if (type === 'quote') message = generateQuoteMessage(data as Quote, contact as Client, company, true);
  else if (type === 'job') message = generateJobMessage(data as Job, contact as Client, company, true);
  else if (type === 'artwork') message = generateArtworkApprovalMessage(data as Job, contact as Client, company, true);
  else if (type === 'po') message = generatePOMessage(data as PurchaseOrder, contact as Supplier, company);
  
  if (!contact.phone) {
    alert('Contact does not have a phone number saved.');
    return;
  }
  
  window.open(getWhatsAppUrl(contact.phone, message), '_blank');
};

export const shareViaEmail = (type: 'quote' | 'job' | 'po' | 'artwork', data: Quote | Job | PurchaseOrder, contact: Client | Supplier, company: CompanySettings | undefined) => {
  let subject = '';
  let body = '';

  if (type === 'quote') {
    subject = `Quote ${(data as Quote).quoteNumber} from ${company?.name || 'Dynamic Print Hub'}`;
    body = generateQuoteMessage(data as Quote, contact as Client, company, false);
  } else if (type === 'job') {
    subject = `Job Update: ${(data as Job).jobNumber} - ${company?.name || 'Dynamic Print Hub'}`;
    body = generateJobMessage(data as Job, contact as Client, company, false);
  } else if (type === 'artwork') {
    subject = `Artwork Approval Required: ${(data as Job).jobNumber} - ${company?.name || 'Dynamic Print Hub'}`;
    body = generateArtworkApprovalMessage(data as Job, contact as Client, company, false);
  } else if (type === 'po') {
    subject = `Purchase Order ${(data as PurchaseOrder).poNumber} from ${company?.name || 'Dynamic Print Hub'}`;
    body = generatePOMessage(data as PurchaseOrder, contact as Supplier, company);
  }
    
  if (!contact.email) {
    alert('Contact does not have an email address saved.');
    return;
  }
  
  window.location.href = getEmailUrl(contact.email, subject, body);
};
