import React, { useState } from 'react';
import { Search, Plus, Filter, Tag, AlertTriangle, Edit2, Trash2, X, Eye, Info, Layers, Beaker, Box } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useCollection, createDocument, updateDocument, deleteDocument } from '../lib/firestoreService';
import { Material, Supplier, PricingSettings } from '../types';
import { getActivePricingSettings } from '../lib/pricingService';
import ConfirmationModal from '../components/ConfirmationModal';
import { toast } from 'sonner';

export default function Materials() {
  const { data: materials, loading } = useCollection<Material>('materials');
  const { data: suppliers } = useCollection<Supplier>('suppliers');
  const { data: settingsList } = useCollection<PricingSettings>('settings');
  
  const pricingSettings = getActivePricingSettings(settingsList);
  const markup = 1 + ((pricingSettings.materialMarkupPercent ?? 40) / 100);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [displayUnit, setDisplayUnit] = useState<string>('Default');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<string | null>(null);
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

  const getConvertedStock = (m: Material) => {
    if (displayUnit === 'Default' || m.unit === displayUnit) {
      return m.stockLevel;
    }
    const factor = m.conversions?.[displayUnit];
    return factor ? m.stockLevel * factor : m.stockLevel;
  };

  const getConvertedCost = (m: Material) => {
    if (displayUnit === 'Default' || m.unit === displayUnit) {
      return m.costPrice;
    }
    const factor = m.conversions?.[displayUnit];
    return factor ? m.costPrice / factor : m.costPrice;
  };

  const currentUnitLabel = (m: Material) => {
    if (displayUnit === 'Default') return m.unit;
    if (m.conversions?.[displayUnit]) return displayUnit;
    return m.unit;
  };

  const handleEdit = (material: Material) => {
    console.log('Button Click: Edit Material', { id: material.id });
    setEditingMaterial(material);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    console.log('Button Click: Delete Material', { id });
    setMaterialToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!materialToDelete) return;
    setIsUpdating(materialToDelete);
    try {
      await deleteDocument('materials', materialToDelete);
      toast.success('Substrate removed from library.');
      setIsDeleteModalOpen(false);
    } catch (error) {
      toast.error('Failed to remove substrate.');
    } finally {
      setIsUpdating(null);
      setMaterialToDelete(null);
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-black text-text-main tracking-tighter uppercase italic text-brand-accent font-serif">Print Media Library</h2>
            <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-2">Wide-format substrates & consumable management</p>
          </div>
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-border shadow-sm">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2.5 rounded-xl transition-all",
                viewMode === 'grid' ? "bg-brand-accent text-white shadow-md shadow-brand-accent/20" : "text-text-light hover:bg-surface"
              )}
            >
              <Box size={20} />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={cn(
                "p-2.5 rounded-xl transition-all",
                viewMode === 'table' ? "bg-brand-accent text-white shadow-md shadow-brand-accent/20" : "text-text-light hover:bg-surface"
              )}
            >
              <Filter size={20} className="rotate-90" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between gap-4">
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

          <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-border shadow-sm overflow-x-auto no-scrollbar max-w-[400px]">
            {['Default', 'm²', 'kg', 'sheet', 'liter'].map((unit) => (
              <button
                key={unit}
                onClick={() => setDisplayUnit(unit)}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  displayUnit === unit 
                    ? "bg-brand-accent text-white shadow-md shadow-brand-accent/20" 
                    : "text-text-light hover:text-brand-accent hover:bg-surface"
                )}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>
        <button 
          onClick={() => {
            setEditingMaterial(null);
            setIsModalOpen(true);
          }}
          className="bg-brand-accent text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:shadow-lg hover:shadow-brand-accent/20 transition-all flex items-center gap-3 active:scale-95 shrink-0"
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

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredMaterials.map((m) => (
            <div key={m.id} className={cn(
              "card-minimal p-6 flex flex-col relative overflow-hidden group border-r-4 border-brand-accent/10 transition-all shadow-md hover:shadow-xl hover:-translate-y-1",
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
                  <span className="text-[8px] text-text-light uppercase font-black tracking-widest block mb-1">
                    In Stock {displayUnit !== 'Default' ? `(${displayUnit})` : ''}
                  </span>
                  <span className={cn(
                    "text-xl font-black tabular-nums tracking-tighter",
                    m.stockLevel <= m.minStock ? "text-red-500" : "text-text-main"
                  )}>
                    {getConvertedStock(m).toFixed(1)} 
                    <span className="text-[10px] text-text-light ml-0.5 opacity-50 uppercase">
                      {currentUnitLabel(m)}
                      {!m.conversions?.[displayUnit] && displayUnit !== 'Default' && m.unit !== displayUnit && " *"}
                    </span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] text-text-light uppercase font-black tracking-widest block mb-1">
                    Cost / {currentUnitLabel(m)}
                  </span>
                  <p className="text-xl font-black text-text-main tabular-nums tracking-tighter italic">
                    <span className="text-xs mr-0.5 font-bold not-italic text-text-light">R</span>
                    {getConvertedCost(m).toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-[10px] font-black text-brand-accent uppercase mt-1">
                    Sell <span className="text-xs font-bold not-italic">R</span>{(getConvertedCost(m) * markup).toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-border shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface/50 border-b border-border">
                  <th className="px-8 py-5 text-[10px] font-black text-text-light uppercase tracking-widest">Media Specification</th>
                  <th className="px-6 py-5 text-[10px] font-black text-text-light uppercase tracking-widest">Category</th>
                  <th className="px-6 py-5 text-[10px] font-black text-text-light uppercase tracking-widest">Pricing Metric</th>
                  <th className="px-6 py-5 text-[10px] font-black text-text-light uppercase tracking-widest text-right">In Stock</th>
                  <th className="px-6 py-5 text-[10px] font-black text-text-light uppercase tracking-widest text-right">Cost Price</th>
                  <th className="px-6 py-5 text-[10px] font-black text-text-light uppercase tracking-widest text-right">Selling Price</th>
                  <th className="px-8 py-5 text-[10px] font-black text-text-light uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMaterials.map((m) => (
                  <tr key={m.id} className="group hover:bg-surface/30 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white border border-border rounded-xl flex items-center justify-center text-brand-accent shadow-sm">
                          <Tag size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-text-main uppercase italic">{m.name}</p>
                          <p className="text-[9px] font-bold text-text-light uppercase tracking-widest mt-0.5">{m.location || 'No Location'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-2.5 py-1 bg-white border border-border rounded-lg text-[8px] font-black text-text-light uppercase tracking-widest">
                        {m.category}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                      Per {currentUnitLabel(m)}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex flex-col items-end">
                        <span className={cn(
                          "text-base font-black tabular-nums tracking-tighter",
                          m.stockLevel <= m.minStock ? "text-red-500" : "text-text-main"
                        )}>
                          {getConvertedStock(m).toFixed(1)} {currentUnitLabel(m)}
                        </span>
                        {m.stockLevel <= m.minStock && (
                          <span className="text-[7px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-1.5 py-0.5 rounded-md border border-red-100 flex items-center gap-1 mt-1">
                            <AlertTriangle size={8} /> Refill Required
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="text-sm font-black text-text-main tabular-nums italic">
                        R {getConvertedCost(m).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="text-sm font-black text-brand-accent tabular-nums italic">
                        R {(getConvertedCost(m) * markup).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewingMaterial(m)} className="p-2.5 text-text-light hover:text-brand-accent hover:bg-white rounded-xl transition-all shadow-sm"><Eye size={16} /></button>
                        <button onClick={() => handleEdit(m)} className="p-2.5 text-text-light hover:text-brand-accent hover:bg-white rounded-xl transition-all shadow-sm"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(m.id)} className="p-2.5 text-text-light hover:text-red-500 hover:bg-white rounded-xl transition-all shadow-sm"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
          suppliers={suppliers}
          onClose={() => setViewingMaterial(null)} 
        />
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Remove Media from Library?"
        message="This will delete the media specification from your library. This media will no longer be available for auto-quoting calculations, though existing quotes will remain unaffected."
        confirmText="Remove Media"
        variant="danger"
        isLoading={!!isUpdating}
      />
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
    printMethods: material?.printMethods || [],
    inkTypes: material?.inkTypes || [],
    printingConsiderations: material?.printingConsiderations || '',
    conversions: material?.conversions || {},
  });

  const PRINT_METHODS = ['Digital', 'Offset', 'Screen', 'Flexo', 'Litho'];
  const INK_TYPES = ['UV', 'Solvent', 'Eco-Solvent', 'Water-based', 'Latex', 'Dye-Sub'];

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
            <h3 className="text-2xl font-black text-text-main tracking-tighter uppercase italic font-serif">{material ? 'Edit Substrate' : 'New Substrate'}</h3>
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
                <div className="relative">
                  <input 
                    type="text"
                    list="unit-options"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent"
                    placeholder="e.g. roll, pack, gram"
                  />
                  <datalist id="unit-options">
                    <option value="m²" />
                    <option value="sheet" />
                    <option value="kg" />
                    <option value="liter" />
                  </datalist>
                </div>
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
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Material Type</label>
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

            <div className="space-y-6 pt-6 border-t border-border/30">
              <h4 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em]">Unit Conversions</h4>
              <p className="text-[9px] font-bold text-text-light uppercase leading-relaxed">
                Define the multiplier from base 1 {formData.unit} to alternative units.<br/>
                Example: If 1 {formData.unit} = 5 kg, set kg factor to 5.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {['m²', 'kg', 'sheet', 'liter'].map(u => (
                  u !== formData.unit && (
                    <div key={u} className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-text-light group-focus-within:text-brand-accent transition-colors uppercase">{u}</div>
                      <input 
                        type="number"
                        step="0.0001"
                        value={formData.conversions?.[u] || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setFormData({
                            ...formData,
                            conversions: {
                              ...formData.conversions,
                              [u]: isNaN(val) ? 0 : val
                            }
                          });
                        }}
                        className="w-full pl-16 pr-4 py-3 bg-gray-50 border border-border rounded-xl font-bold text-[11px] focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent"
                        placeholder="Factor"
                      />
                    </div>
                  )
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3 mt-4">Compatible Print Methods</label>
              <div className="flex flex-wrap gap-2">
                {PRINT_METHODS.map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      const methods = formData.printMethods || [];
                      setFormData({
                        ...formData,
                        printMethods: methods.includes(method) 
                          ? methods.filter(m => m !== method)
                          : [...methods, method]
                      })
                    }}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                      (formData.printMethods || []).includes(method)
                        ? "bg-brand-accent text-white"
                        : "bg-surface text-text-light border border-border hover:border-brand-accent/30"
                    )}
                  >
                    {method}
                  </button>
                ))}
              </div>

              <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3 mt-6">Recommended Ink Types</label>
              <div className="flex flex-wrap gap-2">
                {INK_TYPES.map(ink => (
                  <button
                    key={ink}
                    type="button"
                    onClick={() => {
                      const inks = formData.inkTypes || [];
                      setFormData({
                        ...formData,
                        inkTypes: inks.includes(ink) 
                          ? inks.filter(i => i !== ink)
                          : [...inks, ink]
                      })
                    }}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                      (formData.inkTypes || []).includes(ink)
                        ? "bg-emerald-500 text-white"
                        : "bg-surface text-text-light border border-border hover:border-emerald-500/30"
                    )}
                  >
                    {ink}
                  </button>
                ))}
              </div>
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

