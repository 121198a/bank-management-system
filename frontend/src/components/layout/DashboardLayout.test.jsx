import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';

vi.mock('./Sidebar', () => ({ default: () => <nav aria-label="Primary">sidebar</nav> }));
vi.mock('./Navbar', () => ({ default: () => <header>navbar</header> }));

const Page = ({ title }) => <section><h1>{title}</h1></section>;
const renderLayout = (element) => render(
  <MemoryRouter initialEntries={['/p']}>
    <Routes><Route element={<DashboardLayout role="customer" />}><Route path="/p" element={element} /></Route></Routes>
  </MemoryRouter>
);

describe('DashboardLayout accessibility', () => {
  it('offers a skip link that targets a focusable main landmark', () => {
    renderLayout(<Page title="My Accounts" />);
    const skip = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skip).toHaveAttribute('href', '#main-content');
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(main).toHaveAttribute('tabindex', '-1');
  });

  it('sizes the app shell to the dynamic viewport so mobile browser toolbars do not clip it', () => {
    const { container } = renderLayout(<Page title="X" />);
    expect(container.firstChild.className).toMatch(/supports-\[height:100dvh\]:h-dvh/);
  });

  it('sets the document title from the page h1', async () => {
    renderLayout(<Page title="Fund Transfer" />);
    await waitFor(() => expect(document.title).toBe('Fund Transfer — Bank Management System'));
  });

  it('updates the title when content loads later (lazy pages) and falls back when there is no h1', async () => {
    const Lazy = () => {
      const [ready, setReady] = React.useState(false);
      React.useEffect(() => { const t = setTimeout(() => setReady(true), 10); return () => clearTimeout(t); }, []);
      return ready ? <h1>Loaded Page</h1> : <p>loading</p>;
    };
    renderLayout(<Lazy />);
    expect(document.title).toBe('Bank Management System');
    await act(async () => { await new Promise((r) => setTimeout(r, 40)); });
    await waitFor(() => expect(document.title).toBe('Loaded Page — Bank Management System'));
  });
});
