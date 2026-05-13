import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Box, 
  Truck, 
  Tag, 
  BookOpen, 
  Package, 
  FileText, 
  Briefcase, 
  Columns, 
  Cpu, 
  Warehouse, 
  ShoppingCart, 
  BarChart3,
  History,
  Settings,
  LogOut,
  ChevronLeft,
  Layers,
  Printer
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Clients', path: '/clients' },
  { icon: Box, label: 'Materials', path: '/materials' },
  { icon: Truck, label: 'Suppliers', path: '/suppliers' },
  { icon: Tag, label: 'Products', path: '/products' },
  { icon: BookOpen, label: 'NCR Registry', path: '/ncr-books' },
  { icon: Printer, label: 'Litho Registry', path: '/litho-products' },
  { icon: Package, label: 'Packages', path: '/packages' },
  { icon: FileText, label: 'Quotes', path: '/quotes' },
  { icon: Briefcase, label: 'Jobs', path: '/jobs' },
  { icon: Columns, label: 'Production Board', path: '/production-board' },
  { icon: Cpu, label: 'Machines', path: '/machines' },
  { icon: Layers, label: 'Departments', path: '/departments' },
  { icon: Warehouse, label: 'Inventory', path: '/inventory' },
  { icon: ShoppingCart, label: 'Purchasing', path: '/purchasing' },
  { icon: BarChart3, label: 'Reports', path: '/reports' },
  { icon: Cpu, label: 'Utilization', path: '/utilization' },
  { icon: History, label: 'Order History', path: '/order-history' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <aside className={cn(
      "bg-paper border-r border-border flex flex-col h-screen transition-all duration-500 relative z-20 ease-[cubic-bezier(0.23,1,0.32,1)]",
      collapsed ? "w-20" : "w-72"
    )}>
      <div className="p-8 flex items-center gap-4">
        <div className="w-10 h-10 bg-brand rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xl shadow-brand/10 group overflow-hidden relative">
          <div className="absolute inset-0 bg-brand-accent transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <span className="relative z-10 font-black text-sm tracking-tighter">XP</span>
        </div>
        {!collapsed && (
          <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-500">
            <h1 className="font-black text-base leading-none text-text-main tracking-tighter uppercase italic">XPressPrint</h1>
            <p className="text-[9px] text-text-light font-black uppercase tracking-[0.2em] mt-1">Management ERP</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-4 space-y-1.5 scrollbar-hide py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3.5 transition-all rounded-2xl font-bold relative group",
              isActive 
                ? "text-brand-accent bg-blue-50/50" 
                : "text-text-muted hover:text-text-main hover:bg-surface"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className={cn("shrink-0 transition-transform group-active:scale-90", collapsed && "mx-auto")} />
                {!collapsed && <span className="text-xs uppercase tracking-widest">{item.label}</span>}
                {isActive && !collapsed && (
                  <div className="absolute right-4 w-1.5 h-1.5 bg-brand-accent rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-6">
        {!collapsed && (
          <div className="bg-surface/80 p-5 rounded-3xl border border-border/50 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[9px] text-text-light font-black uppercase tracking-[0.2em]">Fleet Load</span>
              <span className="text-[10px] font-black text-brand-accent">92%</span>
            </div>
            <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-brand-accent h-full rounded-full transition-all duration-1000 ease-out" 
                style={{ width: '92%' }} 
              />
            </div>
            <p className="text-[9px] text-text-muted font-bold mt-3 leading-relaxed">System performing at high efficiency levels.</p>
          </div>
        )}
        
        <button className="flex items-center gap-3 px-5 py-4 text-text-muted hover:text-red-500 w-full transition-all rounded-2xl hover:bg-red-50 group font-black text-[10px] uppercase tracking-widest">
          <LogOut size={18} strokeWidth={2.5} className="shrink-0 group-hover:-translate-x-1 transition-transform" />
          {!collapsed && <span>System Logout</span>}
        </button>
      </div>

      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-24 bg-paper border border-border shadow-md rounded-full p-1.5 text-text-light hover:text-brand-accent transition-all z-30 active:scale-90"
      >
        <ChevronLeft size={12} strokeWidth={3} className={cn("transition-transform duration-500", collapsed && "rotate-180")} />
      </button>
    </aside>
  );
}
