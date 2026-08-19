const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const LoanApplication = require('../models/LoanApplication');
const Account = require('../models/Account');
const User = require('../models/User');
const EmployeeProfile = require('../models/EmployeeProfile');
const CustomerProfile = require('../models/CustomerProfile');
const Document = require('../models/Document');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { writeAuditLog } = require('../middleware/auditLogger');
const { toDecimal128, decimalToString, compareMoney } = require('../utils/money');
const { escapeRegex } = require('../utils/sanitize');
const { generateYearScopedId } = require('../utils/sequence');

const LOAN_STORAGE_ROOT = path.resolve(__dirname, '../../storage/loans');
const DOCUMENT_MIME_EXTENSIONS = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};
const DOCUMENT_TYPES = ['identity_proof', 'address_proof', 'pan', 'income_proof', 'salary_slip', 'bank_statement', 'employment_proof', 'other'];

const LOAN_ACTIONS = {
  created: 'LOAN_CREATED',
  reviewStarted: 'LOAN_REVIEW_STARTED',
  documentsRequested: 'LOAN_DOCUMENTS_REQUESTED',
  remarkAdded: 'LOAN_REMARK_ADDED',
  recommended: 'LOAN_AMOUNT_RECOMMENDED',
  approved: 'LOAN_APPROVED',
  rejected: 'LOAN_REJECTED',
  disbursed: 'LOAN_DISBURSED',
  documentsAttached: 'LOAN_DOCUMENTS_ATTACHED',
  documentVerified: 'LOAN_DOCUMENT_VERIFIED'
};

const serializeLoan = (loan) => {
  const value = loan?.toJSON ? loan.toJSON() : loan;
  if (!value) return value;
  for (const key of ['monthlyIncome', 'requestedAmount', 'approvedAmount', 'existingEmi', 'employeeRecommendedAmount']) {
    if (value[key] !== undefined && value[key] !== null && typeof value[key] === 'object' && value[key].$numberDecimal) {
      value[key] = value[key].$numberDecimal;
    }
  }
  return value;
};

const populateLoan = (query) => query
  .populate('customer', 'fullName email phone kycStatus')
  .populate('account', 'accountNumber accountType balance currency status branch')
  .populate('branch', 'branchId branchName branchCode ifsc city state status')
  .populate('documents', 'owner applicationType application type fileName mimeType size status verifiedAt verifiedBy createdAt')
  .populate('reviewedBy', 'fullName email')
  .populate('finalApprovedBy', 'fullName email');

const getEmployeeScope = async (userId) => {
  const employee = await EmployeeProfile.findOne({ user: userId, status: 'active' }).select('branch allBranchAccess permissions');
  if (!employee) throw new ApiError(403, 'Employee profile not found or inactive');
  if (!employee.permissions.includes('loan.review')) throw new ApiError(403, 'Permission denied. Required permission: loan.review');
  return employee;
};

const assertEmployeeCanAccessLoan = async (loan, userId) => {
  const employee = await getEmployeeScope(userId);
  if (!employee.allBranchAccess && (!loan.branch || !loan.branch.equals(employee.branch))) {
    throw new ApiError(403, 'You do not have permission to access loans outside your branch');
  }
  return employee;
};

const notifyCustomer = async (userId, title, message, type = 'info') => {
  try {
    await Notification.create({ user: userId, title, message, type });
  } catch (error) {
    console.error(`Loan notification failed: ${error.message}`);
  }
};

