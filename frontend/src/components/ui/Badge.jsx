import React from 'react';

const variantMap = {
  active: 'badge-success',
  verified: 'badge-success',
  success: 'badge-success',
  approved: 'badge-success',
  recovered: 'badge-success',
  converted: 'badge-success',
  settled: 'badge-success',
  resolved: 'badge-success',
  issued: 'badge-success',
  delivered: 'badge-success',
  pending: 'badge-warning',
  warning: 'badge-warning',
  submitted: 'badge-warning',
  under_review: 'badge-warning',
  documents_required: 'badge-warning',
  manager_review: 'badge-warning',
  contact_pending: 'badge-warning',
  customer_contacted: 'badge-warning',
  promise_to_pay: 'badge-warning',
  payment_received: 'badge-warning',
  follow_up_required: 'badge-warning',
  new: 'badge-warning',
  assigned: 'badge-warning',
  contacted: 'badge-warning',
  interested: 'badge-warning',
  application_started: 'badge-warning',
  under_investigation: 'badge-warning',
  investigating: 'badge-warning',
  open: 'badge-warning',
  medium: 'badge-warning',
  low: 'badge-info',
  inactive: 'badge-danger',
  rejected: 'badge-danger',
  failed: 'badge-danger',
  lost: 'badge-danger',
  escalated: 'badge-danger',
  overdue: 'badge-danger',
  expired: 'badge-danger',
  lapsed: 'badge-danger',
  suspended: 'badge-danger',
  frozen: 'badge-danger',
  blocked: 'badge-danger',
  confirmed: 'badge-danger',
  high: 'badge-danger',
  critical: 'badge-danger',
  false_positive: 'badge-gray',
  closed: 'badge-gray',
  cancelled: 'badge-gray',
  disbursed: 'badge-success',
  deposit: 'badge-success',
  withdraw: 'badge-danger',
  transfer_in: 'badge-info',
  transfer_out: 'badge-warning',
  admin: 'badge-danger',
  employee: 'badge-info',
  customer: 'badge-gray',
  bank_head: 'badge-danger',
  department_head: 'badge-danger',
  manager: 'badge-info',
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
