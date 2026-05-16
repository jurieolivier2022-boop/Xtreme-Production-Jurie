import React, { useState, useEffect } from 'react';
import { motion, Reorder, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Calculator, AlertCircle, Package as PackageIcon, Book, Layers, Box, Calendar, Clock, CheckCircle2, Image as ImageIcon, Share2, Send, MessageCircle, ExternalLink, Download, Printer, Mail, Upload, FileText, Camera, GripVertical, Loader2 } from 'lucide-react';
import { Job, QuoteItem, Client, Product, PricingSettings, Material, Machine, NCRBook, Package, JobStage, JobPriority, Department, CompanySettings, LithoProduct, Quote } from '../types';
import { createDocument, updateDocument, useCollection, getNextSequence } from '../lib/firestoreService';
import { calculateQuoteTotals, DEFAULT_PRICING_SETTINGS, getActivePricingSettings } from '../lib/pricingService';
import { cn, sqMmToSqM } from '../lib/utils';
import { generateJobCardPDF } from '../lib/pdfService';
import { shareViaWhatsApp, shareViaEmail } from '../lib/messagingService';
import { toast } from 'sonner';

interface JobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job?: Job | null;
}

const priorityStyles = {
  Urgent: "bg-red-50 text-red-600 border border-red-100",
  High: "bg-orange-50 text-orange-600 border border-orange-100",
  Normal: "bg-blue-50 text-brand border border-blue-100",
};

const stageStyles = {
  Prepress: "bg-purple-50 text-purple-600",
  Printing: "bg-blue-50 text-brand",
  Laminating: "bg-cyan-50 text-cyan-600",
  Finishing: "bg-indigo-50 text-indigo-600",
  'Quality Check': "bg-amber-50 text-amber-600",
  Ready: "bg-emerald-50 text-emerald-600",
  Delivered: "bg-emerald-500 text-white",
  Cancelled: "bg-gray-100 text-gray-500",
  Embroidery: "bg-pink-50 text-pink-600",
  Screenprinting: "bg-orange-50 text-orange-600",
};

