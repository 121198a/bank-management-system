import React from 'react';

const variantMap = {
  active: 'badge-success',
  verified: 'badge-success',
  success: 'badge-success',
  approved: 'badge-success',
  pending: 'badge-warning',
  warning: 'badge-warning',
  inactive: 'badge-danger',
  rejected: 'badge-danger',
  failed: 'badge-danger',
  closed: 'badge-gray',
  deposit: 'badge-success',
  withdraw: 'badge-danger',
  transfer_in: 'badge-info',
  transfer_out: 'badge-warning',
  admin: 'badge-danger',
  employee: 'badge-info',
  customer: 'badge-gray',
  info: 'badge-info',
  error: 'badge-danger',
  savings: 'badge-info',
  current: 'badge-gray'
};

const Badge = ({ value, label }) => {
  const key = (value || '').toLowerCase().replace(' ', '_');
  const cls = variantMap[key] || 'badge-gray';
  return (
    <span className={cls}>
      {label || value}
    </span>
  );
};

export default Badge;
