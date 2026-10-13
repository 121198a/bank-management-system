import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import usePageMeta from '../../hooks/usePageMeta';

const NotFound = () => {
  const { isAuthenticated } = useAuth();
  usePageMeta('Page not found', 'The page you asked for does not exist.');
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-banking-dark px-4">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-400">Error 404</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">This page does not exist</h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          The address may be mistyped, or the page may have moved.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link className="btn-primary" to={isAuthenticated ? '/' : '/login'}>
            {isAuthenticated ? 'Back to my dashboard' : 'Go to sign in'}
          </Link>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