export default function JobModal({ isOpen, onClose, job }: JobModalProps) {
  const { data: clients } = useCollection<Client>('clients');
  const { data: products } = useCollection<Product>('products');
  const { data: materials } = useCollection<Material>('materials');
  const { data: machines } = useCollection<Machine>('machines');
  const { data: ncrBooks } = useCollection<NCRBook>('ncr_books');
  const { data: packages } = useCollection<Package>('packages');
  const { data: lithoProducts } = useCollection<LithoProduct>('litho_products');
  const { data: departments } = useCollection<Department>('departments');
  const { data: settingsList } = useCollection<PricingSettings>('settings');
  const { data: companySettingsList } = useCollection<CompanySettings>('company_settings');
  const { data: quotes } = useCollection<Quote>('quotes');
  
  const settings = getActivePricingSettings(settingsList);
  const company = companySettingsList[0];

  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState<Partial<Job>>({
    jobNumber: 'Pending...',
    clientId: '',
    clientName: '',
    productName: '',
    departmentId: '',
    stage: 'Prepress',
    priority: 'Normal',
    dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
    artworkStatus: 'Pending',
    ncrDetails: {
      paperColors: '',
      startNumber: '',
      endNumber: '',
      perforationPosition: '',
      bindingType: '',
      bindingPosition: '',
    },
    items: [],
    createdAt: Date.now()
  });

  const [items, setItems] = useState<Partial<QuoteItem>[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'artwork' | 'items'>('details');
  const [uploadingFiles, setUploadingFiles] = useState<{ id: string; name: string; progress: number }[]>([]);
  const artworkFileRef = React.useRef<HTMLInputElement>(null);

  const processFiles = (files: FileList | File[]) => {
    Array.from(files).forEach(file => {
      if (!file.type.includes('jpeg') && !file.type.includes('jpg') && !file.type.includes('pdf') && !file.type.includes('png')) {
        toast.error(`${file.name} is not a supported format. Please upload JPEG, PNG or PDF.`);
        return;
      }

      const uploadId = Math.random().toString(36).substr(2, 9);
      setUploadingFiles(prev => [...prev, { id: uploadId, name: file.name, progress: 0 }]);

      const reader = new FileReader();
      
      // Simulate progress for Base64 reading (which is usually fast, but we want visual feedback)
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 90) {
          clearInterval(progressInterval);
          progress = 90;
        }
        setUploadingFiles(prev => prev.map(f => f.id === uploadId ? { ...f, progress } : f));
      }, 200);

      reader.onload = (event) => {
        clearInterval(progressInterval);
        setUploadingFiles(prev => prev.map(f => f.id === uploadId ? { ...f, progress: 100 } : f));
        
        setTimeout(() => {
          const base64String = event.target?.result as string;
          const artwork = formData.artwork || [];
          const newArt = {
            id: Math.random().toString(36).substr(2, 9),
            url: base64String,
            name: file.name.split('.')[0].replace(/[-_]/g, ' '),
            status: 'Pending' as const,
            version: (artwork.length + 1),
            uploadedAt: Date.now()
          };
          
          setFormData(prev => ({
            ...prev,
            artwork: [...(prev.artwork || []), newArt]
          }));
          
          setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
        }, 500);
      };

      reader.onerror = () => {
        clearInterval(progressInterval);
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
        toast.error(`Failed to read ${file.name}`);
      };

      reader.readAsDataURL(file);
    });
  };

  const handleArtworkFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  useEffect(() => {
    const initJob = async () => {
      if (job) {
        setFormData({
          ...job,
          ncrDetails: job.ncrDetails || { 
            paperColors: '', 
            startNumber: '', 
            endNumber: '',
            perforationPosition: '',
            bindingType: '',
            bindingPosition: '',
          }
        });
        setItems(job.items || []);
      } else {
        setFormData({
          jobNumber: 'Pending...',
          clientId: '',
          clientName: '',
          productName: '',
          stage: 'Prepress',
          priority: 'Normal',
          dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000),
          artworkStatus: 'Pending',
          ncrDetails: {
            paperColors: '',
            startNumber: '',
            endNumber: '',
            perforationPosition: '',
            bindingType: '',
            bindingPosition: '',
          },
          items: [],
          createdAt: Date.now()
        });
        setItems([]);
      }
    };

    if (isOpen) {
      initJob();
    }
  }, [job, isOpen]);

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

    if (updates.type && updates.type !== currentItem.type) {
      originId = '';
      updates.originId = '';
      updates.description = '';
      updates.unitCost = 0;
      updates.machineId = '';
    }

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

    if (updates.materialId && updates.materialId !== currentItem.materialId && type === 'Product') {
      const material = materials.find(m => m.id === updates.materialId);
      if (material) unitCost = material.costPrice;
      updates.unitCost = unitCost;
    }

    newItems[index] = { ...newItems[index], ...updates };
    const item = newItems[index];

    // Find relevant entities for dimension checking
    const product = products.find(p => p.id === item.originId);
    const material = materials.find(m => m.id === (item.type === 'Material' ? item.originId : item.materialId));
    const isArea = (item.type === 'Product' && product?.costingMethod === 'Area') || 
                   (item.type === 'Material' && (material?.unit === 'm²' || material?.unit === 'sqm'));

    // Recalculate totals
    const q = item.quantity ?? 1;
    const w = item.width ?? 0;
    const l = item.length ?? 0;
    
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
      let machinePrice = 0;

      if (machine) {
        const costRate = machine.costPerHour || machine.hourlyRate || 0;
        const sellRate = machine.hourlyRate || 0;

        if (machine.costUnit === 'm²') {
          machineCost = sqMmToSqM(w * l) * costRate * q;
          machinePrice = sqMmToSqM(w * l) * sellRate * q;
        } else if (machine.costUnit === 'page' || machine.costUnit === 'copy') {
          machineCost = q * costRate;
          machinePrice = q * sellRate;
        } else if (machine.costUnit === 'hr') {
          const hours = (product?.setupTime || 0) / 60;
          machineCost = hours * costRate;
          machinePrice = hours * sellRate;
        } else {
          machineCost = q * costRate;
          machinePrice = q * sellRate;
        }
      }

      if (isArea) {
        computedCost = (sqMmToSqM(w * l) * matCost * q) + machineCost;
        computedPrice = (sqMmToSqM(w * l) * matCost * activeMarkup * q) + machinePrice;
      } else {
        computedCost = (matCost * q) + machineCost;
        computedPrice = (matCost * q * activeMarkup) + machinePrice;
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

    if ('totalPrice' in updates) {
      item.totalPrice = updates.totalPrice!;
      item.totalCost = item.totalPrice / activeMarkup;
    } else if ('totalCost' in updates) {
      item.totalCost = updates.totalCost!;
    } else {
      item.totalPrice = computedPrice;
      item.totalCost = computedCost;
    }
    
    setItems(newItems);

    // Auto-fill productName if it's the first item
    if (index === 0 && updates.description) {
      setFormData(prev => ({ ...prev, productName: updates.description }));
    }
  };

  const totals = calculateQuoteTotals(items as any, false, settings);
  const hasNCRItems = items.some(item => item.type === 'NCR');

  const getApprovalLink = () => {
    return `${window.location.origin}/approval/${job?.id || 'save-job-first'}`;
  };

  const handleWhatsAppShare = async () => {
    console.log('Button Click: WhatsApp Share', { jobId: job?.id });
    const client = clients.find(c => c.id === formData.clientId);
    if (client) {
      setIsProcessing(true);
      try {
        await shareViaWhatsApp('job', formData as Job, client, company);
      } finally {
        setIsProcessing(false);
      }
    } else {
      toast.error('Please select a client first.');
    }
  };

  const handleEmailShare = async () => {
    console.log('Button Click: Email Share', { jobId: job?.id });
    const client = clients.find(c => c.id === formData.clientId);
    if (client) {
      setIsProcessing(true);
      try {
        await shareViaEmail('job', formData as Job, client, company);
      } finally {
        setIsProcessing(false);
      }
    } else {
      toast.error('Please select a client first.');
    }
  };

  const handleDownloadPDF = async () => {
    console.log('Button Click: Download PDF', { jobId: job?.id });
    setIsProcessing(true);
    try {
      const client = clients.find(c => c.id === formData.clientId);
      const doc = generateJobCardPDF(formData as Job, client, company);
      doc.save(`JobCard_${formData.jobNumber}.pdf`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintPDF = async () => {
    console.log('Button Click: Print PDF', { jobId: job?.id });
    setIsProcessing(true);
    try {
      const client = clients.find(c => c.id === formData.clientId);
      const doc = generateJobCardPDF(formData as Job, client, company);
      const blobURL = doc.output('bloburl');
      const win = window.open(blobURL, '_blank');
      if (!win) {
        toast.error('Popup blocked. Please allow popups to print.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleArtworkWhatsAppShare = async () => {
    console.log('Button Click: Artwork WhatsApp Share', { jobId: job?.id });
    const client = clients.find(c => c.id === formData.clientId);
    if (client) {
      setIsProcessing(true);
      try {
        await shareViaWhatsApp('artwork', formData as Job, client, company);
      } finally {
        setIsProcessing(false);
      }
    } else {
      toast.error('Please select a client first.');
    }
  };

  const handleArtworkEmailShare = async () => {
    console.log('Button Click: Artwork Email Share', { jobId: job?.id });
    const client = clients.find(c => c.id === formData.clientId);
    if (client) {
      setIsProcessing(true);
      try {
        await shareViaEmail('artwork', formData as Job, client, company);
      } finally {
        setIsProcessing(false);
      }
    } else {
      toast.error('Please select a client first.');
    }
  };

  const handleEmailPDF = async () => {
    console.log('Button Click: Email PDF', { jobId: job?.id });
    const client = clients.find(c => c.id === formData.clientId);
    if (client) {
      setIsProcessing(true);
      try {
        await shareViaEmail('job', formData as Job, client, company);
      } finally {
        setIsProcessing(false);
      }
    } else {
      toast.error('Please select a client first.');
    }
  };

  const handleSave = async () => {
    console.log('Button Click: Commit Job to Registry', { isEdit: !!job?.id });
    setIsSaving(true);
    try {
      const client = clients.find(c => c.id === formData.clientId);
      const finalData: Partial<Job> = {
        ...formData,
        clientName: client ? (client.companyName || client.name) : 'Unknown',
        items: (items || []) as QuoteItem[],
        total: Number(totals.total) || 0,
        clientId: formData.clientId || '',
        stage: formData.stage || 'Prepress',
        priority: formData.priority || 'Normal',
        dueDate: Number(formData.dueDate) || (Date.now() + 7 * 24 * 60 * 60 * 1000),
        notes: formData.notes || '',
        createdAt: Number(formData.createdAt) || Date.now(),
        productName: formData.productName || (items.length > 0 ? items[0].description : 'Custom Production'),
        quoteId: formData.quoteId || '',
      };

      if (job?.id) {
        await updateDocument('jobs', job.id, finalData);
      } else {
        const year = new Date().getFullYear();
        const sequence = await getNextSequence(`jobs_${year}`);
        finalData.jobNumber = `Jobcard-${year}-${(sequence || 1).toString().padStart(3, '0')}`;
        await createDocument('jobs', finalData as any);
      }
      setShowSuccess(true);
      toast.success('Job saved successfully.');
      setTimeout(() => {
        onClose();
        setShowSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error('Failed to save job. Please check console for details.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-text-main/20 backdrop-blur-sm overflow-y-auto pt-10 sm:pt-20">
      <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 relative mb-10 sm:mb-20 printable-content">
        <div className="p-8 border-b border-border flex items-center justify-between shrink-0 no-print">
          <div>
            <h2 className="text-2xl font-bold text-text-main tracking-tight">{job ? 'Edit Job Card' : 'Direct Job Entry'}</h2>
            <p className="text-xs font-black text-brand-accent uppercase tracking-widest mt-1">Manual workflow bypass — #{formData.jobNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Base on Quote (Optional)</label>
              <select 
                value={formData.quoteId || ''}
                onChange={(e) => {
                  const quoteId = e.target.value;
                  const quote = quotes.find(q => q.id === quoteId);
                  if (quote) {
                    setFormData({
                      ...formData,
                      quoteId,
                      clientId: quote.clientId,
                      productName: quote.items.map(i => i.description).join(', ').substring(0, 50) || 'Custom Order',
                    });
                    setItems(quote.items);
                  } else {
                    setFormData({ ...formData, quoteId: '' });
                  }
                }}
                className="w-full px-5 py-3 bg-blue-50/50 border border-brand/20 rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all text-brand"
              >
                <option value="">Manual Entry (No Quote)</option>
                {quotes.filter(q => q.status === 'Accepted').map(q => (
                  <option key={q.id} value={q.id}>{q.quoteNumber} - {clients.find(c => c.id === q.clientId)?.companyName || 'Unknown'}</option>
                ))}
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Select Client</label>
              <select 
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
              >
                <option value="">Choose a client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.companyName || c.name}</option>)}
              </select>
            </div>
            
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Department</label>
              <select 
                value={formData.departmentId || ''}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
              >
                <option value="">Unassigned</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Production Stage</label>
              <select 
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value as JobStage })}
                className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
              >
                {Object.keys(stageStyles).map(stage => <option key={stage} value={stage}>{stage}</option>)}
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Priority Level</label>
              <select 
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as JobPriority })}
                className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Due Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" size={16} />
                <input 
                  type="date"
                  value={formData.dueDate ? new Date(formData.dueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData({ ...formData, dueDate: new Date(e.target.value).getTime() })}
                  className="w-full pl-12 pr-6 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                />
              </div>
            </div>

            <div className="col-span-1">
              <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Artwork Status</label>
              <select 
                value={formData.artworkStatus}
                onChange={(e) => setFormData({ ...formData, artworkStatus: e.target.value as any })}
                className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
              >
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="N/A">N/A</option>
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Product Reference</label>
              <input 
                type="text"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                placeholder="Product summary name..."
              />
            </div>
            
            <div className="col-span-3">
              <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Internal Production Notes</label>
              <textarea 
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-5 py-4 bg-gray-50 border border-border rounded-xl font-medium focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all h-24 resize-none"
                placeholder="Specific instructions for machines, finishing, or delivery..."
              />
            </div>
          </div>

          {hasNCRItems && (
            <div className="pt-6 border-t border-border">
              <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.2em] mb-6">NCR Specifications</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Paper Color Sequence</label>
                  <input 
                    type="text"
                    value={formData.ncrDetails?.paperColors || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      ncrDetails: { ...formData.ncrDetails!, paperColors: e.target.value } 
                    })}
                    className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                    placeholder="e.g. White / Yellow / Pink"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Start Number</label>
                  <input 
                    type="text"
                    value={formData.ncrDetails?.startNumber || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      ncrDetails: { ...formData.ncrDetails!, startNumber: e.target.value } 
                    })}
                    className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                    placeholder="0001"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">End Number</label>
                  <input 
                    type="text"
                    value={formData.ncrDetails?.endNumber || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      ncrDetails: { ...formData.ncrDetails!, endNumber: e.target.value } 
                    })}
                    className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Perforation Position</label>
                  <input 
                    type="text"
                    value={formData.ncrDetails?.perforationPosition || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      ncrDetails: { ...formData.ncrDetails!, perforationPosition: e.target.value } 
                    })}
                    className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                    placeholder="e.g. Left side / Top"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Binding Type</label>
                  <input 
                    type="text"
                    value={formData.ncrDetails?.bindingType || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      ncrDetails: { ...formData.ncrDetails!, bindingType: e.target.value } 
                    })}
                    className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                    placeholder="e.g. Spiral / Gluing"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Binding Position</label>
                  <input 
                    type="text"
                    value={formData.ncrDetails?.bindingPosition || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      ncrDetails: { ...formData.ncrDetails!, bindingPosition: e.target.value } 
                    })}
                    className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                    placeholder="e.g. Left / Top"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-border">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.2em]">Visual Proofing Protocol</h3>
                <p className="text-xs font-bold text-text-main mt-1 italic">Manage artwork versions and client approvals</p>
              </div>
              {formData.artwork && formData.artwork.length > 0 && (
                <div className="flex items-center gap-3">
                  <button 
                    type="button" 
                    onClick={handleArtworkWhatsAppShare}
                    disabled={!job?.id}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
                  >
                    <MessageCircle size={14} /> WhatsApp Approval
                  </button>
                  <button 
                    type="button" 
                    onClick={handleArtworkEmailShare}
                    disabled={!job?.id}
                    className="flex items-center gap-2 px-4 py-2 bg-brand/5 text-brand border border-brand/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-brand hover:text-white transition-all disabled:opacity-50"
                  >
                    <Mail size={14} /> Email Link
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-4">
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => artworkFileRef.current?.click()}
                  className={cn(
                    "relative group cursor-pointer border-2 border-dashed rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[300px]",
                    isDragging ? "bg-brand/10 border-brand scale-[0.98]" : "bg-brand/5 border-brand/10 hover:bg-brand/[0.07] hover:border-brand/20"
                  )}
                >
                  <input 
                    type="file"
                    ref={artworkFileRef}
                    onChange={handleArtworkFileUpload}
                    accept=".jpg,.jpeg,image/jpeg,.png,image/png,.pdf,application/pdf"
                    multiple
                    className="hidden"
                  />
                  <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl shadow-brand/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                    <Upload className="text-brand" size={32} />
                  </div>
                  <h4 className="text-base font-black text-text-main tracking-tighter uppercase italic leading-tight">Drop proofs here</h4>
                  <p className="text-[9px] font-bold text-text-light uppercase tracking-widest mt-2 max-w-[180px]">Accepts high-res JPEG, PNG or PDF formats</p>
                  
                  <div className="mt-8 px-6 py-2.5 bg-brand text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-brand/20 group-hover:bg-brand-accent transition-colors">
                    Click to Browse
                  </div>

                  {isDragging && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-brand/40 backdrop-blur-[2px] rounded-[2.5rem] flex items-center justify-center pointer-events-none"
                    >
                      <div className="bg-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
                        <Plus className="text-brand animate-spin" size={20} />
                        <span className="text-xs font-black text-brand uppercase tracking-widest">Release to Upload</span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="md:col-span-8 flex flex-col">
                <div className="flex-1 space-y-4 max-h-[600px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-border/40 pb-10">
                  {/* Uploading Progress */}
                  <AnimatePresence>
                    {uploadingFiles.map(file => (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="bg-brand/5 border border-brand/20 rounded-2xl p-4 overflow-hidden"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Loader2 className="text-brand animate-spin" size={16} />
                            <span className="text-[10px] font-black text-text-main uppercase tracking-widest truncate max-w-[200px]">
                              {file.name}
                            </span>
                          </div>
                          <span className="text-[10px] font-black text-brand tabular-nums">{Math.round(file.progress)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-brand/10 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-brand"
                            initial={{ width: 0 }}
                            animate={{ width: `${file.progress}%` }}
                            transition={{ duration: 0.2 }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <Reorder.Group 
                    axis="y" 
                    values={formData.artwork || []} 
                    onReorder={(newOrder) => setFormData({ ...formData, artwork: newOrder })}
                    className="space-y-4"
                  >
                    {formData.artwork?.map((art, idx) => (
                      <Reorder.Item 
                        key={art.id} 
                        value={art}
                        className="bg-white p-6 rounded-3xl border border-border group relative overflow-hidden shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex gap-6">
                          <div className="flex flex-col items-center justify-center text-text-light opacity-20 group-hover:opacity-100 transition-opacity">
                            <GripVertical size={20} />
                          </div>

                          <div 
                            className="w-28 h-28 bg-surface rounded-2xl overflow-hidden flex-shrink-0 border border-border/50 flex items-center justify-center cursor-pointer hover:brightness-95 transition-all relative group/img"
                            onClick={(e) => { e.stopPropagation(); window.open(art.url, '_blank'); }}
                          >
                            {art.url.startsWith('data:application/pdf') ? (
                              <div className="flex flex-col items-center gap-1">
                                <FileText size={36} className="text-red-500" />
                                <span className="text-[8px] font-black text-text-light uppercase tracking-tighter">PDF PROOF</span>
                              </div>
                            ) : (
                              <img src={art.url} alt={art.name} className="w-full h-full object-cover" />
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                              <ExternalLink size={24} className="text-white" />
                            </div>
                            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] font-black text-white uppercase tracking-widest">
                              v{art.version}.0
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <input 
                                  type="text"
                                  value={art.name}
                                  onChange={(e) => {
                                    const newArt = [...(formData.artwork || [])];
                                    const artIdx = newArt.findIndex(a => a.id === art.id);
                                    if (artIdx !== -1) {
                                      newArt[artIdx] = { ...art, name: e.target.value };
                                      setFormData({ ...formData, artwork: newArt });
                                    }
                                  }}
                                  className="text-sm font-black text-text-main truncate uppercase tracking-tight bg-transparent border-none p-0 focus:ring-0 w-full italic"
                                />
                                <div className="flex items-center gap-3 mt-1">
                                  <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">{new Date(art.uploadedAt).toLocaleString()}</p>
                                  <div className="w-1 h-1 bg-border rounded-full" />
                                  <p className="text-[9px] font-bold text-brand uppercase tracking-widest">Identity: {art.id}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <select 
                                  value={art.status}
                                  onChange={(e) => {
                                    const newArt = [...(formData.artwork || [])];
                                    const artIdx = newArt.findIndex(a => a.id === art.id);
                                    if (artIdx !== -1) {
                                      newArt[artIdx] = { ...art, status: e.target.value as any };
                                      setFormData({ ...formData, artwork: newArt });
                                    }
                                  }}
                                  className={cn(
                                    "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all cursor-pointer shadow-sm",
                                    art.status === 'Approved' ? "bg-emerald-500 text-white border-emerald-600" :
                                    art.status === 'Changes Requested' ? "bg-red-500 text-white border-red-600" :
                                    "bg-amber-50 text-amber-600 border-amber-100"
                                  )}
                                >
                                  <option value="Pending">Waiting for feedback</option>
                                  <option value="Approved">Artwork Approved</option>
                                  <option value="Changes Requested">Revisions Required</option>
                                </select>
                              </div>
                            </div>

                            <div className="relative">
                              <MessageCircle size={14} className="absolute left-4 top-4 text-text-light opacity-40" />
                              <textarea 
                                value={art.feedback || ''}
                                onChange={(e) => {
                                  const newArt = [...(formData.artwork || [])];
                                  const artIdx = newArt.findIndex(a => a.id === art.id);
                                  if (artIdx !== -1) {
                                    newArt[artIdx] = { ...art, feedback: e.target.value };
                                    setFormData({ ...formData, artwork: newArt });
                                  }
                                }}
                                placeholder="Transcription of client feedback or internal design notes..."
                                className="w-full pl-11 pr-4 py-3 bg-surface/50 border border-border/60 rounded-2xl text-[10px] font-bold text-text-main placeholder:text-text-light/40 focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all resize-none h-20"
                              />
                            </div>
                          </div>

                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const updatedArtwork = (formData.artwork || []).filter(a => a.id !== art.id);
                              setFormData({ ...formData, artwork: updatedArtwork });
                            }}
                            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-text-light hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-white shadow-lg border border-border rounded-xl"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        {art.status === 'Approved' && (
                          <div className="absolute top-0 right-0 py-1 px-4 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-[0.2em] -rotate-12 translate-x-4 -translate-y-1 shadow-md">
                            Production Ready
                          </div>
                        )}
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>

                  {(!formData.artwork || formData.artwork.length === 0) && uploadingFiles.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-text-light py-20 border-2 border-dashed border-border/20 rounded-[2.5rem] bg-gray-50/30">
                      <ImageIcon size={48} strokeWidth={1} className="mb-4 opacity-20" />
                      <h5 className="text-sm font-black uppercase tracking-widest opacity-30 italic">Pipeline Empty</h5>
                      <p className="text-[9px] font-bold uppercase tracking-widest opacity-20 mt-2">Upload initial proofs to begin client review</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-10 border-t border-border/60">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] italic">Post-Production Gallery</h3>
                <p className="text-xs font-bold text-text-main mt-1">Archive photographic evidence of completed production value</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-4">
                <div 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.multiple = true;
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (!files) return;
                      Array.from(files).forEach(file => {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64String = event.target?.result as string;
                          const newPhoto = {
                            id: Math.random().toString(36).substr(2, 9),
                            url: base64String,
                            uploadedAt: Date.now(),
                            notes: ''
                          };
                          setFormData(prev => ({
                            ...prev,
                            completionPhotos: [...(prev.completionPhotos || []), newPhoto]
                          }));
                        };
                        reader.readAsDataURL(file);
                      });
                    };
                    input.click();
                  }}
                  className="bg-emerald-50/30 border-2 border-dashed border-emerald-100 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center hover:bg-emerald-50 hover:border-emerald-200 transition-all cursor-pointer min-h-[250px] group/upload"
                >
                  <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl shadow-emerald-500/5 border border-emerald-100 flex items-center justify-center mb-6 text-emerald-500 group-hover/upload:scale-110 transition-transform">
                    <Camera size={36} />
                  </div>
                  <h4 className="text-base font-black text-emerald-600 uppercase tracking-tighter italic leading-none">Upload Media</h4>
                  <p className="text-[9px] font-bold text-text-light uppercase tracking-widest mt-3 max-w-[160px]">Capture final quality check photos</p>
                </div>
              </div>

              <div className="md:col-span-8">
                <div className="grid grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border/40">
                  {formData.completionPhotos?.slice().reverse().map((photo) => (
                    <div key={photo.id} className="relative group aspect-sqaure bg-surface rounded-3xl overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all">
                      <img src={photo.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button 
                          type="button" 
                          onClick={() => window.open(photo.url, '_blank')}
                          className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white hover:bg-white/40 transition-all"
                        >
                          <ExternalLink size={20} />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              completionPhotos: (prev.completionPhotos || []).filter(p => p.id !== photo.id)
                            }));
                          }}
                          className="p-3 bg-red-500/20 backdrop-blur-md rounded-2xl text-red-500 hover:bg-red-500/40 transition-all border border-red-500/30"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                      <div className="absolute bottom-3 left-3 bg-white/10 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20">
                         <p className="text-[7px] font-black text-white uppercase tracking-widest">{new Date(photo.uploadedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                  {(!formData.completionPhotos || formData.completionPhotos.length === 0) && (
                    <div className="col-span-3 h-60 flex flex-col items-center justify-center text-text-light/20 border-2 border-dashed border-border/10 rounded-[2.5rem] bg-gray-50/20">
                      <Camera size={48} strokeWidth={1} className="mb-4" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">Vault Ready</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-text-main uppercase tracking-widest">Workflow Line Items</h3>
              <button onClick={addItem} className="flex items-center gap-2 text-xs font-black text-brand-accent hover:bg-blue-50 px-5 py-2.5 rounded-xl border border-brand-accent/20 transition-all">
                <Plus size={16} /> Add Component
              </button>
            </div>
            
            <div className="border border-border/50 rounded-2xl overflow-hidden bg-surface shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-paper border-b border-border/50">
                  <tr>
                    <th className="px-6 py-4 text-[9px] font-black text-text-light uppercase tracking-[0.2em] w-32">Origin</th>
                    <th className="px-6 py-4 text-[9px] font-black text-text-light uppercase tracking-[0.2em]">Spec & Substrate</th>
                    <th className="px-6 py-4 text-[9px] font-black text-text-light uppercase tracking-[0.2em] w-20 text-center">Qty</th>
                    <th className="px-4 py-4 text-[9px] font-black text-text-light uppercase tracking-[0.2em] w-28">Dim (mm)</th>
                    <th className="px-4 py-4 text-[9px] font-black text-text-light uppercase tracking-[0.2em] w-28">Prod Cost (R)</th>
                    <th className="px-4 py-4 text-[9px] font-black text-text-light uppercase tracking-[0.2em] w-28">Sell Price (R)</th>
                    <th className="px-4 py-4 text-[9px] font-black text-text-light uppercase tracking-[0.2em] w-24">Markup</th>
                    <th className="px-4 py-4 text-[9px] font-black text-text-light uppercase tracking-[0.2em] w-14"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 bg-white">
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
                      <tr key={item.id} className="hover:bg-brand-accent/[0.01] transition-colors">
                        <td className="px-6 py-4">
                          <select 
                            value={item.type || 'Product'}
                            onChange={(e) => updateItem(idx, { type: e.target.value as any, originId: '' })}
                            className="w-full bg-surface border border-border/40 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-brand-accent/10"
                          >
                            <option value="Product">Product</option>
                            <option value="Material">Material</option>
                            <option value="NCR">NCR Book</option>
                            <option value="Litho">Litho Print</option>
                            <option value="Package">Package</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                             <div className="flex flex-col gap-1">
                                <select 
                                  value={item.originId || ''}
                                  onChange={(e) => updateItem(idx, { originId: e.target.value })}
                                  className="w-full bg-transparent border-none p-0 focus:ring-0 font-black text-sm text-brand uppercase tracking-tighter"
                                >
                                  <option value="">Choose item...</option>
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
                                  placeholder="Detail spec..."
                                  className="w-full bg-transparent border-none p-0 focus:ring-0 font-bold text-[10px] text-text-light italic"
                                />
                             </div>
                             {item.type === 'Product' && (
                                <div className="space-y-2">
                                  <select 
                                    value={item.materialId || ''}
                                    onChange={(e) => updateItem(idx, { materialId: e.target.value })}
                                    className="w-full bg-surface/30 border border-border/20 rounded px-1.5 py-1 text-[9px] font-black text-text-main focus:ring-1 focus:ring-brand/20 outline-none"
                                  >
                                    <option value="">Select Substrate...</option>
                                    {materials.map(m => (
                                      <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                  </select>
                                  <select 
                                    value={item.machineId || product?.defaultMachineId || ''}
                                    onChange={(e) => updateItem(idx, { machineId: e.target.value })}
                                    className="w-full bg-surface/30 border border-border/20 rounded px-1.5 py-1 text-[9px] font-black text-text-main focus:ring-1 focus:ring-brand/20 outline-none"
                                  >
                                    <option value="">Select Machine...</option>
                                    {machines.map(m => (
                                      <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                  </select>
                                </div>
                             )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input 
                            type="number" 
                            value={(item.quantity === null || item.quantity === undefined || isNaN(item.quantity)) ? '' : item.quantity}
                            onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                            className="w-full bg-transparent border-none p-0 focus:ring-0 font-black text-base text-text-main tabular-nums text-center"
                          />
                        </td>
                        <td className="px-4 py-4">
                          {isArea ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                <input 
                                  type="number" 
                                  value={(item.width === null || item.width === undefined || isNaN(item.width)) ? '' : item.width}
                                  onChange={(e) => updateItem(idx, { width: Number(e.target.value) })}
                                  className="w-full bg-surface/50 border border-border/20 px-1 py-1 text-center text-[10px] font-black tabular-nums rounded"
                                  placeholder="W"
                                />
                                <span className="text-[8px] font-black text-text-light opacity-30">×</span>
                                <input 
                                  type="number" 
                                  value={(item.length === null || item.length === undefined || isNaN(item.length)) ? '' : item.length}
                                  onChange={(e) => updateItem(idx, { length: Number(e.target.value) })}
                                  className="w-full bg-surface/50 border border-border/20 px-1 py-1 text-center text-[10px] font-black tabular-nums rounded"
                                  placeholder="L"
                                />
                              </div>
                              <span className="text-[8px] font-black text-text-light uppercase tracking-widest opacity-40 text-center">
                                {sqMmToSqM((item.width || 0) * (item.length || 0) * itemQuantity).toFixed(2)}m²
                              </span>
                            </div>
                          ) : (
                            <span className="text-[9px] font-black text-text-light opacity-30 tracking-widest flex justify-center">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col border border-border/40 rounded-lg p-2 bg-gray-50/50">
                            <div className="flex items-center gap-1 mb-1 border-b border-border/10 pb-1">
                               <span className="text-[8px] font-black text-text-light italic">UNIT</span>
                               <input 
                                  type="number" 
                                  step="0.01"
                                  value={item.unitCost || 0}
                                  onChange={(e) => updateItem(idx, { unitCost: Number(e.target.value) })}
                                  className="w-full bg-transparent border-none p-0 focus:ring-0 text-[10px] font-bold text-text-main tabular-nums text-right"
                               />
                            </div>
                            <div className="flex items-center gap-1">
                               <span className="text-[9px] font-black text-red-500">R</span>
                               <input 
                                  type="number" 
                                  step="0.01"
                                  value={item.totalCost || 0}
                                  onChange={(e) => updateItem(idx, { totalCost: Number(e.target.value) })}
                                  className="w-full bg-transparent border-none p-0 focus:ring-0 text-xs font-black text-red-500 tabular-nums text-right"
                               />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col border border-brand/20 rounded-lg p-2 bg-brand/5">
                             <div className="flex items-center gap-1 mb-1 border-b border-brand/10 pb-1">
                               <span className="text-[8px] font-black text-brand italic">UNIT</span>
                               <input 
                                  type="number" 
                                  step="0.01"
                                  value={unitSellPrice || 0}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    const factor = isArea ? (sqMmToSqM((item.width || 0) * (item.length || 0)) * itemQuantity) : itemQuantity;
                                    updateItem(idx, { totalPrice: val * factor });
                                  }}
                                  className="w-full bg-transparent border-none p-0 focus:ring-0 text-[10px] font-bold text-brand tabular-nums text-right"
                               />
                            </div>
                            <div className="flex items-center gap-1">
                               <span className="text-[9px] font-black text-brand">R</span>
                               <input 
                                  type="number" 
                                  step="0.01"
                                  value={item.totalPrice || 0}
                                  onChange={(e) => updateItem(idx, { totalPrice: Number(e.target.value) })}
                                  className="w-full bg-transparent border-none p-0 focus:ring-0 text-xs font-black text-brand tabular-nums text-right"
                               />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className={cn(
                            "flex flex-col items-center justify-center p-2 rounded-lg border",
                            ((item.totalPrice || 0) - (item.totalCost || 0)) >= 0 ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-red-50 border-red-100 text-red-600"
                          )}>
                             <span className="text-[10px] font-black italic tracking-tighter">
                               R {((item.totalPrice || 0) - (item.totalCost || 0)).toFixed(2)}
                             </span>
                             <span className="text-[7px] font-black uppercase tracking-[0.2em] mt-1 opacity-60">
                               {(((item.totalPrice || 0) - (item.totalCost || 0)) / (item.totalCost || 1) * 100).toFixed(0)}% GP
                             </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => removeItem(idx)} className="text-text-light hover:text-red-500 transition-colors opacity-30 hover:opacity-100">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-text-muted font-bold italic opacity-40 text-[10px] uppercase tracking-widest">
                        Workflow is empty. Add components to begin fabrication job.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-8 bg-paper border-t border-border no-print">
          <div className="grid grid-cols-4 gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-text-light uppercase tracking-[0.2em] mb-2 leading-none">Total Production Cost</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-black text-text-light italic">ZAR</span>
                <span className="text-3xl font-black text-red-500 tracking-tighter italic tabular-nums">
                  {items.reduce((sum, item) => sum + (item.totalCost || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-black text-brand-accent uppercase tracking-[0.2em] mb-2 leading-none">Gross Profit (GP)</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-black text-text-light italic">ZAR</span>
                <span className="text-3xl font-black text-emerald-600 tracking-tighter italic tabular-nums">
                  {totals.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-black text-text-light uppercase tracking-[0.2em] mb-2 leading-none">GP Margin</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-text-main tracking-tighter italic tabular-nums">
                  {totals.total > 0 ? (((totals.total / 1.15) - items.reduce((sum, item) => sum + (item.totalCost || 0), 0)) / (totals.total / 1.15) * 100).toFixed(1) : '0.0'}
                </span>
                <span className="text-xs font-black text-text-light">%</span>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-brand uppercase tracking-[0.2em] mb-2 leading-none">Invoiced Value (Incl. VAT)</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-black text-text-light italic">ZAR</span>
                <span className="text-4xl font-black text-brand tracking-tighter italic tabular-nums">
                  {totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-8 pt-8 border-t border-border">
            <div className="flex items-center gap-4">
               {/* Metadata / Logs */}
               <div className="px-4 py-2 bg-gray-50 rounded-xl border border-border/50">
                  <span className="text-[9px] font-black text-text-light uppercase tracking-widest block mb-0.5">Automated Calculation</span>
                  <span className="text-[10px] font-black text-text-main uppercase tracking-tighter italic">Precision Grade-A Logic Applied</span>
               </div>
            </div>
            
            <div className="flex items-center gap-4">
              {job && (
                <div className="flex items-center gap-2 mr-6 border-r border-border pr-6">
                  <button 
                    onClick={handleDownloadPDF}
                    title="Download Job Card PDF"
                    disabled={isProcessing}
                    className="p-3 bg-white border border-border rounded-xl text-text-light hover:text-brand hover:border-brand transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download size={18} className={cn(isProcessing && "animate-bounce")} />
                  </button>
                  <button 
                    onClick={handlePrintPDF}
                    title="Print Job Card"
                    disabled={isProcessing}
                    className="p-3 bg-white border border-border rounded-xl text-text-light hover:text-brand hover:border-brand transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Printer size={18} className={cn(isProcessing && "animate-bounce")} />
                  </button>
                  <button 
                    onClick={handleEmailPDF}
                    title="Send via Email"
                    disabled={isProcessing}
                    className="p-3 bg-white border border-border rounded-xl text-text-light hover:text-amber-500 hover:border-amber-500 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Mail size={18} className={cn(isProcessing && "animate-bounce")} />
                  </button>
                  <button 
                    onClick={handleArtworkWhatsAppShare}
                    title="Send Artwork for Approval (WhatsApp)"
                    disabled={isProcessing}
                    className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ImageIcon size={18} className={cn(isProcessing && "animate-bounce")} />
                  </button>
                  <button 
                    onClick={handleWhatsAppShare}
                    title="Share via WhatsApp"
                    disabled={isProcessing}
                    className="p-3 bg-white border border-border rounded-xl text-text-light hover:text-emerald-500 hover:border-emerald-500 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MessageCircle size={18} className={cn(isProcessing && "animate-bounce")} />
                  </button>
                </div>
              )}
              <button onClick={onClose} disabled={isSaving || isProcessing} className="px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-text-muted hover:bg-surface border border-border/50 transition-all disabled:opacity-50">Abort Entry</button>
              <button 
                onClick={handleSave} 
                disabled={isSaving || isProcessing}
                className="px-10 py-4 bg-brand text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:-translate-y-1 transition-all flex items-center gap-3 disabled:opacity-70 disabled:translate-y-0"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 size={18} strokeWidth={3} />
                )}
                {isSaving ? 'Synchronizing...' : 'Commit to Registry'}
              </button>
            </div>
          </div>
        </div>

        {showSuccess && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="w-20 h-20 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center mb-6 shadow-xl shadow-emerald-200 animate-in zoom-in duration-500 delay-100">
              <CheckCircle2 size={40} strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-text-main tracking-tighter uppercase italic">Registry Updated</h3>
            <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-2">Production flow has been recalculated</p>
          </div>
        )}
      </div>
    </div>
  );
}
