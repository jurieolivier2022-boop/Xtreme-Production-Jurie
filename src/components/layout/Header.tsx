import React from 'react';
import { Search, Plus, Bell, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useFirestoreConnection } from '@/src/lib/firestoreService';
import { useAuth } from '@/src/lib/authContext';
import { cn } from '@/src/lib/utils';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { isConnected } = useFirestoreConnection();
  const { user } = useAuth();
  
  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('')
    : user?.email?.charAt(0).toUpperCase() || 'AU';
  
  return (
    <header className="h-28 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-10 flex items-center justify-between sticky top-0 z-10 shrink-0">
      <div className="animate-in fade-in slide-in-from-left-4 duration-700">
        <h2 className="text-3xl font-black text-text-main tracking-tight uppercase italic font-serif leading-none">{title}</h2>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-2.5">
            {isConnected === null ? (
              <Loader2 className="w-2 h-2 animate-spin text-brand-accent" />
            ) : isConnected ? (
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-creative animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.5)]" />
            )}
            <p className={cn(
              "text-[10px] font-black uppercase tracking-[0.3em]",
              isConnected === false ? "text-creative" : "text-text-light"
            )}>
              {isConnected === null ? 'Syncing...' : isConnected ? 'Operational' : 'Disconnected'}
            </p>
          </div>
          <div className="w-1 h-1 bg-slate-200 rounded-full" />
          <p className="text-[10px] font-black text-text-light/50 uppercase tracking-[0.3em]">Session-L6</p>
        </div>
      </div>

      <div className="flex items-center gap-10">
        <div className="relative group hidden xl:block">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-brand-accent transition-all group-focus-within:scale-110" size={18} />
          <input 
            type="text" 
            placeholder="Command Search..." 
            className="pl-14 pr-8 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:outline-none focus:ring-[8px] focus:ring-brand-accent/5 focus:bg-white focus:border-brand-accent/30 transition-all w-96 placeholder:text-text-light/40"
          />
        </div>

        <div className="flex items-center gap-8 pl-10 border-l border-slate-100">
          <button className="relative p-3 text-text-light hover:text-brand-accent hover:bg-slate-50 rounded-2xl transition-all group">
            <Bell size={22} strokeWidth={2} className="group-hover:rotate-12 transition-transform" />
            <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-creative rounded-full ring-4 ring-white shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse"></span>
          </button>

          <div className="flex items-center gap-4 cursor-pointer p-2 pr-5 rounded-[1.5rem] bg-slate-50 hover:bg-white border border-transparent hover:border-slate-100 transition-all group shadow-sm hover:shadow-md">
            <div className="w-12 h-12 rounded-2xl bg-brand text-white flex items-center justify-center font-black text-sm shadow-xl shadow-brand/10 transition-all group-hover:rotate-6 group-hover:scale-105 uppercase italic font-serif">
              {initials}
            </div>
            <div className="hidden lg:flex flex-col">
              <span className="text-sm font-black text-text-main leading-none uppercase tracking-tight italic font-serif">
                {user?.displayName || user?.email?.split('@')[0] || 'Guest'}
              </span>
              <span className="text-[10px] font-bold text-creative uppercase tracking-[0.2em] mt-1.5 opacity-80">
                {user ? 'Studio Access' : 'External'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
