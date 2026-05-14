import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calculator, AlertCircle, Package as PackageIcon, Book, Layers, Box, Calendar, Clock, CheckCircle2, Image as ImageIcon, Share2, Send, MessageCircle, ExternalLink, Download, Printer, Mail, Upload, FileText } from 'lucide-react';
import { Job, QuoteItem, Client, Product, PricingSettings, Material, Machine, NCRBook, Package, JobStage, JobPriority, Department, CompanySettings, LithoProduct } from '../types';
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
  const [newArtworkUrl, setNewArtworkUrl] = useState('');
  const [newArtworkName, setNewArtworkName] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'artwork' | 'items'>('details');
  const artworkFileRef = React.useRef<HTMLInputElement>(null);

  const handleArtworkFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('jpeg') && !file.type.includes('jpg') && !file.type.includes('pdf')) {
      toast.error('Please upload a JPEG or PDF file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setNewArtworkUrl(base64String);
      if (!newArtworkName) {
        setNewArtworkName(file.name);
      }
    };
    reader.readAsDataURL(file);
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
        // Fetch real sequence number for new jobs
        const sequence = await getNextSequence('jobs');
        const year = new Date().getFullYear();
        const jobNumber = sequence 
          ? `Jobcard-${year}-${sequence.toString()}`
          : `Jobcard-${year}-${Math.floor(Math.random() * 90000 + 10000)}`;

        setFormData({
          jobNumber,
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

    if (updates.type && updates.type !== currentItem.type) {
      originId = '';
      updates.originId = '';
    }

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

    if ('totalPrice' in updates) {
      item.totalPrice = updates.totalPrice!;
      item.totalCost = item.totalPrice / activeMarkup;
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

  const handleAddArtwork = () => {
    if (!newArtworkUrl) return;
    const artwork = formData.artwork || [];
    const newArt = {
      id: Math.random().toString(36).substr(2, 9),
      url: newArtworkUrl,
      name: newArtworkName || `Proof v${artwork.length + 1}`,
      status: 'Pending' as const,
      version: (artwork.length + 1),
      uploadedAt: Date.now()
    };
    setFormData({ ...formData, artwork: [...artwork, newArt] });
    setNewArtworkUrl('');
    setNewArtworkName('');
  };

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
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
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
        createdAt: Number(formData.createdAt) || Date.now(),
        productName: formData.productName || (items.length > 0 ? items[0].description : 'Custom Production'),
      };

      if (job?.id) {
        await updateDocument('jobs', job.id, finalData);
      } else {
        const year = new Date().getFullYear();
        const sequence = await getNextSequence(`jobs_${year}`);
        finalData.jobNumber = `Jobcard-${year}-${sequence || Math.floor(Math.random() * 1000)}`;
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
            <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.2em] mb-6">Artwork Proofing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-brand/5 border border-brand/10 p-6 rounded-3xl h-fit">
                <label className="block text-[10px] font-black text-brand uppercase tracking-widest mb-4">Artwork & Design Proofs</label>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-brand-accent/60 uppercase tracking-widest ml-1">Proof Label</label>
                    <input 
                      type="text" 
                      value={newArtworkName}
                      onChange={(e) => setNewArtworkName(e.target.value)}
                      placeholder="e.g. Front Final, Inside Pages..."
                      className="w-full px-4 py-3 bg-white border border-brand/20 rounded-xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-brand/10"
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <input 
                      type="file"
                      ref={artworkFileRef}
                      onChange={handleArtworkFileUpload}
                      accept=".jpg,.jpeg,image/jpeg,.pdf,application/pdf"
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => artworkFileRef.current?.click()}
                        className="flex-1 px-4 py-3 bg-white border border-brand/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand hover:bg-brand/5 flex items-center justify-center gap-2 border-dashed"
                      >
                        <Upload size={14} /> Upload JPG/PDF
                      </button>
                      <button 
                        type="button" 
                        onClick={handleAddArtwork}
                        disabled={!newArtworkUrl}
                        className="px-6 py-3 bg-brand text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        <Plus size={14} /> Add Proof
                      </button>
                    </div>
                    {newArtworkUrl && (
                      <div className="p-3 bg-white/50 border border-brand/10 rounded-xl flex items-center justify-between">
                        <span className="text-[9px] font-black text-brand truncate max-w-[150px] uppercase italic">{newArtworkName || 'Ready to add...'}</span>
                        <button onClick={() => { setNewArtworkUrl(''); setNewArtworkName(''); }} className="text-red-500 hover:text-red-600">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {formData.artwork && formData.artwork.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-brand/10 space-y-4">
                    <p className="text-[9px] font-black text-brand-accent uppercase tracking-widest">Share Approval Link</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        type="button" 
                        onClick={handleArtworkWhatsAppShare}
                        disabled={!job?.id}
                        className="flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:brightness-110 disabled:opacity-50"
                      >
                        <MessageCircle size={14} /> WhatsApp
                      </button>
                      <button 
                        type="button" 
                        onClick={handleArtworkEmailShare}
                        disabled={!job?.id}
                        className="flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:brightness-110 disabled:opacity-50"
                      >
                        <Mail size={14} /> Email
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border">
                {formData.artwork?.map((art, artIdx) => (
                  <div key={art.id} className="bg-white p-6 rounded-3xl border border-border group relative overflow-hidden">
                    <div className="flex gap-6">
                      <div 
                        className="w-24 h-24 bg-gray-50 rounded-2xl overflow-hidden flex-shrink-0 border border-border/50 flex items-center justify-center cursor-pointer hover:brightness-95 transition-all relative group/img"
                        onClick={() => window.open(art.url, '_blank')}
                      >
                        {art.url.startsWith('data:application/pdf') ? (
                          <div className="flex flex-col items-center gap-1">
                            <FileText size={32} className="text-red-500" />
                            <span className="text-[8px] font-black text-text-light uppercase tracking-tighter">PDF PROOF</span>
                          </div>
                        ) : (
                          <img src={art.url} alt={art.name} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                          <ExternalLink size={20} className="text-white" />
                        </div>
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] font-black text-white uppercase tracking-widest">
                          v{art.version}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <input 
                              type="text"
                              value={art.name}
                              onChange={(e) => {
                                const newArt = [...(formData.artwork || [])];
                                newArt[artIdx] = { ...art, name: e.target.value };
                                setFormData({ ...formData, artwork: newArt });
                              }}
                              className="text-[10px] font-black text-text-main truncate uppercase tracking-tight bg-transparent border-none p-0 focus:ring-0 w-full"
                            />
                            <p className="text-[9px] font-bold text-text-light mt-1">{new Date(art.uploadedAt).toLocaleString()}</p>
                          </div>
                          <select 
                            value={art.status}
                            onChange={(e) => {
                              const newArt = [...(formData.artwork || [])];
                              newArt[artIdx] = { ...art, status: e.target.value as any };
                              setFormData({ ...formData, artwork: newArt });
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all cursor-pointer",
                              art.status === 'Approved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                              art.status === 'Changes Requested' ? "bg-red-50 text-red-600 border-red-100" :
                              "bg-amber-50 text-amber-600 border-amber-100"
                            )}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Changes Requested">Changes Requested</option>
                          </select>
                        </div>

                        <div className="relative">
                          <MessageCircle size={12} className="absolute left-3 top-3 text-text-light opacity-40" />
                          <textarea 
                            value={art.feedback || ''}
                            onChange={(e) => {
                              const newArt = [...(formData.artwork || [])];
                              newArt[artIdx] = { ...art, feedback: e.target.value };
                              setFormData({ ...formData, artwork: newArt });
                            }}
                            placeholder="Add artwork feedback or instructions..."
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-border rounded-xl text-[10px] font-bold text-text-main placeholder:text-text-light/40 focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all resize-none h-16"
                          />
                        </div>
                      </div>

                      <button 
                        type="button"
                        onClick={() => {
                          const updatedArtwork = (formData.artwork || []).filter(a => a.id !== art.id);
                          setFormData({ ...formData, artwork: updatedArtwork });
                        }}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-text-light hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-white shadow-sm border border-border rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {(!formData.artwork || formData.artwork.length === 0) && (
                  <div className="h-full flex flex-col items-center justify-center text-text-light py-10">
                    <ImageIcon size={32} strokeWidth={1} className="mb-2 opacity-30" />
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40">No proofs yet</span>
                  </div>
                )}
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
                    <th className="px-6 py-4 text-[9px] font-black text-text-light uppercase tracking-[0.2em] w-36">Origin</th>
                    <th className="px-6 py-4 text-[9px] font-black text-text-light uppercase tracking-[0.2em]">Specification</th>
                    <th className="px-6 py-4 text-[9px] font-black text-text-light uppercase tracking-[0.2em]">Substrate</th>
                    <th className="px-6 py-4 text-[9px] font-black text-text-light uppercase tracking-[0.2em] w-20">Qty</th>
                    <th className="px-6 py-4 text-[9px] font-black text-text-light uppercase tracking-[0.2em] w-36">Metric (mm)</th>
                    <th className="px-6 py-4 text-[9px] font-black text-text-light uppercase tracking-[0.2em] w-28">Rate (R)</th>
                    <th className="px-6 py-4 text-[9px] font-black text-text-light uppercase tracking-[0.2em] w-28">Total (R)</th>
                    <th className="px-6 py-4 text-[9px] font-black text-text-light uppercase tracking-[0.2em] w-14"></th>
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
                          <div className="flex flex-col gap-1">
                            <select 
                              value={item.originId || ''}
                              onChange={(e) => updateItem(idx, { originId: e.target.value })}
                              className="w-full bg-transparent border-none p-0 focus:ring-0 font-black text-sm text-brand uppercase tracking-tighter mb-1"
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
                              className="w-full bg-transparent border-none p-0 focus:ring-0 font-bold text-xs text-text-light italic"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {item.type === 'Product' ? (
                            <select 
                              value={item.materialId || ''}
                              onChange={(e) => updateItem(idx, { materialId: e.target.value })}
                              className="w-full bg-transparent border-none p-0 focus:ring-0 font-black text-xs text-text-main"
                            >
                              <option value="">Stock...</option>
                              {materials.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-[9px] font-black text-text-light uppercase tracking-widest opacity-20">Base</span>
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
                            <div className="flex items-center gap-1">
                            <input 
                                type="number" 
                                value={(item.width === null || item.width === undefined || isNaN(item.width)) ? '' : item.width}
                                onChange={(e) => updateItem(idx, { width: Number(e.target.value) })}
                                className="w-14 bg-surface/50 border border-border/20 px-2 py-2 text-center text-xs font-black tabular-nums rounded-lg"
                                placeholder="W"
                              />
                              <span className="text-[10px] font-black text-text-light opacity-30">×</span>
                              <input 
                                type="number" 
                                value={(item.length === null || item.length === undefined || isNaN(item.length)) ? '' : item.length}
                                onChange={(e) => updateItem(idx, { length: Number(e.target.value) })}
                                className="w-14 bg-surface/50 border border-border/20 px-2 py-2 text-center text-xs font-black tabular-nums rounded-lg"
                                placeholder="L"
                              />
                            </div>
                          ) : (
                            <span className="text-[9px] font-black text-text-light opacity-30 tracking-widest">UNIT</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-text-light font-bold">R</span>
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
                        </td>
                        <td className="px-6 py-4">
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
                            <span className="text-[8px] font-black text-text-light uppercase tracking-widest opacity-40 block mt-1">
                              {sqMmToSqM((item.width || 0) * (item.length || 0) * itemQuantity).toFixed(2)} m² Total
                            </span>
                          )}
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

        <div className="p-8 bg-paper border-t border-border flex items-center justify-between shrink-0 no-print">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-brand-accent uppercase tracking-[0.2em] mb-1 leading-none">Job Value Estimation</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-black text-text-light italic">ZAR</span>
              <span className="text-4xl font-black text-text-main tracking-tighter italic">
                {totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
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
