import React from 'react';
import { Link } from 'react-router-dom';
import usePageMeta from '../../hooks/usePageMeta';
import { DRAFT_NOTICE, LEGAL_DOCS, legalPath } from './legalContent';

const LegalPage = ({ slug }) => {
  const doc = LEGAL_DOCS.find((d) => d.slug === slug);
  usePageMeta(doc.title, doc.description);
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-banking-dark px-4 py-12">
      <article className="mx-auto max-w-2xl">
        <Link to="/legal" className="text-sm font-semibold text-primary-700 dark:text-primary-400 hover:text-primary-800">&larr; All policies</Link>
        <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">{doc.title}</h1>
        <p role="note" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          {DRAFT_NOTICE}
        </p>
        {doc.sections.map(([heading, body]) => (
          <section key={heading} className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{heading}</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{body}</p>
          </section>
        ))}
        <nav aria-label="Other policies" className="mt-12 border-t border-gray-200 dark:border-slate-800 pt-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Other policies</h2>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {LEGAL_DOCS.filter((d) => d.slug !== slug).map((d) => (
              <li key={d.slug}><Link className="text-primary-700 dark:text-primary-400 underline underline-offset-2" to={legalPath(d.slug)}>{d.title}</Link></li>
            ))}
          </ul>
        </nav>
      </article>
    </main>
  );
};

export default LegalPage;
