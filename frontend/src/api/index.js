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


// ─── Employees (self) ──────────────────────────────────────────────────────
export const employeesAPI = {
  getMe: () => api.get('/employees/me').then((r) => r.data)
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
  forwardToManager: (id) => api.put(`/loans/${id}/forward-to-manager`).then((r) => r.data),
  managerReview: (id, decision, extra) =>
    api.put(`/loans/${id}/manager-review`, { decision, ...extra }).then((r) => r.data),
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

// ─── Insurance ─────────────────────────────────────────────────────────────
export const insuranceAPI = {
  listProducts: (params) => api.get('/insurance/products', { params }).then((r) => r.data),
  createProduct: (data) => api.post('/insurance/products', data).then((r) => r.data),
  updateProductStatus: (id, status) => api.put(`/insurance/products/${id}/status`, { status }).then((r) => r.data),

  applyForPolicy: (data) => api.post('/insurance/policies', data).then((r) => r.data),
  getMyPolicies: (params) => api.get('/insurance/policies/my', { params }).then((r) => r.data),
  listPolicies: (params) => api.get('/insurance/policies', { params }).then((r) => r.data),
  getPolicyById: (id) => api.get(`/insurance/policies/${id}`).then((r) => r.data),
  startPolicyReview: (id) => api.put(`/insurance/policies/${id}/review`).then((r) => r.data),
  requestPolicyDocuments: (id, documentTypes) => api.put(`/insurance/policies/${id}/documents-required`, { documentTypes }).then((r) => r.data),
  addPolicyRemark: (id, text) => api.put(`/insurance/policies/${id}/remark`, { text }).then((r) => r.data),
  forwardPolicyToManager: (id) => api.put(`/insurance/policies/${id}/forward-to-manager`).then((r) => r.data),
  managerReviewPolicy: (id, decision, extra) => api.put(`/insurance/policies/${id}/manager-review`, { decision, ...extra }).then((r) => r.data),
  approvePolicy: (id) => api.put(`/insurance/policies/${id}/approve`).then((r) => r.data),
  rejectPolicy: (id, reason) => api.put(`/insurance/policies/${id}/reject`, { reason }).then((r) => r.data),
  uploadPolicyDocument: (id, file, documentType) =>
    api.post(`/insurance/policies/${id}/documents/upload`, file, {
      headers: { 'Content-Type': file.type, 'X-Document-Type': documentType, 'X-File-Name': encodeURIComponent(file.name) }
    }).then((r) => r.data),
  downloadPolicyDocument: (id, documentId) => api.get(`/insurance/policies/${id}/documents/${documentId}/file`, { responseType: 'blob' }).then((r) => r.data),
  verifyPolicyDocument: (id, documentId) => api.put(`/insurance/policies/${id}/documents/${documentId}/verify`).then((r) => r.data),

  fileClaim: (data) => api.post('/insurance/claims', data).then((r) => r.data),
  getMyClaims: (params) => api.get('/insurance/claims/my', { params }).then((r) => r.data),
  listClaims: (params) => api.get('/insurance/claims', { params }).then((r) => r.data),
  getClaimById: (id) => api.get(`/insurance/claims/${id}`).then((r) => r.data),
  startClaimReview: (id) => api.put(`/insurance/claims/${id}/review`).then((r) => r.data),
  forwardClaimToManager: (id) => api.put(`/insurance/claims/${id}/forward-to-manager`).then((r) => r.data),
  managerReviewClaim: (id, decision, extra) => api.put(`/insurance/claims/${id}/manager-review`, { decision, ...extra }).then((r) => r.data),
  approveClaim: (id, approvedAmount) => api.put(`/insurance/claims/${id}/approve`, approvedAmount ? { approvedAmount } : {}).then((r) => r.data),
  rejectClaim: (id, reason) => api.put(`/insurance/claims/${id}/reject`, { reason }).then((r) => r.data),
  settleClaim: (id) => api.put(`/insurance/claims/${id}/settle`).then((r) => r.data)
};

// ─── Collections ───────────────────────────────────────────────────────────
export const collectionAPI = {
  createCase: (data) => api.post('/collections/cases', data).then((r) => r.data),
  listCases: (params) => api.get('/collections/cases', { params }).then((r) => r.data),
  getCaseById: (id) => api.get(`/collections/cases/${id}`).then((r) => r.data),
  assignCase: (id, assignedEmployeeId) => api.put(`/collections/cases/${id}/assign`, { assignedEmployeeId }).then((r) => r.data),
  addContact: (id, method, outcome) => api.put(`/collections/cases/${id}/contact`, { method, outcome }).then((r) => r.data),
  recordPromiseToPay: (id, amount, promisedDate) => api.put(`/collections/cases/${id}/promise-to-pay`, { amount, promisedDate }).then((r) => r.data),
  recordPayment: (id, amount) => api.put(`/collections/cases/${id}/payment`, { amount }).then((r) => r.data),
  markFollowUp: (id, text) => api.put(`/collections/cases/${id}/follow-up`, text ? { text } : {}).then((r) => r.data),
  escalate: (id, reason, escalatedTo) => api.put(`/collections/cases/${id}/escalate`, { reason, ...(escalatedTo && { escalatedTo }) }).then((r) => r.data),
  addRemark: (id, text) => api.put(`/collections/cases/${id}/remark`, { text }).then((r) => r.data),
  closeCase: (id, reason) => api.put(`/collections/cases/${id}/close`, { reason }).then((r) => r.data)
};

// ─── Sales ─────────────────────────────────────────────────────────────────
export const salesAPI = {
  createLead: (data) => api.post('/sales/leads', data).then((r) => r.data),
  listLeads: (params) => api.get('/sales/leads', { params }).then((r) => r.data),
  getLeadById: (id) => api.get(`/sales/leads/${id}`).then((r) => r.data),
  assignLead: (id, assignedEmployeeId) => api.put(`/sales/leads/${id}/assign`, { assignedEmployeeId }).then((r) => r.data),
  updateStatus: (id, status, extra) => api.put(`/sales/leads/${id}/status`, { status, ...extra }).then((r) => r.data),
  addRemark: (id, text) => api.put(`/sales/leads/${id}/remark`, { text }).then((r) => r.data),
  convertLead: (id, convertedType, referenceId, customerId) => api.put(`/sales/leads/${id}/convert`, { convertedType, referenceId, ...(customerId && { customerId }) }).then((r) => r.data),
  getPerformance: () => api.get('/sales/performance').then((r) => r.data)
};

// ─── Security ──────────────────────────────────────────────────────────────
export const securityAPI = {
  listEvents: (params) => api.get('/security/events', { params }).then((r) => r.data),
  createIncident: (data) => api.post('/security/incidents', data).then((r) => r.data),
  listIncidents: (params) => api.get('/security/incidents', { params }).then((r) => r.data),
  resolveIncident: (id, status, resolution) => api.put(`/security/incidents/${id}/resolve`, { status, resolution }).then((r) => r.data),
  listFraudAlerts: (params) => api.get('/security/fraud-alerts', { params }).then((r) => r.data),
  reviewFraudAlert: (id, status, resolution) => api.put(`/security/fraud-alerts/${id}/review`, { status, ...(resolution && { resolution }) }).then((r) => r.data)
};
