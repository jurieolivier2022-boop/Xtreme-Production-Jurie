export type JobStage = 'Prepress' | 'Printing' | 'Laminating' | 'Finishing' | 'Quality Check' | 'Ready' | 'Delivered' | 'Cancelled' | 'Embroidery' | 'Screenprinting';
export type JobPriority = 'Normal' | 'High' | 'Urgent';
export type CostingMethod = 'Area' | 'Per Item' | 'NCR' | 'Hourly' | 'Page';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  address?: string;
  vatNumber?: string;
  createdAt: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  leadTime: string;
  categories: string[];
  status: 'Active' | 'Inactive';
}

export interface Material {
  id: string;
  name: string;
  category: string;
  stockLevel: number;
  minStock: number;
  unit: string;
  costPrice: number;
  location: string;
  supplierId: string;
  thickness?: string;
  materialType?: string;
  printingConsiderations?: string;
}

export interface Machine {
  id: string;
  name: string;
  type: string;
  maxWidth?: number;
  speed?: string;
  costPerHour?: number;
  costPerCopy?: number;
  hourlyRate?: number;
  costUnit: 'hr' | 'm²' | 'item' | 'copy' | 'page';
  status: 'Active' | 'Idle' | 'Maintenance';
  utilization?: number;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  color: string; // For categorization on board
  createdAt: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  defaultMachineId: string;
  defaultMaterialId?: string;
  defaultDepartmentId?: string;
  setupTime: number; // in minutes
  markupPercent: number;
  costingMethod: CostingMethod;
}

export interface QuoteItem {
  id: string;
  type: 'Product' | 'Material' | 'NCR' | 'Package' | 'Litho';
  originId: string;
  productId?: string; // Keep for backward compatibility or refactor later
  materialId?: string;
  description: string;
  width?: number; // in mm
  length?: number; // in mm
  quantity: number;
  unitCost: number;
  totalCost: number;
  totalPrice: number;
}

export interface PricingSettings {
  id: string;
  expressSurchargeType: 'percentage' | 'flat';
  expressSurchargeValue: number;
  vatRate: number;
  currency: string;
  // NCR Specific Pricing
  ncrBaseRate: number;
  ncrSizeFactors: Record<string, number>;
  ncrPartFactors: Record<string, number>;
  ncrPrintFactors: Record<string, number>;
  ncrBindingRates: Record<string, number>;
  ncrVolumeDiscounts: { minQty: number; discount: number }[];
  ncrSets100Factor: number;
  ncrNumberingFee: number;
  ncrPerforationFee: number;
  ncrCoverFee: number;
  materialMarkupPercent: number;
}

export interface CompanySettings {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  vatNumber?: string;
  registrationNumber?: string;
  bankName?: string;
  accountNumber?: string;
  branchCode?: string;
  website?: string;
  logoUrl?: string;
  // Messaging Templates
  quoteEmailTemplate?: string;
  quoteWhatsappTemplate?: string;
  jobEmailTemplate?: string;
  jobWhatsappTemplate?: string;
  // Artwork Approval Templates
  artworkEmailTemplate?: string;
  artworkWhatsappTemplate?: string;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  clientId: string;
  items: QuoteItem[];
  subtotal: number;
  isExpress: boolean;
  expressSurcharge: number;
  vat: number;
  total: number;
  profit: number;
  status: 'Draft' | 'Sent' | 'Viewed' | 'Accepted' | 'Rejected' | 'Expired';
  expiryDate: number;
  createdAt: number;
}

export interface NCRPricingTier {
  quantity: number;
  cost: number;
  sell: number;
}

export interface NCRBook {
  id: string;
  name: string;
  description: string;
  parts: string;
  setsPerBook: number;
  size: string;
  binding: string;
  print: string;
  options: string[];
  pricingGrid: NCRPricingTier[];
  status: 'Active' | 'Archived';
  createdAt: number;
}

export interface PackageItem {
  label: string;
  price: number;
}

export interface Package {
  id: string;
  name: string;
  description: string;
  featured: boolean;
  items: PackageItem[];
  fullPrice: number;
  packagePrice: number;
  savings: number;
  savingsPercent: number;
  category: string;
  status: 'Active' | 'Inactive';
  createdAt: number;
}

export interface LithoPricingTier {
  quantity: number;
  cost: number;
  sell: number;
}

export interface LithoProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  size: string;
  paperType: string;
  finishing?: string;
  pricingGrid: LithoPricingTier[];
  status: 'Active' | 'Archived';
  createdAt: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  materialId: string;
  quantity: number;
  rollWidth?: number;
  rollLength?: number;
  totalM2?: number;
  orderDate: number;
  expectedDate: number;
  status: 'Sent' | 'Received' | 'Cancelled';
  totalCost: number;
}

export interface Job {
  id: string;
  jobNumber: string;
  quoteId?: string;
  clientId: string;
  clientName: string;
  productName: string;
  departmentId?: string;
  artwork?: {
    id: string;
    url: string;
    name: string;
    status: 'Pending' | 'Approved' | 'Changes Requested';
    version: number;
    uploadedAt: number;
    feedback?: string;
  }[];
  items?: QuoteItem[];
  total?: number;
  profit?: number;
  stage: JobStage;
  priority: JobPriority;
  dueDate: number;
  assignedMachineId?: string;
  artworkStatus: 'Pending' | 'Approved' | 'N/A';
  ncrDetails?: {
    paperColors: string;
    startNumber: string;
    endNumber: string;
    perforationPosition?: string;
    bindingType?: string;
    bindingPosition?: string;
  };
  createdAt: number;
}
