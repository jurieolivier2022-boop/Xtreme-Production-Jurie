import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2, Tag, Layers, Settings, Percent, Box, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useCollection, createDocument, updateDocument, deleteDocument } from '../lib/firestoreService';
import { Product, Material, Machine } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Products() {
  const navigate = useNavigate();
  const { data: products, loading } = useCollection<Product>('products');
  const { data: materials } = useCollection<Material>('materials');
  const { data: machines } = useCollection<Machine>('machines');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (product: Product) => {
    console.log('Button Click: Edit Product', { id: product.id });
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    console.log('Button Click: Delete Product', { id });
    if (confirm('Delete this product?')) {
      setIsUpdating(id);
      try {
        await deleteDocument('products', id);
      } finally {
        setIsUpdating(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between gap-6">
        <div className="relative group w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-brand transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search products & services..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all shadow-sm"
          />
        </div>
        <button 
          onClick={() => {
            setEditingProduct(null);
            setIsModalOpen(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      <div className="card-minimal p-0 overflow-hidden">
        <table className="w-full text-left min-w-[1000px]">
          <thead>
            <tr className="bg-gray-50/50 border-b border-border">
              <th className="px-8 py-5 text-[10px] font-bold text-text-light uppercase tracking-[0.2em]">Product Name</th>
              <th className="px-8 py-5 text-[10px] font-bold text-text-light uppercase tracking-[0.2em]">Category</th>
              <th className="px-8 py-5 text-[10px] font-bold text-text-light uppercase tracking-[0.2em]">Method</th>
              <th className="px-8 py-5 text-[10px] font-bold text-text-light uppercase tracking-[0.2em] text-center">Setup Time</th>
              <th className="px-8 py-5 text-[10px] font-bold text-text-light uppercase tracking-[0.2em] text-center">Markup</th>
              <th className="px-8 py-5 text-[10px] font-bold text-text-light uppercase tracking-[0.2em] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredProducts.map((product) => (
              <tr 
                key={product.id} 
                className={cn(
                  "hover:bg-blue-50/10 transition-colors group relative",
                  isUpdating === product.id && "opacity-50 pointer-events-none"
                )}
              >
                {isUpdating === product.id && (
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] z-50 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
                  </div>
                )}
                <td className="px-8 py-6">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-text-main text-sm tracking-tight group-hover:text-brand transition-colors">{product.name}</span>
                    <span className="text-xs text-text-muted font-medium line-clamp-1">{product.description}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-text-muted text-[10px] font-bold rounded-lg uppercase tracking-wider">
                    <Layers size={10} />
                    {product.category}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <span className="text-brand text-[10px] font-black uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg">
                    {product.costingMethod}
                  </span>
                </td>
                <td className="px-8 py-6 text-sm text-text-muted text-center font-bold">
                  {product.setupTime}m
                </td>
                <td className="px-8 py-6 text-center">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-600 font-bold text-xs rounded-lg">
                    <Percent size={10} />
                    {product.markupPercent}
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleEdit(product)} className="p-2 text-text-light hover:text-brand hover:bg-white rounded-lg transition-all"><Edit2 size={16} strokeWidth={2.5} /></button>
                    <button onClick={() => handleDelete(product.id)} className="p-2 text-text-light hover:text-red-500 hover:bg-white rounded-lg transition-all"><Trash2 size={16} strokeWidth={2.5} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-8 py-20 text-center text-text-muted font-medium italic">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <ProductModal 
          product={editingProduct} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
}

function ProductModal({ product, onClose }: { product: Product | null, onClose: () => void }) {
  const navigate = useNavigate();
  const { data: materials } = useCollection<any>('materials');
  const { data: machines } = useCollection<any>('machines');
  
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: product?.name || '',
    description: product?.description || '',
    category: product?.category || 'Print Media',
    costingMethod: product?.costingMethod || 'Area',
    setupTime: product?.setupTime || 0,
    markupPercent: product?.markupPercent ?? 40,
    defaultMachineId: product?.defaultMachineId || '',
    defaultMaterialId: product?.defaultMaterialId || ''
  });

  const [showGuidedNextStep, setShowGuidedNextStep] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Button Click: Save Product', { isEdit: !!product });
    setIsSaving(true);
    try {
      if (product) {
        await updateDocument('products', product.id, formData);
      } else {
        await createDocument('products', formData as any);
        setShowGuidedNextStep(true);
      }
      if (!product && !showGuidedNextStep) {
        // We will wait for them to click through if it's a new product
      } else if (product) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-text-main/20 backdrop-blur-sm">
      <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-8 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="text-2xl font-bold text-text-main tracking-tight">{product ? 'Edit Product' : 'Add New Product'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Product Title</label>
              <input 
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Description</label>
              <textarea 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand h-20"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Category</label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand"
                >
                  <option value="Print Media">Print Media</option>
                  <option value="Board">Board</option>
                  <option value="Finishing">Finishing</option>
                  <option value="Garment">Garment</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Costing Method</label>
                <select 
                  value={formData.costingMethod}
                  onChange={(e) => setFormData({ ...formData, costingMethod: e.target.value as any })}
                  className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand"
                >
                  <option value="Area">By Area (m²)</option>
                  <option value="Per Item">Per Item (Unit)</option>
                  <option value="Page">By Page</option>
                  <option value="NCR">NCR Book logic</option>
                  <option value="Hourly">Hourly rate</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Default Machine</label>
                <select 
                  value={formData.defaultMachineId}
                  onChange={(e) => setFormData({ ...formData, defaultMachineId: e.target.value })}
                  className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand"
                >
                  <option value="">None</option>
                  {machines.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Default Material</label>
                <select 
                  value={formData.defaultMaterialId}
                  onChange={(e) => setFormData({ ...formData, defaultMaterialId: e.target.value })}
                  className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand"
                >
                  <option value="">None</option>
                  {materials.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Setup Time (mins)</label>
                <input 
                  type="number"
                  value={formData.setupTime}
                  onChange={(e) => setFormData({ ...formData, setupTime: Number(e.target.value) })}
                  className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Markup (%)</label>
                <input 
                  type="number"
                  value={formData.markupPercent}
                  onChange={(e) => setFormData({ ...formData, markupPercent: Number(e.target.value) })}
                  className="w-full px-5 py-3 bg-gray-50 border border-border rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-4 pt-4 border-t border-border">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-6 py-2 font-bold text-text-muted hover:bg-gray-100 rounded-xl disabled:opacity-50">Cancel</button>
            <button 
              type="submit" 
              disabled={isSaving}
              className="btn-primary flex items-center gap-2 disabled:opacity-70"
            >
              {isSaving && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              {isSaving ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>

        <AnimatePresence>
          {showGuidedNextStep && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-white/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-12 text-center"
            >
               <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-[2.5rem] flex items-center justify-center mb-6 border border-purple-100">
                  <Box size={32} />
               </div>
               <h3 className="text-2xl font-black text-text-main tracking-tighter uppercase italic">Catalog Updated</h3>
               <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-3">The product specifications are committed. Launch a quote?</p>
               
               <div className="grid grid-cols-1 gap-3 w-full mt-10">
                  <button 
                    onClick={() => {
                       navigate('/quotes');
                    }}
                    className="w-full flex items-center justify-center gap-4 py-5 bg-brand text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand/20 hover:-translate-y-1 transition-all"
                  >
                     Start New Quote
                     <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <ArrowRight size={16} />
                     </div>
                  </button>
                  <button 
                    onClick={onClose}
                    className="w-full py-4 text-[9px] font-black text-text-muted uppercase tracking-[0.2em] hover:text-text-main transition-colors"
                  >
                     Return to Catalog
                  </button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
