import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Printer, X, Box, Search, ExternalLink, Copy, Filter, ArrowRight, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useCollection, createDocument, updateDocument, deleteDocument } from '../lib/firestoreService';
import { LithoProduct, LithoPricingTier } from '../types';
import QuoteModal from '../components/QuoteModal';
import { toast } from 'sonner';

const CATEGORIES = ['All', 'Business Cards', 'Flyers', 'Folders', 'Postcards', 'Brochures', 'Letterheads', 'Other'];

export default function LithoProducts() {
  const { data: products, loading } = useCollection<LithoProduct>('litho_products');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<LithoProduct | null>(null);
  const [prefilledItem, setPrefilledItem] = useState<{ type: string; originId: string; quantity: number } | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleAddToQuote = (productId: string, qty: number) => {
    setPrefilledItem({ type: 'Litho', originId: productId, quantity: qty });
    setIsQuoteModalOpen(true);
  };

  const handleDuplicate = async (product: LithoProduct) => {
    try {
      const { id, ...duplicateData } = product;
      await createDocument('litho_products', {
        ...duplicateData,
        name: `${product.name} (Copy)`,
        createdAt: Date.now()
      });
      toast.success('Product specification duplicated');
    } catch (error) {
      console.error('Error duplicating product:', error);
      toast.error('Failed to duplicate product');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this litho product specification?')) {
      setIsUpdating(id);
      try {
        await deleteDocument('litho_products', id);
        toast.success('Product removed from registry');
      } finally {
        setIsUpdating(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full" 
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col"
      >
        <div className="flex items-center gap-4 mb-2">
          <div className="w-10 h-10 bg-brand-accent/10 rounded-xl flex items-center justify-center text-brand-accent border border-brand-accent/20">
            <Layers size={20} strokeWidth={2.5} />
          </div>
          <h2 className="text-4xl font-black text-text-main tracking-tighter uppercase italic leading-none">Litho Registry</h2>
        </div>
        <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] ml-14">Standard configuration with tier-based pricing matrix</p>
      </motion.header>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative group w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-brand-accent transition-colors" size={18} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search specifications..." 
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-border rounded-2xl text-[11px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => {
                setEditingProduct(null);
                setIsRegisterOpen(true);
              }}
              className="flex-1 md:flex-none bg-brand-accent text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:shadow-lg hover:shadow-brand-accent/20 transition-all flex items-center justify-center gap-3 active:scale-95 group"
            >
              <Plus size={18} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
              New Specification
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border",
                selectedCategory === cat 
                  ? "bg-text-main text-white border-text-main shadow-md" 
                  : "bg-white text-text-light border-border hover:border-brand-accent/50 hover:text-brand-accent"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredProducts.map((product, index) => (
            <motion.div 
              layout
              key={product.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "card-minimal p-8 flex flex-col relative overflow-hidden group border-r-4 border-brand-accent/30 transition-all hover:translate-y-[-4px]",
                isUpdating === product.id && "opacity-50 pointer-events-none"
              )}
            >
              <div className="absolute inset-0 grid-structure opacity-[0.015] pointer-events-none" />
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-paper border border-border/50 rounded-2xl flex items-center justify-center text-brand-accent shadow-sm group-hover:bg-brand-accent group-hover:text-white transition-all ring-4 ring-transparent group-hover:ring-brand-accent/10">
                    <Printer size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <span className="px-2 py-0.5 bg-brand-accent/10 text-brand-accent text-[8px] font-black uppercase tracking-[0.2em] rounded-md border border-brand-accent/20">
                      {product.category}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all translate-y-[-4px] group-hover:translate-y-0">
                  <button 
                    onClick={() => handleDuplicate(product)}
                    title="Duplicate Specification"
                    className="p-2.5 bg-white border border-border rounded-xl text-text-light hover:text-brand-accent hover:border-brand-accent/30 transition-all shadow-sm"
                  >
                    <Copy size={16} />
                  </button>
                  <button 
                    onClick={() => {
                      setEditingProduct(product);
                      setIsRegisterOpen(true);
                    }}
                    className="p-2.5 bg-white border border-border rounded-xl text-text-light hover:text-brand-accent hover:border-brand-accent/30 transition-all shadow-sm"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(product.id)}
                    className="p-2.5 bg-white border border-border rounded-xl text-text-light hover:text-red-500 hover:border-red-100 transition-all shadow-sm"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="relative z-10 mb-8">
                <h3 className="text-xl font-black text-text-main tracking-tighter uppercase italic leading-tight group-hover:text-brand-accent transition-colors">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="text-[10px] font-medium text-text-light mt-1 line-clamp-1 italic opacity-70">{product.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-6 relative z-10 mb-8 p-5 bg-paper/50 rounded-2xl border border-border/10">
                <div>
                  <span className="text-[8px] text-text-muted uppercase font-black tracking-widest block mb-1">Material Stock</span>
                  <span className="text-xs font-black text-text-main italic line-clamp-1">{product.paperType}</span>
                </div>
                <div>
                  <span className="text-[8px] text-text-muted uppercase font-black tracking-widest block mb-1">Dimensions</span>
                  <span className="text-xs font-black text-text-main italic">{product.size}</span>
                </div>
                {product.finishing && (
                  <div className="col-span-2 pt-3 border-t border-border/20">
                    <span className="text-[8px] text-text-muted uppercase font-black tracking-widest block mb-1">Finishing Protocol</span>
                    <span className="text-[11px] font-black text-text-main italic uppercase tracking-tight">{product.finishing}</span>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-6 border-t border-border/30 relative z-10">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[9px] text-text-light font-black uppercase tracking-[0.2em] opacity-40 italic">Pricing Matrix</span>
                  <span className="text-[8px] text-brand-accent font-black uppercase tracking-widest">Unit Price Inc.</span>
                </div>
                <div className="space-y-2">
                  {(product.pricingGrid || []).map((tier, i) => (
                    <button 
                      key={i}
                      onClick={() => handleAddToQuote(product.id, tier.quantity)}
                      className="w-full flex justify-between items-center px-4 py-3 bg-white hover:bg-brand-accent group/tier border border-border/50 rounded-xl transition-all shadow-sm group-hover:border-brand-accent/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-paper flex items-center justify-center text-[10px] font-black text-text-main group-hover/tier:bg-white/20 group-hover/tier:text-white transition-colors">
                          {tier.quantity}
                        </div>
                        <div className="flex flex-col items-start transition-colors group-hover/tier:text-white">
                          <span className="text-[9px] font-black text-text-main uppercase tracking-tighter group-hover/tier:text-white">Batch Order</span>
                          <span className="text-[8px] font-bold text-text-light uppercase tracking-widest group-hover/tier:text-white/60">R{(tier.sell / tier.quantity).toFixed(2)} / unit</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-brand-accent tabular-nums italic group-hover/tier:text-white">R{tier.sell.toFixed(0)}</span>
                        <ArrowRight size={14} className="opacity-0 group-hover/tier:opacity-100 group-hover/tier:translate-x-1 transition-all text-brand-accent group-hover/tier:text-white" />
                      </div>
                    </button>
                  ))}
                  {(!product.pricingGrid || product.pricingGrid.length === 0) && (
                    <div className="text-[10px] text-text-muted italic opacity-40 py-6 text-center bg-paper rounded-xl border border-dashed border-border uppercase tracking-widest font-black">
                      No tiers defined
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {filteredProducts.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full py-40 text-center card-minimal"
          >
             <div className="w-24 h-24 bg-brand-accent/5 text-brand-accent/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-brand-accent/10 relative">
                <Box size={40} strokeWidth={1.5} />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute inset-0 bg-brand-accent rounded-[2rem] -z-10"
                />
             </div>
             <h3 className="text-2xl font-black text-text-main tracking-tighter uppercase italic">Registry Empty</h3>
             <p className="text-[10px] font-black text-text-light uppercase tracking-[0.2em] mt-3 opacity-50">Modify search criteria or register a new litho specification</p>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {isRegisterOpen && (
          <RegisterModal 
            product={editingProduct} 
            onClose={() => setIsRegisterOpen(false)} 
          />
        )}
      </AnimatePresence>

      {isQuoteModalOpen && (
        <QuoteModal 
          isOpen={true}
          prefilledItem={prefilledItem}
          onClose={() => {
            setIsQuoteModalOpen(false);
            setPrefilledItem(null);
          }}
        />
      )}
    </div>
  );
}

function RegisterModal({ product, onClose }: { product: LithoProduct | null, onClose: () => void }) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<LithoProduct>>({
    name: product?.name || '',
    category: product?.category || 'Business Cards',
    description: product?.description || '',
    size: product?.size || '90x50mm',
    paperType: product?.paperType || '350gsm Silk',
    finishing: product?.finishing || '',
    colorProfile: product?.colorProfile || 'CMYK',
    bleedRequirement: product?.bleedRequirement || '3mm',
    turnaroundTime: product?.turnaroundTime || '5-7 business days',
    status: product?.status || 'Active',
    pricingGrid: product?.pricingGrid || [{ quantity: 100, cost: 0, sell: 0 }]
  });

  const updateTier = (index: number, updates: Partial<LithoPricingTier>) => {
    const newGrid = [...(formData.pricingGrid || [])];
    newGrid[index] = { ...newGrid[index], ...updates };
    setFormData({ ...formData, pricingGrid: newGrid });
  };

  const addTier = () => {
    const lastQty = formData.pricingGrid?.[formData.pricingGrid.length - 1]?.quantity || 100;
    setFormData({ 
      ...formData, 
      pricingGrid: [...(formData.pricingGrid || []), { quantity: lastQty + 100, cost: 0, sell: 0 }] 
    });
  };

  const removeTier = (index: number) => {
    setFormData({ 
      ...formData, 
      pricingGrid: (formData.pricingGrid || []).filter((_, i) => i !== index) 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (product?.id) {
        await updateDocument('litho_products', product.id, formData);
        toast.success('Specifications updated successfully');
      } else {
        await createDocument('litho_products', { ...formData, createdAt: Date.now() });
        toast.success('New product registered in registry');
      }
      onClose();
    } catch (error) {
      console.error('Error saving litho product:', error);
      toast.error('Failed to save product specifications.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-text-main/40 backdrop-blur-md overflow-y-auto pt-10 sm:pt-20"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col overflow-hidden relative mb-10 sm:mb-20"
      >
        <div className="px-10 py-10 bg-paper border-b border-border flex justify-between items-start shrink-0">
          <div>
            <div className="w-10 h-10 bg-brand-accent/10 rounded-xl flex items-center justify-center text-brand-accent mb-4 border border-brand-accent/20">
              <Plus size={20} />
            </div>
            <h3 className="text-3xl font-black text-text-main tracking-tighter uppercase italic">{product ? 'Edit Specs' : 'New Litho Spec'}</h3>
            <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-2">Configure standard production parameters</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-4 bg-white hover:bg-red-50 text-text-light hover:text-red-500 rounded-2xl transition-all border border-border hover:border-red-100 shadow-sm"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-12 space-y-10 custom-scrollbar">
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="col-span-full">
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3 ml-1">Product Designation</label>
                <input 
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-7 py-5 bg-gray-50 border border-border rounded-[1.5rem] font-black text-lg focus:ring-8 focus:ring-brand-accent/3 focus:border-brand-accent transition-all"
                  placeholder="e.g. PREMIUM BUSINESS CARDS"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3 ml-1">Production Class</label>
                <div className="relative">
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-7 py-5 bg-gray-50 border border-border rounded-[1.5rem] font-black appearance-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent transition-all cursor-pointer"
                  >
                    {CATEGORIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <Filter className="absolute right-6 top-1/2 -translate-y-1/2 text-text-light pointer-events-none" size={16} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3 ml-1">Trim Size</label>
                <input 
                  type="text"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  className="w-full px-7 py-5 bg-gray-50 border border-border rounded-[1.5rem] font-black focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent transition-all"
                  placeholder="90x50mm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3 ml-1">Paper / Stock</label>
                <input 
                   type="text"
                   value={formData.paperType}
                   onChange={(e) => setFormData({ ...formData, paperType: e.target.value })}
                   className="w-full px-7 py-5 bg-gray-50 border border-border rounded-[1.5rem] font-black focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent transition-all"
                   placeholder="350gsm Silk"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3 ml-1">Finishing Protocol</label>
                <input 
                   type="text"
                   value={formData.finishing}
                   onChange={(e) => setFormData({ ...formData, finishing: e.target.value })}
                   className="w-full px-7 py-5 bg-gray-50 border border-border rounded-[1.5rem] font-black focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent transition-all"
                   placeholder="e.g. Matt Lamination"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3 ml-1">Color Profile</label>
                <input 
                   type="text"
                   value={formData.colorProfile}
                   onChange={(e) => setFormData({ ...formData, colorProfile: e.target.value })}
                   className="w-full px-7 py-5 bg-gray-50 border border-border rounded-[1.5rem] font-black focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent transition-all"
                   placeholder="e.g. CMYK Fogra39"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3 ml-1">Bleed Requirement</label>
                <input 
                   type="text"
                   value={formData.bleedRequirement}
                   onChange={(e) => setFormData({ ...formData, bleedRequirement: e.target.value })}
                   className="w-full px-7 py-5 bg-gray-50 border border-border rounded-[1.5rem] font-black focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent transition-all"
                   placeholder="e.g. 3mm all rounded"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3 ml-1">Turnaround Time</label>
                <input 
                   type="text"
                   value={formData.turnaroundTime}
                   onChange={(e) => setFormData({ ...formData, turnaroundTime: e.target.value })}
                   className="w-full px-7 py-5 bg-gray-50 border border-border rounded-[1.5rem] font-black focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent transition-all"
                   placeholder="e.g. 5-7 business days"
                />
              </div>
            </div>

            <div className="pt-10 border-t border-border/20">
              <div className="flex justify-between items-end mb-8">
                 <div>
                    <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-1">Pricing Tiers</label>
                    <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Base cost vs total selling price</p>
                 </div>
                 <button 
                    type="button" 
                    onClick={addTier}
                    className="flex items-center gap-2 px-5 py-2.5 bg-brand-accent/5 text-brand-accent rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-accent hover:text-white transition-all shadow-sm shadow-brand-accent/5"
                 >
                   <Plus size={14} strokeWidth={3} /> Add Tier
                 </button>
              </div>
              
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {(formData.pricingGrid || []).map((tier, idx) => (
                    <motion.div 
                      layout
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex gap-4 items-center group bg-paper/50 p-4 rounded-[1.5rem] border border-border/50"
                    >
                      <div className="w-10 h-10 bg-white border border-border rounded-xl flex items-center justify-center text-[11px] font-black text-text-light/40 italic">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <span className="block text-[8px] font-black text-text-light uppercase mb-1 ml-1">Qty</span>
                        <input 
                           type="number"
                           value={tier.quantity}
                           onChange={(e) => updateTier(idx, { quantity: parseInt(e.target.value) || 0 })}
                           className="w-full px-4 py-3 bg-white border border-border rounded-xl font-black text-sm text-center focus:ring-4 focus:ring-brand-accent/5 transition-all"
                        />
                      </div>
                      <div className="flex-1 relative">
                        <span className="block text-[8px] font-black text-text-light uppercase mb-1 ml-1">Prod Cost</span>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-text-light font-bold">R</span>
                          <input 
                             type="number"
                             step="0.01"
                             value={tier.cost}
                             onChange={(e) => updateTier(idx, { cost: parseFloat(e.target.value) || 0 })}
                             className="w-full pl-7 pr-3 py-3 bg-white border border-border rounded-xl font-bold text-sm text-text-muted/60 focus:ring-4 focus:ring-brand-accent/5 transition-all"
                          />
                        </div>
                      </div>
                      <div className="flex-1 relative">
                        <span className="block text-[8px] font-black text-brand-accent uppercase mb-1 ml-1">Sell (Batch)</span>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-brand-accent font-bold italic">R</span>
                          <input 
                             type="number"
                             step="0.01"
                             value={tier.sell}
                             onChange={(e) => updateTier(idx, { sell: parseFloat(e.target.value) || 0 })}
                             className="w-full pl-8 pr-3 py-3 bg-white border-2 border-brand-accent/30 rounded-xl font-black text-sm text-brand-accent shadow-sm focus:ring-4 focus:ring-brand-accent/5 transition-all"
                          />
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeTier(idx)}
                        disabled={(formData.pricingGrid || []).length <= 1}
                        className="p-3 bg-white text-text-light hover:text-red-500 border border-border rounded-xl hover:border-red-100 disabled:opacity-0 transition-all shadow-sm mt-4"
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </form>

        <div className="px-12 py-10 bg-paper border-t border-border flex gap-5">
          <button 
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-10 py-5 bg-white text-text-light font-black text-[10px] uppercase tracking-[0.2em] rounded-[1.5rem] hover:bg-gray-50 border border-border transition-all flex-1 font-bold disabled:opacity-50"
          >
            Discard
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-10 py-5 bg-brand-accent text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-[1.5rem] hover:shadow-2xl hover:shadow-brand-accent/30 transition-all active:scale-95 flex-1 flex items-center justify-center gap-3 disabled:opacity-70"
          >
            {isSaving ? (
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full" 
              />
            ) : (
              <ExternalLink size={18} strokeWidth={2.5} />
            )}
            {product ? 'Commit Changes' : 'Publish to Registry'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
