import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import OfflineBanner from './OfflineBanner';

const setOnline = (value) => Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });

describe('OfflineBanner', () => {
  it('renders nothing while online', () => {
    setOnline(true);
    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('appears when the browser goes offline and disappears when it returns', () => {
    setOnline(true);
    render(<OfflineBanner />);
    act(() => { setOnline(false); window.dispatchEvent(new Event('offline')); });
    expect(screen.getByRole('status')).toHaveTextContent(/offline/i);
    act(() => { setOnline(true); window.dispatchEvent(new Event('online')); });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('is visible immediately if the page loads while already offline', () => {
    setOnline(false);
    render(<OfflineBanner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    setOnline(true);
  });
});
