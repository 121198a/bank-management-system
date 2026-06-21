export const formatCurrency = (amount, currency = 'INR') => {
  if (amount === undefined || amount === null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatDate = (dateStr, opts) => {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('en-IN', opts || {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: true
  }).format(new Date(dateStr));
};

export const formatDateOnly = (dateStr) =>
  formatDate(dateStr, { year: 'numeric', month: 'short', day: '2-digit' });

export const capitalize = (str = '') =>
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

export const truncate = (str = '', len = 30) =>
  str.length > len ? str.slice(0, len) + '…' : str;

export const getErrorMessage = (err) => {
  if (err?.response?.data?.errors?.length) {
    return err.response.data.errors.map((e) => e.message).join('. ');
  }
  return err?.response?.data?.message || err?.message || 'Something went wrong';
};
