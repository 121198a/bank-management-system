import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

const mockAuth = vi.hoisted(() => ({ value: {} }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => mockAuth.value }));

const renderAt = (auth, roles) => {
  mockAuth.value = auth;
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/login" element={<div>LOGIN</div>} />
        <Route path="/dashboard" element={<div>CUSTOMER HOME</div>} />
        <Route path="/employee" element={<div>EMPLOYEE HOME</div>} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={roles}><div>SECRET</div></ProtectedRoute>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('ProtectedRoute', () => {
  it('sends anonymous visitors to /login', () => {
    renderAt({ user: null, loading: false, isAuthenticated: false }, ['admin']);
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
    expect(screen.queryByText('SECRET')).not.toBeInTheDocument();
  });
  it('redirects a customer away from an admin route to their own dashboard', () => {
    renderAt({ user: { role: 'customer' }, loading: false, isAuthenticated: true }, ['admin']);
    expect(screen.getByText('CUSTOMER HOME')).toBeInTheDocument();
    expect(screen.queryByText('SECRET')).not.toBeInTheDocument();
  });
  it('redirects an employee to the employee area', () => {
    renderAt({ user: { role: 'employee' }, loading: false, isAuthenticated: true }, ['admin']);
    expect(screen.getByText('EMPLOYEE HOME')).toBeInTheDocument();
  });
  it('renders the page for an allowed role', () => {
    renderAt({ user: { role: 'admin' }, loading: false, isAuthenticated: true }, ['admin']);
    expect(screen.getByText('SECRET')).toBeInTheDocument();
  });
});