const createLoanApplication = asyncHandler(async (req, res) => {
  const account = await Account.findOne({
    _id: req.body.accountId,
    user: req.user._id,
    status: 'active'
  });

  if (!account) {
    throw new ApiError(400, 'A valid active account belonging to you is required for the loan application');
  }

  const customerProfile = await CustomerProfile.findOne({ user: req.user._id }).select('homeBranch preferredBranch');
  const applicationBranch = account.branch || customerProfile?.homeBranch || customerProfile?.preferredBranch || null;
  const applicationId = await generateYearScopedId('LN');
  const loan = await LoanApplication.create({
    applicationId,
    customer: req.user._id,
    employmentType: req.body.employmentType,
    employerName: req.body.employerName || '',
    designation: req.body.designation || '',
    monthlyIncome: toDecimal128(req.body.monthlyIncome),
    workExperienceYears: req.body.workExperienceYears ?? 0,
    loanType: req.body.loanType,
    requestedAmount: toDecimal128(req.body.requestedAmount),
    tenureMonths: req.body.tenureMonths,
    purpose: req.body.purpose,
    existingEmi: toDecimal128(req.body.existingEmi || '0.00', { allowZero: true }),
    hasExistingLoans: Boolean(req.body.hasExistingLoans),
    account: account._id,
    branch: applicationBranch,
    status: 'submitted',
    submittedAt: new Date()
  });

  await writeAuditLog({
    actor: req.user,
    action: LOAN_ACTIONS.created,
    targetType: 'LoanApplication',
    targetId: loan._id,
    after: serializeLoan(loan),
    req
  });

  await notifyCustomer(
    req.user._id,
    'Loan Application Submitted',
    `Your loan application ${loan.applicationId} has been submitted for review.`,
    'success'
  );

  const result = await populateLoan(LoanApplication.findById(loan._id));
  return new ApiResponse(201, 'Loan application submitted successfully', { loan: serializeLoan(result) }).send(res);
});

const getMyLoanApplications = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const filter = { customer: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.loanType) filter.loanType = req.query.loanType;
  const skip = (page - 1) * limit;

  const [loans, total] = await Promise.all([
    populateLoan(LoanApplication.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)),
    LoanApplication.countDocuments(filter)
  ]);

  return new ApiResponse(
    200,
    'Loan applications fetched successfully',
    { loans: loans.map(serializeLoan) },
    { page, limit, total, totalPages: Math.ceil(total / limit) }
  ).send(res);
});

const getLoanApplicationById = asyncHandler(async (req, res) => {
  const loan = await populateLoan(LoanApplication.findById(req.params.id));
  if (!loan) throw new ApiError(404, 'Loan application not found');

  if (req.user.role === 'customer') {
    if (!loan.customer._id.equals(req.user._id)) {
      throw new ApiError(403, 'You do not have permission to view this loan application');
    }
  } else if (req.user.role === 'employee') {
    await assertEmployeeCanAccessLoan(loan, req.user._id);
  }

  return new ApiResponse(200, 'Loan application fetched successfully', { loan: serializeLoan(loan) }).send(res);
});

const listLoanApplications = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.loanType) filter.loanType = req.query.loanType;

  if (req.query.search) {
    const searchRegex = new RegExp(escapeRegex(req.query.search), 'i');
    const users = await User.find({
      $or: [{ fullName: searchRegex }, { email: searchRegex }]
    }).select('_id').limit(1000);
    filter.$or = [
      { applicationId: searchRegex },
      { customer: { $in: users.map((user) => user._id) } }
    ];
  }

  if (req.user.role === 'employee') {
    const employee = await getEmployeeScope(req.user._id);
    if (!employee.allBranchAccess) filter.branch = employee.branch;
  }

  const skip = (page - 1) * limit;
  const [loans, total] = await Promise.all([
    populateLoan(LoanApplication.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)),
    LoanApplication.countDocuments(filter)
  ]);

  return new ApiResponse(
    200,
    'Loan applications fetched successfully',
    { loans: loans.map(serializeLoan) },
    { page, limit, total, totalPages: Math.ceil(total / limit) }
  ).send(res);
});

const startLoanReview = asyncHandler(async (req, res) => {
  const loan = await LoanApplication.findById(req.params.id);
  if (!loan) throw new ApiError(404, 'Loan application not found');
  await assertEmployeeCanAccessLoan(loan, req.user._id);

  if (loan.status !== 'submitted') {
    throw new ApiError(400, `Cannot start review while loan is ${loan.status}`);
  }

  const before = serializeLoan(loan);
  loan.status = 'under_review';
  loan.reviewedBy = req.user._id;
  await loan.save();

  await writeAuditLog({
    actor: req.user,
    action: LOAN_ACTIONS.reviewStarted,
    targetType: 'LoanApplication',
    targetId: loan._id,
    before,
    after: serializeLoan(loan),
    req
  });

  await notifyCustomer(loan.customer, 'Loan Under Review', `Your loan application ${loan.applicationId} is now under review.`);

  return new ApiResponse(200, 'Loan review started', { loan: serializeLoan(loan) }).send(res);
});

