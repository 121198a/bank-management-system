import React, { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import OfflineBanner from '../ui/OfflineBanner';
import { titleFor } from '../../config/brand';


const DashboardLayout = ({ role }) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mainRef = useRef(null);

  // Keep the browser tab / history title in sync with the page's own <h1> (WCAG 2.4.2).
  // Pages are lazy-loaded, so watch the content area instead of reading it once.
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return undefined;
    const sync = () => {
      const heading = main.querySelector('h1');
      const next = titleFor(heading ? heading.textContent.trim() : '');
      if (document.title !== next) document.title = next;
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(main, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex h-screen supports-[height:100dvh]:h-dvh bg-slate-50 dark:bg-banking-dark overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-gray-900 focus:shadow-lg focus:ring-2 focus:ring-primary-600"
      >
        Skip to main content
      </a>
      <Sidebar role={role} mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar role={role} onMenuClick={() => setMobileNavOpen(true)} />
        <OfflineBanner />
        <main id="main-content" tabIndex={0} className="flex-1 overflow-y-auto p-3 xs:p-4 sm:p-6 lg:p-7 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-600" ref={mainRef}>
          <div className="max-w-[1480px] mx-auto page-shell animate-page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
export default DashboardLayout;
