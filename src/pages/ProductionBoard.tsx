import React from 'react';
import { MoreVertical, Calendar, User, Package, Briefcase, Filter, Search, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useCollection, updateDocument } from '../lib/firestoreService';
import { Job, JobStage, Department, Client, Machine, Material, JobPriority } from '../types';
import JobDetailsModal from '../components/JobDetailsModal';
import { AnimatePresence, motion } from 'motion/react';

const COLUMNS: JobStage[] = ['Prepress', 'Printing', 'Laminating', 'Finishing', 'Embroidery', 'Screenprinting', 'Quality Check', 'Ready'];

export default function ProductionBoard() {
  const { data: jobs, loading: jobsLoading } = useCollection<Job>('jobs');
  const { data: departments, loading: deptsLoading } = useCollection<Department>('departments');
  const { data: clients } = useCollection<Client>('clients');
  const { data: machines } = useCollection<Machine>('machines');
  const { data: materials } = useCollection<Material>('materials');
  
  const [selectedDeptId, setSelectedDeptId] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [viewingJobDetails, setViewingJobDetails] = React.useState<Job | null>(null);

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

  const moveToNextStage = async (e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    const currentIndex = COLUMNS.indexOf(job.stage);
    if (currentIndex < COLUMNS.length - 1) {
      const nextStage = COLUMNS[currentIndex + 1];
      setIsUpdating(job.id);
      try {
        await updateDocument('jobs', job.id, { stage: nextStage });
      } catch (error) {
        console.error('Error advancing job:', error);
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

  const filteredJobs = jobs.filter(j => {
    const matchesDept = selectedDeptId === 'all' || j.departmentId === selectedDeptId;
    const matchesSearch = !searchQuery || 
      j.jobNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.productName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const getPriorityColor = (priority: JobPriority) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-500 text-white';
      case 'High': return 'bg-orange-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const getDueDateStatus = (dueDate: number) => {
    const now = Date.now();
    const diff = dueDate - now;
    const days = diff / (1000 * 60 * 60 * 24);
    
    if (diff < 0) return { label: 'Overdue', color: 'text-red-500', icon: AlertCircle };
    if (days < 2) return { label: 'Due Soon', color: 'text-orange-500', icon: Clock };
    return { label: 'On Track', color: 'text-emerald-500', icon: CheckCircle2 };
  };

  const liveViewingJob = viewingJobDetails ? jobs.find(j => j.id === viewingJobDetails.id) : null;

  return (
    <div className="flex flex-col gap-6 h-full overflow-hidden animate-in fade-in duration-700">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col">
          <h2 className="text-4xl font-black text-text-main tracking-tighter uppercase italic leading-none">Production Grid</h2>
          <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-3">Active factory floor monitoring</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" />
            <input 
              type="text"
              placeholder="Search by job or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-paper border border-border/50 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 bg-paper p-1.5 rounded-3xl border border-border/50 shadow-sm overflow-x-auto max-w-[400px] no-scrollbar">
            <button 
              onClick={() => setSelectedDeptId('all')}
              className={cn(
                "px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
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
                  "px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  selectedDeptId === dept.id ? "bg-brand text-white shadow-lg shadow-blue-100" : "text-text-muted hover:bg-surface"
                )}
              >
                {dept.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pr-4">
        {COLUMNS.map((col, idx) => {
          const colJobs = filteredJobs.filter(j => j.stage === col);
          const stageProgress = ((idx + 1) / COLUMNS.length) * 100;

          return (
            <div 
              key={col} 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, col)}
              className="flex flex-col gap-5 min-w-[320px] max-w-[320px] bg-paper/30 border border-border/30 rounded-[2.5rem] p-5 relative overflow-hidden group/col animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-surface opacity-50">
                <div 
                  className="h-full bg-brand/30 transition-all duration-1000 ease-out" 
                  style={{ width: `${stageProgress}%` }}
                />
              </div>

              <div className="flex items-center justify-between px-2 relative z-10 pt-2">
                <div className="flex flex-col">
                  <h3 className="text-[10px] font-black text-text-light tracking-[0.3em] uppercase">{col}</h3>
                  <span className="text-[16px] font-black text-text-main tracking-tighter tabular-nums mt-1">{colJobs.length} <span className="text-[9px] text-text-light uppercase tracking-widest font-bold ml-1 opacity-40">Orders</span></span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-surface border border-border/50 flex items-center justify-center group-hover/col:scale-110 transition-all duration-500 shadow-sm">
                  <Briefcase size={14} className="text-brand-accent" />
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-4 overflow-y-auto scrollbar-hide py-2 relative z-10 px-1">
                {colJobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-text-light/20 border-2 border-dashed border-border/20 rounded-3xl opacity-30">
                    <Package size={20} className="mb-3 stroke-[1.5px]" />
                    <span className="text-[8px] font-black uppercase tracking-[0.3em]">No Pending Tasks</span>
                  </div>
                ) : (
                  colJobs.map((job) => {
                    const dept = departments.find(d => d.id === job.departmentId);
                    const dueStatus = getDueDateStatus(job.dueDate);
                    const DueIcon = dueStatus.icon;

                    return (
                      <motion.div 
                        key={job.id} 
                        layoutId={job.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, job.id)}
                        onClick={() => {
                          setViewingJobDetails(job);
                          setIsDetailsOpen(true);
                        }}
                        className={cn(
                          "bg-white border border-border/50 rounded-3xl p-5 shadow-sm hover:shadow-xl hover:border-brand-accent/40 hover:-translate-y-1 transition-all relative group/card cursor-grab active:cursor-grabbing",
                          isUpdating === job.id && "opacity-50 pointer-events-none scale-95"
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {/* High Priority Indicator */}
                        {job.priority !== 'Normal' && (
                          <div className={cn(
                            "absolute top-5 right-5 w-2 h-2 rounded-full animate-pulse",
                            job.priority === 'Urgent' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                          )} />
                        )}

                        <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-brand-accent uppercase tracking-[0.2em]">{job.jobNumber || `JOB-${job.id.slice(0, 4)}`}</span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <DueIcon size={10} className={dueStatus.color} />
                              <span className={cn("text-[9px] font-black uppercase tracking-widest", dueStatus.color)}>{dueStatus.label}</span>
                            </div>
                          </div>
                          {dept && (
                            <div className={cn("px-2.5 py-1 rounded-full text-[7px] font-black uppercase tracking-widest shadow-sm border border-transparent", 
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
                        
                        <div className="space-y-1 mb-4">
                          <h4 className="text-xs font-black text-text-main line-clamp-1 tracking-tight uppercase italic">{job.clientName}</h4>
                          <p className="text-[10px] text-text-light font-bold truncate tracking-wide opacity-80">{job.productName}</p>
                        </div>

                        {/* Production Specs Indicator */}
                        {job.ncrDetails && (job.ncrDetails.paperColors || job.ncrDetails.startNumber) && (
                          <div className="mb-4 flex flex-col gap-1 px-3 py-2 bg-brand/5 border border-brand/10 rounded-xl">
                            {job.ncrDetails.paperColors && (
                              <div className="flex items-center justify-between">
                                <span className="text-[7px] font-black text-brand tracking-widest uppercase opacity-40">Specs</span>
                                <span className="text-[8px] font-black text-text-main uppercase">{job.ncrDetails.paperColors}</span>
                              </div>
                            )}
                            {job.ncrDetails.startNumber && (
                              <div className="flex items-center justify-between">
                                <span className="text-[7px] font-black text-brand tracking-widest uppercase opacity-40">Range</span>
                                <span className="text-[8px] font-black text-text-main uppercase">{job.ncrDetails.startNumber} — {job.ncrDetails.endNumber}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Visual Status Pills */}
                        <div className="flex flex-wrap gap-2 mb-5">
                          {job.artworkStatus === 'Approved' && (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                              <CheckCircle2 size={8} />
                              <span className="text-[7px] font-black uppercase tracking-widest">Artwork OK</span>
                            </div>
                          )}
                          {job.priority !== 'Normal' && (
                            <div className={cn("px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest", 
                              job.priority === 'Urgent' ? "bg-red-600 text-white" : "bg-orange-500 text-white"
                            )}>
                              {job.priority}
                            </div>
                          )}
                        </div>

                        <div className="pt-4 border-t border-dashed border-border/60 flex items-center justify-between group/footer">
                           <div className="flex items-center gap-2 text-text-light">
                              <Calendar size={10} className="opacity-40" />
                              <span className="text-[9px] font-black uppercase tracking-widest tabular-nums opacity-60">
                                {new Date(job.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                           </div>
                           
                           {col !== 'Ready' ? (
                             <button
                               onClick={(e) => moveToNextStage(e, job)}
                               className="px-2.5 py-1 bg-surface hover:bg-brand hover:text-white rounded-lg text-[8px] font-black uppercase tracking-widest border border-border shadow-sm transition-all flex items-center gap-1.5"
                             >
                               Move Next
                             </button>
                           ) : (
                             <div className="flex items-center gap-1.5 grayscale opacity-40">
                                <User size={10} />
                                <span className="text-[8px] font-black uppercase tracking-widest">Completed</span>
                             </div>
                           )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {isDetailsOpen && liveViewingJob && (
          <JobDetailsModal 
            job={liveViewingJob}
            clientId={liveViewingJob.clientId}
            clients={clients}
            departments={departments}
            machines={machines}
            materials={materials}
            onClose={() => setIsDetailsOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