const requestLoanDocuments = asyncHandler(async (req, res) => {
  const loan = await LoanApplication.findById(req.params.id);
  if (!loan) throw new ApiError(404, 'Loan application not found');
  await assertEmployeeCanAccessLoan(loan, req.user._id);

  if (loan.status !== 'under_review') {
    throw new ApiError(400, `Documents can only be requested while loan is under review`);
  }

  const before = serializeLoan(loan);
  loan.documentsRequested = [...new Set(req.body.documentTypes)];
  loan.status = 'documents_required';
  loan.reviewedBy = req.user._id;
  await loan.save();

  await writeAuditLog({
    actor: req.user,
    action: LOAN_ACTIONS.documentsRequested,
    targetType: 'LoanApplication',
    targetId: loan._id,
    before,
    after: serializeLoan(loan),
    req
  });

  await notifyCustomer(
    loan.customer,
    'Documents Required for Loan',
    `Additional documents are required for loan application ${loan.applicationId}: ${loan.documentsRequested.join(', ')}.`,
    'warning'
  );

  return new ApiResponse(200, 'Loan documents requested successfully', { loan: serializeLoan(loan) }).send(res);
});

const addLoanRemark = asyncHandler(async (req, res) => {
  const loan = await LoanApplication.findById(req.params.id);
  if (!loan) throw new ApiError(404, 'Loan application not found');
  await assertEmployeeCanAccessLoan(loan, req.user._id);

  if (!['under_review', 'documents_required'].includes(loan.status)) {
    throw new ApiError(400, `Remarks cannot be added while loan is ${loan.status}`);
  }

  const before = serializeLoan(loan);
  loan.remarks.push({ text: req.body.text, by: req.user._id, at: new Date() });
  loan.reviewedBy = req.user._id;
  await loan.save();

  await writeAuditLog({
    actor: req.user,
    action: LOAN_ACTIONS.remarkAdded,
    targetType: 'LoanApplication',
    targetId: loan._id,
    before,
    after: serializeLoan(loan),
    req
  });

  return new ApiResponse(200, 'Loan remark added successfully', { loan: serializeLoan(loan) }).send(res);
});

const recommendLoanAmount = asyncHandler(async (req, res) => {
  const loan = await LoanApplication.findById(req.params.id);
  if (!loan) throw new ApiError(404, 'Loan application not found');
  await assertEmployeeCanAccessLoan(loan, req.user._id);

  if (loan.status !== 'under_review') {
    throw new ApiError(400, `A loan amount can only be recommended while loan is under review`);
  }

  const amount = toDecimal128(req.body.amount);
  if (compareMoney(amount, loan.requestedAmount) > 0) {
    throw new ApiError(400, 'Employee recommendation cannot exceed the requested amount');
  }

  const before = serializeLoan(loan);
  loan.employeeRecommendedAmount = amount;
  loan.reviewedBy = req.user._id;
  await loan.save();

  await writeAuditLog({
    actor: req.user,
    action: LOAN_ACTIONS.recommended,
    targetType: 'LoanApplication',
    targetId: loan._id,
    before,
    after: serializeLoan(loan),
    req
  });

  return new ApiResponse(200, 'Loan amount recommendation saved', { loan: serializeLoan(loan) }).send(res);
});

