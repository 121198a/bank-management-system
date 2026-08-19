import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const DashboardLayout = ({ role }) => (
  <div className="flex h-screen bg-slate-50 dark:bg-banking-dark overflow-hidden">
    <Sidebar role={role} />
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
      <Navbar role={role} />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
        <div className="max-w-[1480px] mx-auto animate-fade-in"><Outlet /></div>
      </main>
    </div>
  </div>
);
export default DashboardLayout;
