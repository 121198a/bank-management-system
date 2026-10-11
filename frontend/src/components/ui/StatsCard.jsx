import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

// Icon sits beside the title, so a wide value (e.g. a large balance) gets the full card width
// instead of pushing the icon out of the card.
const StatsCard = ({ title, value, subtitle, icon: Icon, iconBg = 'bg-primary-50 dark:bg-primary-900/30', iconColor = 'text-primary-700 dark:text-primary-400', trend, trendLabel }) => {
  return (
    <div className="card p-5 min-w-0 animate-page-enter">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-gray-600 dark:text-banking-muted min-w-0">{title}</p>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${iconColor}`} aria-hidden="true" />
          </div>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white [overflow-wrap:anywhere]">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{subtitle}</p>}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          <span>{Math.abs(trend)}% {trendLabel || ''}</span>
        </div>
      )}
    </div>
  );
};

export default StatsCard;
