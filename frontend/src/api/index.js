import api from './axiosInstance';

export const createIdempotencyKey = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const usersAPI = {
  getMe: () => api.get('/users/me').then((r) => r.data),
  updateMe: (data) => api.put('/users/me', data).then((r) => r.data),
  listUsers: (params) => api.get('/users', { params }).then((r) => r.data),
  createUser: (data) => api.post('/users', data).then((r) => r.data),
  editUser: (id, data) => api.put(`/users/${id}`, data).then((r) => r.data),
  getUserById: (id) => api.get(`/users/${id}`).then((r) => r.data),
  updateRole: (id, role) => api.put(`/users/${id}/role`, { role }).then((r) => r.data),
  updateStatus: (id, isActive) => api.put(`/users/${id}/status`, { isActive }).then((r) => r.data)
};

// ─── Accounts ────────────────────────────────────────────────────────────────
export const accountsAPI = {
  create: (data) => api.post('/accounts', data).then((r) => r.data),
  getMyAccounts: () => api.get('/accounts/my').then((r) => r.data),
  listAccounts: (params) => api.get('/accounts', { params }).then((r) => r.data),
  getById: (id) => api.get(`/accounts/${id}`).then((r) => r.data),
  approve: (id) => api.put(`/accounts/${id}/approve`).then((r) => r.data),
  updateStatus: (id, status, remarks) =>
    api.put(`/accounts/${id}/status`, { status, remarks }).then((r) => r.data)
};

// ─── Transactions ─────────────────────────────────────────────────────────────
export const transactionsAPI = {
  deposit: (data, idempotencyKey) => api.post('/transactions/deposit', data, { headers: { 'Idempotency-Key': idempotencyKey } }).then((r) => r.data),
  withdraw: (data, idempotencyKey) => api.post('/transactions/withdraw', data, { headers: { 'Idempotency-Key': idempotencyKey } }).then((r) => r.data),
  transfer: (data, idempotencyKey) => api.post('/transactions/transfer', data, { headers: { 'Idempotency-Key': idempotencyKey } }).then((r) => r.data),
  getAccountTransactions: (accountId, params) =>
    api.get(`/transactions/account/${accountId}`, { params }).then((r) => r.data),
  listAll: (params) => api.get('/transactions', { params }).then((r) => r.data),
  downloadStatement: (accountId, params) =>
    api.get(`/transactions/statement/${accountId}/pdf`, {
      params,
      responseType: 'blob'
    }).then((r) => r.data)
};

// ─── KYC ─────────────────────────────────────────────────────────────────────
export const kycAPI = {
  submit: (data) => api.post('/kyc/submit', data).then((r) => r.data),
  getMy: () => api.get('/kyc/my').then((r) => r.data),
  listAll: (params) => api.get('/kyc', { params }).then((r) => r.data),
  review: (id, status, remarks) =>
    api.put(`/kyc/${id}/review`, { status, remarks }).then((r) => r.data)
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }).then((r) => r.data),
  markAsRead: (id) => api.put(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.put('/notifications/read-all').then((r) => r.data),
  delete: (id) => api.delete(`/notifications/${id}`).then((r) => r.data)
};

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export const auditAPI = {
  listLogs: (params) => api.get('/audit', { params }).then((r) => r.data)
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats').then((r) => r.data)
};


// ─── Loans ───────────────────────────────────────────────────────────────────
export const loansAPI = {
  create: (data) => api.post('/loans', data).then((r) => r.data),
  getMy: (params) => api.get('/loans/my', { params }).then((r) => r.data),
  getById: (id) => api.get(`/loans/${id}`).then((r) => r.data),
  listAll: (params) => api.get('/loans', { params }).then((r) => r.data),
  startReview: (id) => api.put(`/loans/${id}/review`).then((r) => r.data),
  requestDocuments: (id, documentTypes) =>
    api.put(`/loans/${id}/documents-required`, { documentTypes }).then((r) => r.data),
  addRemark: (id, text) =>
    api.put(`/loans/${id}/remark`, { text }).then((r) => r.data),
  recommend: (id, amount) =>
    api.put(`/loans/${id}/recommend`, { amount }).then((r) => r.data),
  approve: (id, approvedAmount) =>
    api.put(`/loans/${id}/approve`, approvedAmount ? { approvedAmount } : {}).then((r) => r.data),
  reject: (id, reason) =>
    api.put(`/loans/${id}/reject`, { reason }).then((r) => r.data),
  disburse: (id) => api.put(`/loans/${id}/disburse`).then((r) => r.data),
  uploadDocument: (id, file, documentType) =>
    api.post(`/loans/${id}/documents/upload`, file, {
      headers: {
        'Content-Type': file.type,
        'X-Document-Type': documentType,
        'X-File-Name': encodeURIComponent(file.name)
      }
    }).then((r) => r.data),
  verifyDocument: (id, documentId) =>
    api.put(`/loans/${id}/documents/${documentId}/verify`).then((r) => r.data),
  downloadDocument: (id, documentId) =>
    api.get(`/loans/${id}/documents/${documentId}/file`, { responseType: 'blob' }).then((r) => r.data)
};
