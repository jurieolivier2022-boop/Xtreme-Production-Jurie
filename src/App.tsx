import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from '@/src/components/layout/Sidebar';
import { Header } from '@/src/components/layout/Header';
import { useAuth } from './lib/authContext';

// Pages
import Dashboard from '@/src/pages/Dashboard';
import Clients from '@/src/pages/Clients';
import Materials from '@/src/pages/Materials';
import Suppliers from '@/src/pages/Suppliers';
import Products from '@/src/pages/Products';
import NCRBooks from '@/src/pages/NCRBooks';
import LithoProducts from '@/src/pages/LithoProducts';
import Packages from '@/src/pages/Packages';
import Quotes from '@/src/pages/Quotes';
import Jobs from '@/src/pages/Jobs';
import ProductionBoard from '@/src/pages/ProductionBoard';
import Machines from '@/src/pages/Machines';
import Inventory from '@/src/pages/Inventory';
import Purchasing from '@/src/pages/Purchasing';
import Reports from '@/src/pages/Reports';
import OrderHistory from '@/src/pages/OrderHistory';
import Settings from '@/src/pages/Settings';
import MachineUtilization from '@/src/pages/MachineUtilization';
import Departments from '@/src/pages/Departments';
import ClientApproval from '@/src/pages/ClientApproval';
import Login from '@/src/pages/Login';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-12 h-12 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/approve/:jobId" element={<Navigate to={`/approval/${window.location.pathname.split('/').pop()}`} replace />} />
        <Route path="/approval/:jobId" element={<ClientApproval />} />
        <Route path="/approval/q/:quoteId" element={<ClientApproval />} />
        {!user ? (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <Route path="/*" element={
            <div className="flex bg-surface min-h-screen text-text-main font-sans selection:bg-blue-100 italic-none">
              <Sidebar />
              <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                <Routes group-id="auth-routes">
            <Route path="/" element={<PageWrapper title="Dashboard" component={<Dashboard />} />} />
            <Route path="/clients" element={<PageWrapper title="Clients" component={<Clients />} />} />
            <Route path="/materials" element={<PageWrapper title="Materials" component={<Materials />} />} />
            <Route path="/suppliers" element={<PageWrapper title="Suppliers" component={<Suppliers />} />} />
            <Route path="/products" element={<PageWrapper title="Products & Services" component={<Products />} />} />
            <Route path="/ncr-books" element={<PageWrapper title="NCR Books" component={<NCRBooks />} />} />
            <Route path="/litho-products" element={<PageWrapper title="Litho Products" component={<LithoProducts />} />} />
            <Route path="/packages" element={<PageWrapper title="Packages" component={<Packages />} />} />
            <Route path="/quotes" element={<PageWrapper title="Quotes" component={<Quotes />} />} />
            <Route path="/jobs" element={<PageWrapper title="Jobs" component={<Jobs />} />} />
            <Route path="/production-board" element={<PageWrapper title="Production Board" component={<ProductionBoard />} />} />
            <Route path="/machines" element={<PageWrapper title="Machines" component={<Machines />} />} />
            <Route path="/departments" element={<PageWrapper title="Departments" component={<Departments />} />} />
            <Route path="/inventory" element={<PageWrapper title="Inventory" component={<Inventory />} />} />
            <Route path="/purchasing" element={<PageWrapper title="Purchasing" component={<Purchasing />} />} />
            <Route path="/reports" element={<PageWrapper title="Reports" component={<Reports />} />} />
            <Route path="/utilization" element={<PageWrapper title="Machine Utilization" component={<MachineUtilization />} />} />
            <Route path="/order-history" element={<PageWrapper title="Order History" component={<OrderHistory />} />} />
            <Route path="/pricing-config" element={<Navigate to="/settings" replace />} />
            <Route path="/settings" element={<PageWrapper title="Settings" component={<Settings />} />} />
                  <Route path="/login" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          } />
        )}
      </Routes>
    </BrowserRouter>
  );
}

function PageWrapper({ title, component }: { title: string, component: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={title} />
      <div className="flex-1 overflow-y-auto bg-surface/50">
        <div className="max-w-[1600px] mx-auto p-10">
          {component}
        </div>
      </div>
    </div>
  );
}
