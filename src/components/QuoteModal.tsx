import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calculator, AlertCircle, Package as PackageIcon, Book, Layers, Box, Download, Printer, Mail, MessageCircle, Briefcase, ChevronRight, Info, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Quote, QuoteItem, Client, Product, PricingSettings, Material, Machine, NCRBook, Package, CompanySettings, Job, LithoProduct } from '../types';
import { createDocument, updateDocument, useCollection, getNextSequence } from '../lib/firestoreService';
import { calculateQuoteTotals, DEFAULT_PRICING_SETTINGS, getActivePricingSettings } from '../lib/pricingService';
import { cn, sqMmToSqM } from '../lib/utils';
import { generateQuotePDF } from '../lib/pdfService';
import { shareViaWhatsApp, shareViaEmail } from '../lib/messagingService';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote?: Quote | null;
  prefilledItem?: { type: string; originId: string; quantity: number } | null;
  initialClientId?: string | null;
}

export default function QuoteModal({ isOpen, onClose, quote, prefilledItem, initialClientId }: QuoteModalProps) {
  const { data: clients } = useCollection<Client>('clients');
  const { data: products } = useCollection<Product>('products');
  const { data: materials } = useCollection<Material>('materials');
  const { data: machines } = useCollection<Machine>('machines');
  const { data: ncrBooks } = useCollection<NCRBook>('ncr_books');
  const { data: packages } = useCollection<Package>('packages');
  const { data: lithoProducts } = useCollection<LithoProduct>('litho_products');
  const { data: settingsList } = useCollection<PricingSettings>('settings');
  const { data: companySettingsList } = useCollection<CompanySettings>('company_settings');
  const { data: jobs } = useCollection<Job>('jobs');
  
  const settings = getActivePricingSettings(settingsList);
  const company = companySettingsList[0];

  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState<Partial<Quote>>({
    quoteNumber: 'Auto-generating...',
    clientId: initialClientId || '',
    items: [],
    isExpress: false,
    notes: '',
    status: 'Draft',
    createdAt: Date.now(),
    expiryDate: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
  });

  const [items, setItems] = useState<Partial<QuoteItem>[]>([]);

  useEffect(() => {
    if (quote) {
      setFormData(quote);
      setItems(quote.items);
    } else {
      setFormData({
        quoteNumber: 'Auto-generating...',
        clientId: initialClientId || '',
        items: [],
        isExpress: false,
        status: 'Draft',
        createdAt: Date.now(),
        expiryDate: Date.now() + (30 * 24 * 60 * 60 * 1000)
      });
      
      if (prefilledItem) {
        const newItem: Partial<QuoteItem> = {
          id: Math.random().toString(36).substr(2, 9),
          type: prefilledItem.type as any,
          originId: prefilledItem.originId,
          quantity: prefilledItem.quantity,
          unitCost: 0,
          totalPrice: 0,
          totalCost: 0,
          description: '',
          width: 0,
          length: 0
        };
        setItems([newItem]);
        // We'll let the next update cycle or a manual trigger handle initial calculation
        // Or we can manually trigger update logic here
      } else {
        setItems([]);
      }
    }
  }, [quote, isOpen, prefilledItem]);

  // Initial calculation for prefilled item
  useEffect(() => {
    if (prefilledItem && items.length === 1 && items[0].originId === prefilledItem.originId && items[0].description === '') {
      updateItem(0, { originId: prefilledItem.originId, type: prefilledItem.type as any });
    }
  }, [items, prefilledItem]);

  const addItem = () => {
    setItems([...items, { 
      id: Math.random().toString(36).substr(2, 9), 
      type: 'Product',
      originId: '',
      description: '', 
      quantity: 1, 
      unitCost: 0, 
      totalPrice: 0, 
      totalCost: 0,
      width: 0,
      length: 0,
      productId: '',
      materialId: '',
      machineId: ''
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<QuoteItem>) => {
    const newItems = [...items];
    const currentItem = newItems[index];
    
    let materialId = updates.materialId ?? currentItem.materialId;
    let machineId = updates.machineId ?? currentItem.machineId;
    let unitCost = updates.unitCost ?? currentItem.unitCost;
    let description = updates.description ?? currentItem.description;
    let type = updates.type ?? currentItem.type;
    let originId = updates.originId ?? currentItem.originId;

    // Reset originId if type changes
    if (updates.type && updates.type !== currentItem.type) {
      originId = '';
      updates.originId = '';
      updates.description = '';
      updates.unitCost = 0;
      updates.machineId = '';
    }

    // Logic based on type and originId
    if (updates.originId && (updates.originId !== currentItem.originId || updates.type !== currentItem.type)) {
      if (type === 'Product') {
        const product = products.find(p => p.id === updates.originId);
        if (product) {
          materialId = product.defaultMaterialId;
          machineId = product.defaultMachineId;
          description = product.name;
          const material = materials.find(m => m.id === materialId);
          if (material) unitCost = material.costPrice;
        }
      } else if (type === 'Material') {
        const material = materials.find(m => m.id === updates.originId);
        if (material) {
          description = material.name;
          unitCost = material.costPrice;
          materialId = material.id;
          machineId = '';
        }
      } else if (type === 'NCR') {
        const ncr = ncrBooks.find(b => b.id === updates.originId);
        if (ncr) {
          description = ncr.name;
          // For NCR, we might default to the first tier or a base cost
          unitCost = ncr.pricingGrid?.[0]?.sell || 0;
          machineId = '';
        }
      } else if (type === 'Package') {
        const pkg = packages.find(p => p.id === updates.originId);
        if (pkg) {
          description = pkg.name;
          unitCost = pkg.packagePrice;
          machineId = '';
        }
      } else if (type === 'Litho') {
        const litho = lithoProducts.find(p => p.id === updates.originId);
        if (litho) {
          description = litho.name;
          unitCost = litho.pricingGrid?.[0]?.sell || 0;
          machineId = '';
        }
      }
      updates.description = description;
      updates.unitCost = unitCost;
      updates.materialId = materialId;
      updates.machineId = machineId;
    }

    // If material changed (only relevant for Product type usually)
    if (updates.materialId && updates.materialId !== currentItem.materialId && type === 'Product') {
      const material = materials.find(m => m.id === updates.materialId);
      if (material) unitCost = material.costPrice;
      updates.unitCost = unitCost;
    }

    newItems[index] = { ...newItems[index], ...updates };
    const item = newItems[index];

    // Helper to ensure we don't pass NaN to inputs
    const safeNum = (val: any) => (val === null || val === undefined || isNaN(val)) ? '' : val;

    const product = products.find(p => p.id === item.originId);
    const material = materials.find(m => m.id === (item.type === 'Material' ? item.originId : item.materialId));
    const isArea = (item.type === 'Product' && product?.costingMethod === 'Area') || 
                   (item.type === 'Material' && (material?.unit === 'm²' || material?.unit === 'sqm'));

    // Recalculate totals
    const q = item.quantity ?? 1;
    const w = item.width ?? 0;
    const l = item.length ?? 0;
    
    // Normalize: unitCost is the BASE COST.
    const u = item.unitCost ?? 0;

    const materialMarkup = 1 + ((settings.materialMarkupPercent ?? 40) / 100);
    const productMarkup = 1 + ((product?.markupPercent ?? 40) / 100);
    const activeMarkup = item.type === 'Material' ? materialMarkup : productMarkup;

    let computedPrice = 0;
    let computedCost = 0;

    if (item.type === 'Product') {
      const machine = machines.find(m => m.id === (item.machineId || product?.defaultMachineId));
      const matCost = material?.costPrice || u;
      let machineCost = 0;

      if (machine) {
        if (machine.costUnit === 'm²') {
          machineCost = sqMmToSqM(w * l) * (machine.hourlyRate || 0) * q;
        } else if (machine.costUnit === 'page' || machine.costUnit === 'copy') {
          machineCost = q * (machine.hourlyRate || 0);
        } else if (machine.costUnit === 'hr') {
          machineCost = ((product?.setupTime || 0) / 60) * (machine.hourlyRate || 0);
        } else {
          machineCost = q * (machine.hourlyRate || 0);
        }
      }

      if (isArea) {
        computedCost = (sqMmToSqM(w * l) * matCost * q) + machineCost;
        computedPrice = computedCost * activeMarkup;
      } else {
        computedCost = (matCost * q) + machineCost;
        computedPrice = computedCost * activeMarkup;
      }
    } else if (item.type === 'NCR') {
      const ncr = ncrBooks.find(b => b.id === item.originId);
      if (ncr && ncr.pricingGrid) {
        const matchingTier = [...ncr.pricingGrid].sort((a,b) => b.quantity - a.quantity).find(t => q >= t.quantity);
        const tierPrice = matchingTier ? matchingTier.sell : (ncr.pricingGrid[0]?.sell || 0);
        computedPrice = tierPrice * q;
        computedCost = computedPrice / activeMarkup;
        item.unitCost = computedCost / q;
      } else {
        computedCost = q * u;
        computedPrice = computedCost * activeMarkup;
      }
    } else if (item.type === 'Package') {
      const pkg = packages.find(p => p.id === item.originId);
      const pkgPrice = pkg?.packagePrice || u * activeMarkup;
      computedPrice = pkgPrice * q;
      computedCost = computedPrice / activeMarkup;
      item.unitCost = computedCost / q;
    } else if (item.type === 'Litho') {
      const litho = lithoProducts.find(p => p.id === item.originId);
      if (litho && litho.pricingGrid) {
        const matchingTier = [...litho.pricingGrid].sort((a,b) => b.quantity - a.quantity).find(t => q >= t.quantity);
        const tierPrice = matchingTier ? matchingTier.sell : (litho.pricingGrid[0]?.sell || 0);
        computedPrice = tierPrice; 
        computedCost = computedPrice / activeMarkup;
        item.unitCost = computedCost / q;
      } else {
        computedCost = q * u;
        computedPrice = computedCost * activeMarkup;
      }
    } else if (item.type === 'Material' && isArea) {
      computedCost = q * sqMmToSqM(w * l) * u;
      computedPrice = computedCost * materialMarkup;
    } else {
      computedCost = q * u;
      computedPrice = computedCost * materialMarkup;
    }

    // If we are explicitly updating basePrice (manual override), use that instead of computed
    if ('basePrice' in updates) {
      item.basePrice = updates.basePrice!;
      item.totalCost = item.basePrice / activeMarkup;
    } else if (!('discountValue' in updates || 'discountType' in updates)) {
      item.basePrice = computedPrice;
      item.totalCost = computedCost;
    }
    
    // Ensure backwards compatibility where totalPrice override acts as basePrice if no discount logic changes it
    if ('totalPrice' in updates && !('basePrice' in updates)) {
      item.basePrice = updates.totalPrice!;
      item.totalCost = item.basePrice / activeMarkup;
    }

    // Initialize basePrice from totalPrice for legacy items
    if (item.basePrice === undefined) {
      item.basePrice = item.totalPrice ?? computedPrice;
    }

    // Apply discount
    let discountAmount = 0;
    const base = item.basePrice;
    if (item.discountValue) {
      if (item.discountType === 'amount') {
        discountAmount = item.discountValue;
      } else {
        discountAmount = base * (item.discountValue / 100);
      }
    }
    
    item.totalPrice = Math.max(0, base - discountAmount);
    
    setItems(newItems);
  };

  const totals = calculateQuoteTotals(items as any, formData.isExpress || false, settings);

  const handleDownloadPDF = async () => {
    console.log('Button Click: Quote Download PDF', { quoteId: quote?.id });
    setIsProcessing(true);
    try {
      const client = clients.find(c => c.id === formData.clientId);
      const finalQuote = { ...formData, items, ...totals } as Quote;
      const doc = generateQuotePDF(finalQuote, client, company);
      doc.save(`Quote_${formData.quoteNumber}.pdf`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintPDF = async () => {
    console.log('Button Click: Quote Print PDF', { quoteId: quote?.id });
    setIsProcessing(true);
    try {
      const client = clients.find(c => c.id === formData.clientId);
      const finalQuote = { ...formData, items, ...totals } as Quote;
      const doc = generateQuotePDF(finalQuote, client, company);
      const blobURL = doc.output('bloburl');
      const win = window.open(blobURL, '_blank');
      if (!win) {
        toast.error('Popup blocked. Please allow popups to print.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmailPDF = async () => {
    console.log('Button Click: Quote Email PDF', { quoteId: quote?.id });
    const client = clients.find(c => c.id === formData.clientId);
    if (client) {
      setIsProcessing(true);
      try {
        const finalQuote = { ...formData, items, ...totals } as Quote;
        await shareViaEmail('quote', finalQuote, client, company);
      } finally {
        setIsProcessing(false);
      }
    } else {
      toast.error('Please select a client first.');
    }
  };

  const handleWhatsAppShare = async () => {
    console.log('Button Click: Quote WhatsApp Share', { quoteId: quote?.id });
    const client = clients.find(c => c.id === formData.clientId);
    if (client) {
      setIsProcessing(true);
      try {
        const finalQuote = { ...formData, items, ...totals } as Quote;
        await shareViaWhatsApp('quote', finalQuote, client, company);
      } finally {
        setIsProcessing(false);
      }
    } else {
      toast.error('Please select a client first.');
    }
  };

  const handleConvertToJob = async () => {
    console.log('Button Click: Convert Quote to Production Job', { quoteId: quote?.id });
    if (!quote?.id) return;
    
    setIsProcessing(true);
    try {
      const client = clients.find(c => c.id === formData.clientId);
      const clientName = client ? (client.companyName || client.name) : 'Unknown Client';
      const productsSummary = items.map(item => item.description).join(', ') || 'Custom Production';
      
      const year = new Date().getFullYear();
      const sequence = await getNextSequence(`jobs_${year}`);
      if (sequence === null) throw new Error("Failed to generate sequence");
      
      const prefix = company?.jobCardPrefix || 'Jobcard';
      const jobNumber = `${prefix}-${year}-${sequence.toString()}`;
      
      const jobData: Omit<Job, 'id'> = {
        jobNumber,
        quoteId: quote.id,
        clientId: formData.clientId || '',
        clientName,
        productName: productsSummary,
        stage: 'Prepress',
        priority: 'Normal',
        dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000), // Default 1 week
        artworkStatus: 'Pending',
        items: items as QuoteItem[],
        total: totals.total,
        profit: totals.profit || 0,
        createdAt: Date.now(),
      };
      
      await createDocument('jobs', jobData);
      
      if (quote.status !== 'Accepted') {
        await updateDocument('quotes', quote.id, { status: 'Accepted' });
      }
      
      toast.success(`Production Job ${jobNumber} created successfully.`);
      onClose();
    } catch (error) {
      console.error("Error creating job:", error);
      toast.error("Failed to create job. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    console.log('Button Click: Finalize Quote', { isEdit: !!quote?.id });
    setIsSaving(true);
    try {
      const finalData: Partial<Quote> = {
        ...formData,
        items: items as QuoteItem[],
        ...totals
      };

      if (quote?.id) {
        await updateDocument('quotes', quote.id, finalData);
      } else {
        const year = new Date().getFullYear();
        const sequence = await getNextSequence(`quotes_${year}`);
        if (!sequence) throw new Error("Failed to generate quote number sequence");
        
        finalData.quoteNumber = `Quote-${year}-${(sequence || 1).toString().padStart(3, '0')}`;
        const newDocId = await createDocument('quotes', finalData as any);
        if (!newDocId) throw new Error("Failed to create quote document in Firestore");
      }
      setShowSuccess(true);
      toast.success('Quote saved successfully.');
      // Removed auto-close to allow for export/share options
    } catch (error) {
      console.error('Error saving quote:', error);
      toast.error('Failed to save quote.');
    } finally {
      setIsSaving(false);
    }
  };

  const getItemTypeIcon = (type: QuoteItem['type']) => {
    switch (type) {
      case 'Product': return <Box size={14} />;
      case 'Material': return <Layers size={14} />;
      case 'NCR': return <Book size={14} />;
      case 'Package': return <PackageIcon size={14} />;
      case 'Litho': return <Printer size={14} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-main/40 backdrop-blur-md overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-7xl h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden relative border border-white/20 printable-content"
      >
        {/* Header */}
        <div className="px-10 py-6 border-b border-border/50 flex items-center justify-between shrink-0 bg-white/50 backdrop-blur-sm sticky top-0 z-20 no-print">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
              <Calculator size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-text-main tracking-tighter uppercase italic">{quote ? 'Adjust Quote' : 'New Quote System'}</h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-brand-accent px-2 py-0.5 bg-blue-50 rounded-lg tabular-nums uppercase tracking-widest">{formData.quoteNumber}</span>
                <span className="text-[10px] font-bold text-text-light/40 uppercase tracking-widest">•</span>
                <span className="text-[10px] font-bold text-text-light/60 uppercase tracking-widest italic">Inversion v2.4</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {quote && (
              <div className="flex items-center gap-1.5 p-1.5 bg-gray-50 rounded-2xl border border-border/50">
                <button 
                  onClick={handleDownloadPDF}
                  title="Download PDF"
                  className="w-10 h-10 flex items-center justify-center text-text-light hover:text-brand-accent hover:bg-white hover:shadow-sm rounded-xl transition-all"
                >
                  <Download size={18} />
                </button>
                <button 
                  onClick={handlePrintPDF}
                  title="Print"
                  className="w-10 h-10 flex items-center justify-center text-text-light hover:text-brand-accent hover:bg-white hover:shadow-sm rounded-xl transition-all"
                >
                  <Printer size={18} />
                </button>
                <div className="w-px h-6 bg-border/50 mx-1" />
                <button 
                  onClick={handleEmailPDF}
                  title="Email"
                  className="w-10 h-10 flex items-center justify-center text-text-light hover:text-amber-500 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                >
                  <Mail size={18} />
                </button>
                <button 
                  onClick={handleWhatsAppShare}
                  title="WhatsApp"
                  className="w-10 h-10 flex items-center justify-center text-text-light hover:text-emerald-500 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                >
                  <MessageCircle size={18} />
                </button>
              </div>
            )}
            <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition-all group active:scale-95">
              <X size={20} className="group-hover:rotate-90 transition-transform" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto px-10 py-10 space-y-12">
            {/* Client and Config Section */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-[0.2em]">Entity Identity</label>
                  {formData.clientId && (
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                      <ChevronRight size={10} strokeWidth={3} /> Verified Account
                    </span>
                  )}
                </div>
                <div className="relative group">
                  <Box className="absolute left-5 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-brand transition-all" size={18} />
                  <select 
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full pl-14 pr-6 py-4.5 bg-paper border border-border/80 rounded-2xl text-sm font-black uppercase tracking-tight focus:outline-none focus:ring-8 focus:ring-brand/5 focus:border-brand/40 transition-all shadow-sm appearance-none"
                  >
                    <option value="">Select Target Client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.companyName || c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-[0.2em]">Priority Matrix</label>
                  <button 
                    onClick={() => setFormData({ ...formData, isExpress: !formData.isExpress })}
                    className={cn(
                      "w-full flex items-center justify-between px-6 py-4.5 rounded-2xl border transition-all text-[11px] font-black uppercase tracking-widest",
                      formData.isExpress 
                        ? "bg-amber-50 border-amber-500 text-amber-700 shadow-[0_0_15px_rgba(245,158,11,0.1)]" 
                        : "bg-paper border-border text-text-muted hover:border-amber-200"
                    )}
                  >
                    <span>Express SLA</span>
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                      formData.isExpress ? "border-amber-500 bg-amber-500" : "border-border"
                    )}>
                      {formData.isExpress && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                    </div>
                  </button>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-[0.2em]">Current State</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-6 py-4.5 bg-paper border border-border/80 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:outline-none focus:ring-8 focus:ring-brand/5 focus:border-brand/40 transition-all shadow-sm"
                  >
                    <option value="Draft">Draft Mode</option>
                    <option value="Sent">Sent to Client</option>
                    <option value="Accepted">Accepted Order</option>
                    <option value="Rejected">Voided/Rejected</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Items Section */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-black text-text-main uppercase tracking-[0.1em] italic">Product Inventory Items</h3>
                  <span className="px-2 py-0.5 bg-surface text-[9px] font-black text-text-light rounded-lg border border-border/50 tabular-nums uppercase tracking-widest">{items.length} units listed</span>
                </div>
                <button 
                  onClick={addItem} 
                  className="flex items-center gap-2 px-6 py-3.5 bg-brand text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-brand/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all"
                >
                  <Plus size={16} strokeWidth={3} />
                  Add New Line Item
                </button>
              </div>
              
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {items.map((item, idx) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      layout
                      className="group relative bg-surface/50 border border-border/60 hover:border-brand/30 rounded-3xl p-6 transition-all"
                    >
                      <button 
                        onClick={() => removeItem(idx)} 
                        className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-border text-text-light hover:text-red-500 hover:border-red-200 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
                      >
                        <Trash2 size={14} />
                      </button>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Selector Column */}
                        <div className="lg:col-span-2 space-y-3">
                          <label className="text-[8px] font-black text-text-light uppercase tracking-widest block opacity-60">Revenue Stream</label>
                          <select 
                            value={item.type || 'Product'}
                            onChange={(e) => updateItem(idx, { type: e.target.value as any, originId: '' })}
                            className="w-full bg-white border border-border/50 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-brand/5"
                          >
                            <option value="Product">Product</option>
                            <option value="Material">Material</option>
                            <option value="NCR">NCR Book</option>
                            <option value="Litho">Litho Print</option>
                            <option value="Package">Standard Pkg</option>
                          </select>
                        </div>

                        {/* Detail Column */}
                        <div className="lg:col-span-3 space-y-3">
                          <label className="text-[8px] font-black text-text-light uppercase tracking-widest block opacity-60">Selection & Specifications</label>
                          <select 
                            value={item.originId || ''}
                            onChange={(e) => updateItem(idx, { originId: e.target.value })}
                            className="w-full bg-white border border-border/50 rounded-xl px-4 py-3 text-[11px] font-black uppercase tracking-tight text-brand focus:ring-4 focus:ring-brand/5"
                          >
                            <option value="">Choose item...</option>
                            {item.type === 'Product' && products.sort((a,b) => a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            {item.type === 'Material' && materials.sort((a,b) => a.name.localeCompare(b.name)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            {item.type === 'NCR' && ncrBooks.sort((a,b) => a.name.localeCompare(b.name)).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            {item.type === 'Litho' && lithoProducts.sort((a,b) => a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            {item.type === 'Package' && packages.sort((a,b) => a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          {item.type === 'Product' && (
                            <div className="grid grid-cols-2 gap-2">
                              <select 
                                value={item.materialId || ''}
                                onChange={(e) => updateItem(idx, { materialId: e.target.value })}
                                className="w-full bg-surface border border-border/40 rounded-xl px-2 py-1.5 text-[9px] font-black uppercase tracking-tight focus:ring-2 focus:ring-brand/10 outline-none transition-all"
                              >
                                <option value="">Substrate...</option>
                                {materials.map(m => (
                                  <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                              </select>
                              <select 
                                value={item.machineId || (products.find(p => p.id === item.originId)?.defaultMachineId) || ''}
                                onChange={(e) => updateItem(idx, { machineId: e.target.value })}
                                className="w-full bg-surface border border-border/40 rounded-xl px-2 py-1.5 text-[9px] font-black uppercase tracking-tight focus:ring-2 focus:ring-brand/10 outline-none transition-all"
                              >
                                <option value="">Machine...</option>
                                {machines.map(m => (
                                  <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          <input 
                            type="text" 
                            value={item.description || ''}
                            onChange={(e) => updateItem(idx, { description: e.target.value })}
                            placeholder="Custom adjustments or spec details..."
                            className="w-full bg-transparent border-none px-1 focus:ring-0 text-[10px] font-medium text-text-light placeholder:italic"
                          />
                        </div>

                        {/* Dynamics Column */}
                        <div className="lg:col-span-4 grid grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <label className="text-[8px] font-black text-text-light uppercase tracking-widest block opacity-60">Logistics Qty</label>
                            <div className="relative">
                              <input 
                                type="number" 
                                value={(item.quantity === null || item.quantity === undefined || isNaN(item.quantity)) ? '' : item.quantity}
                                onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                                className="w-full bg-white border border-border/50 rounded-xl px-4 py-3 text-sm font-black tabular-nums focus:ring-4 focus:ring-brand/5"
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-text-light/40 uppercase tracking-widest">Units</div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="text-[8px] font-black text-text-light uppercase tracking-widest block opacity-60">Dimensions (mm)</label>
                            {((item.type === 'Product' && products.find(p => p.id === item.originId)?.costingMethod === 'Area') || 
                              (item.type === 'Material' && (materials.find(m => m.id === (item.type === 'Material' ? item.originId : item.materialId))?.unit?.includes('m')))) ? (
                              <div className="flex items-center gap-1.5">
                                <input 
                                  type="number" 
                                  value={(item.width === null || item.width === undefined || isNaN(item.width)) ? '' : item.width}
                                  onChange={(e) => updateItem(idx, { width: Number(e.target.value) })}
                                  placeholder="W"
                                  className="w-full bg-white border border-border/50 rounded-xl px-2.5 py-3 text-[11px] font-black tabular-nums focus:ring-4 focus:ring-brand/5 text-center"
                                />
                                <span className="text-[8px] font-black text-text-light opacity-30">×</span>
                                <input 
                                  type="number" 
                                  value={(item.length === null || item.length === undefined || isNaN(item.length)) ? '' : item.length}
                                  onChange={(e) => updateItem(idx, { length: Number(e.target.value) })}
                                  placeholder="L"
                                  className="w-full bg-white border border-border/50 rounded-xl px-2.5 py-3 text-[11px] font-black tabular-nums focus:ring-4 focus:ring-brand/5 text-center"
                                />
                              </div>
                            ) : (
                              <div className="w-full h-[46px] rounded-xl border border-border/30 flex items-center justify-center text-[8px] font-black text-text-light/40 uppercase tracking-[0.2em] italic">Fixed Sizing</div>
                            )}
                          </div>
                        </div>

                        {/* Revenue Calculation Column */}
                        <div className="lg:col-span-3 space-y-3">
                          <label className="text-[8px] font-black text-text-light uppercase tracking-widest block opacity-60 text-right">Revenue Calculation</label>
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-2 group/rate">
                              <span className="text-[10px] font-bold text-text-light">R</span>
                              <input 
                                type="number" 
                                step="0.01"
                                value={((item.type === 'Product' && products.find(p => p.id === item.originId)?.costingMethod === 'Area') || 
                                       (item.type === 'Material' && (materials.find(m => m.id === (item.type === 'Material' ? item.originId : item.materialId))?.unit?.includes('m')))) 
                                        ? (sqMmToSqM((item.width || 0) * (item.length || 0)) * (item.quantity || 1) > 0 ? ((item.basePrice || item.totalPrice || 0) / (sqMmToSqM((item.width || 0) * (item.length || 0)) * (item.quantity || 1))) : 0)
                                        : (item.quantity ? (item.basePrice || item.totalPrice || 0) / item.quantity : 0)
                                }
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                                  const factor = ((item.type === 'Product' && products.find(p => p.id === item.originId)?.costingMethod === 'Area') || 
                                                 (item.type === 'Material' && (materials.find(m => m.id === (item.type === 'Material' ? item.originId : item.materialId))?.unit?.includes('m')))) 
                                                  ? (sqMmToSqM((item.width || 0) * (item.length || 0)) * (item.quantity || 1)) 
                                                  : (item.quantity || 1);
                                  updateItem(idx, { basePrice: val * factor });
                                }}
                                className="w-24 bg-transparent border-none p-0 focus:ring-0 font-black text-base text-right text-text-main tabular-nums"
                              />
                              <span className="text-[8px] font-black text-text-light/40 uppercase tracking-widest whitespace-nowrap">
                                / {((item.type === 'Product' && products.find(p => p.id === item.originId)?.costingMethod === 'Area') || 
                                   (item.type === 'Material' && (materials.find(m => m.id === (item.type === 'Material' ? item.originId : item.materialId))?.unit?.includes('m')))) ? 'm²' : 'unit'}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-1 w-full justify-end">
                              <span className="text-[9px] font-bold text-text-light italic">Base Subtotal:</span>
                              <input 
                                type="number"
                                step="0.01"
                                value={item.basePrice ?? item.totalPrice ?? ''}
                                onChange={(e) => updateItem(idx, { basePrice: e.target.value === '' ? 0 : Number(e.target.value) })}
                                className="w-24 bg-surface border border-border/50 rounded-lg px-2 py-1 focus:ring-2 focus:ring-brand/20 font-bold text-[11px] text-right text-text-muted tabular-nums"
                              />
                            </div>
                            
                            <div className="flex items-center gap-1 mt-1 bg-surface border border-border/50 rounded-lg p-1 w-32 justify-end">
                              <select 
                                value={item.discountType || 'percentage'}
                                onChange={(e) => updateItem(idx, { discountType: e.target.value as any })}
                                className="bg-transparent text-[9px] font-bold text-text-light uppercase border-r border-border/50 px-1 focus:outline-none shrink-0"
                              >
                                <option value="percentage">% OFF</option>
                                <option value="amount">R OFF</option>
                              </select>
                              <input
                                type="number"
                                placeholder="Disc"
                                value={item.discountValue || ''}
                                onChange={(e) => updateItem(idx, { discountValue: e.target.value === '' ? 0 : Number(e.target.value) })}
                                className="w-full bg-transparent px-1 text-[11px] text-right text-amber-600 font-bold focus:outline-none placeholder:text-text-light/30 tabular-nums"
                              />
                            </div>

                            <div className="flex items-center gap-2 mt-1 w-full justify-end">
                              <div className="flex items-center gap-1 bg-blue-50/50 border border-blue-100 rounded-lg p-1">
                                <input 
                                  type="text"
                                  placeholder="Start #"
                                  value={item.startNumber || ''}
                                  onChange={(e) => updateItem(idx, { startNumber: e.target.value })}
                                  className="w-14 bg-transparent text-[9px] font-bold text-blue-600 text-center focus:outline-none placeholder:text-blue-300"
                                />
                                <span className="text-[8px] text-blue-300">→</span>
                                <input 
                                  type="text"
                                  placeholder="End #"
                                  value={item.endNumber || ''}
                                  onChange={(e) => updateItem(idx, { endNumber: e.target.value })}
                                  className="w-14 bg-transparent text-[9px] font-bold text-blue-600 text-center focus:outline-none placeholder:text-blue-300"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30 w-full justify-end">
                              <span className="text-[9px] font-black text-brand-accent uppercase tracking-widest">Final:</span>
                              <span className="text-lg font-black text-brand-accent tabular-nums tracking-tight">
                                R{item.totalPrice?.toFixed(2) || '0.00'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {items.length === 0 && (
                  <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-20 h-20 rounded-[2rem] bg-surface flex items-center justify-center border border-border/50 text-text-light/30">
                      <Plus size={32} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-text-main uppercase tracking-widest italic">Awaiting Payload</p>
                      <p className="text-[9px] font-black text-text-light uppercase tracking-[0.3em] mt-2">Initialize the sales sequence by adding items</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Sidebar: Totals & Actions */}
          <aside className="w-[320px] bg-gray-50 border-l border-border/50 flex flex-col shrink-0 no-print">
            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              <div className="space-y-6">
                <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.2em] border-b border-border/50 pb-4 italic">Financial Synopsis</h3>
                <div className="space-y-5">
                  {(totals as any).totalDiscount > 0 ? (
                    <>
                      <div className="flex items-center justify-between group">
                        <span className="text-[10px] font-bold text-text-light uppercase tracking-widest">Base Sub-total</span>
                        <span className="text-sm font-black text-text-main tabular-nums">R{(totals as any).baseSubtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between group">
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Total Discount</span>
                        <span className="text-sm font-black text-red-500 tabular-nums">- R{(totals as any).totalDiscount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between group">
                        <span className="text-[10px] font-bold text-text-light uppercase tracking-widest">Discounted Sub-total</span>
                        <span className="text-sm font-black text-text-main tabular-nums">R{totals.subtotal.toLocaleString()}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between group">
                      <span className="text-[10px] font-bold text-text-light uppercase tracking-widest">Base Sub-total</span>
                      <span className="text-sm font-black text-text-main tabular-nums">R{totals.subtotal.toLocaleString()}</span>
                    </div>
                  )}
                  {formData.isExpress && (
                    <div 
                      className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl"
                    >
                      <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Rush Uplift</span>
                      <span className="text-sm font-black text-amber-600 tabular-nums">+ R{totals.expressSurcharge.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between group">
                    <span className="text-[10px] font-bold text-text-light uppercase tracking-widest">VAT Accrual ({settings.vatRate}%)</span>
                    <span className="text-sm font-black text-text-main tabular-nums">R{totals.vat.toLocaleString()}</span>
                  </div>
                  
                  <div className="pt-6 border-t border-dashed border-border/60">
                    <div className="bg-brand text-white p-6 rounded-[2rem] shadow-xl shadow-brand/20 space-y-1 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-white/10 transition-colors" />
                      <span className="text-[10px] font-black text-white/60 uppercase tracking-widest relative z-10">Total Aggregate Value</span>
                      <div className="text-3xl font-black tabular-nums tracking-tighter relative z-10">R{Math.round(totals.total).toLocaleString()}</div>
                      <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-2 relative z-10 italic">Quote ID: {formData.quoteNumber?.split('-')[2] || '...' }</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/60 border border-border/40 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                  <TrendingUp size={12} /> Projected Yield
                </div>
                <div className="text-xl font-black text-text-main tabular-nums tracking-tight">R{totals.profit.toLocaleString()}</div>
                <div className="w-full bg-border/20 h-1 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min((totals.profit / (totals.subtotal || 1)) * 100, 100) || 0}%` }} />
                </div>
                <p className="text-[8px] font-bold text-text-light/60 uppercase tracking-widest italic">{((totals.profit / (totals.subtotal || 1)) * 100 || 0).toFixed(1)}% Operating Margin</p>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-text-light uppercase tracking-[0.2em] italic">Internal Directives</label>
                <textarea 
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Legal disclaimers, production nuances, or logistics notes..."
                  className="w-full h-32 bg-white/50 border border-border/40 rounded-2xl p-4 text-[10px] font-medium placeholder:italic focus:ring-4 focus:ring-brand/5 transition-all resize-none"
                />
              </div>

              <div className="space-y-4 pt-10">
                <div className="flex items-center gap-2 text-[9px] font-black text-text-light uppercase tracking-widest italic">
                  <Info size={12} strokeWidth={3} /> System Notice
                </div>
                <p className="text-[9px] leading-relaxed text-text-muted font-medium opacity-60">Quotes expire automatically after 30 days. Converting to an order will transfer all items to the active production queue.</p>
              </div>
            </div>

            <div className="p-8 border-t border-border/50 bg-white/50 space-y-4">
              {formData.status === 'Accepted' && !jobs.some(j => j.quoteId === quote?.id) && (
                <button 
                  onClick={handleConvertToJob}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4.5 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Briefcase size={18} strokeWidth={2.5} />
                  Process & Dispatch Order
                </button>
              )}
              <button 
                onClick={handleSave} 
                disabled={isSaving || isProcessing}
                className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-text-main text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-text-main/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all disabled:opacity-70"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Calculator size={18} strokeWidth={2.5} />
                )}
                {isSaving ? 'Syncing Ledger...' : 'Commit & Finalize'}
              </button>
              <button 
                onClick={onClose} 
                className="w-full py-4 text-[9px] font-black text-text-light uppercase tracking-[0.3em] hover:text-text-main transition-colors"
              >
                Abort Sequence
              </button>
            </div>
          </aside>
        </div>

        <AnimatePresence>
          {showSuccess && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-12 text-center"
            >
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-24 h-24 bg-brand text-white rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-brand/20 border border-brand/10"
              >
                <CheckCircle2 size={40} strokeWidth={3} />
              </motion.div>
              <h3 className="text-4xl font-black text-text-main tracking-tighter uppercase italic">Quote Finalized</h3>
              <p className="text-[11px] font-black text-text-light uppercase tracking-[0.4em] mt-3 mb-12">The document is registered. Select dispatch method:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                 <button 
                   onClick={handleDownloadPDF}
                   disabled={isProcessing}
                   className="flex col-span-2 items-center justify-center gap-4 py-6 bg-brand text-white rounded-[2.5rem] text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-brand/20 hover:-translate-y-1 transition-all"
                 >
                    <Download size={20} />
                    Download Official PDF
                 </button>
                 <button 
                   onClick={handleWhatsAppShare}
                   disabled={isProcessing}
                   className="flex items-center justify-center gap-4 py-5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-[2.5rem] text-[10px] font-black uppercase tracking-[0.2em] hover:-translate-y-1 transition-all"
                 >
                    <MessageCircle size={18} />
                    WhatsApp
                 </button>
                 <button 
                   onClick={handleEmailPDF}
                   disabled={isProcessing}
                   className="flex items-center justify-center gap-4 py-5 bg-amber-50 text-amber-600 border border-amber-100 rounded-[2.5rem] text-[10px] font-black uppercase tracking-[0.2em] hover:-translate-y-1 transition-all"
                 >
                    <Mail size={18} />
                    Email
                 </button>
              </div>
              
              <button 
                onClick={onClose}
                className="mt-12 py-4 px-12 text-[10px] font-black text-text-light uppercase tracking-[0.3em] hover:text-text-main transition-colors border border-transparent hover:border-border rounded-full"
              >
                Finish & Close Registry
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
