import React, { useState } from 'react';
import { Search, Plus, Filter, Edit2, Share2, Trash2, Clock, AlertCircle, Briefcase, Mail, MessageCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useCollection, deleteDocument, updateDocument, createDocument, getNextSequence } from '../lib/firestoreService';
import { Quote, Client, Job, CompanySettings } from '../types';
import QuoteModal from '../components/QuoteModal';
import { shareViaWhatsApp, shareViaEmail } from '../lib/messagingService';

const statusStyles = {
  Accepted: "bg-emerald-50 text-emerald-600",
  Sent: "bg-blue-50 text-brand",
  Draft: "bg-gray-100 text-text-light",
  Viewed: "bg-orange-50 text-orange-600",
  Rejected: "bg-red-50 text-red-600",
  Expired: "bg-gray-200 text-gray-500",
};

export default function Quotes() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  
  const { data: quotes, loading: quotesLoading } = useCollection<Quote>('quotes');
  const { data: clients } = useCollection<Client>('clients');
  const { data: jobs, loading: jobsLoading } = useCollection<Job>('jobs');
  const { data: companyList } = useCollection<CompanySettings>('company_settings');

  const company = companyList.find(c => c.id === 'company') || companyList[0];

  const loading = quotesLoading || jobsLoading;

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? (client.companyName || client.name) : 'Unknown Client';
  };

  const handleEdit = (quote: Quote) => {
    console.log('Button Click: Edit Quote', { id: quote.id });
    setSelectedQuote(quote);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    console.log('Button Click: Delete Quote', { id });
    if (confirm('Are you sure you want to delete this quote?')) {
      setIsUpdating(id);
      try {
        await deleteDocument('quotes', id);
      } finally {
        setIsUpdating(null);
      }
    }
  };

  const handleStatusChange = async (id: string, status: Quote['status']) => {
    console.log('Button Click: Quote Status Change', { id, status });
    setIsUpdating(id);
    try {
      await updateDocument('quotes', id, { status });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleCreateJob = async (quote: Quote) => {
    console.log('Button Click: Convert Quote to Job', { id: quote.id });
    const clientName = getClientName(quote.clientId);
    const productsSummary = quote.items.map(item => item.description).join(', ') || 'Custom Production';
    
    setIsUpdating(quote.id);
    try {
      const year = new Date().getFullYear();
      const sequence = await getNextSequence(`jobs_${year}`);
      if (sequence === null) throw new Error("Failed to generate sequence");
      
      const jobNumber = `Jobcard-${year}-${sequence.toString()}`;
      
      const jobData: Omit<Job, 'id'> = {
        jobNumber,
        quoteId: quote.id,
        clientId: quote.clientId,
        clientName,
        productName: productsSummary,
        stage: 'Prepress',
        priority: 'Normal',
        dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000), // Default 1 week
        artworkStatus: 'Pending',
        items: quote.items,
        total: quote.total,
        profit: quote.profit,
        createdAt: Date.now(),
      };
      
      await createDocument('jobs', jobData);
      alert(`Production Job ${jobNumber} created for ${clientName}`);
    } catch (error) {
      console.error("Error creating job:", error);
      alert("Failed to create job. Please try again.");
    } finally {
      setIsUpdating(null);
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
    <div className="flex flex-col gap-12 animate-in fade-in duration-700">
      <div className="flex items-center justify-between gap-8">
        <div className="flex items-center gap-6 flex-1">
          <div className="relative group w-full max-w-xl">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-brand-accent transition-all group-focus-within:scale-110" size={18} />
            <input 
              type="text" 
              placeholder="Filter sale pipeline..." 
              className="w-full pl-14 pr-6 py-4 bg-paper border border-border/80 rounded-3xl text-[11px] font-black uppercase tracking-[0.05em] focus:outline-none focus:ring-[8px] focus:ring-brand-accent/5 focus:border-brand-accent/40 transition-all shadow-sm"
            />
          </div>
          <button className="flex items-center gap-2 px-8 py-4 bg-paper border border-border/80 rounded-3xl text-[10px] font-black text-text-muted hover:border-brand-accent hover:text-brand-accent transition-all shadow-sm uppercase tracking-widest">
            <Filter size={18} />
            Matrix Filter
          </button>
        </div>
        <button 
          onClick={() => {
            setSelectedQuote(null);
            setIsModalOpen(true);
          }}
          className="btn-primary flex items-center gap-3 px-10 py-5 rounded-3xl shadow-2xl shadow-brand/20 active:scale-95 group transition-all"
        >
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center transition-transform group-hover:rotate-90">
            <Plus size={16} strokeWidth={3} />
          </div>
          <span className="uppercase tracking-[0.2em] text-xs font-black">Generate Quote</span>
        </button>
      </div>

      <div className="card-minimal p-0 overflow-hidden relative border-border/40">
        <div className="absolute inset-0 grid-structure opacity-[0.015] pointer-events-none" />
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left min-w-[1200px]">
            <thead>
              <tr className="bg-surface/50 border-b border-border/50">
                <th className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.25em]">Registry ID</th>
                <th className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.25em]">Entity Detail</th>
                <th className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.25em]">Scope</th>
                <th className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.25em]">Priority</th>
                <th className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.25em]">Log Date</th>
                <th className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.25em]">Gross Val</th>
                <th className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.25em]">Yield</th>
                <th className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.3em]">State</th>
                <th className="px-10 py-6 text-[9px] font-black text-text-light uppercase tracking-[0.25em] text-right">Ops</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {quotes.map((quote, idx) => (
                <tr 
                  key={quote.id} 
                  className={cn(
                    "hover:bg-brand-accent/[0.02] transition-colors group animate-in fade-in slide-in-from-left-2 fill-mode-both relative",
                    isUpdating === quote.id && "opacity-50 pointer-events-none"
                  )}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  {isUpdating === quote.id && (
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] z-50 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
                    </div>
                  )}
                  <td className="px-10 py-8">
                    <span className="text-xs font-black text-brand-accent tracking-tighter tabular-nums px-3 py-1 bg-blue-50 rounded-lg">#{quote.quoteNumber.split('-')[2]}</span>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-text-main font-black tracking-tighter group-hover:text-brand-accent transition-colors italic">{getClientName(quote.clientId)}</span>
                      <span className="text-[9px] text-text-light font-bold uppercase tracking-widest opacity-60">REF-{quote.id.substring(0, 8)}</span>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-[11px] text-text-muted font-bold uppercase tracking-widest tabular-nums">
                    {quote.items.length} units
                  </td>
                  <td className="px-10 py-8">
                    {quote.isExpress ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-accent/5 text-brand-accent rounded-full text-[9px] font-black uppercase tracking-widest border border-brand-accent/10">
                        <Clock size={10} strokeWidth={3} className="animate-pulse" />
                        SLA: Express
                      </span>
                    ) : (
                      <span className="text-[9px] font-black text-text-light uppercase tracking-[0.2em] opacity-40">Standard</span>
                    )}
                  </td>
                  <td className="px-10 py-8 text-[10px] text-text-muted font-black tabular-nums tracking-widest">
                    {new Date(quote.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-10 py-8">
                    <span className="text-sm font-black text-text-main tabular-nums tracking-tighter">R{quote.total.toLocaleString()}</span>
                  </td>
                  <td className="px-10 py-8">
                    <span className="text-sm font-black text-emerald-500 tabular-nums tracking-tighter">R{quote.profit.toLocaleString()}</span>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex flex-col gap-2 items-center">
                      <span className={cn(
                        "px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm w-full text-center",
                        quote.status === 'Accepted' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        quote.status === 'Sent' ? "bg-blue-50 text-brand-accent border-blue-100" :
                        quote.status === 'Viewed' ? "bg-amber-50 text-amber-600 border-amber-100" :
                        quote.status === 'Rejected' ? "bg-red-50 text-red-600 border-red-100" :
                        "bg-surface text-text-muted border-border"
                      )}>
                        {quote.status}
                      </span>
                      {quote.status === 'Accepted' && (
                        <>
                          {jobs.some(j => j.quoteId === quote.id) ? (
                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                              <Briefcase size={10} /> In Production
                            </span>
                          ) : (
                            <button 
                              onClick={() => handleCreateJob(quote)}
                              className="w-full py-1.5 bg-emerald-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1"
                            >
                              <Plus size={10} /> Convert to Order
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <div className="flex items-center justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                      {quote.status === 'Accepted' && !jobs.some(j => j.quoteId === quote.id) && (
                        <button 
                          onClick={() => handleCreateJob(quote)}
                          title="Generate Production Job"
                          className="w-10 h-10 flex items-center justify-center text-emerald-500 hover:bg-emerald-50/50 rounded-2xl transition-all"
                        >
                          <Briefcase size={16} strokeWidth={2.5} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleEdit(quote)}
                        className="w-10 h-10 flex items-center justify-center text-text-light hover:text-brand-accent hover:bg-blue-50/50 rounded-2xl transition-all"
                      >
                        <Edit2 size={16} strokeWidth={2.5} />
                      </button>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => {
                            const client = clients.find(c => c.id === quote.clientId);
                            if (client) shareViaWhatsApp('quote', quote, client, company);
                          }}
                          title="Share via WhatsApp"
                          className="w-10 h-10 flex items-center justify-center text-text-light hover:text-emerald-500 hover:bg-emerald-50/50 rounded-2xl transition-all"
                        >
                          <MessageCircle size={16} strokeWidth={2.5} />
                        </button>
                        <button 
                          onClick={() => {
                            const client = clients.find(c => c.id === quote.clientId);
                            if (client) shareViaEmail('quote', quote, client, company);
                          }}
                          title="Send via Email"
                          className="w-10 h-10 flex items-center justify-center text-text-light hover:text-amber-500 hover:bg-amber-50/50 rounded-2xl transition-all"
                        >
                          <Mail size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                      <button 
                        onClick={() => handleDelete(quote.id)}
                        className="w-10 h-10 flex items-center justify-center text-text-light hover:text-red-500 hover:bg-red-50/50 rounded-2xl transition-all"
                      >
                        <Trash2 size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {quotes.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-10 py-32 text-center relative z-10">
                    <div className="w-24 h-24 bg-surface text-text-light rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-border/50 group hover:scale-110 transition-transform duration-700">
                      <AlertCircle size={40} className="group-hover:rotate-12 transition-transform" />
                    </div>
                    <p className="text-xl font-black text-text-main tracking-tighter uppercase italic">Registry Empty</p>
                    <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-2">Awaiting system initialization or user input</p>
                    <button 
                      onClick={() => setIsModalOpen(true)}
                      className="mt-8 px-8 py-4 bg-brand-accent text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-3xl hover:shadow-xl hover:shadow-brand-accent/20 transition-all"
                    >
                      Initialize First Record
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <QuoteModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setSelectedQuote(null);
        }} 
        quote={selectedQuote} 
      />
    </div>
  );
}
