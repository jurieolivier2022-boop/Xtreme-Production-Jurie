import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Briefcase, FileText, Clock, CheckCircle2, AlertCircle, Users, Box, Share2, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useCollection } from '../lib/firestoreService';
import { Quote, Job, Client, Product } from '../types';
import { toast } from 'sonner';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: quotes, loading: quotesLoading } = useCollection<Quote>('quotes');
  const { data: jobs, loading: jobsLoading } = useCollection<Job>('jobs');
  const { data: clients, loading: clientsLoading } = useCollection<Client>('clients');
  const { data: products, loading: productsLoading } = useCollection<Product>('products');

  const loading = quotesLoading || jobsLoading || clientsLoading || productsLoading;

  const mtdRevenue = quotes
    .filter(q => q.status === 'Accepted' && new Date(q.createdAt).getMonth() === new Date().getMonth())
    .reduce((sum, q) => sum + q.subtotal, 0);

  const mtdProfit = quotes
    .filter(q => q.status === 'Accepted' && new Date(q.createdAt).getMonth() === new Date().getMonth())
    .reduce((sum, q) => sum + q.profit, 0);

  const activeJobsCount = jobs.filter(j => j.stage !== 'Delivered' && j.stage !== 'Cancelled').length;
  const pendingQuotesCount = quotes.filter(q => q.status === 'Sent' || q.status === 'Viewed' || q.status === 'Draft').length;

  const chartData = [
    { name: 'Mon', revenue: 4200 },
    { name: 'Tue', revenue: 3800 },
    { name: 'Wed', revenue: 5600 },
    { name: 'Thu', revenue: 8400 },
    { name: 'Fri', revenue: 6200 },
    { name: 'Sat', revenue: 2500 },
    { name: 'Sun', revenue: 1200 },
  ];

  return (
    <div className="flex flex-col gap-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-5xl font-black text-text-main tracking-tighter uppercase italic font-serif leading-none">Studio Pulse</h2>
          <p className="text-[11px] font-black text-creative uppercase tracking-[0.4em] mt-3 flex items-center gap-2">
            <span className="w-8 h-px bg-creative opacity-30" />
            Live production metrics
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm self-start md:self-auto">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="User" />
              </div>
            ))}
          </div>
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest pl-2">System Active</span>
        </div>
      </header>

      {/* Guided Workflow Section */}
      <section className="animate-in slide-in-from-top-4 duration-700">
        <div className="flex items-center justify-between mb-8 px-2">
           <h3 className="text-[11px] font-black text-text-muted uppercase tracking-[0.3em] flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-brand-accent shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
             Core Execution Workflow
           </h3>
           <div className="hidden md:flex items-center gap-3">
              <span className="text-[9px] font-black text-text-light uppercase tracking-widest">Progress</span>
              <div className="w-40 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-accent rounded-full transition-all duration-1000" style={{ width: '75%' }} />
              </div>
           </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <WorkflowStep 
            id={1}
            title="Registry: Clients"
            desc="Maintain your partner network"
            icon={Users}
            link="/clients"
            color="indigo"
            isComplete={clients.length > 0}
            loading={clientsLoading}
            navigate={navigate}
          />
          <WorkflowStep 
            id={2}
            title="Catalog: Products"
            desc="Technical unit specifications"
            icon={Box}
            link="/products"
            color="rose"
            isComplete={products.length > 0}
            loading={productsLoading}
            navigate={navigate}
          />
          <WorkflowStep 
            id={3}
            title="Engine: Quoting"
            desc="Automated cost estimation"
            icon={FileText}
            link="/quotes"
            color="amber"
            isComplete={quotes.length > 0}
            loading={quotesLoading}
            navigate={navigate}
          />
          <WorkflowStep 
            id={4}
            title="Output: Delivery"
            desc="Production & logistics flow"
            icon={Share2}
            link="/jobs"
            color="emerald"
            isComplete={jobs.length > 0}
            loading={jobsLoading}
            navigate={navigate}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard label="Revenue MTD" value={loading ? '...' : `R ${mtdRevenue.toLocaleString()}`} icon={DollarSign} color="indigo" trend="+12.5%" link="/reports" navigate={navigate} />
        <StatCard label="Net Profit" value={loading ? '...' : `R ${mtdProfit.toLocaleString()}`} icon={TrendingUp} color="emerald" trend="+8.2%" link="/reports" navigate={navigate} />
        <StatCard label="Active Fleet" value={loading ? '...' : activeJobsCount.toString()} icon={Briefcase} color="rose" trend="0" link="/jobs" navigate={navigate} />
        <StatCard label="Quote Pipeline" value={loading ? '...' : pendingQuotesCount.toString()} icon={FileText} color="amber" trend="-2" link="/quotes" navigate={navigate} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.05)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-1000">
            <TrendingUp size={120} strokeWidth={1} />
          </div>
          
          <div className="flex items-center justify-between mb-12 relative z-10">
            <div>
              <h3 className="text-2xl font-black text-text-main tracking-tighter uppercase italic font-serif">Flux Performance</h3>
              <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-2">Revenue output velocity</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-2 h-2 bg-brand-accent rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Real-time</span>
              </div>
            </div>
          </div>

          <div className="h-[420px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontBold: 900, fill: '#64748b', textTransform: 'uppercase' }} 
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontBold: 900, fill: '#64748b' }} 
                  dx={-15}
                />
                <Tooltip 
                  cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 5' }}
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: '1px solid #f1f5f9', 
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)',
                    padding: '20px',
                    backgroundColor: 'rgba(255,255,255,1)',
                  }} 
                  labelStyle={{ fontWeight: 900, marginBottom: '10px', fontSize: '14px', color: '#0f172a', textTransform: 'uppercase' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#6366f1" 
                  strokeWidth={6} 
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                  activeDot={{ r: 10, stroke: '#fff', strokeWidth: 5, shadow: '0 0 20px rgba(99,102,241,0.5)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-8">
          <div className="bg-brand rounded-[2.5rem] p-10 flex-1 relative overflow-hidden text-white shadow-2xl shadow-brand/20">
            <div className="absolute inset-0 grid-structure opacity-[0.04]" />
            <h3 className="text-xl font-black tracking-tighter uppercase italic mb-10 relative z-10 font-serif">Event Stream</h3>
            
            <div className="space-y-7 relative z-10">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 opacity-40">
                  <Loader2 className="mb-4 animate-spin text-creative" size={32} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-center">Syncing Matrix...</p>
                </div>
              ) : (
                <>
                  {quotes.slice(0, 4).map((quote, idx) => (
                    <ActivityItem 
                      key={quote.id}
                      icon={quote.status === 'Accepted' ? CheckCircle2 : FileText} 
                      title={quote.status === 'Accepted' ? "Workflow Committed" : "Draft Broadcast"} 
                      subject={quote.quoteNumber} 
                      time={new Date(quote.createdAt).toLocaleDateString()} 
                      color="white"
                      delay={idx * 0.1}
                    />
                  ))}
                  {quotes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 opacity-40">
                      <Clock className="mb-4" size={32} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-center">System Idle...</p>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <button 
              onClick={() => navigate('/quotes')}
              className="w-full mt-12 py-4 text-[11px] font-black uppercase tracking-[0.3em] bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all relative z-10 flex items-center justify-center gap-3 active:scale-95 group"
            >
              Full Command History
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          <div 
            onClick={() => toast.info('Studio support is online. Design systems performing optimally.', {
              description: 'Real-time monitoring active across all production channels.',
              duration: 5000
            })}
            className="bg-creative rounded-[2rem] p-8 text-white group cursor-pointer overflow-hidden transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-rose-500/20 relative"
          >
             <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-8 -translate-y-8 blur-2xl group-hover:bg-white/20 transition-colors" />
             <div className="flex justify-between items-start relative z-10">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Support Node</p>
                  <h4 className="text-2xl font-black tracking-tighter italic uppercase font-serif">HQ READY</h4>
                </div>
                <AlertCircle className="opacity-60 group-hover:rotate-12 transition-transform" />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowStep({ id, title, desc, icon: Icon, link, color, isComplete, loading, navigate }: any) {
  const colors = {
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
    rose: "text-rose-600 bg-rose-50 border-rose-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
  };

  const progressColors = {
    indigo: "bg-indigo-600",
    rose: "bg-rose-600",
    amber: "bg-amber-600",
    emerald: "bg-emerald-600",
  };

  return (
    <div 
      onClick={() => navigate(link)}
      className={cn(
        "group cursor-pointer relative bg-white p-9 rounded-[3rem] border border-slate-100 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all flex flex-col gap-7 overflow-hidden",
        isComplete && "bg-slate-50/30"
      )}
    >
      <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50/50 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-150 transition-transform duration-1000 pointer-events-none" />
      
      <div className="flex items-center justify-between relative z-10">
        <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center border-2 transition-all duration-700 group-hover:rotate-3", colors[color as keyof typeof colors])}>
          <Icon size={28} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col items-end">
           <span className="text-[54px] font-black text-slate-100 italic leading-none translate-x-4 tracking-tighter transition-colors group-hover:text-slate-200">{id}</span>
           {loading ? (
             <div className="mt-1 text-brand-accent/40 animate-spin">
               <Loader2 size={12} />
             </div>
           ) : isComplete && (
             <div className="flex items-center gap-1.5 mt-2 text-emerald-600 font-black text-[9px] uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-emerald-100 shadow-sm animate-in zoom-in duration-500">
               <CheckCircle2 size={12} />
               Synced
             </div>
           )}
        </div>
      </div>

      <div className="relative z-10 flex-1">
        <h4 className="text-base font-black text-text-main uppercase tracking-tight group-hover:text-brand-accent transition-colors italic font-serif leading-tight">{title}</h4>
        <p className="text-[11px] text-text-light font-bold uppercase tracking-widest mt-3 leading-relaxed">{desc}</p>
      </div>

      <div className="flex items-center justify-between relative z-10 group/btn">
         <div className="h-2 flex-1 bg-slate-50 border border-slate-100 rounded-full mr-8 overflow-hidden">
            <div className={cn(
               "h-full rounded-full transition-all duration-1000",
               progressColors[color as keyof typeof progressColors],
               isComplete ? "w-full" : "w-1/4 opacity-40 animate-pulse"
            )} />
         </div>
         <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-text-light group-hover:text-brand-accent group-hover:border-brand-accent group-hover:shadow-lg group-hover:shadow-brand-accent/20 transition-all rotate-0 group-hover:rotate-6">
            <ArrowRight size={18} strokeWidth={3} />
         </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, trend, link, navigate }: any) {
  const colors = {
    indigo: "text-brand-accent border-brand-accent/20 bg-indigo-50/50",
    emerald: "text-emerald-500 border-emerald-500/20 bg-emerald-50/50",
    rose: "text-rose-500 border-rose-500/20 bg-rose-50/50",
    amber: "text-amber-500 border-amber-500/20 bg-amber-50/50",
  };

  return (
    <div 
      onClick={() => link && navigate(link)}
      className="bg-white border border-slate-100 rounded-[2.5rem] p-9 group cursor-pointer hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.06)] hover:border-brand-accent/30 transition-all duration-500"
    >
      <div className="flex items-center justify-between mb-10">
        <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center border-2 transition-all group-hover:rounded-[2rem] duration-700 shadow-sm", colors[color as keyof typeof colors])}>
          <Icon size={28} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
        </div>
        <div className={cn(
          "px-4 py-2 rounded-2xl flex items-center gap-2 shadow-sm",
          trend?.startsWith('+') ? "text-emerald-600 bg-emerald-50 border border-emerald-100" : trend?.startsWith('-') ? "text-rose-600 bg-rose-50 border border-rose-100" : "text-text-muted bg-slate-50 border border-slate-100"
        )}>
          {trend?.startsWith('+') && <TrendingUp size={12} />}
          <span className="text-[10px] font-black uppercase tracking-wider">{trend === '0' ? 'IDLE' : trend}</span>
        </div>
      </div>
      
      <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-3">{label}</p>
      <h4 className="text-4xl font-black text-text-main tracking-tighter tabular-nums font-serif italic">{value}</h4>
    </div>
  );
}

function ActivityItem({ icon: Icon, title, subject, time, color, delay }: any) {
  const colors = {
    blue: "text-brand-accent bg-blue-50/50",
    emerald: "text-emerald-500 bg-emerald-50",
    red: "text-red-500 bg-red-50",
    purple: "text-purple-500 bg-purple-50",
    white: "text-white bg-white/10"
  };

  return (
    <div 
      className="flex gap-4 group cursor-pointer animate-in fade-in slide-in-from-left-4 duration-500 fill-mode-both"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border border-transparent transition-all group-hover:border-current/20", colors[color as keyof typeof colors])}>
        <Icon size={18} strokeWidth={2.5} />
      </div>
      <div className="flex flex-col gap-0.5 justify-center">
        <span className="text-xs font-black tracking-tight uppercase group-hover:translate-x-1 transition-transform inline-block">{title}</span>
        <span className="text-[10px] font-medium opacity-60 uppercase tracking-widest">{subject} • {time}</span>
      </div>
    </div>
  );
}
