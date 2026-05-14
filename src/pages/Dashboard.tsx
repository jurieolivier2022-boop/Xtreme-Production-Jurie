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
      <header className="flex flex-col">
        <h2 className="text-4xl font-black text-text-main tracking-tighter uppercase italic">Control Center</h2>
        <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-2">Real-time production & revenue monitoring</p>
      </header>

      {/* Guided Workflow Section */}
      <section className="animate-in slide-in-from-top-4 duration-700">
        <div className="flex items-center justify-between mb-6 px-2">
           <h3 className="text-[11px] font-black text-text-light uppercase tracking-[0.3em] italic">System Initialization Sequence</h3>
           <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-brand uppercase tracking-widest">Guide Active</span>
              <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
           </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <WorkflowStep 
            id={1}
            title="Registry: Clients"
            desc="Onboard partners into the matrix"
            icon={Users}
            link="/clients"
            color="blue"
            isComplete={clients.length > 0}
            loading={clientsLoading}
            navigate={navigate}
          />
          <WorkflowStep 
            id={2}
            title="Catalog: Products"
            desc="Define units & technical specs"
            icon={Box}
            link="/products"
            color="purple"
            isComplete={products.length > 0}
            loading={productsLoading}
            navigate={navigate}
          />
          <WorkflowStep 
            id={3}
            title="Engine: Quoting"
            desc="Generate cost estimates"
            icon={FileText}
            link="/quotes"
            color="amber"
            isComplete={quotes.length > 0}
            loading={quotesLoading}
            navigate={navigate}
          />
          <WorkflowStep 
            id={4}
            title="Operations: Dispatch"
            desc="Finalize order & production"
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
        <StatCard label="Revenue MTD" value={loading ? '...' : `R ${mtdRevenue.toLocaleString()}`} icon={DollarSign} color="blue" trend="+12.5%" link="/reports" navigate={navigate} />
        <StatCard label="Net Profit" value={loading ? '...' : `R ${mtdProfit.toLocaleString()}`} icon={TrendingUp} color="emerald" trend="+8.2%" link="/reports" navigate={navigate} />
        <StatCard label="Active Fleet" value={loading ? '...' : activeJobsCount.toString()} icon={Briefcase} color="purple" trend="0" link="/jobs" navigate={navigate} />
        <StatCard label="Quote Pipeline" value={loading ? '...' : pendingQuotesCount.toString()} icon={FileText} color="amber" trend="-2" link="/quotes" navigate={navigate} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 card-minimal p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <TrendingUp size={120} strokeWidth={1} />
          </div>
          
          <div className="flex items-center justify-between mb-12 relative z-10">
            <div>
              <h3 className="text-xl font-black text-text-main tracking-tighter uppercase italic">Flow Analysis</h3>
              <p className="text-[10px] font-black text-text-light uppercase tracking-[0.2em] mt-1">Revenue throughput per cycle</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-surface rounded-full border border-border">
                <div className="w-2 h-2 bg-brand-accent rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Live Flow</span>
              </div>
            </div>
          </div>

          <div className="h-[420px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8', textTransform: 'uppercase' }} 
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} 
                  dx={-15}
                />
                <Tooltip 
                  cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5' }}
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: '1px solid #e2e8f0', 
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)',
                    padding: '16px',
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)'
                  }} 
                  labelStyle={{ fontWeight: 900, marginBottom: '8px', fontSize: '12px', color: '#0f172a' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={5} 
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                  activeDot={{ r: 8, stroke: '#fff', strokeWidth: 4, shadow: '0 0 20px rgba(59,130,246,0.5)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-8">
          <div className="card-minimal p-10 flex-1 relative overflow-hidden bg-brand text-white">
            <div className="absolute inset-0 grid-structure opacity-[0.03]" />
            <h3 className="text-xl font-black tracking-tighter uppercase italic mb-10 relative z-10">Real-Time Log</h3>
            
            <div className="space-y-6 relative z-10">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 opacity-40">
                  <Loader2 className="mb-4 animate-spin" size={32} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-center">Syncing Archive...</p>
                </div>
              ) : (
                <>
                  {quotes.slice(0, 4).map((quote, idx) => (
                    <ActivityItem 
                      key={quote.id}
                      icon={quote.status === 'Accepted' ? CheckCircle2 : FileText} 
                      title={quote.status === 'Accepted' ? "Order Finalized" : "Discovery Quote"} 
                      subject={quote.quoteNumber} 
                      time={new Date(quote.createdAt).toLocaleDateString()} 
                      color="white"
                      delay={idx * 0.1}
                    />
                  ))}
                  {quotes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 opacity-40">
                      <Clock className="mb-4" size={32} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-center">Awaiting System Cycles...</p>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <button 
              onClick={() => navigate('/quotes')}
              className="w-full mt-12 py-4 text-[10px] font-black uppercase tracking-[0.2em] bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl transition-all relative z-10"
            >
              Access Full Archives
            </button>
          </div>
          
          <div 
            onClick={() => toast.info('Support system active at L1. Hardware maintenance is standing by.', {
              description: 'For urgent escalations, please check the system logs in settings.',
              duration: 5000
            })}
            className="card-minimal p-8 bg-brand-accent text-white group cursor-pointer overflow-hidden transition-transform active:scale-95"
          >
             <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Support Status</p>
                  <h4 className="text-xl font-black tracking-tighter italic">L1 SUPPORT ACTIVE</h4>
                </div>
                <AlertCircle className="opacity-50 group-hover:rotate-12 transition-transform" />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowStep({ id, title, desc, icon: Icon, link, color, isComplete, loading, navigate }: any) {
  const colors = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    purple: "text-purple-600 bg-purple-50 border-purple-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
  };

  const progressColors = {
    blue: "bg-blue-600",
    purple: "bg-purple-600",
    amber: "bg-amber-600",
    emerald: "bg-emerald-600",
  };

  return (
    <div 
      onClick={() => navigate(link)}
      className={cn(
        "group cursor-pointer relative bg-white p-8 rounded-[2.5rem] border border-border shadow-sm hover:border-brand-accent/30 transition-all flex flex-col gap-6 overflow-hidden",
        isComplete && "border-emerald-100 bg-emerald-50/5"
      )}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-125 transition-transform duration-700" />
      
      <div className="flex items-center justify-between relative z-10">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500 group-hover:rounded-xl", colors[color as keyof typeof colors])}>
          <Icon size={24} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col items-end">
           <span className="text-[40px] font-black text-text-main/5 italic leading-none">{id}</span>
           {loading ? (
             <div className="mt-1 text-brand/40 animate-spin">
               <Loader2 size={10} />
             </div>
           ) : isComplete && (
             <div className="flex items-center gap-1 mt-1 text-emerald-600 font-black text-[8px] uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
               <CheckCircle2 size={10} />
               Valid
             </div>
           )}
        </div>
      </div>

      <div className="relative z-10 flex-1">
        <h4 className="text-sm font-black text-text-main uppercase tracking-tight group-hover:text-brand transition-colors">{title}</h4>
        <p className="text-[10px] text-text-light font-bold uppercase tracking-widest mt-2 leading-relaxed">{desc}</p>
      </div>

      <div className="flex items-center justify-between relative z-10 group/btn">
         <div className="h-1 flex-1 bg-surface rounded-full mr-6 overflow-hidden">
            <div className={cn(
               "h-full rounded-full transition-all duration-1000",
               progressColors[color as keyof typeof progressColors],
               isComplete ? "w-full" : "w-1/3 opacity-30"
            )} />
         </div>
         <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-text-light group-hover:text-brand group-hover:border-brand transition-all">
            <ArrowRight size={14} strokeWidth={3} />
         </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, trend, link, navigate }: any) {
  const colors = {
    blue: "text-brand-accent border-brand-accent/10 bg-brand-accent/5",
    emerald: "text-emerald-500 border-emerald-500/10 bg-emerald-500/5",
    purple: "text-purple-500 border-purple-500/10 bg-purple-500/5",
    amber: "text-amber-500 border-amber-500/10 bg-amber-500/5",
  };

  return (
    <div 
      onClick={() => link && navigate(link)}
      className="card-minimal group cursor-pointer border-border/50 hover:border-brand-accent/30 transition-all duration-500"
    >
      <div className="flex items-center justify-between mb-8">
        <div className={cn("w-14 h-14 rounded-[2rem] flex items-center justify-center border transition-all group-hover:rounded-2xl duration-700", colors[color as keyof typeof colors])}>
          <Icon size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
        </div>
        <div className={cn(
          "px-3 py-1.5 rounded-full flex items-center gap-1.5",
          trend?.startsWith('+') ? "text-emerald-500 bg-emerald-50/50 border border-emerald-100" : trend?.startsWith('-') ? "text-red-500 bg-red-50/50 border border-red-100" : "text-text-muted bg-surface border border-border"
        )}>
          {trend?.startsWith('+') && <TrendingUp size={10} />}
          <span className="text-[9px] font-black uppercase tracking-wider">{trend === '0' ? 'IDLE' : trend}</span>
        </div>
      </div>
      
      <p className="text-[9px] font-black text-text-light uppercase tracking-[0.2em] mb-2">{label}</p>
      <h4 className="text-3xl font-black text-text-main tracking-tighter tabular-nums">{value}</h4>
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
