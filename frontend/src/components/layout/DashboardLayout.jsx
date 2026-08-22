import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const DashboardLayout = ({ role }) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-banking-dark overflow-hidden">
      <Sidebar role={role} mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar role={role} onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto p-3 xs:p-4 sm:p-6 lg:p-7">
          <div className="max-w-[1480px] mx-auto animate-fade-in"><Outlet /></div>
        </main>
      </div>
    </div>
  );
};
export default DashboardLayout;
