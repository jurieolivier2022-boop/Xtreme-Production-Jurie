import React, { useState, useMemo } from 'react';
import { Calculator, Plus, Edit2, Trash2, Book, X, Hash, Layers, Minimize2, Check, ExternalLink, Search, GripVertical } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useCollection, createDocument, updateDocument, deleteDocument } from '../lib/firestoreService';
import { NCRBook, PricingSettings, NCRPricingTier } from '../types';
import { DEFAULT_PRICING_SETTINGS, calculateNCRPrice } from '../lib/pricingService';
import QuoteModal from '../components/QuoteModal';

export default function NCRBooks() {
  const { data: books, loading: booksLoading } = useCollection<NCRBook>('ncr_books');
  const { data: settingsList, loading: settingsLoading } = useCollection<PricingSettings>('settings');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<NCRBook | null>(null);
  const [prefilledItem, setPrefilledItem] = useState<{ type: string; originId: string; quantity: number } | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleAddToQuote = (bookId: string, qty: number) => {
    console.log('Action: Add NCR to Quote', { bookId, qty });
    setPrefilledItem({ type: 'NCR', originId: bookId, quantity: qty });
    setIsQuoteModalOpen(true);
  };

  const activeSettings = useMemo(() => {
    return settingsList.find(s => s.id === 'pricing') || settingsList[0] || DEFAULT_PRICING_SETTINGS;
  }, [settingsList]);

  const loading = booksLoading || settingsLoading;

  const filteredBooks = books.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    console.log('Button Click: Delete NCR Specification', { id });
    if (confirm('Are you sure you want to remove this NCR specification?')) {
      setIsUpdating(id);
      try {
        await deleteDocument('ncr_books', id);
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
        <h2 className="text-4xl font-black text-text-main tracking-tighter uppercase italic">Print Registry</h2>
        <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-2">Carbonless copy & stationary book management</p>
      </header>

      <div className="flex items-center justify-between">
        <div className="relative group w-full max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-brand-accent transition-colors" size={18} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search NCR specifications..." 
            className="w-full pl-12 pr-4 py-3 bg-paper border border-border rounded-xl text-[11px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsCalculatorOpen(true)}
            className="bg-paper border border-border text-text-main px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:border-brand-accent transition-all flex items-center gap-3 active:scale-95 shadow-sm"
          >
            <Calculator size={18} strokeWidth={3} className="text-brand-accent" />
            Cost Calculator
          </button>
          <button 
            onClick={() => {
              setEditingBook(null);
              setIsRegisterOpen(true);
            }}
            className="bg-brand-accent text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:shadow-lg hover:shadow-brand-accent/20 transition-all flex items-center gap-3 active:scale-95"
          >
            <Plus size={18} strokeWidth={3} />
            Add NCR Book
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredBooks.map((book) => (
          <div 
            key={book.id} 
            className={cn(
              "card-minimal p-8 flex flex-col relative overflow-hidden group border-r-4 border-brand-accent/20 transition-all",
              isUpdating === book.id && "opacity-50 pointer-events-none"
            )}
          >
            {isUpdating === book.id && (
              <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] z-50 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
              </div>
            )}
            <div className="absolute inset-0 grid-structure opacity-[0.015] pointer-events-none" />
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="w-12 h-12 bg-surface border border-border/50 rounded-2xl flex items-center justify-center text-brand-accent shadow-sm">
                <Book size={24} strokeWidth={2} />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => {
                    setEditingBook(book);
                    setIsRegisterOpen(true);
                  }}
                  className="p-2 text-text-light hover:text-brand-accent transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(book.id)}
                  className="p-2 text-text-light hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="relative z-10 mb-8">
              <h3 className="text-xl font-black text-text-main tracking-tighter uppercase italic leading-tight group-hover:text-brand-accent transition-colors">{book.name}</h3>
              <p className="text-[10px] font-bold text-text-light uppercase tracking-widest mt-2">{book.description || `Custom ${book.size} ${book.parts} book`}</p>
            </div>

            <div className="grid grid-cols-2 gap-6 relative z-10 mb-8">
              <div>
                <span className="text-[8px] text-text-light uppercase font-black tracking-widest block mb-1">Stock Yield</span>
                <span className="text-sm font-black text-text-main tabular-nums italic">{book.parts} • {book.setsPerBook} Sets</span>
              </div>
              <div>
                <span className="text-[8px] text-text-light uppercase font-black tracking-widest block mb-1">Dimensions</span>
                <span className="text-sm font-black text-text-main italic">{book.size} Standard</span>
              </div>
              <div>
                <span className="text-[8px] text-text-light uppercase font-black tracking-widest block mb-1">Binding</span>
                <span className="text-sm font-black text-text-main italic uppercase text-[11px]">{book.binding}</span>
              </div>
              <div>
                <span className="text-[8px] text-text-light uppercase font-black tracking-widest block mb-1">Print Type</span>
                <span className="text-sm font-black text-text-main italic uppercase text-[11px]">{book.print}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-8 relative z-10">
              {book.options.map((opt) => (
                <span key={opt} className="px-3 py-1 bg-surface border border-border/50 text-text-light text-[8px] font-black uppercase tracking-widest rounded-lg">
                  {opt}
                </span>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t border-border/30 relative z-10">
              <span className="text-[10px] text-text-light font-black uppercase tracking-widest block mb-1 opacity-50 italic">Price List Preview</span>
              <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                {(book.pricingGrid || []).slice(0, 3).map((tier, i) => (
                  <div key={i} className="flex justify-between items-center text-[11px] font-black italic">
                    <span className="text-text-light uppercase font-bold tracking-tighter">{tier.quantity} Books</span>
                    <span className="text-brand-accent tabular-nums">R{tier.sell.toFixed(2)}</span>
                  </div>
                ))}
                {(book.pricingGrid || []).length > 3 && (
                  <div className="text-[8px] text-text-light font-black uppercase text-center pt-1 border-t border-border/10">
                    + {(book.pricingGrid.length - 3)} more tiers
                  </div>
                )}
                {(!book.pricingGrid || book.pricingGrid.length === 0) && (
                  <div className="text-xs text-text-muted italic opacity-50">No pricing defined</div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {filteredBooks.length === 0 && (
          <div className="col-span-full py-32 text-center card-minimal">
             <div className="w-20 h-20 bg-surface/50 text-text-light rounded-3xl flex items-center justify-center mx-auto mb-6 border border-border/30">
                <Book size={32} />
             </div>
             <p className="text-xl font-black text-text-main tracking-tighter uppercase italic">No NCR records found</p>
             <p className="text-[10px] font-black text-text-light uppercase tracking-widest mt-2">Initialize a manual register or use the cost calculator</p>
          </div>
        )}
      </div>

      {isCalculatorOpen && (
        <CalculatorModal 
          settings={activeSettings}
          books={books}
          onAddToQuote={handleAddToQuote}
          onClose={() => setIsCalculatorOpen(false)} 
        />
      )}

      {isRegisterOpen && (
        <RegisterModal 
          book={editingBook} 
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

function CalculatorModal({ settings, onClose, books, onAddToQuote }: { settings: PricingSettings; onClose: () => void, books: NCRBook[], onAddToQuote: (id: string, qty: number) => void }) {
  const [calcMode, setCalcMode] = useState<'registry' | 'automated'>('automated');
  const [selectedBookId, setSelectedBookId] = useState<string>(books[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(5);
  
  // Automated Mode State
  const [spec, setSpec] = useState({
    size: 'A5',
    parts: '2-part',
    print: 'Greyscale',
    numbering: true,
    perforation: true,
    cover: true
  });

  const selectedBook = useMemo(() => books.find(b => b.id === selectedBookId), [books, selectedBookId]);

  const pricing = useMemo(() => {
    if (calcMode === 'registry') {
      if (!selectedBook?.pricingGrid) return null;
      const tiers = [...selectedBook.pricingGrid].sort((a, b) => a.quantity - b.quantity);
      const exactMatch = tiers.find(t => t.quantity === quantity);
      const matchingTier = exactMatch || [...tiers].reverse().find(t => t.quantity <= quantity) || tiers[0];
      
      if (!matchingTier) return null;
      
      return {
        cost: matchingTier.cost * quantity,
        sell: matchingTier.sell * quantity,
        unitSell: matchingTier.sell,
        quantity: quantity
      };
    } else {
      const result = calculateNCRPrice(
        settings,
        spec.size,
        spec.parts,
        spec.print,
        quantity,
        spec.numbering,
        spec.perforation,
        spec.cover
      );
      return {
        cost: result.costPrice,
        sell: result.totalPrice,
        unitSell: result.totalPrice / quantity,
        quantity: quantity
      };
    }
  }, [calcMode, selectedBook, quantity, spec, settings]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-text-main/20 backdrop-blur-sm overflow-y-auto pt-10 sm:pt-20">
      <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in duration-200 relative mb-10 sm:mb-20">
        {/* Left Side: Parameters */}
        <div className="p-10 flex-1 space-y-8 bg-paper border-r border-border overflow-y-auto max-h-[90vh]">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-black text-text-main tracking-tighter uppercase italic">Print Cost Calculator</h3>
              <p className="text-[10px] font-black text-text-light uppercase tracking-[0.2em]">Estimate costs based on registry or global algorithms</p>
            </div>
            <button onClick={onClose} className="md:hidden p-3 hover:bg-surface rounded-2xl transition-all">
              <X size={20} className="text-text-light" />
            </button>
          </div>

          <div className="flex bg-surface p-1 rounded-2xl border border-border/50">
            <button 
              onClick={() => setCalcMode('automated')}
              className={cn(
                "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                calcMode === 'automated' ? "bg-white text-brand-accent shadow-sm" : "text-text-light hover:text-text-main"
              )}
            >
              Automated Engine
            </button>
            <button 
              onClick={() => setCalcMode('registry')}
              className={cn(
                "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                calcMode === 'registry' ? "bg-white text-brand-accent shadow-sm" : "text-text-light hover:text-text-main"
              )}
            >
              Registry Lookup
            </button>
          </div>

          <div className="space-y-6">
            {calcMode === 'registry' ? (
              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-4">Select Registered Book</label>
                <select 
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="w-full px-6 py-4 bg-white border border-border rounded-2xl font-black appearance-none cursor-pointer text-sm mb-4 italic uppercase tracking-tighter"
                >
                  {books.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.parts} • {b.size})</option>
                  ))}
                </select>

                {selectedBook && (
                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 bg-surface rounded-xl border border-border/50">
                        <span className="text-[8px] font-black text-text-light uppercase tracking-widest block mb-1">Stock Yield</span>
                        <p className="text-[10px] font-bold text-text-main uppercase tracking-tighter italic">
                          {selectedBook.parts} • {selectedBook.setsPerBook} Sets
                        </p>
                     </div>
                     <div className="p-4 bg-surface rounded-xl border border-border/50">
                        <span className="text-[8px] font-black text-text-light uppercase tracking-widest block mb-1">Print Specs</span>
                        <p className="text-[10px] font-bold text-text-main uppercase tracking-tighter italic">
                          {selectedBook.size} • {selectedBook.print}
                        </p>
                     </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Book Size</label>
                  <select 
                    value={spec.size}
                    onChange={(e) => setSpec({ ...spec, size: e.target.value })}
                    className="w-full px-5 py-3 bg-white border border-border rounded-xl font-black text-xs uppercase"
                  >
                    {Object.keys(settings.ncrSizeFactors).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Parts</label>
                  <select 
                    value={spec.parts}
                    onChange={(e) => setSpec({ ...spec, parts: e.target.value })}
                    className="w-full px-5 py-3 bg-white border border-border rounded-xl font-black text-xs uppercase"
                  >
                    {Object.keys(settings.ncrPartFactors).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Print Type</label>
                  <select 
                    value={spec.print}
                    onChange={(e) => setSpec({ ...spec, print: e.target.value })}
                    className="w-full px-5 py-3 bg-white border border-border rounded-xl font-black text-xs uppercase"
                  >
                    {Object.keys(settings.ncrPrintFactors).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="flex flex-col justify-center gap-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={spec.numbering}
                      onChange={(e) => setSpec({ ...spec, numbering: e.target.checked })}
                      className="w-4 h-4 rounded border-border text-brand-accent focus:ring-brand-accent"
                    />
                    <span className="text-[10px] font-black text-text-light uppercase tracking-widest group-hover:text-text-main transition-colors">Numbering</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={spec.perforation}
                      onChange={(e) => setSpec({ ...spec, perforation: e.target.checked })}
                      className="w-4 h-4 rounded border-border text-brand-accent focus:ring-brand-accent"
                    />
                    <span className="text-[10px] font-black text-text-light uppercase tracking-widest group-hover:text-text-main transition-colors">Perforation</span>
                  </label>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-4 text-center">Batch Quantity (Number of Books)</label>
              <div className="flex bg-surface p-1 rounded-2xl border border-border/50 items-center">
                {[5, 10, 20, 50, 100].map(q => (
                  <button
                    key={q}
                    onClick={() => setQuantity(q)}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-[11px] font-black uppercase transition-all",
                      quantity === q ? "bg-white text-brand-accent shadow-sm" : "text-text-light hover:text-text-main"
                    )}
                  >
                    {q}
                  </button>
                ))}
                <div className="w-px h-6 bg-border mx-2" />
                <input 
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className="w-20 bg-transparent border-none text-center font-black text-[13px] focus:ring-0 italic tabular-nums"
                  placeholder="?"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Results */}
        <div className="w-full md:w-[420px] p-10 bg-white flex flex-col justify-between border-l-4 border-brand-accent/5 overflow-y-auto max-h-[90vh]">
          <div className="hidden md:flex justify-end mb-8 shrink-0">
            <button onClick={onClose} className="p-3 hover:bg-surface rounded-2xl transition-all">
              <X size={20} className="text-text-light" />
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {pricing ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <span className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] block mb-8 italic opacity-50">Calculated Commercial Rate</span>
                
                <div className="space-y-8">
                  <div className="relative">
                    <div className="flex items-baseline gap-2 mb-2">
                       <span className="text-sm font-black text-text-light italic">R</span>
                       <span className="text-6xl font-black text-text-main tracking-tighter tabular-nums italic leading-none">
                         {pricing.sell.toFixed(2).split('.')[0]}
                         <span className="text-2xl opacity-40">,{pricing.sell.toFixed(2).split('.')[1]}</span>
                       </span>
                    </div>
                    <p className="text-[10px] font-black text-brand-accent uppercase tracking-[0.2em]">{calcMode === 'registry' ? 'Matched from Registry' : 'Estimated via Pricing Engine'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-8 border-t border-border/30">
                    <div>
                       <span className="text-[8px] font-black text-text-light uppercase tracking-widest block mb-1">Unit Selling Price</span>
                       <span className="text-sm font-black text-text-main tabular-nums italic">R{pricing.unitSell.toFixed(2)}</span>
                    </div>
                    <div>
                       <span className="text-[8px] font-black text-text-light uppercase tracking-widest block mb-1">Total Production Cost</span>
                       <span className="text-sm font-black text-text-main tabular-nums italic opacity-40">R{pricing.cost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center">
                <p className="text-xs font-black text-text-light uppercase tracking-widest">Awaiting valid parameter input...</p>
              </div>
            )}
          </div>

          <div className="mt-12 space-y-4">
             <div className="p-4 bg-blue-50/50 rounded-2xl flex items-start gap-4">
                <Check size={20} className="text-brand-accent shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-text-muted leading-relaxed">Rates include global volume discounts and markup defaults defined in the pricing configuration module.</p>
             </div>
             <button 
                onClick={() => {
                  if (calcMode === 'registry') {
                    if (selectedBookId) onAddToQuote(selectedBookId, quantity);
                  } else {
                    // We need a way to handle automated items in QuoteModal
                    // For now let's just use the registry if possible, 
                    // or implement a generic handling in next iteration
                    alert('Automated quote generation is coming in the next build. Use Registry Lookup for now.');
                  }
                  onClose();
                }}
                className="w-full py-5 bg-brand-accent text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] shadow-xl shadow-brand-accent/20 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3"
             >
                Generate Official Quote
                <ExternalLink size={18} />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegisterModal({ book, onClose }: { book: NCRBook | null, onClose: () => void }) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<NCRBook>>({
    name: book?.name || '',
    description: book?.description || '',
    parts: book?.parts || '2-part',
    setsPerBook: book?.setsPerBook || 50,
    size: book?.size || 'A5',
    binding: book?.binding || 'Glued',
    print: book?.print || 'Single-sided',
    options: book?.options || [],
    pricingGrid: book?.pricingGrid || [{ quantity: 5, cost: 0, sell: 0 }],
    status: book?.status || 'Active'
  });

  const toggleOption = (opt: string) => {
    const current = formData.options || [];
    if (current.includes(opt)) {
      setFormData({ ...formData, options: current.filter(o => o !== opt) });
    } else {
      setFormData({ ...formData, options: [...current, opt] });
    }
  };

  const updateTier = (index: number, updates: Partial<NCRPricingTier>) => {
    const newGrid = [...(formData.pricingGrid || [])];
    newGrid[index] = { ...newGrid[index], ...updates };
    setFormData({ ...formData, pricingGrid: newGrid });
  };

  const addTier = () => {
    const lastQty = formData.pricingGrid?.[formData.pricingGrid.length - 1]?.quantity || 5;
    setFormData({ 
      ...formData, 
      pricingGrid: [...(formData.pricingGrid || []), { quantity: lastQty + 5, cost: 0, sell: 0 }] 
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
    console.log('Button Click: Save NCR Registry', { isEdit: !!book });
    setIsSaving(true);
    try {
      if (book?.id) {
        await updateDocument('ncr_books', book.id, formData);
      } else {
        await createDocument('ncr_books', { ...formData, createdAt: Date.now() });
      }
      onClose();
    } catch (error) {
      console.error('Error saving NCR book:', error);
      alert('Failed to save NCR specifications.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-text-main/20 backdrop-blur-sm overflow-y-auto pt-10 sm:pt-20">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 relative mb-10 sm:mb-20">
        <div className="px-10 py-8 bg-paper border-b border-border flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-2xl font-black text-text-main tracking-tighter uppercase italic">{book ? 'Update Registry' : 'Register NCR Book'}</h3>
            <p className="text-[10px] font-black text-text-light uppercase tracking-[0.2em]">Specification & table-based pricing grid</p>
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
                placeholder="e.g. NCR Duplicate White/Yellow Greyscale"
              />
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Parts</label>
                <input 
                  type="text"
                  value={formData.parts}
                  onChange={(e) => setFormData({ ...formData, parts: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-black"
                  placeholder="2-part"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Sets</label>
                <input 
                  type="number"
                  value={formData.setsPerBook}
                  onChange={(e) => setFormData({ ...formData, setsPerBook: parseInt(e.target.value) || 0 })}
                  className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-black"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Size</label>
                <select 
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-black appearance-none"
                >
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                  <option value="A6">A6</option>
                  <option value="DL">DL</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Binding</label>
                <input 
                   type="text"
                   value={formData.binding}
                   onChange={(e) => setFormData({ ...formData, binding: e.target.value })}
                   className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-black"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">Print Variation</label>
                <input 
                   type="text"
                   value={formData.print}
                   onChange={(e) => setFormData({ ...formData, print: e.target.value })}
                   className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-black"
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
            {book ? 'Update Registry' : 'Commit Registry'}
          </button>
        </div>
      </div>
    </div>
  );
}
