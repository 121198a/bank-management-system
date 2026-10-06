import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Last-resort render-error boundary. Shows a recoverable screen instead of a
 * blank page; never renders error details to the user.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    // Hook for a monitoring service (e.g. Sentry) — console only for now.
    console.error('UI render error:', error?.name || 'Error');
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div role="alert" className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-banking-dark px-4">
        <div className="max-w-md text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">Something went wrong</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            The page failed to load. Your data is safe. Try again, or return to the start.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}>Reload</button>
            <a className="btn-secondary" href="/">Go home</a>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
