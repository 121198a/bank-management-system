import React from 'react';

export const CardSkeleton = () => (
  <div className="card p-5 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="h-3 bg-gray-200 dark:bg-banking-border rounded w-24 mb-3" />
        <div className="h-7 bg-gray-200 dark:bg-banking-border rounded w-32 mb-2" />
        <div className="h-3 bg-gray-200 dark:bg-banking-border rounded w-20" />
      </div>
      <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-banking-border" />
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 5 }) => (
  <div className="table-container animate-pulse">
    <table className="table">
      <thead>
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="table-th">
              <div className="h-3 bg-gray-200 dark:bg-banking-border rounded w-16" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-banking-border">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <tr key={rowIdx}>
            {Array.from({ length: cols }).map((_, colIdx) => (
              <td key={colIdx} className="table-td">
                <div className="h-3 bg-gray-200 dark:bg-banking-border rounded w-full max-w-[120px]" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const FormSkeleton = ({ fields = 4 }) => (
  <div className="space-y-4 animate-pulse">
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i}>
        <div className="h-3 bg-gray-200 dark:bg-banking-border rounded w-24 mb-2" />
        <div className="h-10 bg-gray-200 dark:bg-banking-border rounded-xl w-full" />
      </div>
    ))}
  </div>
);

export const NotificationSkeleton = ({ count = 4 }) => (
  <div className="space-y-3 animate-pulse">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex gap-3 p-3 rounded-xl border border-gray-100 dark:border-banking-border">
        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-banking-border flex-shrink-0" />
        <div className="flex-1">
          <div className="h-3 bg-gray-200 dark:bg-banking-border rounded w-1/3 mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-banking-border rounded w-full" />
        </div>
      </div>
    ))}
  </div>
);
