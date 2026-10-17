import React from 'react';
import { Link } from 'react-router-dom';
import usePageMeta from '../../hooks/usePageMeta';
import { BRAND } from '../../config/brand';
import { DRAFT_NOTICE, LEGAL_DOCS, legalPath } from './legalContent';

const LegalHub = () => {
  usePageMeta('Legal and policies', 'Terms, privacy and policies for this service (draft).');
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-banking-dark px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <Link to="/login" className="text-sm font-semibold text-primary-700 dark:text-primary-400 hover:text-primary-800">&larr; Back to sign in</Link>
        <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">Legal and policies</h1>
        <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
          Terms, privacy and policies for {BRAND.name} ({BRAND.descriptor}). This is a banking-style application: read the Service Disclaimer for what that does and does not mean.
        </p>
        <p role="note" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">{DRAFT_NOTICE}</p>
        <ul className="mt-8 divide-y divide-gray-200 dark:divide-slate-800 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-banking-card">
          {LEGAL_DOCS.map((d) => (
            <li key={d.slug}>
              <Link to={legalPath(d.slug)} className="block p-4 hover:bg-gray-50 dark:hover:bg-slate-800/60">
                <span className="font-semibold text-gray-900 dark:text-white">{d.title}</span>
                <span className="mt-1 block text-sm text-gray-600 dark:text-gray-400">{d.summary}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-xs text-gray-600 dark:text-gray-400">&copy; {new Date().getFullYear()} {BRAND.name}</p>
      </div>
    </main>
  );
};

export default LegalHub;
