import React from 'react';
import { Search } from 'lucide-react';

const ManagementFilterBar = ({
  search = '',
  onSearch,
  placeholder = 'Search...',
  children,
  className = ''
}) => (
  <div className={`card p-4 sm:p-5 ${className}`}>
    <div className="flex flex-col lg:flex-row lg:items-center gap-3">
      <div className="w-full lg:w-1/4 lg:min-w-[250px] lg:max-w-[360px] shrink-0">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <input
            className="input-field pl-10 h-12"
            placeholder={placeholder}
            value={search}
            onChange={onSearch}
          />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:flex-wrap lg:ml-auto gap-3 w-full lg:w-auto lg:justify-end">
        {children}
      </div>
    </div>
  </div>
);

export default ManagementFilterBar;