function MaterialViewModal({ material, suppliers, onClose }: { material: Material, suppliers: Supplier[], onClose: () => void }) {
  const supplier = suppliers.find(s => s.id === material.supplierId);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-text-main/20 backdrop-blur-sm overflow-y-auto pt-10 sm:pt-20">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in duration-200 relative mb-10 sm:mb-20">
        {/* Left Aspect: Visual/Primary Info */}
        <div className="w-full md:w-[280px] bg-paper p-10 flex flex-col border-r border-border shrink-0 md:overflow-y-auto">
          <div className="w-20 h-20 bg-brand-accent/10 rounded-3xl flex items-center justify-center text-brand-accent mb-8">
            <Layers size={36} />
          </div>
          <h3 className="text-2xl font-black text-text-main tracking-tighter uppercase italic leading-tight mb-2 font-serif">{material.name}</h3>
          <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest bg-brand-accent/5 px-3 py-1 rounded-full self-start mb-10 border border-brand-accent/10">
            {material.category}
          </span>

          <div className="mt-auto space-y-6">
            <div>
              <span className="text-[8px] font-black text-text-light uppercase tracking-widest block mb-1 opacity-50">Current Inventory</span>
              <p className="text-2xl font-black text-text-main italic tracking-tighter">{material.stockLevel} <span className="text-[10px] opacity-40">{material.unit}</span></p>
              
              {material.conversions && Object.entries(material.conversions).filter(([_, f]) => f > 0).length > 0 && (
                <div className="mt-2 space-y-1">
                  {Object.entries(material.conversions).filter(([_, f]) => f > 0).map(([unit, factor]) => (
                    <p key={unit} className="text-[9px] font-bold text-text-light uppercase tracking-widest">
                      &bull; {(material.stockLevel * factor).toFixed(2)} {unit}
                    </p>
                  ))}
                </div>
              )}
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
                  <span className="text-[8px] font-black text-text-light uppercase tracking-widest block mb-2 opacity-50">Material Type</span>
                  <p className="text-xs font-black text-text-main uppercase tracking-tight">{material.materialType || 'Not Specified'}</p>
                </div>
                <div className="p-5 bg-surface rounded-2xl border border-border/50 col-span-2">
                  <span className="text-[8px] font-black text-text-light uppercase tracking-widest block mb-2 opacity-50">Supplier</span>
                  {supplier ? (
                    <div>
                      <p className="text-xs font-black text-text-main uppercase tracking-tight mb-1">{supplier.name}</p>
                      <p className="text-[10px] font-bold text-text-light">{supplier.contactPerson} &bull; {supplier.email || supplier.phone}</p>
                    </div>
                  ) : <p className="text-xs font-bold text-text-light italic">No Supplier Selected</p>}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                <Beaker size={14} className="text-brand-accent" />
                Printing & Production Notes
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                 <div className="p-5 bg-surface rounded-2xl border border-border/50">
                    <span className="text-[8px] font-black text-text-light uppercase tracking-widest block mb-2 opacity-50">Compatible Print Methods</span>
                    <div className="flex flex-wrap gap-1.5">
                      {material.printMethods?.length ? material.printMethods.map(m => (
                        <span key={m} className="px-2 py-1 bg-brand-accent text-white text-[9px] font-black uppercase tracking-widest rounded-lg">
                          {m}
                        </span>
                      )) : <span className="text-[9px] font-bold text-text-light uppercase italic">Not Specified</span>}
                    </div>
                 </div>
                 <div className="p-5 bg-surface rounded-2xl border border-border/50">
                    <span className="text-[8px] font-black text-text-light uppercase tracking-widest block mb-2 opacity-50">Recommended Inks</span>
                    <div className="flex flex-wrap gap-1.5">
                      {material.inkTypes?.length ? material.inkTypes.map(i => (
                        <span key={i} className="px-2 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg">
                          {i}
                        </span>
                      )) : <span className="text-[9px] font-bold text-text-light uppercase italic">Not Specified</span>}
                    </div>
                 </div>
              </div>
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
