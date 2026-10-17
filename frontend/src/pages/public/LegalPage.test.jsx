import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LegalPage from './LegalPage';
import LegalHub from './LegalHub';
import { LEGAL_DOCS, legalPath } from './legalContent';

const text = (doc) => doc.sections.map(([h, b]) => `${h} ${b}`).join(' ');

describe('legal documents', () => {
  it.each(LEGAL_DOCS.map((d) => [d.slug, d.title]))('%s renders one h1, a draft notice and its sections', (slug, title) => {
    render(<MemoryRouter><LegalPage slug={slug} /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
    expect(screen.getByRole('note')).toHaveTextContent(/lawyer/i);
    expect(document.title).toContain(title);
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(2);
  });

  it('the hub links to every document, and slugs are unique', () => {
    render(<MemoryRouter><LegalHub /></MemoryRouter>);
    for (const d of LEGAL_DOCS) expect(screen.getByRole('link', { name: new RegExp(d.title) })).toHaveAttribute('href', legalPath(d.slug));
    expect(new Set(LEGAL_DOCS.map((d) => d.slug)).size).toBe(LEGAL_DOCS.length);
  });

  it('covers the documents this product needs, and none that do not apply', () => {
    const slugs = LEGAL_DOCS.map((d) => d.slug);
    for (const s of ['privacy-policy', 'terms-of-use', 'cookie-policy', 'acceptable-use', 'disclaimer', 'support', 'delete-account']) expect(slugs).toContain(s);
    expect(slugs).not.toContain('community-guidelines'); // no user-generated content in this application
  });

  it('the cookie policy matches what the backend really sets', () => {
    const t = text(LEGAL_DOCS.find((d) => d.slug === 'cookie-policy'));
    for (const fact of ['refreshToken', 'HTTP-only', 'SameSite=Strict', '/api/auth', 'Secure', '7 days', 'memory only']) expect(t).toContain(fact);
    expect(t).toMatch(/no analytics|does not use advertising, analytics/i);
  });

  it('the delete-account page does not promise a self-service feature that does not exist', () => {
    const t = text(LEGAL_DOCS.find((d) => d.slug === 'delete-account'));
    expect(t).toMatch(/does not offer self-service account deletion/);
    expect(t).toMatch(/administrator can deactivate/);
  });

  it('no document claims licensing, insurance or compliance it cannot know', () => {
    for (const d of LEGAL_DOCS) {
      const t = text(d);
      expect(t, d.slug).not.toMatch(/\b(FDIC|DICGC|insured by|guaranteed by|fully compliant|bank-grade|military-grade)\b/i);
    }
  });

  it('every document leaves owner-only facts as visible [placeholders]', () => {
    for (const d of LEGAL_DOCS) expect(text(d), d.slug).toMatch(/\[[^\]]+\]/);
  });
});
