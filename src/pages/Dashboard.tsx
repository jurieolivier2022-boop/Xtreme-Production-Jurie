import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Briefcase, FileText, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useCollection } from '../lib/firestoreService';
import { Quote, Job } from '../types';

export default function Dashboard() {
  const { data: quotes } = useCollection<Quote>('quotes');
  const { data: jobs } = useCollection<Job>('jobs');

  const mtdRevenue = quotes
    .filter(q => q.status === 'Accepted' && new Date(q.createdAt).getMonth() === new Date().getMonth())
    .reduce((sum, q) => sum + q.subtotal, 0);

  const mtdProfit = quotes
    .filter(q => q.status === 'Accepted' && new Date(q.createdAt).getMonth() === new Date().getMonth())
    .reduce((sum, q) => sum + q.profit, 0);

  const activeJobsCount = jobs.filter(j => j.stage !== 'Delivered' && j.stage !== 'Cancelled').length;
  const pendingQuotesCount = quotes.filter(q => q.status === 'Sent' || q.status === 'Viewed' || q.status === 'Draft').length;

  // Chart data calculation
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard label="Revenue MTD" value={`R ${mtdRevenue.toLocaleString()}`} icon={DollarSign} color="blue" trend="+12.5%" link="/reports" />
        <StatCard label="Net Profit" value={`R ${mtdProfit.toLocaleString()}`} icon={TrendingUp} color="emerald" trend="+8.2%" link="/reports" />
        <StatCard label="Active Fleet" value={activeJobsCount.toString()} icon={Briefcase} color="purple" trend="0" link="/jobs" />
        <StatCard label="Quote Pipeline" value={pendingQuotesCount.toString()} icon={FileText} color="amber" trend="-2" link="/quotes" />
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
            </div>
            
            <button 
              onClick={() => window.location.href = '/quotes'}
              className="w-full mt-12 py-4 text-[10px] font-black uppercase tracking-[0.2em] bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl transition-all relative z-10"
            >
              Access Full Archives
            </button>
          </div>
          
          <div 
            onClick={() => alert('Support system active. For urgent issues contact hardware maintenance.')}
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

function StatCard({ label, value, icon: Icon, color, trend, link }: any) {
  const colors = {
    blue: "text-brand-accent border-brand-accent/10 bg-brand-accent/5",
    emerald: "text-emerald-500 border-emerald-500/10 bg-emerald-500/5",
    purple: "text-purple-500 border-purple-500/10 bg-purple-500/5",
    amber: "text-amber-500 border-amber-500/10 bg-amber-500/5",
  };

  return (
    <div 
      onClick={() => link && (window.location.href = link)}
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
