import React from 'react';
import { Search, Plus, Bell } from 'lucide-react';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="h-24 bg-paper/80 backdrop-blur-xl border-b border-border/50 px-10 flex items-center justify-between sticky top-0 z-10 shrink-0">
      <div className="animate-in fade-in slide-in-from-left-2 duration-500">
        <h2 className="text-2xl font-black text-text-main tracking-tighter uppercase italic">{title}</h2>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
          <p className="text-[9px] font-black text-text-light uppercase tracking-[0.2em]">Operational Node: 042</p>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="relative group hidden xl:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-brand-accent transition-all group-focus-within:scale-110" size={16} />
          <input 
            type="text" 
            placeholder="System Search..." 
            className="pl-12 pr-6 py-3 bg-surface/50 border border-border/60 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-[6px] focus:ring-brand-accent/5 focus:bg-paper focus:border-brand-accent/30 transition-all w-80 placeholder:text-text-light/50"
          />
        </div>

        <div className="flex items-center gap-6 pl-8 border-l border-border/50">
          <button className="relative p-2.5 text-text-light hover:text-text-main hover:bg-surface rounded-2xl transition-all group">
            <Bell size={20} strokeWidth={2} className="group-hover:rotate-12 transition-transform" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-brand-accent rounded-full ring-2 ring-paper shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
          </button>

          <div className="flex items-center gap-4 cursor-pointer p-1.5 pl-1.5 pr-4 rounded-2xl bg-surface/50 hover:bg-surface border border-transparent hover:border-border/60 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center font-black text-xs shadow-lg shadow-brand/10 transition-transform group-hover:scale-95">
              AU
            </div>
            <div className="hidden lg:flex flex-col">
              <span className="text-xs font-black text-text-main leading-none uppercase tracking-tight">Admin User</span>
              <span className="text-[9px] font-bold text-text-light uppercase tracking-widest mt-1">Superuser Access</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
