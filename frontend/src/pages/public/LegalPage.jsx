import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const DRAFT_NOTICE =
  'Draft template written from what this application actually stores. Replace every [bracketed] item and have a qualified lawyer review it for your jurisdiction before launch.';

const PAGES = {
  privacy: {
    title: 'Privacy Policy',
    sections: [
      ['Who we are', 'This service is operated by [Legal entity name], [registered address]. Contact for privacy requests: [privacy contact email].'],
      ['What we collect', 'Account details (name, email, phone, address); account and transaction records; KYC details you submit (document type, document number and any uploaded document); service requests, loan and insurance applications; security and audit logs (actions taken, IP address, request ID).'],
      ['Why we use it', 'To provide banking services, verify identity, prevent fraud, meet legal obligations and keep your account secure.'],
      ['Cookies and storage', 'We use one HTTP-only cookie to keep you signed in (a rotating refresh token) and your browser stores your light/dark theme choice. We do not use advertising or analytics trackers.'],
      ['Sharing', 'We do not sell personal data. Data is shared only with service providers needed to run the service (hosting, database, email delivery: [list providers]) and where the law requires it.'],
      ['Retention', 'Records are kept for [retention period] after account closure, or longer where the law requires.'],
      ['Your rights', 'Subject to applicable law you may request access to, correction of, or deletion of your data by contacting [privacy contact email].'],
      ['Security', 'Passwords are hashed, sessions use short-lived tokens, and access is role-restricted and audit-logged. No system is perfectly secure; report concerns to [security contact email].']
    ]
  },
  terms: {
    title: 'Terms of Service',
    sections: [
      ['Acceptance', 'By creating an account or using this service you agree to these terms.'],
      ['Your account', 'Keep your credentials confidential and tell us promptly about unauthorised use. You are responsible for activity under your account.'],
      ['Permitted use', 'Use the service lawfully. Do not attempt to bypass security controls, access other customers\u2019 data, or disrupt the service.'],
      ['Transactions', 'Transfers, deposits and withdrawals are subject to balance, limit, verification and fraud checks, and may be delayed, held or declined to comply with law or protect you.'],
      ['Verification (KYC)', 'Some features require identity verification. We may restrict an account until verification is complete.'],
      ['Availability', 'We aim for high availability but do not guarantee uninterrupted service.'],
      ['Liability', '[Limitation of liability wording to be supplied by counsel for your jurisdiction.]'],
      ['Changes and contact', 'We may update these terms and will post the new version here. Questions: [contact email]. Governing law: [jurisdiction].']
    ]
  }
};

const LegalPage = ({ kind }) => {
  const page = PAGES[kind];
  useEffect(() => { document.title = `${page.title} — NexaBank`; }, [page.title]);
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-banking-dark px-4 py-12">
      <article className="mx-auto max-w-2xl">
        <Link to="/login" className="text-sm font-semibold text-primary-600 hover:text-primary-700">&larr; Back to sign in</Link>
        <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">{page.title}</h1>
        <p role="note" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          {DRAFT_NOTICE}
        </p>
        {page.sections.map(([heading, body]) => (
          <section key={heading} className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{heading}</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{body}</p>
          </section>
        ))}
      </article>
    </main>
  );
};

export default LegalPage;
