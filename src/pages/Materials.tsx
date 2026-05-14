import React, { useState } from 'react';
import { Search, Plus, Filter, Tag, AlertTriangle, Edit2, Trash2, X, Eye, Info, Layers, Beaker } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useCollection, createDocument, updateDocument, deleteDocument } from '../lib/firestoreService';
import { Material, Supplier, PricingSettings } from '../types';
import { getActivePricingSettings } from '../lib/pricingService';
import { toast } from 'sonner';

export default function Materials() {
  const { data: materials, loading } = useCollection<Material>('materials');
  const { data: suppliers } = useCollection<Supplier>('suppliers');
  const { data: settingsList } = useCollection<PricingSettings>('settings');
  
  const pricingSettings = getActivePricingSettings(settingsList);
  const markup = 1 + ((pricingSettings.materialMarkupPercent ?? 40) / 100);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const categories = ['All', 'Print Media', 'Board', 'Ink', 'Vinyl', 'Laminate', 'Consumable'];

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         m.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleEdit = (material: Material) => {
    console.log('Button Click: Edit Material', { id: material.id });
    setEditingMaterial(material);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    console.log('Button Click: Delete Material', { id });
    if (confirm('Are you sure you want to delete this material?')) {
      setIsUpdating(id);
      try {
        await deleteDocument('materials', id);
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
        <h2 className="text-4xl font-black text-text-main tracking-tighter uppercase italic text-brand-accent">Print Media Library</h2>
        <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-2">Wide-format substrates & consumable management</p>
      </header>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative group w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-brand-accent transition-colors" size={18} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search substrates..." 
              className="w-full pl-12 pr-4 py-3 bg-paper border border-border rounded-xl text-[11px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent transition-all shadow-sm"
            />
          </div>
        </div>
        <button 
          onClick={() => {
            setEditingMaterial(null);
            setIsModalOpen(true);
          }}
          className="bg-brand-accent text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:shadow-lg hover:shadow-brand-accent/20 transition-all flex items-center gap-3 active:scale-95"
        >
          <Plus size={18} strokeWidth={3} />
          Register Media
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2",
              selectedCategory === cat 
                ? "bg-brand-accent text-white border-brand-accent shadow-lg shadow-brand-accent/20" 
                : "bg-white text-text-light border-border hover:border-brand-accent/30 hover:text-brand-accent"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredMaterials.map((m) => (
          <div key={m.id} className={cn(
            "card-minimal p-6 flex flex-col relative overflow-hidden group border-r-4 border-brand-accent/10 transition-all",
            isUpdating === m.id && "opacity-50 pointer-events-none"
          )}>
            {isUpdating === m.id && (
              <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] z-50 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
              </div>
            )}
            <div className="absolute inset-0 grid-structure opacity-[0.015] pointer-events-none" />
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="w-12 h-12 bg-surface border border-border/50 rounded-2xl flex items-center justify-center text-brand-accent shadow-sm">
                <Tag size={20} />
              </div>
              <div className="flex items-center gap-2">
                {m.stockLevel <= m.minStock && (
                  <div className="flex items-center gap-1.5 text-red-500 bg-red-50 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider border border-red-100 animate-pulse">
                    <AlertTriangle size={10} />
                    Refill
                  </div>
                )}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button onClick={() => setViewingMaterial(m)} className="p-2 text-text-light hover:text-brand-accent hover:bg-white rounded-lg transition-all" title="View Details"><Eye size={14} /></button>
                  <button onClick={() => handleEdit(m)} className="p-2 text-text-light hover:text-brand-accent hover:bg-white rounded-lg transition-all" title="Edit"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(m.id)} className="p-2 text-text-light hover:text-red-500 hover:bg-white rounded-lg transition-all" title="Delete"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>

            <h3 className="font-black text-text-main text-sm mb-1 tracking-tighter uppercase italic">{m.name}</h3>
            <span className="text-[10px] text-text-light font-black uppercase tracking-[0.2em] mb-6">{m.category}</span>

            <div className="mt-auto grid grid-cols-2 gap-6 pt-6 border-t border-border/30 relative z-10">
              <div>
                <span className="text-[8px] text-text-light uppercase font-black tracking-widest block mb-1">In Stock</span>
                <span className={cn(
                  "text-xl font-black tabular-nums tracking-tighter",
                  m.stockLevel <= m.minStock ? "text-red-500" : "text-text-main"
                )}>
                  {m.stockLevel.toFixed(1)} <span className="text-[10px] text-text-light ml-0.5 opacity-50 uppercase">{m.unit}</span>
                </span>
              </div>
              <div>
                <span className="text-[8px] text-text-light uppercase font-black tracking-widest block mb-1">Cost / {m.unit}</span>
                <span className="text-xl font-black text-text-main tabular-nums tracking-tighter italic mr-4">
                  <span className="text-xs mr-0.5 font-bold not-italic text-text-light">R</span>{m.costPrice.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-[8px] text-brand-accent uppercase font-black tracking-widest block mb-1">Est. Sell / {m.unit}</span>
                <span className="text-xl font-black text-brand-accent tabular-nums tracking-tighter italic">
                  <span className="text-xs mr-0.5 font-bold not-italic">R</span>{(m.costPrice * markup).toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <MaterialModal 
          material={editingMaterial} 
          suppliers={suppliers}
          onClose={() => setIsModalOpen(false)} 
        />
      )}

      {viewingMaterial && (
        <MaterialViewModal 
          material={viewingMaterial} 
          onClose={() => setViewingMaterial(null)} 
        />
      )}
    </div>
  );
}

function MaterialModal({ material, suppliers, onClose }: { material: Material | null, suppliers: Supplier[], onClose: () => void }) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Material>>({
    name: material?.name || '',
    category: material?.category || 'Print Media',
    unit: material?.unit || 'm²',
    costPrice: material?.costPrice || 0,
    stockLevel: material?.stockLevel || 0,
    minStock: material?.minStock || 10,
    location: material?.location || '',
    supplierId: material?.supplierId || '',
    thickness: material?.thickness || '',
    materialType: material?.materialType || '',
    printingConsiderations: material?.printingConsiderations || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Button Click: Save Material Specifications', { isEdit: !!material });
    setIsSaving(true);
    
    try {
      // Ensure all required fields are present according to rules and type
      const payload = {
        ...formData,
        name: formData.name || '',
        category: formData.category || 'Print Media',
        unit: formData.unit || 'm²',
        costPrice: Number(formData.costPrice) || 0,
        stockLevel: Number(formData.stockLevel) || 0,
        minStock: Number(formData.minStock) || 0,
        supplierId: formData.supplierId || (suppliers.length > 0 ? suppliers[0].id : ''),
        location: formData.location || 'Warehouse Alpha',
      };

      if (material) {
        await updateDocument('materials', material.id, payload);
      } else {
        await createDocument('materials', payload);
      }
      onClose();
    } catch (error) {
      console.error('Error saving material:', error);
      toast.error('Failed to save material specifications.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-text-main/20 backdrop-blur-sm overflow-y-auto pt-10 sm:pt-20">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 relative mb-10 sm:mb-20">
        <div className="px-10 py-8 bg-paper border-b border-border flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-2xl font-black text-text-main tracking-tighter uppercase italic">{material ? 'Edit Substrate' : 'New Substrate'}</h3>
            <p className="text-[10px] font-black text-text-light uppercase tracking-[0.2em]">Material specifications & dimension billing</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-surface rounded-2xl transition-all">
            <X size={20} className="text-text-light" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-8">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Media Name</label>
              <input 
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent"
                placeholder="e.g. Gloss Vinyl 1.37m"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Classification</label>
                <select 
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent appearance-none cursor-pointer"
                >
                  <option value="Print Media">Print Media</option>
                  <option value="Board">Board</option>
                  <option value="Ink">Ink</option>
                  <option value="Vinyl">Vinyl</option>
                  <option value="Laminate">Laminate</option>
                  <option value="Consumable">Consumable</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Supplier</label>
                <select 
                  required
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent appearance-none cursor-pointer"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Cost Price (Per {formData.unit})</label>
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-text-light font-black group-focus-within:text-brand-accent transition-colors">R</div>
                <input 
                  type="number"
                  step="0.01"
                  required
                  value={isNaN(formData.costPrice as number) ? '' : formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) })}
                  className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold tabular-nums focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent"
                  placeholder="0.00"
                />
              </div>
              <p className="mt-2 text-[9px] font-bold text-text-light uppercase tracking-widest opacity-60 italic">This is the base {formData.unit} rate used in automated quoting</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
               <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Billing Metric</label>
                <select 
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent appearance-none cursor-pointer"
                >
                  <option value="m²">Square Meters (m²)</option>
                  <option value="sheet">Sheet</option>
                  <option value="kg">kg</option>
                  <option value="liter">liter</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Storage Location</label>
                <input 
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent"
                  placeholder="e.g. Shelf A1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Current Stock ({formData.unit})</label>
                <input 
                  type="number"
                  step="0.1"
                  required
                  value={isNaN(formData.stockLevel as number) ? '' : formData.stockLevel}
                  onChange={(e) => setFormData({ ...formData, stockLevel: parseFloat(e.target.value) })}
                  className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold tabular-nums focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Refill Alert</label>
                <input 
                  type="number"
                  required
                  value={isNaN(formData.minStock as number) ? '' : formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: parseFloat(e.target.value) })}
                  className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold tabular-nums focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-6 border-t border-border/30">
            <h4 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em]">Detailed Specifications</h4>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Thickness (e.g. 80 micron)</label>
                <input 
                  type="text"
                  value={formData.thickness}
                  onChange={(e) => setFormData({ ...formData, thickness: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent"
                  placeholder="e.g. 100μ"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Substrate Type</label>
                <input 
                  type="text"
                  value={formData.materialType}
                  onChange={(e) => setFormData({ ...formData, materialType: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent"
                  placeholder="e.g. Monomeric PVC"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Printing Considerations</label>
              <textarea 
                value={formData.printingConsiderations}
                onChange={(e) => setFormData({ ...formData, printingConsiderations: e.target.value })}
                className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent h-24 resize-none"
                placeholder="Notes on ink limits, profiles, or drying times..."
              />
            </div>
          </div>

          <div className="space-y-6 pt-6 border-t border-border/30">
            <h4 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em]">Detailed Specifications</h4>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Thickness (e.g. 80 micron)</label>
                <input 
                  type="text"
                  value={formData.thickness}
                  onChange={(e) => setFormData({ ...formData, thickness: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent"
                  placeholder="e.g. 100μ"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Substrate Type</label>
                <input 
                  type="text"
                  value={formData.materialType}
                  onChange={(e) => setFormData({ ...formData, materialType: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent"
                  placeholder="e.g. Monomeric PVC"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Printing Considerations</label>
              <textarea 
                value={formData.printingConsiderations}
                onChange={(e) => setFormData({ ...formData, printingConsiderations: e.target.value })}
                className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent h-24 resize-none"
                placeholder="Notes on ink limits, profiles, or drying times..."
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-8 py-4 bg-surface text-text-light font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-gray-100 transition-all font-bold disabled:opacity-50"
            >
              Discard
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="flex-1 px-8 py-4 bg-brand-accent text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:shadow-xl hover:shadow-brand-accent/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isSaving && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              {material ? 'Save Specifications' : 'Add to Registry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MaterialViewModal({ material, onClose }: { material: Material, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-text-main/20 backdrop-blur-sm overflow-y-auto pt-10 sm:pt-20">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in duration-200 relative mb-10 sm:mb-20">
        {/* Left Aspect: Visual/Primary Info */}
        <div className="w-full md:w-[280px] bg-paper p-10 flex flex-col border-r border-border shrink-0 md:overflow-y-auto">
          <div className="w-20 h-20 bg-brand-accent/10 rounded-3xl flex items-center justify-center text-brand-accent mb-8">
            <Layers size={36} />
          </div>
          <h3 className="text-2xl font-black text-text-main tracking-tighter uppercase italic leading-tight mb-2">{material.name}</h3>
          <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest bg-brand-accent/5 px-3 py-1 rounded-full self-start mb-10 border border-brand-accent/10">
            {material.category}
          </span>

          <div className="mt-auto space-y-6">
            <div>
              <span className="text-[8px] font-black text-text-light uppercase tracking-widest block mb-1 opacity-50">Current Inventory</span>
              <p className="text-2xl font-black text-text-main italic tracking-tighter">{material.stockLevel} <span className="text-[10px] opacity-40">{material.unit}</span></p>
            </div>
            <div>
              <span className="text-[8px] font-black text-text-light uppercase tracking-widest block mb-1 opacity-50">Costing Metric</span>
              <p className="text-xl font-black text-brand-accent italic tracking-tighter">R{material.costPrice.toFixed(2)} / {material.unit}</p>
            </div>
          </div>
        </div>

        {/* Right Aspect: Detailed Specs */}
        <div className="flex-1 p-10 bg-white relative overflow-y-auto">
          <button onClick={onClose} className="absolute right-6 top-6 p-3 hover:bg-surface rounded-2xl transition-all z-10">
            <X size={20} className="text-text-light" />
          </button>

          <div className="space-y-10">
            <div>
              <h4 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                <Info size={14} className="text-brand-accent" />
                Detailed Specifications
              </h4>
              <div className="grid grid-cols-2 gap-8">
                <div className="p-5 bg-surface rounded-2xl border border-border/50">
                  <span className="text-[8px] font-black text-text-light uppercase tracking-widest block mb-2 opacity-50">Thickness</span>
                  <p className="text-xs font-black text-text-main uppercase tracking-tight">{material.thickness || 'Not Specified'}</p>
                </div>
                <div className="p-5 bg-surface rounded-2xl border border-border/50">
                  <span className="text-[8px] font-black text-text-light uppercase tracking-widest block mb-2 opacity-50">Substrate Type</span>
                  <p className="text-xs font-black text-text-main uppercase tracking-tight">{material.materialType || 'Not Specified'}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                <Beaker size={14} className="text-brand-accent" />
                Printing & Production Notes
              </h4>
              <div className="p-6 bg-blue-50/30 rounded-3xl border border-brand-accent/10">
                <p className="text-[11px] font-bold text-text-muted leading-relaxed italic whitespace-pre-wrap">
                  {material.printingConsiderations || 'No specific printing considerations recorded for this substrate.'}
                </p>
              </div>
            </div>

            <div className="pt-10 border-t border-border flex justify-between items-center">
              <div>
                <span className="text-[8px] font-black text-text-light uppercase tracking-widest block mb-1 opacity-50">Storage Location</span>
                <p className="text-[10px] font-black text-text-main uppercase tracking-widest">{material.location || 'Warehouse Alpha'}</p>
              </div>
              <button 
                onClick={onClose}
                className="px-8 py-3 bg-brand-accent text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-brand-accent/10"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
