import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from './NotFound';

const mockAuth = vi.hoisted(() => ({ value: { isAuthenticated: false } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => mockAuth.value }));

describe('NotFound', () => {
  it('points signed-out users to sign in and sets the document title', () => {
    mockAuth.value = { isAuthenticated: false };
    render(<MemoryRouter><NotFound /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('This page does not exist');
    expect(screen.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute('href', '/login');
    expect(document.title).toMatch(/not found/i);
  });
  it('points signed-in users back to their dashboard', () => {
    mockAuth.value = { isAuthenticated: true };
    render(<MemoryRouter><NotFound /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Back to my dashboard' })).toHaveAttribute('href', '/');
  });
});
