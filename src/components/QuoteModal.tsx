import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calculator, AlertCircle, Package as PackageIcon, Book, Layers, Box, Download, Printer, Mail, MessageCircle, Briefcase } from 'lucide-react';
import { Quote, QuoteItem, Client, Product, PricingSettings, Material, Machine, NCRBook, Package, CompanySettings, Job, LithoProduct } from '../types';
import { createDocument, updateDocument, useCollection, getNextSequence } from '../lib/firestoreService';
import { calculateQuoteTotals, DEFAULT_PRICING_SETTINGS, getActivePricingSettings } from '../lib/pricingService';
import { cn, sqMmToSqM } from '../lib/utils';
import { generateQuotePDF } from '../lib/pdfService';
import { shareViaWhatsApp, shareViaEmail } from '../lib/messagingService';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote?: Quote | null;
  prefilledItem?: { type: string; originId: string; quantity: number } | null;
}

export default function QuoteModal({ isOpen, onClose, quote, prefilledItem }: QuoteModalProps) {
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
    clientId: '',
    items: [],
    isExpress: false,
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
        clientId: '',
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
      materialId: ''
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<QuoteItem>) => {
    const newItems = [...items];
    const currentItem = newItems[index];
    
    let materialId = updates.materialId ?? currentItem.materialId;
    let unitCost = updates.unitCost ?? currentItem.unitCost;
    let description = updates.description ?? currentItem.description;
    let type = updates.type ?? currentItem.type;
    let originId = updates.originId ?? currentItem.originId;

    // Reset originId if type changes
    if (updates.type && updates.type !== currentItem.type) {
      originId = '';
      updates.originId = '';
    }

    // Logic based on type and originId
    if (updates.originId && (updates.originId !== currentItem.originId || updates.type !== currentItem.type)) {
      if (type === 'Product') {
        const product = products.find(p => p.id === updates.originId);
        if (product) {
          materialId = product.defaultMaterialId;
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
        }
      } else if (type === 'NCR') {
        const ncr = ncrBooks.find(b => b.id === updates.originId);
        if (ncr) {
          description = ncr.name;
          // For NCR, we might default to the first tier or a base cost
          unitCost = ncr.pricingGrid?.[0]?.sell || 0;
        }
      } else if (type === 'Package') {
        const pkg = packages.find(p => p.id === updates.originId);
        if (pkg) {
          description = pkg.name;
          unitCost = pkg.packagePrice;
        }
      } else if (type === 'Litho') {
        const litho = lithoProducts.find(p => p.id === updates.originId);
        if (litho) {
          description = litho.name;
          unitCost = litho.pricingGrid?.[0]?.sell || 0;
        }
      }
      updates.description = description;
      updates.unitCost = unitCost;
      updates.materialId = materialId;
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
      const machine = machines.find(m => m.id === product?.defaultMachineId);
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
        computedPrice = computedCost * productMarkup;
      } else {
        computedCost = (matCost * q) + machineCost;
        computedPrice = computedCost * productMarkup;
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

    // If we are explicitly updating totalPrice (manual override), use that instead of computed
    if ('totalPrice' in updates) {
      item.totalPrice = updates.totalPrice!;
      item.totalCost = item.totalPrice / activeMarkup;
    } else {
      item.totalPrice = computedPrice;
      item.totalCost = computedCost;
    }
    
    setItems(newItems);
  };

  const totals = calculateQuoteTotals(items as any, formData.isExpress || false, settings);

  const handleDownloadPDF = async () => {
    console.log('Button Click: Quote Download PDF', { quoteId: quote?.id });
    setIsProcessing(true);
    try {
      const client = clients.find(c => c.id === formData.clientId);
      const doc = generateQuotePDF(formData as Quote, client, company);
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
      const doc = generateQuotePDF(formData as Quote, client, company);
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
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
        await shareViaEmail('quote', formData as Quote, client, company);
      } finally {
        setIsProcessing(false);
      }
    } else {
      alert('Please select a client first.');
    }
  };

  const handleWhatsAppShare = async () => {
    console.log('Button Click: Quote WhatsApp Share', { quoteId: quote?.id });
    const client = clients.find(c => c.id === formData.clientId);
    if (client) {
      setIsProcessing(true);
      try {
        await shareViaWhatsApp('quote', formData as Quote, client, company);
      } finally {
        setIsProcessing(false);
      }
    } else {
      alert('Please select a client first.');
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
      
      const jobNumber = `Jobcard-${year}-${sequence.toString()}`;
      
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
      
      alert(`Production Job ${jobNumber} created successfully.`);
      onClose();
    } catch (error) {
      console.error("Error creating job:", error);
      alert("Failed to create job. Please try again.");
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
        finalData.quoteNumber = `Quote-${year}-${sequence || Math.floor(Math.random() * 1000)}`;
        await createDocument('quotes', finalData as any);
      }
      setShowSuccess(true);
      setTimeout(() => {
        onClose();
        setShowSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Error saving quote:', error);
      alert('Failed to save quote.');
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
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-text-main/20 backdrop-blur-sm overflow-y-auto pt-10 sm:pt-20">
      <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 relative mb-10 sm:mb-20">
        <div className="p-8 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-text-main tracking-tight">{quote ? 'Edit Quote' : 'Create New Quote'}</h2>
            <p className="text-sm text-text-muted mt-1">{formData.quoteNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-2">Select Client</label>
              <select 
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full px-6 py-4 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all text-sm"
              >
                <option value="">Choose a client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setFormData({ ...formData, isExpress: !formData.isExpress })}
                className={cn(
                  "flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all font-bold",
                  formData.isExpress 
                    ? "bg-amber-50 border-amber-500 text-amber-700 shadow-sm" 
                    : "bg-white border-border text-text-muted hover:border-amber-200"
                )}
              >
                <AlertCircle size={20} className={formData.isExpress ? "text-amber-500" : "text-text-light"} />
                Express Rush Service
              </button>
              
              <div className="flex-1">
                <label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-2">Status</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-6 py-4 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all text-sm"
                >
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-text-main">Quote Items</h3>
              <button onClick={addItem} className="flex items-center gap-2 text-xs font-bold text-brand hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors">
                <Plus size={16} /> Add Item
              </button>
            </div>
            
            <div className="border border-border rounded-2xl overflow-hidden bg-gray-50/30">
              <table className="w-full text-left">
                <thead className="bg-white border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold text-text-light uppercase tracking-widest w-40">Source</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-text-light uppercase tracking-widest">Detail & Spec</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-text-light uppercase tracking-widest">Media/Stock</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-text-light uppercase tracking-widest w-24">Qty</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-text-light uppercase tracking-widest w-40">Dims (mm)</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-text-light uppercase tracking-widest w-32">Rate ({settings.currency})</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-text-light uppercase tracking-widest w-32">Total</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-text-light uppercase tracking-widest w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, idx) => {
                    const product = products.find(p => p.id === item.originId);
                    const material = materials.find(m => m.id === (item.type === 'Material' ? item.originId : item.materialId));
                    const isArea = (item.type === 'Product' && product?.costingMethod === 'Area') || 
                                   (item.type === 'Material' && (material?.unit === 'm²' || material?.unit === 'sqm'));
                    const itemQuantity = item.quantity || 1;
                    const itemArea = sqMmToSqM((item.width || 0) * (item.length || 0));
                    const totalArea = itemArea * itemQuantity;
                    
                    const materialMarkup = 1 + ((settings.materialMarkupPercent ?? 40) / 100);
                    const productMarkup = 1 + ((product?.markupPercent ?? 40) / 100);
                    const activeMarkup = item.type === 'Material' ? materialMarkup : productMarkup;

                    let unitSellPrice = 0;
                    if (isArea) {
                      unitSellPrice = totalArea > 0 ? ((item.totalPrice || 0) / totalArea) : ((item.unitCost || 0) * activeMarkup);
                    } else {
                      unitSellPrice = item.totalPrice ? (item.totalPrice / itemQuantity) : 0;
                    }

                    return (
                      <tr key={item.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <select 
                            value={item.type || 'Product'}
                            onChange={(e) => updateItem(idx, { type: e.target.value as any, originId: '' })}
                            className="w-full bg-gray-50 border border-border/50 rounded-lg px-3 py-2.5 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-brand-accent/20"
                          >
                            <option value="Product">Product</option>
                            <option value="Material">Material</option>
                            <option value="NCR">NCR Book</option>
                            <option value="Litho">Litho Print</option>
                            <option value="Package">Package</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <select 
                              value={item.originId || ''}
                              onChange={(e) => updateItem(idx, { originId: e.target.value })}
                              className="w-full bg-transparent border-none p-0 focus:ring-0 font-black text-sm text-brand-accent uppercase tracking-tight mb-1"
                            >
                              <option value="">Select From {item.type}s...</option>
                              {item.type === 'Product' && products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              {item.type === 'Material' && materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                              {item.type === 'NCR' && ncrBooks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                              {item.type === 'Litho' && lithoProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              {item.type === 'Package' && packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <input 
                              type="text" 
                              value={item.description || ''}
                              onChange={(e) => updateItem(idx, { description: e.target.value })}
                              placeholder="Spec detail..."
                              className="w-full bg-transparent border-none p-0 focus:ring-0 font-medium text-xs text-text-muted"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {item.type === 'Product' ? (
                            <select 
                              value={item.materialId || ''}
                              onChange={(e) => updateItem(idx, { materialId: e.target.value })}
                              className="w-full bg-transparent border-none p-0 focus:ring-0 font-bold text-xs text-text-main"
                            >
                              <option value="">Stock Material...</option>
                              {materials.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.name} (R{m.costPrice})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-[10px] font-bold text-text-light uppercase tracking-widest opacity-40">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="number" 
                            value={(item.quantity === null || item.quantity === undefined || isNaN(item.quantity)) ? '' : item.quantity}
                            onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                            className="w-full bg-transparent border-none p-0 focus:ring-0 font-black text-base text-text-main tabular-nums"
                          />
                        </td>
                        <td className="px-6 py-4">
                          {isArea ? (
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col flex-1">
                                <span className="text-[7px] font-black text-text-light uppercase mb-1">Width</span>
                                <input 
                                  type="number" 
                                  value={(item.width === null || item.width === undefined || isNaN(item.width)) ? '' : item.width}
                                  onChange={(e) => updateItem(idx, { width: Number(e.target.value) })}
                                  className="w-full bg-surface border border-border/50 px-2 py-2 rounded-lg text-xs font-black text-text-main tabular-nums"
                                  placeholder="W"
                                />
                              </div>
                              <span className="text-[8px] font-black text-text-light mt-4">×</span>
                              <div className="flex flex-col flex-1">
                                <span className="text-[7px] font-black text-text-light uppercase mb-1">Length</span>
                                <input 
                                  type="number" 
                                  value={(item.length === null || item.length === undefined || isNaN(item.length)) ? '' : item.length}
                                  onChange={(e) => updateItem(idx, { length: Number(e.target.value) })}
                                  className="w-full bg-surface border border-border/50 px-2 py-2 rounded-lg text-xs font-black text-text-main tabular-nums"
                                  placeholder="L"
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="px-3 py-1 bg-surface rounded-md text-[8px] font-black text-text-light uppercase tracking-widest border border-border/50">Fixed</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-text-light font-bold">R</span>
                            <input 
                              type="number" 
                              step="0.01"
                              value={unitSellPrice || ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : Number(e.target.value);
                                const factor = isArea ? (sqMmToSqM((item.width || 0) * (item.length || 0)) * itemQuantity) : itemQuantity;
                                updateItem(idx, { totalPrice: val * factor });
                              }}
                              className="w-full bg-transparent border-none p-0 focus:ring-0 font-black text-base text-brand-accent tabular-nums"
                            />
                          </div>
                          {isArea && (
                            <span className="text-[8px] text-text-light font-black uppercase tracking-[0.2em] block mt-1 opacity-60">Sell Rate</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-text-light">R</span>
                              <input 
                                type="number"
                                step="0.01"
                                value={item.totalPrice || ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                                  updateItem(idx, { totalPrice: val });
                                }}
                                className="w-full bg-transparent border-none p-0 focus:ring-0 text-base font-black text-text-main tabular-nums italic"
                              />
                            </div>
                            {isArea && (
                              <span className="text-[8px] font-black text-text-light uppercase tracking-widest opacity-40">
                                {sqMmToSqM((item.width || 0) * (item.length || 0) * itemQuantity).toFixed(2)} m² Total
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => removeItem(idx)} className="text-text-light hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-text-muted font-medium italic">
                        No items added yet. Click "Add Item" to begin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-8 bg-gray-50 border-t border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-10">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-text-light uppercase tracking-widest">Subtotal</span>
              <span className="text-lg font-bold text-text-main">R{totals.subtotal.toLocaleString()}</span>
            </div>
            {formData.isExpress && (
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1">
                  Express Premium ({settings.expressSurchargeValue}{settings.expressSurchargeType === 'percentage' ? '%' : ' ZAR'})
                </span>
                <span className="text-lg font-bold text-amber-600">+ R{totals.expressSurcharge.toLocaleString()}</span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-text-light uppercase tracking-widest">VAT ({settings.vatRate}%)</span>
              <span className="text-lg font-bold text-text-main">R{totals.vat.toLocaleString()}</span>
            </div>
            <div className="flex flex-col bg-brand px-6 py-3 rounded-2xl shadow-lg shadow-blue-200">
              <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Grand Total</span>
              <span className="text-2xl font-black text-white leading-tight">R{totals.total.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {quote && (
              <div className="flex items-center gap-2 mr-6 border-r border-border pr-6 transition-all">
                <button 
                  onClick={handleDownloadPDF}
                  title="Download Quote PDF"
                  disabled={isProcessing}
                  className="p-3 bg-white border border-border rounded-xl text-text-light hover:text-brand-accent hover:border-brand-accent transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <Download size={18} className={cn(isProcessing && "animate-bounce")} />
                </button>
                <button 
                  onClick={handlePrintPDF}
                  title="Print Quote"
                  disabled={isProcessing}
                  className="p-3 bg-white border border-border rounded-xl text-text-light hover:text-brand-accent hover:border-brand-accent transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <Printer size={18} className={cn(isProcessing && "animate-bounce")} />
                </button>
                <button 
                  onClick={handleEmailPDF}
                  title="Send via Email"
                  disabled={isProcessing}
                  className="p-3 bg-white border border-border rounded-xl text-text-light hover:text-amber-500 hover:border-amber-500 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <Mail size={18} className={cn(isProcessing && "animate-bounce")} />
                </button>
                <button 
                  onClick={handleWhatsAppShare}
                  title="Share via WhatsApp"
                  disabled={isProcessing}
                  className="p-3 bg-white border border-border rounded-xl text-text-light hover:text-emerald-500 hover:border-emerald-500 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <MessageCircle size={18} className={cn(isProcessing && "animate-bounce")} />
                </button>
                {formData.status === 'Accepted' && !jobs.some(j => j.quoteId === quote?.id) && (
                  <button 
                    onClick={handleConvertToJob}
                    title="Convert to Production Job"
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    {isProcessing ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Briefcase size={16} />}
                    {isProcessing ? 'Processing...' : 'Process Order'}
                  </button>
                )}
              </div>
            )}
            <button onClick={onClose} disabled={isSaving || isProcessing} className="px-8 py-3 rounded-xl font-bold text-text-muted hover:bg-white transition-all disabled:opacity-50">Cancel</button>
            <button 
              onClick={handleSave} 
              disabled={isSaving || isProcessing}
              className="px-10 py-4 bg-brand text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:-translate-y-1 transition-all flex items-center gap-3 disabled:opacity-70 disabled:translate-y-0"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <Calculator size={18} />
              )}
              {isSaving ? 'Synchronizing...' : 'Finalize Quote'}
            </button>
          </div>
        </div>

        {showSuccess && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="w-20 h-20 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center mb-6 shadow-xl shadow-emerald-200 animate-in zoom-in duration-500 delay-100">
              <Calculator size={40} strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-black text-text-main tracking-tighter uppercase italic">Quote Finalized</h3>
            <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-2">Sales pipeline has been updated</p>
          </div>
        )}
      </div>
    </div>
  );
}