const uploadLoanDocument = asyncHandler(async (req, res) => {
  const loan = await LoanApplication.findById(req.params.id);
  if (!loan) throw new ApiError(404, 'Loan application not found');
  if (!loan.customer.equals(req.user._id)) {
    throw new ApiError(403, 'You can only upload documents to your own loan application');
  }
  if (!['submitted', 'under_review', 'documents_required'].includes(loan.status)) {
    throw new ApiError(400, `Documents cannot be uploaded while loan is ${loan.status}`);
  }

  const mimeType = String(req.headers['content-type'] || '').split(';')[0].toLowerCase();
  const documentType = String(req.headers['x-document-type'] || '').trim();
  const rawFileName = String(req.headers['x-file-name'] || '').trim();
  let fileName;
  try { fileName = decodeURIComponent(rawFileName).slice(0, 180); } catch (_) { fileName = rawFileName.slice(0, 180); }

  if (!DOCUMENT_MIME_EXTENSIONS[mimeType]) throw new ApiError(415, 'Unsupported document type');
  if (!DOCUMENT_TYPES.includes(documentType)) throw new ApiError(400, 'Invalid document type');
  if (!fileName) throw new ApiError(400, 'X-File-Name header is required');
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new ApiError(400, 'Document file is required');
  if (req.body.length > 5 * 1024 * 1024) throw new ApiError(413, 'Document exceeds the 5MB limit');

  const key = `${crypto.randomUUID()}${DOCUMENT_MIME_EXTENSIONS[mimeType]}`;
  const storagePath = path.join(LOAN_STORAGE_ROOT, key);
  await fs.mkdir(LOAN_STORAGE_ROOT, { recursive: true });
  await fs.writeFile(storagePath, req.body, { flag: 'wx' });

  try {
    const document = await Document.create({
      owner: req.user._id,
      applicationType: 'loan_application',
      application: loan._id,
      type: documentType,
      fileName,
      mimeType,
      size: req.body.length,
      storageReference: `loans/${key}`,
      status: 'uploaded'
    });

    loan.documents = [...new Set([...loan.documents.map(String), String(document._id)])];
    await loan.save();

    await writeAuditLog({
      actor: req.user,
      action: LOAN_ACTIONS.documentsAttached,
      targetType: 'Document',
      targetId: document._id,
      after: {
        loanApplication: loan._id,
        type: document.type,
        fileName: document.fileName,
        size: document.size,
        status: document.status
      },
      req
    });

    return new ApiResponse(201, 'Loan document uploaded successfully', { document: document.toJSON() }).send(res);
  } catch (error) {
    try { await fs.unlink(storagePath); } catch (_) { /* best effort cleanup */ }
    throw error;
  }
});

