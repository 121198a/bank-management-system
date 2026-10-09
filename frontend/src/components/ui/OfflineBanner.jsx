import React from 'react';
import { WifiOff } from 'lucide-react';
import useOnlineStatus from '../../hooks/useOnlineStatus';

/**
 * Announced politely to assistive tech. Deliberately makes no promise about queuing:
 * nothing is saved while offline, and money movement must not be retried silently.
 */
const OfflineBanner = () => {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
      <WifiOff className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>You are offline. Nothing can be saved or sent until your connection returns.</span>
    </div>
  );
};

export default OfflineBanner;
