import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function MainLayout() {
  const location = useLocation();
  
  const getTitle = (pathname: string) => {
    switch (pathname) {
      case '/': return 'Dashboard';
      case '/clients': return 'Clients';
      case '/materials': return 'Materials';
      case '/suppliers': return 'Suppliers';
      case '/products': return 'Products & Services';
      case '/ncr-books': return 'NCR Books';
      case '/litho-products': return 'Litho Products';
      case '/packages': return 'Packages';
      case '/quotes': return 'Quotes';
      case '/jobs': return 'Jobs';
      case '/production-board': return 'Production Board';
      case '/machines': return 'Machines';
      case '/departments': return 'Departments';
      case '/inventory': return 'Inventory';
      case '/purchasing': return 'Purchasing';
      case '/reports': return 'Reports';
      case '/utilization': return 'Machine Utilization';
      case '/order-history': return 'Order History';
      case '/settings': return 'Settings';
      default: return 'XPressPrint ERP';
    }
  };

  return (
    <div className="flex bg-surface min-h-screen text-text-main font-sans selection:bg-blue-100 not-italic">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <div className="flex flex-col h-full overflow-hidden">
          <Header title={getTitle(location.pathname)} />
          <div className="flex-1 overflow-y-auto bg-surface/50">
            <div className="max-w-[1600px] mx-auto p-10">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