const downloadLoanDocument = asyncHandler(async (req, res) => {
  const loan = await LoanApplication.findById(req.params.id);
  if (!loan) throw new ApiError(404, 'Loan application not found');

  if (req.user.role === 'customer' && !loan.customer.equals(req.user._id)) {
    throw new ApiError(403, 'You do not have permission to access this document');
  }
  if (req.user.role === 'employee') await assertEmployeeCanAccessLoan(loan, req.user._id);

  const document = await Document.findOne({
    _id: req.params.documentId,
    applicationType: 'loan_application',
    application: loan._id
  }).select('+storageReference');

  if (!document) throw new ApiError(404, 'Loan document not found');

  const storagePath = path.resolve(LOAN_STORAGE_ROOT, path.basename(document.storageReference));
  if (!storagePath.startsWith(`${LOAN_STORAGE_ROOT}${path.sep}`)) throw new ApiError(400, 'Invalid document reference');

  try {
    await fs.access(storagePath);
  } catch (_) {
    throw new ApiError(404, 'Document file is not available');
  }

  res.setHeader('Content-Type', document.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${document.fileName.replace(/["\\\r\n]/g, '')}"`);
  const file = await fs.readFile(storagePath);
  return res.status(200).send(file);
});

const attachLoanDocuments = asyncHandler(async (req, res) => {
  const loan = await LoanApplication.findById(req.params.id);
  if (!loan) throw new ApiError(404, 'Loan application not found');

  if (!loan.customer.equals(req.user._id)) {
    throw new ApiError(403, 'You can only attach documents to your own loan application');
  }

  if (!['submitted', 'under_review', 'documents_required'].includes(loan.status)) {
    throw new ApiError(400, `Documents cannot be attached while loan is ${loan.status}`);
  }

  const docs = await Document.find({
    _id: { $in: req.body.documentIds },
    owner: req.user._id,
    applicationType: 'loan_application',
    application: loan._id
  }).select('_id status type');

  if (docs.length !== req.body.documentIds.length) {
    throw new ApiError(400, 'One or more documents are invalid or do not belong to this loan application');
  }

  const before = serializeLoan(loan);
  loan.documents = [...new Set([...loan.documents.map(String), ...docs.map((doc) => String(doc._id))])];
  await loan.save();

  await writeAuditLog({
    actor: req.user,
    action: LOAN_ACTIONS.documentsAttached,
    targetType: 'LoanApplication',
    targetId: loan._id,
    before,
    after: serializeLoan(loan),
    req
  });

  return new ApiResponse(200, 'Loan documents linked successfully', { loan: serializeLoan(loan) }).send(res);
});

const verifyLoanDocument = asyncHandler(async (req, res) => {
  const loan = await LoanApplication.findById(req.params.id);
  if (!loan) throw new ApiError(404, 'Loan application not found');
  await assertEmployeeCanAccessLoan(loan, req.user._id);

  if (!['under_review', 'documents_required'].includes(loan.status)) {
    throw new ApiError(400, `Documents cannot be verified while loan is ${loan.status}`);
  }

  const document = await Document.findOne({
    _id: req.params.documentId,
    applicationType: 'loan_application',
    application: loan._id,
    owner: loan.customer
  });

  if (!document) throw new ApiError(404, 'Loan document not found');
  if (document.status === 'verified') {
    throw new ApiError(400, 'Document is already verified');
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const before = serializeLoan(loan);
      document.status = 'verified';
      document.verifiedBy = req.user._id;
      document.verifiedAt = new Date();
      await document.save({ session });

      const freshLoan = await LoanApplication.findById(loan._id).session(session);
      const docs = await Document.find({
        _id: { $in: freshLoan.documents },
        applicationType: 'loan_application',
        application: freshLoan._id,
        owner: freshLoan.customer
      }).session(session);

      if (freshLoan.status === 'documents_required' && freshLoan.documentsRequested.length > 0) {
        const allRequestedVerified = freshLoan.documentsRequested.every(
          (type) => docs.some((doc) => doc.type === type && doc.status === 'verified')
        );
        if (allRequestedVerified) {
          freshLoan.status = 'under_review';
          freshLoan.documentsRequested = [];
        }
      }

      freshLoan.reviewedBy = req.user._id;
      await freshLoan.save({ session });

      await writeAuditLog({
        actor: req.user,
        action: LOAN_ACTIONS.documentVerified,
        targetType: 'LoanApplication',
        targetId: freshLoan._id,
        before,
        after: serializeLoan(freshLoan),
        req,
        session
      });

      result = freshLoan;
    });

    await notifyCustomer(
      result.customer,
      'Loan Document Verified',
      `A document for loan application ${result.applicationId} has been verified.`
    );

    return new ApiResponse(200, 'Loan document verified successfully', { loan: serializeLoan(result) }).send(res);
  } finally {
    await session.endSession();
  }
});

const approveLoanApplication = asyncHandler(async (req, res) => {
  const loan = await LoanApplication.findById(req.params.id);
  if (!loan) throw new ApiError(404, 'Loan application not found');

  if (loan.status !== 'under_review') {
    throw new ApiError(400, `Cannot approve a loan while it is ${loan.status}`);
  }
  if (!loan.reviewedBy) throw new ApiError(400, 'Employee review is required before final approval');
  if (!loan.employeeRecommendedAmount) throw new ApiError(400, 'Employee recommendation is required before final approval');

  const documents = await Document.find({
    _id: { $in: loan.documents },
    applicationType: 'loan_application',
    application: loan._id,
    owner: loan.customer
  });

  if (documents.length === 0) {
    throw new ApiError(400, 'At least one loan document must be submitted and verified before approval');
  }
  if (documents.some((doc) => doc.status !== 'verified')) {
    throw new ApiError(400, 'All submitted loan documents must be verified before approval');
  }
  if (loan.documentsRequested.length > 0) {
    throw new ApiError(400, 'All requested loan documents must be submitted and verified before approval');
  }

  const approvedAmount = toDecimal128(req.body.approvedAmount || decimalToString(loan.employeeRecommendedAmount));
  if (compareMoney(approvedAmount, loan.requestedAmount) > 0) {
    throw new ApiError(400, 'Approved amount cannot exceed the requested amount');
  }
  if (compareMoney(approvedAmount, '0.00') <= 0) {
    throw new ApiError(400, 'Approved amount must be greater than zero');
  }

  const before = serializeLoan(loan);
  loan.approvedAmount = approvedAmount;
  loan.finalApprovedBy = req.user._id;
  loan.status = 'approved';
  await loan.save();

  await writeAuditLog({
    actor: req.user,
    action: LOAN_ACTIONS.approved,
    targetType: 'LoanApplication',
    targetId: loan._id,
    before,
    after: serializeLoan(loan),
    req
  });

  await notifyCustomer(
    loan.customer,
    'Loan Approved',
    `Your loan application ${loan.applicationId} has been approved for ${decimalToString(approvedAmount)} INR.`,
    'success'
  );

  return new ApiResponse(200, 'Loan approved successfully', { loan: serializeLoan(loan) }).send(res);
});

const rejectLoanApplication = asyncHandler(async (req, res) => {
  const loan = await LoanApplication.findById(req.params.id);
  if (!loan) throw new ApiError(404, 'Loan application not found');

  if (!['under_review', 'documents_required'].includes(loan.status)) {
    throw new ApiError(400, `Cannot reject a loan while it is ${loan.status}`);
  }

  const before = serializeLoan(loan);
  loan.status = 'rejected';
  loan.remarks.push({ text: `Rejected: ${req.body.reason}`, by: req.user._id, at: new Date() });
  loan.finalApprovedBy = null;
  await loan.save();

  await writeAuditLog({
    actor: req.user,
    action: LOAN_ACTIONS.rejected,
    targetType: 'LoanApplication',
    targetId: loan._id,
    before,
    after: serializeLoan(loan),
    req
  });

  await notifyCustomer(
    loan.customer,
    'Loan Application Rejected',
    `Your loan application ${loan.applicationId} was rejected. Reason: ${req.body.reason}`,
    'error'
  );

  return new ApiResponse(200, 'Loan rejected successfully', { loan: serializeLoan(loan) }).send(res);
});

const disburseLoan = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let result;
    let notificationPayload;

    await session.withTransaction(async () => {
      const loan = await LoanApplication.findById(req.params.id).session(session);
      if (!loan) throw new ApiError(404, 'Loan application not found');
      if (loan.status !== 'approved') {
        throw new ApiError(400, `Only approved loans can be disbursed; current status is ${loan.status}`);
      }
      if (!loan.approvedAmount) throw new ApiError(400, 'Approved loan amount is missing');

      const account = await Account.findById(loan.account).session(session);
      if (!account) throw new ApiError(400, 'Loan destination account not found');
      if (!account.user.equals(loan.customer)) throw new ApiError(400, 'Loan destination account does not belong to the customer');
      if (account.status !== 'active') throw new ApiError(400, 'Loan destination account is not active');

      const before = {
        status: loan.status,
        disbursedAt: loan.disbursedAt,
        accountBalance: decimalToString(account.balance)
      };

      // The approved -> disbursed state check is inside the MongoDB
      // transaction, so concurrent disbursement attempts cannot both commit.
      account.balance = require('../utils/money').addMoney(account.balance, loan.approvedAmount);
      await account.save({ session });

      const operationId = crypto.randomUUID();
      const [transaction] = await Transaction.create([{
        operationId,
        account: account._id,
        type: 'deposit',
        amount: loan.approvedAmount,
        balanceAfter: account.balance,
        currency: account.currency,
        description: `Loan disbursement ${loan.applicationId}`,
        status: 'success',
        performedBy: req.user._id
      }], { session });

      loan.status = 'disbursed';
      loan.disbursedAt = new Date();
      await loan.save({ session });

      await writeAuditLog({
        actor: req.user,
        action: LOAN_ACTIONS.disbursed,
        targetType: 'LoanApplication',
        targetId: loan._id,
        before,
        after: {
          status: loan.status,
          disbursedAt: loan.disbursedAt,
          transactionId: transaction._id,
          accountBalance: decimalToString(account.balance)
        },
        req,
        session
      });

      result = loan;
      notificationPayload = {
        user: loan.customer,
        applicationId: loan.applicationId,
        amount: decimalToString(loan.approvedAmount),
        accountNumber: account.accountNumber
      };
    });

    await notifyCustomer(
      notificationPayload.user,
      'Loan Disbursed',
      `${notificationPayload.amount} INR has been disbursed for loan ${notificationPayload.applicationId} to account ${notificationPayload.accountNumber}.`,
      'success'
    );

    const populated = await populateLoan(LoanApplication.findById(result._id));
    return new ApiResponse(200, 'Loan disbursed successfully', { loan: serializeLoan(populated) }).send(res);
  } finally {
    await session.endSession();
  }
});

module.exports = {
  createLoanApplication,
  getMyLoanApplications,
  getLoanApplicationById,
  listLoanApplications,
  startLoanReview,
  requestLoanDocuments,
  addLoanRemark,
  recommendLoanAmount,
  attachLoanDocuments,
  uploadLoanDocument,
  downloadLoanDocument,
  verifyLoanDocument,
  approveLoanApplication,
  rejectLoanApplication,
  disburseLoan
};
