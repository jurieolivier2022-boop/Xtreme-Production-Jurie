import React, { useState, useMemo } from 'react';
import { Calculator, Plus, Edit2, Trash2, Printer, X, Box, Search, ExternalLink } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useCollection, createDocument, updateDocument, deleteDocument } from '../lib/firestoreService';
import { LithoProduct, LithoPricingTier } from '../types';
import QuoteModal from '../components/QuoteModal';

export default function LithoProducts() {
  const { data: products, loading } = useCollection<LithoProduct>('litho_products');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<LithoProduct | null>(null);
  const [prefilledItem, setPrefilledItem] = useState<{ type: string; originId: string; quantity: number } | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleAddToQuote = (productId: string, qty: number) => {
    setPrefilledItem({ type: 'Litho', originId: productId, quantity: qty });
    setIsQuoteModalOpen(true);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this litho product specification?')) {
      setIsUpdating(id);
      try {
        await deleteDocument('litho_products', id);
      } finally {
        setIsUpdating(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700">
      <header className="flex flex-col">
        <h2 className="text-4xl font-black text-text-main tracking-tighter uppercase italic">Litho Printing Registry</h2>
        <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-2">Manage standard litho items like business cards, flyers & folders</p>
      </header>

      <div className="flex items-center justify-between">
        <div className="relative group w-full max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-brand-accent transition-colors" size={18} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search litho products..." 
            className="w-full pl-12 pr-4 py-3 bg-paper border border-border rounded-xl text-[11px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent transition-all shadow-sm"
          />
        </div>
        <button 
          onClick={() => {
            setEditingProduct(null);
            setIsRegisterOpen(true);
          }}
          className="bg-brand-accent text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:shadow-lg hover:shadow-brand-accent/20 transition-all flex items-center gap-3 active:scale-95"
        >
          <Plus size={18} strokeWidth={3} />
          Add Litho Product
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredProducts.map((product) => (
          <div 
            key={product.id} 
            className={cn(
              "card-minimal p-8 flex flex-col relative overflow-hidden group border-r-4 border-brand-accent/20 transition-all",
              isUpdating === product.id && "opacity-50 pointer-events-none"
            )}
          >
            <div className="absolute inset-0 grid-structure opacity-[0.015] pointer-events-none" />
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="w-12 h-12 bg-surface border border-border/50 rounded-2xl flex items-center justify-center text-brand-accent shadow-sm">
                <Printer size={24} strokeWidth={2} />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => {
                    setEditingProduct(product);
                    setIsRegisterOpen(true);
                  }}
                  className="p-2 text-text-light hover:text-brand-accent transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(product.id)}
                  className="p-2 text-text-light hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="relative z-10 mb-8">
              <h3 className="text-xl font-black text-text-main tracking-tighter uppercase italic leading-tight group-hover:text-brand-accent transition-colors">{product.name}</h3>
              <p className="text-[10px] font-bold text-text-light uppercase tracking-widest mt-2">{product.category}</p>
            </div>

            <div className="grid grid-cols-2 gap-6 relative z-10 mb-8">
              <div>
                <span className="text-[8px] text-text-light uppercase font-black tracking-widest block mb-1">Stock</span>
                <span className="text-sm font-black text-text-main italic">{product.paperType}</span>
              </div>
              <div>
                <span className="text-[8px] text-text-light uppercase font-black tracking-widest block mb-1">Dimensions</span>
                <span className="text-sm font-black text-text-main italic">{product.size}</span>
              </div>
              {product.finishing && (
                <div className="col-span-2">
                  <span className="text-[8px] text-text-light uppercase font-black tracking-widest block mb-1">Finishing</span>
                  <span className="text-sm font-black text-text-main italic uppercase text-[11px]">{product.finishing}</span>
                </div>
              )}
            </div>

            <div className="mt-auto pt-6 border-t border-border/30 relative z-10">
              <span className="text-[10px] text-text-light font-black uppercase tracking-widest block mb-4 opacity-50 italic">Batch Pricing lookup</span>
              <div className="space-y-3">
                {(product.pricingGrid || []).map((tier, i) => (
                  <button 
                    key={i}
                    onClick={() => handleAddToQuote(product.id, tier.quantity)}
                    className="w-full flex justify-between items-center px-4 py-2 bg-surface hover:bg-brand-accent/5 hover:border-brand-accent/30 border border-border/50 rounded-xl transition-all group/tier"
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] font-black italic text-text-main uppercase tracking-tighter">{tier.quantity} Items</span>
                      <span className="text-[8px] font-bold text-text-light uppercase tracking-widest">Add to Quote</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-brand-accent tabular-nums italic">R{tier.sell.toFixed(2)}</span>
                    </div>
                  </button>
                ))}
                {(!product.pricingGrid || product.pricingGrid.length === 0) && (
                  <div className="text-xs text-text-muted italic opacity-50 py-4 text-center">No pricing tiers defined</div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {filteredProducts.length === 0 && (
          <div className="col-span-full py-32 text-center card-minimal">
             <div className="w-20 h-20 bg-surface/50 text-text-light rounded-3xl flex items-center justify-center mx-auto mb-6 border border-border/30">
                <Box size={32} />
             </div>
             <p className="text-xl font-black text-text-main tracking-tighter uppercase italic">No litho products found</p>
             <p className="text-[10px] font-black text-text-light uppercase tracking-widest mt-2">Add standard products like business cards or flyers</p>
          </div>
        )}
      </div>

      {isRegisterOpen && (
        <RegisterModal 
          product={editingProduct} 
          onClose={() => setIsRegisterOpen(false)} 
        />
      )}

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
      } else {
        await createDocument('litho_products', { ...formData, createdAt: Date.now() });
      }
      onClose();
    } catch (error) {
      console.error('Error saving litho product:', error);
      alert('Failed to save product specifications.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-text-main/20 backdrop-blur-sm overflow-y-auto pt-10 sm:pt-20">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 relative mb-10 sm:mb-20">
        <div className="px-10 py-8 bg-paper border-b border-border flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-2xl font-black text-text-main tracking-tighter uppercase italic">{product ? 'Update Specification' : 'Register Litho Product'}</h3>
            <p className="text-[10px] font-black text-text-light uppercase tracking-[0.2em]">Standard configuration with fixed tier pricing</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-surface rounded-2xl transition-all">
            <X size={20} className="text-text-light" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Product Name</label>
              <input 
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-black focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent"
                placeholder="e.g. Premium Business Cards 100pk"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Category</label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-black appearance-none"
                >
                  <option value="Business Cards">Business Cards</option>
                  <option value="Flyers">Flyers</option>
                  <option value="Folders">Folders</option>
                  <option value="Postcards">Postcards</option>
                  <option value="Brochures">Brochures</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Size</label>
                <input 
                  type="text"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-black"
                  placeholder="90x50mm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Paper/Stock</label>
                <input 
                   type="text"
                   value={formData.paperType}
                   onChange={(e) => setFormData({ ...formData, paperType: e.target.value })}
                   className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-black"
                   placeholder="350gsm Silk"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Finishing</label>
                <input 
                   type="text"
                   value={formData.finishing}
                   onChange={(e) => setFormData({ ...formData, finishing: e.target.value })}
                   className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-black"
                   placeholder="e.g. Matt Lamination both sides"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-border/20">
              <div className="flex justify-between items-center mb-6">
                 <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em]">Quantity Pricing Table</label>
                 <button 
                    type="button" 
                    onClick={addTier}
                    className="flex items-center gap-2 text-[10px] font-black text-brand-accent uppercase tracking-widest hover:opacity-70"
                 >
                   <Plus size={14} /> Add Quantity Tier
                 </button>
              </div>
              
              <div className="space-y-3">
                {(formData.pricingGrid || []).map((tier, idx) => (
                  <div key={idx} className="flex gap-3 items-center group animate-in fade-in slide-in-from-left-2 duration-200">
                    <div className="w-12 text-center text-[10px] font-black text-text-light/50">#{idx + 1}</div>
                    <div className="flex-1">
                      <input 
                         type="number"
                         placeholder="Qty"
                         value={tier.quantity}
                         onChange={(e) => updateTier(idx, { quantity: parseInt(e.target.value) || 0 })}
                         className="w-full px-4 py-3 bg-gray-50 border border-border rounded-xl font-black text-sm text-center"
                      />
                    </div>
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-text-light font-bold">R</span>
                      <input 
                         type="number"
                         step="0.01"
                         placeholder="Cost"
                         value={tier.cost}
                         onChange={(e) => updateTier(idx, { cost: parseFloat(e.target.value) || 0 })}
                         className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-border rounded-xl font-bold text-sm text-brand-accent/50"
                      />
                    </div>
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-brand-accent font-bold">R</span>
                      <input 
                         type="number"
                         step="0.01"
                         placeholder="Total Sell"
                         value={tier.sell}
                         onChange={(e) => updateTier(idx, { sell: parseFloat(e.target.value) || 0 })}
                         className="w-full pl-8 pr-4 py-3 bg-white border-2 border-brand-accent/30 rounded-xl font-black text-sm text-brand-accent"
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => removeTier(idx)}
                      disabled={(formData.pricingGrid || []).length <= 1}
                      className="p-3 text-text-light hover:text-red-500 disabled:opacity-0 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </form>

        <div className="px-10 py-8 bg-paper border-t border-border flex gap-4">
          <button 
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-8 py-4 bg-surface text-text-light font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-gray-100 transition-all flex-1 font-bold disabled:opacity-50"
          >
            Discard
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-8 py-4 bg-brand-accent text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:shadow-xl hover:shadow-brand-accent/20 transition-all active:scale-95 flex-1 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isSaving && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
            {product ? 'Update Registry' : 'Commit Registry'}
          </button>
        </div>
      </div>
    </div>
  );
}
