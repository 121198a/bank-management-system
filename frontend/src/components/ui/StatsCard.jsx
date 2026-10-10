import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StatsCard = ({ title, value, subtitle, icon: Icon, iconBg = 'bg-primary-100 dark:bg-primary-900/30', iconColor = 'text-primary-700 dark:text-primary-400', trend, trendLabel }) => {
  return (
    <div className="card p-5 flex items-start justify-between group relative overflow-hidden hover:-translate-y-1 hover:shadow-card-hover transition-all duration-300 animate-page-enter">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-500 dark:text-banking-muted mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600 dark:text-red-400'}`}>
            {trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{Math.abs(trend)}% {trendLabel || ''}</span>
          </div>
        )}
      </div>
      {Icon && (
        <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center flex-shrink-0 ml-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      )}
    </div>
  );
};

export default StatsCard;
