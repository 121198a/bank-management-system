import React from 'react';
import { Link } from 'react-router-dom';
import { legalPath } from '../../pages/public/legalContent';

const LINKS = [['Privacy', 'privacy-policy'], ['Terms', 'terms-of-use'], ['Cookies', 'cookie-policy'], ['Support', 'support']];

/** Inline legal links (no landmark): safe inside paragraphs and footers. */
const LegalLinks = ({ className = '' }) => (
  <span className={className}>
    {LINKS.map(([label, slug]) => (
      <React.Fragment key={slug}>
        <Link to={legalPath(slug)} className="underline underline-offset-2 hover:text-gray-900 dark:hover:text-white">{label}</Link>
        {' · '}
      </React.Fragment>
    ))}
    <Link to="/legal" className="underline underline-offset-2 hover:text-gray-900 dark:hover:text-white">All policies</Link>
  </span>
);

export default LegalLinks;
