import React from 'react';
import { MoreVertical, Calendar, User, Package, Briefcase, Filter } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useCollection, updateDocument } from '../lib/firestoreService';
import { Job, JobStage, Department } from '../types';

const COLUMNS: JobStage[] = ['Prepress', 'Printing', 'Laminating', 'Finishing', 'Embroidery', 'Screenprinting', 'Ready'];

export default function ProductionBoard() {
  const { data: jobs, loading: jobsLoading } = useCollection<Job>('jobs');
  const { data: departments, loading: deptsLoading } = useCollection<Department>('departments');
  const [selectedDeptId, setSelectedDeptId] = React.useState<string>('all');
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null);

  const onDragStart = (e: React.DragEvent, id: string) => {
    console.log('Action: Drag Job Start', { id });
    e.dataTransfer.setData('jobId', id);
  };

  const onDrop = async (e: React.DragEvent, newStage: JobStage) => {
    const jobId = e.dataTransfer.getData('jobId');
    if (!jobId) return;
    
    console.log('Action: Drop Job', { id: jobId, newStage });
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      setIsUpdating(jobId);
      try {
        await updateDocument('jobs', jobId, { stage: newStage });
      } catch (error) {
        console.error('Error updating job stage:', error);
      } finally {
        setIsUpdating(null);
      }
    }
  };

  if (jobsLoading || deptsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
      </div>
    );
  }

  const filteredJobs = selectedDeptId === 'all' 
    ? jobs 
    : jobs.filter(j => j.departmentId === selectedDeptId);

  return (
    <div className="flex flex-col gap-8 h-full overflow-hidden animate-in fade-in duration-700">
      <header className="flex items-end justify-between">
        <div className="flex flex-col">
          <h2 className="text-4xl font-black text-text-main tracking-tighter uppercase italic leading-none">Production Grid</h2>
          <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-3">Active factory floor monitoring</p>
        </div>
        
        <div className="flex items-center gap-3 bg-paper p-2 rounded-3xl border border-border/50 shadow-sm">
          <button 
            onClick={() => setSelectedDeptId('all')}
            className={cn(
              "px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
              selectedDeptId === 'all' ? "bg-brand text-white shadow-lg shadow-blue-100" : "text-text-muted hover:bg-surface"
            )}
          >
            All Areas
          </button>
          {departments.map(dept => (
            <button 
              key={dept.id}
              onClick={() => setSelectedDeptId(dept.id)}
              className={cn(
                "px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                selectedDeptId === dept.id ? "bg-brand text-white shadow-lg shadow-blue-100" : "text-text-muted hover:bg-surface"
              )}
            >
              {dept.name}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 flex gap-8 overflow-x-auto pb-10 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pr-4">
        {COLUMNS.map((col, idx) => {
          const colJobs = filteredJobs.filter(j => j.stage === col);
          return (
            <div 
              key={col} 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, col)}
              className="flex flex-col gap-6 min-w-[340px] max-w-[340px] bg-paper/50 border border-border/40 rounded-[2.5rem] p-6 relative overflow-hidden group/col animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className="absolute inset-0 grid-structure opacity-[0.015] pointer-events-none" />
              
              <div className="flex items-center justify-between px-2 relative z-10">
                <div className="flex flex-col">
                  <h3 className="text-[10px] font-black text-text-light tracking-[0.3em] uppercase">{col}</h3>
                  <span className="text-[18px] font-black text-text-main tracking-tighter tabular-nums mt-1">{colJobs.length} <span className="text-[10px] text-text-light uppercase tracking-widest font-bold ml-1 opacity-40">Units</span></span>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-surface border border-border/50 flex items-center justify-center group-hover/col:bg-brand group-hover/col:text-white transition-all duration-500 shadow-sm">
                  <Briefcase size={16} />
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-5 overflow-y-auto scrollbar-hide py-2 relative z-10">
                {colJobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-text-light/20 border-2 border-dashed border-border/30 rounded-3xl opacity-50 grayscale hover:grayscale-0 transition-all">
                    <Package size={24} className="mb-4 stroke-[1px]" />
                    <span className="text-[9px] font-black uppercase tracking-[0.3em]">Sector Clear</span>
                  </div>
                ) : (
                  colJobs.map((job) => {
                    const dept = departments.find(d => d.id === job.departmentId);
                    return (
                      <div 
                        key={job.id} 
                        draggable
                        onDragStart={(e) => onDragStart(e, job.id)}
                        className={cn(
                          "bg-white border border-border/60 rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.06)] hover:border-brand-accent/30 transition-all relative group/card cursor-grab active:cursor-grabbing transform-gpu hover:-translate-y-1",
                          isUpdating === job.id && "opacity-50 pointer-events-none scale-95"
                        )}
                      >
                        {isUpdating === job.id && (
                          <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] z-50 flex items-center justify-center rounded-3xl">
                            <div className="w-6 h-6 border-2 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
                          </div>
                        )}
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-brand-accent uppercase tracking-[0.2em]">#{job.jobNumber || job.id.slice(0, 8)}</span>
                            <span className="text-[8px] font-bold text-text-light uppercase tracking-widest mt-1 italic">{new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          {dept && (
                            <div className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border", 
                              dept.color === 'Red' ? 'bg-red-50 text-red-600 border-red-100' :
                              dept.color === 'Blue' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                              dept.color === 'Green' ? 'bg-green-50 text-green-600 border-green-100' :
                              dept.color === 'Orange' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                              dept.color === 'Purple' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                              'bg-gray-50 text-gray-600 border-gray-100'
                            )}>
                              {dept.name}
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-1.5 mb-6">
                          <h4 className="text-sm font-black text-text-main leading-none tracking-tight line-clamp-1 italic uppercase">{job.clientName || 'Unnamed Entity'}</h4>
                          <p className="text-[10px] text-brand-accent font-black uppercase tracking-[0.15em]">{job.productName || 'Specialized Spec'}</p>
                        </div>

                        {job.ncrDetails && (job.ncrDetails.paperColors || job.ncrDetails.startNumber) && (
                          <div className="mb-6 p-3 bg-brand/5 rounded-2xl border border-brand/10 flex flex-col gap-1.5 translate-y-[-4px]">
                            {job.ncrDetails.paperColors && (
                              <div className="flex items-center justify-between">
                                <span className="text-[7px] font-black text-brand uppercase tracking-widest opacity-60">Colors</span>
                                <span className="text-[8px] font-black text-text-main uppercase text-right">{job.ncrDetails.paperColors}</span>
                              </div>
                            )}
                            {(job.ncrDetails.startNumber || job.ncrDetails.endNumber) && (
                              <div className="flex items-center justify-between">
                                <span className="text-[7px] font-black text-brand uppercase tracking-widest opacity-60">Numbers</span>
                                <span className="text-[8px] font-black text-text-main uppercase text-right">{job.ncrDetails.startNumber} {job.ncrDetails.endNumber ? `— ${job.ncrDetails.endNumber}` : ''}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="pt-6 border-t border-dashed border-border/80 flex items-center justify-between">
                           <div className="flex items-center gap-2 text-text-light">
                              <Calendar size={12} className="text-brand-accent/40" />
                              <span className="text-[10px] font-black uppercase tracking-widest tabular-nums">{new Date(job.dueDate).toLocaleDateString()}</span>
                           </div>
                           <div className="flex -space-x-2">
                              <div className="w-8 h-8 rounded-full bg-surface border-4 border-white flex items-center justify-center shadow-sm">
                                 <User size={10} className="text-text-light" />
                              </div>
                           </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
