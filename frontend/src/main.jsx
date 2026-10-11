import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster, resolveValue } from 'react-hot-toast';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import App from './App';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { EmployeeProvider } from './context/EmployeeContext';
import { ThemeProvider } from './context/ThemeContext';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-700.css';
import './index.css';
import plex400 from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2?url';
import plex600 from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2?url';
import plex700 from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-700-normal.woff2?url';


const ToastNotification = ({ t }) => {
  const isError = t.type === 'error';
  const isSuccess = t.type === 'success';
  const Icon = isError ? XCircle : isSuccess ? CheckCircle2 : Info;

  return (
    <div
      className={`flex w-[min(420px,calc(100vw-32px))] items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-2xl backdrop-blur-md transition-all ${
        isError
          ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/90 dark:text-red-200'
          : isSuccess
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/90 dark:text-emerald-200'
            : 'border-gray-200 bg-white text-gray-800 dark:border-banking-border dark:bg-banking-card dark:text-gray-100'
      }`}
      role="status"
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1 text-sm font-medium leading-5">
        {resolveValue(t.message, t)}
      </div>
      <button
        type="button"
        aria-label="Close notification"
        title="Close notification"
        onClick={() => toast.dismiss(t.id)}
        className="-mr-1 -mt-1 rounded-lg p-1.5 opacity-60 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

// Preload the text faces now so they arrive before the first (lazy) screen paints; a late font swap
// re-wraps text and shifts the centred sign-in form (measured CLS 0.18 without this).
[plex400, plex600, plex700].forEach((href) => {
  const link = document.createElement('link');
  link.rel = 'preload'; link.as = 'font'; link.type = 'font/woff2'; link.crossOrigin = 'anonymous'; link.href = href;
  document.head.appendChild(link);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <EmployeeProvider>
            <App />
            <Toaster
              position="top-right"
              gutter={10}
              reverseOrder={false}
              toastOptions={{ duration: 4500 }}
            >
              {(t) => <ToastNotification t={t} />}
            </Toaster>
          </EmployeeProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
