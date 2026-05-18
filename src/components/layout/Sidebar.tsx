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
  Printer,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useLocation } from 'react-router-dom';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Columns, label: 'Production Board', path: '/production-board' },
  { icon: FileText, label: 'Quotes', path: '/quotes' },
  { icon: Briefcase, label: 'Jobs', path: '/jobs' },
  { icon: Users, label: 'Clients', path: '/clients' },
  { 
    icon: Box, 
    label: 'Inventory & Registry', 
    path: '/inventory-group',
    children: [
      { icon: LayoutDashboard, label: 'Overview', path: '/inventory-registry' },
      { icon: Box, label: 'Materials', path: '/materials' },
      { icon: Tag, label: 'Products', path: '/products' },
      { icon: Printer, label: 'Litho Registry', path: '/litho-products' },
      { icon: BookOpen, label: 'NCR Registry', path: '/ncr-books' },
      { icon: Package, label: 'Packages', path: '/packages' },
    ]
  },
  { 
    icon: Truck, 
    label: 'Procurement', 
    path: '/procurement-group',
    children: [
      { icon: Warehouse, label: 'Inventory', path: '/inventory' },
      { icon: Truck, label: 'Suppliers', path: '/suppliers' },
      { icon: ShoppingCart, label: 'Purchasing', path: '/purchasing' },
    ]
  },
  { 
    icon: Settings, 
    label: 'Settings', 
    path: '/settings-group',
    children: [
      { icon: Settings, label: 'General', path: '/settings' },
      { icon: Cpu, label: 'Machines', path: '/machines' },
      { icon: Layers, label: 'Departments', path: '/departments' },
      { icon: BarChart3, label: 'Reports', path: '/reports' },
      { icon: Cpu, label: 'Utilization', path: '/utilization' },
      { icon: History, label: 'Order History', path: '/order-history' },
    ]
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = React.useState(false);
  const [openSubmenus, setOpenSubmenus] = React.useState<string[]>(['/inventory-group', '/settings-group', '/procurement-group']);
  const { pathname } = useLocation();

  const toggleSubmenu = (path: string) => {
    setOpenSubmenus(prev => 
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  return (
    <aside className={cn(
      "bg-white border-r border-slate-100 flex flex-col h-screen transition-all duration-500 relative z-20 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-[10px_0_40px_-20px_rgba(0,0,0,0.05)]",
      collapsed ? "w-20" : "w-72"
    )}>
      <div className="p-8 flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-brand-accent via-indigo-600 to-creative rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xl shadow-brand-accent/20 group overflow-hidden relative rotate-3 hover:rotate-0 transition-transform cursor-pointer">
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="relative z-10 font-black text-lg tracking-tighter italic">SP</span>
        </div>
        {!collapsed && (
          <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-500">
            <h1 className="font-black text-lg leading-none text-text-main tracking-tight uppercase italic font-serif">SignPro</h1>
            <div className="text-[10px] text-creative font-black uppercase tracking-[0.2em] mt-1.5 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-creative animate-pulse" />
              Creative ERP
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-4 space-y-2 scrollbar-hide py-4">
        {navItems.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const isSubmenuOpen = openSubmenus.includes(item.path);
          const isChildActive = hasChildren && item.children?.some(child => pathname === child.path);
          const isItemActive = pathname === item.path || isChildActive;

          if (hasChildren) {
            return (
              <div key={item.path} className="space-y-1.5">
                <button
                  onClick={() => !collapsed && toggleSubmenu(item.path)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-4 transition-all rounded-2xl font-bold relative group",
                    isChildActive 
                      ? "text-brand-accent bg-indigo-50/50" 
                      : "text-text-muted hover:text-text-main hover:bg-slate-50"
                  )}
                >
                  <item.icon size={18} strokeWidth={isChildActive ? 2.5 : 2} className={cn("shrink-0 transition-all group-active:scale-95", collapsed && "mx-auto", isChildActive && "text-brand-accent")} />
                  {!collapsed && (
                    <>
                      <span className="text-[11px] uppercase tracking-widest flex-1 text-left">{item.label}</span>
                      <ChevronDown size={14} className={cn("transition-transform duration-500", isSubmenuOpen && "rotate-180")} />
                    </>
                  )}
                </button>
                
                {!collapsed && isSubmenuOpen && (
                  <div className="pl-6 space-y-1 animate-in slide-in-from-top-3 duration-500 fill-mode-both">
                    {item.children?.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) => cn(
                          "flex items-center gap-3 px-4 py-3 transition-all rounded-xl font-bold relative group",
                          isActive 
                            ? "text-brand-accent bg-indigo-50/30" 
                            : "text-text-light hover:text-text-main hover:bg-slate-50"
                        )}
                      >
                        {({ isActive }) => (
                          <>
                            <child.icon size={14} strokeWidth={isActive ? 2.5 : 2} className={cn("shrink-0 transition-colors", isActive ? "text-brand-accent" : "text-text-light group-hover:text-text-muted")} />
                            <span className="text-[10px] uppercase tracking-[0.18em]">{child.label}</span>
                            {isActive && (
                              <div className="absolute right-3 w-1.5 h-1.5 bg-brand-accent rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                            )}
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-4 transition-all rounded-2xl font-bold relative group",
                isActive 
                  ? "text-brand-accent bg-indigo-50/50" 
                  : "text-text-muted hover:text-text-main hover:bg-slate-50"
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className={cn("shrink-0 transition-all group-active:scale-95", collapsed && "mx-auto", isActive && "text-brand-accent")} />
                  {!collapsed && <span className="text-[11px] uppercase tracking-widest">{item.label}</span>}
                  {isActive && !collapsed && (
                    <div className="absolute right-4 w-2 h-2 bg-brand-accent rounded-full shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-6">
        {!collapsed && (
          <div className="bg-gradient-to-br from-indigo-50 to-rose-50/30 p-6 rounded-[2rem] border border-indigo-100/50 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/40 rounded-full blur-2xl group-hover:bg-brand-accent/20 transition-colors" />
            <div className="flex justify-between items-center mb-3 relative z-10">
              <span className="text-[9px] text-indigo-900 font-black uppercase tracking-[0.2em]">System Health</span>
              <span className="text-[10px] font-black text-brand-accent">Optimal</span>
            </div>
            <div className="w-full bg-white h-2 rounded-full overflow-hidden shadow-inner relative z-10">
              <div 
                className="bg-gradient-to-r from-brand-accent to-creative h-full rounded-full transition-all duration-1000 ease-out" 
                style={{ width: '92%' }} 
              />
            </div>
            <p className="text-[9px] text-indigo-900/60 font-bold mt-4 leading-relaxed relative z-10 uppercase tracking-wider">Engine: SignPro Core v2.4</p>
          </div>
        )}
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
