import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LegalPage from './LegalPage';

describe('LegalPage', () => {
  it.each([['privacy', 'Privacy Policy'], ['terms', 'Terms of Service']])('renders %s with a draft notice', (kind, title) => {
    render(<MemoryRouter><LegalPage kind={kind} /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
    expect(screen.getByRole('note')).toHaveTextContent(/lawyer/i);
    expect(document.title).toContain(title);
  });
});
