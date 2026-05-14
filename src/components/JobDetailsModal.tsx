import React from 'react';
import { X, Calendar, Clock, CheckCircle2, Layers, Wrench, Zap, Info, Scissors, Check, Printer, Edit2, Box, Book, ExternalLink, FileText, Settings } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Job, Client, Department, Machine, Material } from '../types';

interface JobDetailsModalProps {
  job: Job;
  clientId: string;
  clients: Client[];
  departments: Department[];
  machines: Machine[];
  materials: Material[];
  onClose: () => void;
  onEdit?: (job: Job) => void;
}

const stageStyles = {
  Prepress: "bg-purple-50 text-purple-600",
  Printing: "bg-blue-50 text-brand",
  Laminating: "bg-cyan-50 text-cyan-600",
  Finishing: "bg-indigo-50 text-indigo-600",
  'Quality Check': "bg-amber-50 text-amber-600",
  Ready: "bg-emerald-50 text-emerald-600",
  Delivered: "bg-emerald-500 text-white",
  Cancelled: "bg-gray-100 text-gray-500",
  Embroidery: "bg-pink-50 text-pink-600",
  Screenprinting: "bg-orange-50 text-orange-600",
};

export default function JobDetailsModal({ 
  job, 
  clients,
  departments,
  machines,
  materials,
  onClose,
  onEdit 
}: JobDetailsModalProps) {
  const client = clients.find(c => c.id === job.clientId);
  const dept = departments.find(d => d.id === job.departmentId);
  const machine = machines.find(m => m.id === job.assignedMachineId);

  const stages = [
    { id: 'Prepress', icon: Layers, label: 'Pre-Press' },
    { id: 'Printing', icon: Wrench, label: 'Printing' },
    { id: 'Laminating', icon: Layers, label: 'Laminating' },
    { id: 'Embroidery', icon: Zap, label: 'Embroidery' },
    { id: 'Screenprinting', icon: Wrench, label: 'Screenprint' },
    { id: 'Finishing', icon: Scissors, label: 'Finishing' },
    { id: 'Quality Check', icon: Info, label: 'QA Check' },
    { id: 'Ready', icon: Check, label: 'Dispatch' },
  ];

  const currentStageIndex = stages.findIndex(s => s.id === job.stage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-text-main/20 backdrop-blur-sm overflow-hidden">
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col relative printable-content"
      >
        <div className="p-8 border-b border-border flex items-center justify-between bg-white relative z-10 no-print">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-brand/5 border border-brand/10 rounded-2xl flex flex-col items-center justify-center">
              <span className="text-[10px] font-black text-brand uppercase tracking-widest leading-none mb-1">Job #</span>
              <span className="text-xl font-black text-text-main italic leading-none">{job.jobNumber}</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-text-main tracking-tighter uppercase italic leading-none">{job.productName}</h2>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                Live Production Specification Card
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button 
                onClick={() => window.print()}
                className="p-3 bg-white border border-border rounded-xl text-text-light hover:text-brand hover:border-brand-accent transition-all shadow-sm group"
                title="Print Job Card"
              >
                <Printer size={20} />
              </button>
             {onEdit && (
               <button 
                  onClick={() => onEdit(job)}
                  className="p-3 bg-white border border-border rounded-xl text-brand hover:bg-blue-50 transition-all shadow-sm group"
                >
                  <Edit2 size={20} />
                </button>
             )}
            <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition-all shadow-sm group">
              <X className="group-hover:rotate-90 transition-transform text-text-light" size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          <div className="p-8 space-y-8 print:p-0">
            {/* Stage Progress Tracker */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-border relative overflow-hidden shadow-sm">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.2em] italic">Production Flow Dynamics</h3>
                  <span className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                    stageStyles[job.stage as keyof typeof stageStyles]
                  )}>
                    Currently {job.stage}
                  </span>
               </div>
               <div className="relative flex justify-between">
                  <div className="absolute top-1/2 left-0 w-full h-[2px] bg-border/40 -translate-y-1/2 z-0" />
                  <div 
                    className="absolute top-1/2 left-0 h-[2px] bg-brand-accent -translate-y-1/2 z-0 transition-all duration-1000" 
                    style={{ width: `${(currentStageIndex / (stages.length - 1)) * 100}%` }} 
                  />
                  {stages.map((stage, idx) => {
                    const Icon = stage.icon;
                    const isActive = idx <= currentStageIndex;
                    const isCurrent = idx === currentStageIndex;
                    
                    return (
                      <div key={stage.id} className="relative z-10 flex flex-col items-center">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 border-2",
                          isActive ? "bg-brand-accent text-white border-brand-accent scale-110 shadow-lg shadow-brand-accent/20" : "bg-white text-text-light border-border/60",
                          isCurrent && "ring-4 ring-brand-accent/20"
                        )}>
                          <Icon size={16} />
                        </div>
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-tighter mt-3 whitespace-nowrap",
                          isActive ? "text-brand-accent" : "text-text-light opacity-50"
                        )}>
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
               </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              {/* Client Info Block */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-border shadow-sm group">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-50/50 rounded-2xl flex items-center justify-center text-brand">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-text-light uppercase tracking-widest leading-none mb-1">Fulfillment Recipient</p>
                    <h4 className="text-lg font-black text-text-main tracking-tighter uppercase italic leading-none">{client?.companyName || client?.name || 'Unknown'}</h4>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-border/40">
                    <span className="text-[9px] font-bold text-text-light uppercase tracking-widest">Contact Identity</span>
                    <span className="text-[11px] font-black text-text-main tracking-tight italic">{client?.name}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-border/40">
                    <span className="text-[9px] font-bold text-text-light uppercase tracking-widest">Digital Channel</span>
                    <span className="text-[11px] font-black text-brand tracking-tight italic">{client?.email}</span>
                  </div>
                </div>
              </div>

              {/* Assignment Block */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-border shadow-sm hover:border-brand-accent/30 transition-all group">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-amber-50/50 rounded-2xl flex items-center justify-center text-amber-600">
                    <Settings size={24} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-text-light uppercase tracking-widest leading-none mb-1">Operational Cell</p>
                    <h4 className="text-lg font-black text-text-main tracking-tighter uppercase italic leading-none">{dept?.name || 'Unallocated'}</h4>
                  </div>
                </div>
                <div className="bg-surface/40 p-4 rounded-2xl border border-border/40">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-text-light uppercase tracking-widest mb-1 opacity-60">Assigned Machine</span>
                      <span className="text-xs font-black text-text-main uppercase tracking-tight">{machine?.name || 'Automatic Allocation'}</span>
                    </div>
                    {machine && (
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[8px] font-black uppercase tracking-widest">
                        Ready
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Dates Card */}
            <div className="grid grid-cols-2 gap-6">
               <div className="bg-white p-6 rounded-[2rem] border border-border shadow-sm flex items-center gap-4 group">
                  <div className="w-12 h-12 bg-blue-50/50 rounded-2xl flex items-center justify-center text-brand group-hover:scale-110 transition-transform">
                    <Calendar size={22} />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-text-light uppercase tracking-widest mb-1">Creation Log</p>
                    <p className="text-base font-black text-text-main italic tracking-tighter uppercase">{new Date(job.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-[2rem] border border-border shadow-sm flex items-center gap-4 group">
                  <div className="w-12 h-12 bg-red-50/50 rounded-2xl flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                    <Clock size={22} />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-text-light uppercase tracking-widest mb-1">Hard Deadline</p>
                    <p className="text-base font-black text-red-500 italic tracking-tighter uppercase">{new Date(job.dueDate).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  </div>
               </div>
            </div>

            {/* NCR Section (if exists) */}
            {job.ncrDetails && Object.values(job.ncrDetails).some(v => !!v) && (
              <div className="bg-white p-8 rounded-[2.5rem] border border-indigo-100 relative overflow-hidden shadow-sm group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none group-hover:scale-110 transition-transform" />
                <div className="flex items-center gap-3 mb-8">
                  <Book className="text-indigo-500" size={20} />
                  <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] italic">NCR Carbonless Architecture</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-12 gap-y-8 relative z-10">
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black text-text-light uppercase tracking-widest mb-2 opacity-60">Triplicate/Duplicate Sequence</span>
                      <span className="text-[13px] font-black text-text-main uppercase tracking-tight italic border-l-4 border-indigo-500 pl-4">{job.ncrDetails.paperColors || 'Not Specified'}</span>
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black text-text-light uppercase tracking-widest mb-2 opacity-60">Sequential Numbering Matrix</span>
                      <span className="text-[13px] font-black text-brand-accent uppercase tracking-tighter italic tabular-nums border-l-4 border-brand-accent pl-4">
                        {job.ncrDetails.startNumber} <span className="mx-2 text-text-light">→</span> {job.ncrDetails.endNumber}
                      </span>
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black text-text-light uppercase tracking-widest mb-2 opacity-60">Physical Parameters</span>
                      <div className="flex gap-4">
                        <div className="px-3 py-2 bg-indigo-50/50 rounded-xl border border-indigo-100">
                          <span className="text-[9px] font-black text-indigo-700 uppercase tracking-tighter">Perf: {job.ncrDetails.perforationPosition || 'None'}</span>
                        </div>
                        <div className="px-3 py-2 bg-indigo-50/50 rounded-xl border border-indigo-100">
                          <span className="text-[9px] font-black text-indigo-700 uppercase tracking-tighter">Bind: {job.ncrDetails.bindingType || 'None'}</span>
                        </div>
                      </div>
                   </div>
                </div>
              </div>
            )}

            {/* Materials Card */}
            {job.items?.some(item => item.materialId) && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 px-2">
                  <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] italic">Raw Material Inventory</h3>
                  <div className="h-px flex-1 bg-border/50" />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {job.items.filter(item => item.materialId).map((item, idx) => {
                    const mat = materials.find(m => m.id === item.materialId);
                    return (
                      <div key={idx} className="bg-white p-6 rounded-[2.5rem] border border-emerald-100 flex items-center gap-6 shadow-sm group">
                         <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                            <Box size={24} />
                         </div>
                         <div className="flex-1">
                            <h5 className="text-sm font-black text-text-main uppercase tracking-tight">{mat?.name || 'Unknown Material'}</h5>
                            <div className="flex items-center gap-4 mt-2">
                               <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{mat?.category || 'General'}</span>
                               <span className="text-[9px] font-bold text-text-light uppercase tracking-widest">Qty: {item.quantity} {mat?.unit || 'Units'}</span>
                            </div>
                         </div>
                         {mat?.location && (
                           <div className="text-right">
                              <p className="text-[8px] font-black text-text-light uppercase tracking-widest mb-1">Storage Loc</p>
                              <p className="text-xs font-black text-text-main uppercase">{mat.location}</p>
                           </div>
                         )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Product Items Bento */}
            {job.items && job.items.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 px-2">
                  <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] italic">Engineering Components</h3>
                  <div className="h-px flex-1 bg-border/50" />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {job.items.map((item, idx) => (
                    <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-border shadow-sm group hover:border-brand/40 transition-all">
                       <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center text-text-light group-hover:bg-brand/5 group-hover:text-brand transition-all">
                                <Layers size={24} />
                             </div>
                             <div>
                                <h5 className="text-base font-black text-text-main uppercase tracking-tight leading-none mb-1">{item.description}</h5>
                                <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest">{item.type} Component</span>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-[9px] font-black text-text-light uppercase tracking-widest mb-1 opacity-50">Volume Allocation</p>
                             <p className="text-xl font-black text-text-main tracking-tighter italic tabular-nums">{item.quantity} <span className="text-[10px] opacity-40 not-italic">Units</span></p>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-12 py-6 border-t border-border/40">
                          {item.width && item.length && (
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-text-light uppercase tracking-widest mb-1 opacity-60">Physical Dim</span>
                              <span className="text-[11px] font-black text-text-main tabular-nums italic">{item.width}mm <span className="text-text-light mx-1">x</span> {item.length}mm</span>
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-text-light uppercase tracking-widest mb-1 opacity-60">Computed Internal Val</span>
                            <span className="text-[11px] font-black text-emerald-500 tabular-nums italic">R {item.totalPrice.toLocaleString()}</span>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Artwork Pipeline */}
            {job.artwork && job.artwork.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 px-2">
                  <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] italic">Visual Proof Protocol</h3>
                  <div className="h-px flex-1 bg-border/50" />
                </div>
                <div className="grid grid-cols-1 gap-4">
                   {job.artwork.map(art => (
                     <div key={art.id} className="bg-white p-6 rounded-[2.5rem] border border-border flex items-center gap-6 group hover:border-brand-accent/40 transition-all shadow-sm">
                        <div 
                          onClick={() => window.open(art.url, '_blank')}
                          className="w-24 h-24 bg-surface rounded-[1.8rem] overflow-hidden flex-shrink-0 border border-border/40 flex items-center justify-center cursor-pointer hover:brightness-95 transition-all relative"
                        >
                           {art.url.startsWith('data:application/pdf') ? (
                             <div className="flex flex-col items-center">
                               <FileText size={28} className="text-red-500" />
                               <span className="text-[8px] font-black uppercase mt-1 tracking-widest">PDF Ready</span>
                             </div>
                           ) : <img src={art.url} className="w-full h-full object-cover" />}
                           <div className="absolute inset-0 bg-brand/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-3 mb-2">
                              <h6 className="text-[13px] font-black text-text-main uppercase tracking-tight truncate border-b-2 border-brand/10">{art.name}</h6>
                              <span className="text-[9px] font-black text-text-light italic opacity-40">v{art.version}.0</span>
                           </div>
                           <div className="flex items-center gap-3">
                              <span className={cn(
                                "text-[9px] font-black uppercase px-3 py-1 rounded-lg border tracking-widest flex items-center gap-2",
                                art.status === 'Approved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                              )}>
                                <div className={cn("w-1.5 h-1.5 rounded-full", art.status === 'Approved' ? "bg-emerald-600" : "bg-amber-600")} />
                                {art.status}
                              </span>
                              <p className="text-[9px] text-text-light font-black uppercase tracking-widest opacity-40">Verification {new Date(art.uploadedAt).toLocaleDateString()}</p>
                           </div>
                           {art.feedback && (
                             <p className="mt-3 text-[10px] text-amber-600 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100/50">“{art.feedback}”</p>
                           )}
                        </div>
                        <button 
                          onClick={() => window.open(art.url, '_blank')}
                          className="w-12 h-12 flex items-center justify-center text-brand bg-brand/5 hover:bg-brand/10 rounded-2xl transition-all"
                        >
                          <ExternalLink size={20} />
                        </button>
                     </div>
                   ))}
                </div>
              </div>
            )}

            <div className="h-20" /> {/* Bottom Spacing */}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
