const mongoose = require('mongoose');
const InsuranceProduct = require('../models/InsuranceProduct');
const InsurancePolicy = require('../models/InsurancePolicy');
const InsuranceClaim = require('../models/InsuranceClaim');
const Account = require('../models/Account');
const Department = require('../models/Department');
const Document = require('../models/Document');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { writeAuditLog } = require('../middleware/auditLogger');
const { toDecimal128, decimalToString, compareMoney, percentageOf } = require('../utils/money');
const { generateYearScopedId } = require('../utils/sequence');
const { saveDocument, readDocumentFile } = require('../services/documentService');
const { loadEmployeeContext, requirePermissions, buildScopeFilter, canAccessResource } = require('../services/orgScope');

const POLICY_SCOPE_FIELDS = { branchField: 'branch', departmentField: 'department' };
const DOCUMENT_TYPES = ['identity_proof', 'address_proof', 'pan', 'income_proof', 'salary_slip', 'bank_statement', 'employment_proof', 'other'];

const serializeMoneyFields = (doc, keys) => {
  const value = doc?.toJSON ? doc.toJSON() : doc;
  if (!value) return value;
  for (const key of keys) {
    if (value[key] && typeof value[key] === 'object' && value[key].$numberDecimal) {
      value[key] = value[key].$numberDecimal;
    }
  }
  return value;
};
const serializePolicy = (p) => serializeMoneyFields(p, ['sumInsured', 'annualPremium']);
const serializeClaim = (c) => serializeMoneyFields(c, ['claimAmount', 'approvedAmount']);

const notifyCustomer = async (userId, title, message, type = 'info') => {
  try {
    await Notification.create({ user: userId, title, message, type });
  } catch (error) {
    console.error(`Insurance notification failed: ${error.message}`);
  }
};

const getEmployeeScope = async (userId, permission = 'insurance.review') => {
  const employee = await loadEmployeeContext(userId);
  requirePermissions(employee, permission);
  return employee;
};

// ==================== PRODUCTS (admin catalog) ====================

const createProduct = asyncHandler(async (req, res) => {
  if (toDecimal128 && compareMoney(toDecimal128(String(req.body.minSumInsured)), toDecimal128(String(req.body.maxSumInsured))) > 0) {
    throw new ApiError(400, 'minSumInsured cannot exceed maxSumInsured');
  }
  if (req.body.minTermMonths > req.body.maxTermMonths) {
    throw new ApiError(400, 'minTermMonths cannot exceed maxTermMonths');
  }
  const product = await InsuranceProduct.create({
    code: req.body.code,
    name: req.body.name,
    type: req.body.type,
    description: req.body.description || '',
    minSumInsured: toDecimal128(String(req.body.minSumInsured)),
    maxSumInsured: toDecimal128(String(req.body.maxSumInsured)),
    annualPremiumRatePercent: req.body.annualPremiumRatePercent,
    minTermMonths: req.body.minTermMonths,
    maxTermMonths: req.body.maxTermMonths
  });

  await writeAuditLog({ actor: req.user, action: 'INSURANCE_PRODUCT_CREATED', targetType: 'InsuranceProduct', targetId: product._id, after: product.toJSON(), req });

  return new ApiResponse(201, 'Insurance product created', { product: serializeMoneyFields(product, ['minSumInsured', 'maxSumInsured']) }).send(res);
});

const listProducts = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;
  else if (req.user.role === 'customer') filter.status = 'active'; // customers only browse active products by default
  const products = await InsuranceProduct.find(filter).sort({ name: 1 });
  return new ApiResponse(200, 'Insurance products fetched', { products: products.map((p) => serializeMoneyFields(p, ['minSumInsured', 'maxSumInsured'])) }).send(res);
});

const updateProductStatus = asyncHandler(async (req, res) => {
  const product = await InsuranceProduct.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Insurance product not found');
  const before = product.toJSON();
  product.status = req.body.status;
  await product.save();
  await writeAuditLog({ actor: req.user, action: 'INSURANCE_PRODUCT_UPDATED', targetType: 'InsuranceProduct', targetId: product._id, before, after: product.toJSON(), req });
  return new ApiResponse(200, 'Insurance product updated', { product: serializeMoneyFields(product, ['minSumInsured', 'maxSumInsured']) }).send(res);
});

// ==================== POLICY APPLICATION ====================

const applyForPolicy = asyncHandler(async (req, res) => {
  const product = await InsuranceProduct.findOne({ _id: req.body.productId, status: 'active' });
  if (!product) throw new ApiError(400, 'Selected insurance product is not available');

  const account = await Account.findOne({ _id: req.body.accountId, user: req.user._id, status: 'active' });
  if (!account) throw new ApiError(400, 'A valid active account belonging to you is required');

  const sumInsured = toDecimal128(String(req.body.sumInsured));
  if (compareMoney(sumInsured, product.minSumInsured) < 0 || compareMoney(sumInsured, product.maxSumInsured) > 0) {
    throw new ApiError(400, `Sum insured must be between ${decimalToString(product.minSumInsured)} and ${decimalToString(product.maxSumInsured)} for this product`);
  }
  if (req.body.termMonths < product.minTermMonths || req.body.termMonths > product.maxTermMonths) {
    throw new ApiError(400, `Term must be between ${product.minTermMonths} and ${product.maxTermMonths} months for this product`);
  }

  // Server-calculated — never trust a client-supplied premium.
  const annualPremium = percentageOf(sumInsured, product.annualPremiumRatePercent);
  const insuranceDept = await Department.findOne({ code: 'INSURANCE' }).select('_id');
  const policyNumber = await generateYearScopedId('INS');

  const policy = await InsurancePolicy.create({
    policyNumber,
    customer: req.user._id,
    product: product._id,
    account: account._id,
    branch: account.branch || null,
    department: insuranceDept?._id || null,
    sumInsured,
    annualPremium,
    premiumFrequency: req.body.premiumFrequency || 'annually',
    termMonths: req.body.termMonths,
    nominee: req.body.nominee || {},
    status: 'submitted'
  });

  await writeAuditLog({ actor: req.user, action: 'INSURANCE_POLICY_APPLIED', targetType: 'InsurancePolicy', targetId: policy._id, after: serializePolicy(policy), req });
  await notifyCustomer(req.user._id, 'Insurance Application Submitted', `Your ${product.name} application ${policy.policyNumber} has been submitted for review.`, 'success');

  return new ApiResponse(201, 'Insurance policy application submitted', { policy: serializePolicy(policy) }).send(res);
});

const getMyPolicies = asyncHandler(async (req, res) => {
  const filter = { customer: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const policies = await InsurancePolicy.find(filter).populate('product', 'name code type').sort({ createdAt: -1 });
  return new ApiResponse(200, 'Your insurance policies fetched', { policies: policies.map(serializePolicy) }).send(res);
});

const getPolicyById = asyncHandler(async (req, res) => {
  const policy = await InsurancePolicy.findById(req.params.id).populate('product').populate('customer', 'fullName email phone');
  if (!policy) throw new ApiError(404, 'Insurance policy not found');

  if (req.user.role === 'customer') {
    if (!policy.customer._id.equals(req.user._id)) throw new ApiError(403, 'You do not have permission to view this policy');
  } else if (req.user.role === 'employee') {
    const employee = await getEmployeeScope(req.user._id);
    if (!(await canAccessResource(employee, policy, POLICY_SCOPE_FIELDS))) {
      throw new ApiError(403, 'You do not have permission to access this policy');
    }
  }

  return new ApiResponse(200, 'Insurance policy fetched', { policy: serializePolicy(policy) }).send(res);
});

const listPolicies = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.user.role === 'employee') {
    const employee = await getEmployeeScope(req.user._id);
    Object.assign(filter, await buildScopeFilter(employee, POLICY_SCOPE_FIELDS));
  }
  const policies = await InsurancePolicy.find(filter).populate('product', 'name code type').populate('customer', 'fullName email').sort({ createdAt: -1 });
  return new ApiResponse(200, 'Insurance policies fetched', { policies: policies.map(serializePolicy) }).send(res);
});

const assertEmployeeCanAccessPolicy = async (policy, userId) => {
  const employee = await getEmployeeScope(userId);
  if (!(await canAccessResource(employee, policy, POLICY_SCOPE_FIELDS))) {
    throw new ApiError(403, 'You do not have permission to access this policy');
  }
  return employee;
};

const startPolicyReview = asyncHandler(async (req, res) => {
  const policy = await InsurancePolicy.findById(req.params.id);
  if (!policy) throw new ApiError(404, 'Insurance policy not found');
  await assertEmployeeCanAccessPolicy(policy, req.user._id);
  if (policy.status !== 'submitted') throw new ApiError(400, `Cannot start review while policy is ${policy.status}`);

  const before = serializePolicy(policy);
  policy.status = 'under_review';
  policy.reviewedBy = req.user._id;
  await policy.save();
  await writeAuditLog({ actor: req.user, action: 'INSURANCE_POLICY_REVIEW_STARTED', targetType: 'InsurancePolicy', targetId: policy._id, before, after: serializePolicy(policy), req });
  return new ApiResponse(200, 'Policy review started', { policy: serializePolicy(policy) }).send(res);
});

const requestPolicyDocuments = asyncHandler(async (req, res) => {
  const policy = await InsurancePolicy.findById(req.params.id);
  if (!policy) throw new ApiError(404, 'Insurance policy not found');
  await assertEmployeeCanAccessPolicy(policy, req.user._id);
  if (policy.status !== 'under_review') throw new ApiError(400, 'Documents can only be requested while policy is under review');

  const before = serializePolicy(policy);
  policy.documentsRequested = [...new Set(req.body.documentTypes)];
  policy.status = 'documents_required';
  await policy.save();
  await writeAuditLog({ actor: req.user, action: 'INSURANCE_POLICY_DOCUMENTS_REQUESTED', targetType: 'InsurancePolicy', targetId: policy._id, before, after: serializePolicy(policy), req });
  await notifyCustomer(policy.customer, 'Documents Required', `Additional documents are required for policy application ${policy.policyNumber}: ${policy.documentsRequested.join(', ')}.`, 'warning');
  return new ApiResponse(200, 'Policy documents requested', { policy: serializePolicy(policy) }).send(res);
});

const addPolicyRemark = asyncHandler(async (req, res) => {
  const policy = await InsurancePolicy.findById(req.params.id);
  if (!policy) throw new ApiError(404, 'Insurance policy not found');
  await assertEmployeeCanAccessPolicy(policy, req.user._id);
  if (!['under_review', 'documents_required'].includes(policy.status)) throw new ApiError(400, `Remarks cannot be added while policy is ${policy.status}`);

  const before = serializePolicy(policy);
  policy.remarks.push({ text: req.body.text, by: req.user._id, at: new Date() });
  await policy.save();
  await writeAuditLog({ actor: req.user, action: 'INSURANCE_POLICY_REMARK_ADDED', targetType: 'InsurancePolicy', targetId: policy._id, before, after: serializePolicy(policy), req });
  return new ApiResponse(200, 'Remark added', { policy: serializePolicy(policy) }).send(res);
});

const forwardPolicyToManager = asyncHandler(async (req, res) => {
  const policy = await InsurancePolicy.findById(req.params.id);
  if (!policy) throw new ApiError(404, 'Insurance policy not found');
  const employee = await assertEmployeeCanAccessPolicy(policy, req.user._id);
  if (policy.status !== 'under_review') throw new ApiError(400, `Cannot forward to manager while policy is ${policy.status}`);
  if (policy.documentsRequested.length > 0) throw new ApiError(400, 'All requested documents must be submitted and verified before forwarding');
  if (!employee.manager) throw new ApiError(400, 'No manager is assigned to your employee profile');

  const before = serializePolicy(policy);
  policy.status = 'manager_review';
  await policy.save();
  await writeAuditLog({ actor: req.user, action: 'INSURANCE_POLICY_FORWARDED_TO_MANAGER', targetType: 'InsurancePolicy', targetId: policy._id, before, after: serializePolicy(policy), req });
  return new ApiResponse(200, 'Policy forwarded to manager for review', { policy: serializePolicy(policy) }).send(res);
});

const managerReviewPolicy = asyncHandler(async (req, res) => {
  const policy = await InsurancePolicy.findById(req.params.id);
  if (!policy) throw new ApiError(404, 'Insurance policy not found');
  const manager = await getEmployeeScope(req.user._id);
  if (!['manager', 'department_head', 'bank_head'].includes(manager.orgRole)) {
    throw new ApiError(403, 'Only a manager or above can perform manager-level policy review');
  }
  if (!(await canAccessResource(manager, policy, POLICY_SCOPE_FIELDS))) throw new ApiError(403, 'You do not have permission to review this policy');
  if (policy.status !== 'manager_review') throw new ApiError(400, `Cannot record a manager decision while policy is ${policy.status}`);

  const before = serializePolicy(policy);
  policy.managerReviewedBy = req.user._id;
  if (req.body.decision === 'reject') {
    policy.status = 'rejected';
    policy.remarks.push({ text: `Rejected at manager review: ${req.body.reason}`, by: req.user._id, at: new Date() });
  }
  await policy.save();
  await writeAuditLog({ actor: req.user, action: req.body.decision === 'reject' ? 'INSURANCE_POLICY_REJECTED' : 'INSURANCE_POLICY_MANAGER_APPROVED', targetType: 'InsurancePolicy', targetId: policy._id, before, after: serializePolicy(policy), req });
  if (req.body.decision === 'reject') {
    await notifyCustomer(policy.customer, 'Insurance Application Rejected', `Your policy application ${policy.policyNumber} was rejected. Reason: ${req.body.reason}`, 'error');
  }
  return new ApiResponse(200, 'Manager review recorded', { policy: serializePolicy(policy) }).send(res);
});

const approvePolicy = asyncHandler(async (req, res) => {
  const policy = await InsurancePolicy.findById(req.params.id);
  if (!policy) throw new ApiError(404, 'Insurance policy not found');
  if (policy.status !== 'manager_review') throw new ApiError(400, `Cannot issue a policy while it is ${policy.status}`);
  if (!policy.managerReviewedBy) throw new ApiError(400, 'Manager review is required before issuance');

  const before = serializePolicy(policy);
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + policy.termMonths);
  const nextDue = new Date(startDate);
  if (policy.premiumFrequency === 'monthly') nextDue.setMonth(nextDue.getMonth() + 1);
  else if (policy.premiumFrequency === 'quarterly') nextDue.setMonth(nextDue.getMonth() + 3);
  else nextDue.setFullYear(nextDue.getFullYear() + 1);

  policy.status = 'active';
  policy.finalApprovedBy = req.user._id;
  policy.startDate = startDate;
  policy.endDate = endDate;
  policy.issuedAt = startDate;
  policy.nextPremiumDueDate = nextDue;
  await policy.save();

  await writeAuditLog({ actor: req.user, action: 'INSURANCE_POLICY_ISSUED', targetType: 'InsurancePolicy', targetId: policy._id, before, after: serializePolicy(policy), req });
  await notifyCustomer(policy.customer, 'Insurance Policy Issued', `Your policy ${policy.policyNumber} is now active until ${endDate.toDateString()}.`, 'success');
  return new ApiResponse(200, 'Policy issued successfully', { policy: serializePolicy(policy) }).send(res);
});

const rejectPolicy = asyncHandler(async (req, res) => {
  const policy = await InsurancePolicy.findById(req.params.id);
  if (!policy) throw new ApiError(404, 'Insurance policy not found');
  if (!['under_review', 'documents_required', 'manager_review'].includes(policy.status)) {
    throw new ApiError(400, `Cannot reject a policy while it is ${policy.status}`);
  }
  const before = serializePolicy(policy);
  policy.status = 'rejected';
  policy.remarks.push({ text: `Rejected: ${req.body.reason}`, by: req.user._id, at: new Date() });
  await policy.save();
  await writeAuditLog({ actor: req.user, action: 'INSURANCE_POLICY_REJECTED', targetType: 'InsurancePolicy', targetId: policy._id, before, after: serializePolicy(policy), req });
  await notifyCustomer(policy.customer, 'Insurance Application Rejected', `Your policy application ${policy.policyNumber} was rejected. Reason: ${req.body.reason}`, 'error');
  return new ApiResponse(200, 'Policy rejected', { policy: serializePolicy(policy) }).send(res);
});

// ==================== POLICY DOCUMENTS ====================

const uploadPolicyDocument = asyncHandler(async (req, res) => {
  const policy = await InsurancePolicy.findById(req.params.id);
  if (!policy) throw new ApiError(404, 'Insurance policy not found');
  if (!policy.customer.equals(req.user._id)) throw new ApiError(403, 'You can only upload documents to your own policy application');
  if (!['submitted', 'under_review', 'documents_required'].includes(policy.status)) throw new ApiError(400, `Documents cannot be uploaded while policy is ${policy.status}`);

  const mimeType = String(req.headers['content-type'] || '').split(';')[0].toLowerCase();
  const documentType = String(req.headers['x-document-type'] || '').trim();
  let fileName = String(req.headers['x-file-name'] || '').trim();
  try { fileName = decodeURIComponent(fileName); } catch (_) { /* keep raw */ }
  if (!DOCUMENT_TYPES.includes(documentType)) throw new ApiError(400, 'Invalid document type');

  const document = await saveDocument({
    ownerId: req.user._id,
    applicationType: 'insurance_policy',
    applicationId: policy._id,
    documentType,
    mimeType,
    fileName,
    buffer: req.body
  });

  policy.documents = [...new Set([...policy.documents.map(String), String(document._id)])];
  await policy.save();

  await writeAuditLog({ actor: req.user, action: 'INSURANCE_POLICY_DOCUMENT_UPLOADED', targetType: 'Document', targetId: document._id, after: { policy: policy._id, type: document.type, fileName: document.fileName }, req });
  return new ApiResponse(201, 'Document uploaded successfully', { document: document.toJSON() }).send(res);
});

const downloadPolicyDocument = asyncHandler(async (req, res) => {
  const policy = await InsurancePolicy.findById(req.params.id);
  if (!policy) throw new ApiError(404, 'Insurance policy not found');
  if (req.user.role === 'customer' && !policy.customer.equals(req.user._id)) throw new ApiError(403, 'You do not have permission to access this document');
  if (req.user.role === 'employee') await assertEmployeeCanAccessPolicy(policy, req.user._id);

  const document = await Document.findOne({ _id: req.params.documentId, applicationType: 'insurance_policy', application: policy._id }).select('+storageReference');
  if (!document) throw new ApiError(404, 'Document not found');

  const file = await readDocumentFile(document);
  res.setHeader('Content-Type', document.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${document.fileName.replace(/["\\\r\n]/g, '')}"`);
  return res.status(200).send(file);
});

const verifyPolicyDocument = asyncHandler(async (req, res) => {
  const policy = await InsurancePolicy.findById(req.params.id);
  if (!policy) throw new ApiError(404, 'Insurance policy not found');
  await assertEmployeeCanAccessPolicy(policy, req.user._id);

  const document = await Document.findOne({ _id: req.params.documentId, applicationType: 'insurance_policy', application: policy._id, owner: policy.customer });
  if (!document) throw new ApiError(404, 'Document not found');
  if (document.status === 'verified') throw new ApiError(400, 'Document is already verified');

  document.status = 'verified';
  document.verifiedBy = req.user._id;
  document.verifiedAt = new Date();
  await document.save();

  const before = serializePolicy(policy);
  if (policy.status === 'documents_required' && policy.documentsRequested.length > 0) {
    const docs = await Document.find({ _id: { $in: policy.documents }, applicationType: 'insurance_policy', application: policy._id });
    const allVerified = policy.documentsRequested.every((type) => docs.some((d) => d.type === type && d.status === 'verified'));
    if (allVerified) {
      policy.status = 'under_review';
      policy.documentsRequested = [];
      await policy.save();
    }
  }

  await writeAuditLog({ actor: req.user, action: 'INSURANCE_POLICY_DOCUMENT_VERIFIED', targetType: 'Document', targetId: document._id, before, after: serializePolicy(policy), req });
  return new ApiResponse(200, 'Document verified', { policy: serializePolicy(policy) }).send(res);
});

// ==================== CLAIMS ====================

const fileClaim = asyncHandler(async (req, res) => {
  const policy = await InsurancePolicy.findOne({ _id: req.body.policyId, customer: req.user._id, status: 'active' });
  if (!policy) throw new ApiError(400, 'A valid active policy belonging to you is required to file a claim');
  if (policy.endDate && policy.endDate < new Date()) throw new ApiError(400, 'This policy has expired and cannot accept new claims');

  const claimAmount = toDecimal128(String(req.body.claimAmount));
  if (compareMoney(claimAmount, policy.sumInsured) > 0) {
    throw new ApiError(400, `Claim amount cannot exceed the policy's sum insured (${decimalToString(policy.sumInsured)})`);
  }

  const claimNumber = await generateYearScopedId('CLM');
  const claim = await InsuranceClaim.create({
    claimNumber,
    policy: policy._id,
    customer: req.user._id,
    branch: policy.branch,
    department: policy.department,
    incidentDate: req.body.incidentDate,
    description: req.body.description,
    claimAmount,
    status: 'submitted'
  });

  await writeAuditLog({ actor: req.user, action: 'INSURANCE_CLAIM_FILED', targetType: 'InsuranceClaim', targetId: claim._id, after: serializeClaim(claim), req });
  await notifyCustomer(req.user._id, 'Insurance Claim Filed', `Your claim ${claim.claimNumber} against policy ${policy.policyNumber} has been submitted.`, 'success');
  return new ApiResponse(201, 'Insurance claim filed successfully', { claim: serializeClaim(claim) }).send(res);
});

const getMyClaims = asyncHandler(async (req, res) => {
  const filter = { customer: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const claims = await InsuranceClaim.find(filter).populate('policy', 'policyNumber product').sort({ createdAt: -1 });
  return new ApiResponse(200, 'Your claims fetched', { claims: claims.map(serializeClaim) }).send(res);
});

const listClaims = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.user.role === 'employee') {
    const employee = await getEmployeeScope(req.user._id, 'insurance.claim.review');
    Object.assign(filter, await buildScopeFilter(employee, POLICY_SCOPE_FIELDS));
  }
  const claims = await InsuranceClaim.find(filter).populate('policy', 'policyNumber').populate('customer', 'fullName email').sort({ createdAt: -1 });
  return new ApiResponse(200, 'Claims fetched', { claims: claims.map(serializeClaim) }).send(res);
});

const getClaimById = asyncHandler(async (req, res) => {
  const claim = await InsuranceClaim.findById(req.params.id).populate('policy').populate('customer', 'fullName email phone');
  if (!claim) throw new ApiError(404, 'Insurance claim not found');
  if (req.user.role === 'customer') {
    if (!claim.customer._id.equals(req.user._id)) throw new ApiError(403, 'You do not have permission to view this claim');
  } else if (req.user.role === 'employee') {
    const employee = await getEmployeeScope(req.user._id, 'insurance.claim.review');
    if (!(await canAccessResource(employee, claim, POLICY_SCOPE_FIELDS))) throw new ApiError(403, 'You do not have permission to access this claim');
  }
  return new ApiResponse(200, 'Claim fetched', { claim: serializeClaim(claim) }).send(res);
});

const assertEmployeeCanAccessClaim = async (claim, userId) => {
  const employee = await getEmployeeScope(userId, 'insurance.claim.review');
  if (!(await canAccessResource(employee, claim, POLICY_SCOPE_FIELDS))) throw new ApiError(403, 'You do not have permission to access this claim');
  return employee;
};

const startClaimReview = asyncHandler(async (req, res) => {
  const claim = await InsuranceClaim.findById(req.params.id);
  if (!claim) throw new ApiError(404, 'Insurance claim not found');
  await assertEmployeeCanAccessClaim(claim, req.user._id);
  if (claim.status !== 'submitted') throw new ApiError(400, `Cannot start review while claim is ${claim.status}`);

  const before = serializeClaim(claim);
  claim.status = 'under_review';
  claim.reviewedBy = req.user._id;
  await claim.save();
  await writeAuditLog({ actor: req.user, action: 'INSURANCE_CLAIM_REVIEW_STARTED', targetType: 'InsuranceClaim', targetId: claim._id, before, after: serializeClaim(claim), req });
  return new ApiResponse(200, 'Claim review started', { claim: serializeClaim(claim) }).send(res);
});

const forwardClaimToManager = asyncHandler(async (req, res) => {
  const claim = await InsuranceClaim.findById(req.params.id);
  if (!claim) throw new ApiError(404, 'Insurance claim not found');
  const employee = await assertEmployeeCanAccessClaim(claim, req.user._id);
  if (claim.status !== 'under_review') throw new ApiError(400, `Cannot forward to manager while claim is ${claim.status}`);
  if (!employee.manager) throw new ApiError(400, 'No manager is assigned to your employee profile');

  const before = serializeClaim(claim);
  claim.status = 'manager_review';
  await claim.save();
  await writeAuditLog({ actor: req.user, action: 'INSURANCE_CLAIM_FORWARDED_TO_MANAGER', targetType: 'InsuranceClaim', targetId: claim._id, before, after: serializeClaim(claim), req });
  return new ApiResponse(200, 'Claim forwarded to manager', { claim: serializeClaim(claim) }).send(res);
});

const managerReviewClaim = asyncHandler(async (req, res) => {
  const claim = await InsuranceClaim.findById(req.params.id);
  if (!claim) throw new ApiError(404, 'Insurance claim not found');
  const manager = await getEmployeeScope(req.user._id, 'insurance.claim.review');
  if (!['manager', 'department_head', 'bank_head'].includes(manager.orgRole)) throw new ApiError(403, 'Only a manager or above can perform manager-level claim review');
  if (!(await canAccessResource(manager, claim, POLICY_SCOPE_FIELDS))) throw new ApiError(403, 'You do not have permission to review this claim');
  if (claim.status !== 'manager_review') throw new ApiError(400, `Cannot record a manager decision while claim is ${claim.status}`);

  const before = serializeClaim(claim);
  claim.managerReviewedBy = req.user._id;
  if (req.body.decision === 'reject') {
    claim.status = 'rejected';
    claim.remarks.push({ text: `Rejected at manager review: ${req.body.reason}`, by: req.user._id, at: new Date() });
  }
  await claim.save();
  await writeAuditLog({ actor: req.user, action: req.body.decision === 'reject' ? 'INSURANCE_CLAIM_REJECTED' : 'INSURANCE_CLAIM_MANAGER_APPROVED', targetType: 'InsuranceClaim', targetId: claim._id, before, after: serializeClaim(claim), req });
  if (req.body.decision === 'reject') {
    await notifyCustomer(claim.customer, 'Insurance Claim Rejected', `Your claim ${claim.claimNumber} was rejected. Reason: ${req.body.reason}`, 'error');
  }
  return new ApiResponse(200, 'Manager review recorded', { claim: serializeClaim(claim) }).send(res);
});

const approveClaim = asyncHandler(async (req, res) => {
  const claim = await InsuranceClaim.findById(req.params.id);
  if (!claim) throw new ApiError(404, 'Insurance claim not found');
  if (claim.status !== 'manager_review') throw new ApiError(400, `Cannot approve a claim while it is ${claim.status}`);
  if (!claim.managerReviewedBy) throw new ApiError(400, 'Manager review is required before final approval');

  const approvedAmount = toDecimal128(String(req.body.approvedAmount || decimalToString(claim.claimAmount)));
  if (compareMoney(approvedAmount, claim.claimAmount) > 0) throw new ApiError(400, 'Approved amount cannot exceed the claimed amount');
  if (compareMoney(approvedAmount, '0.00') <= 0) throw new ApiError(400, 'Approved amount must be greater than zero');

  const before = serializeClaim(claim);
  claim.approvedAmount = approvedAmount;
  claim.finalApprovedBy = req.user._id;
  claim.status = 'approved';
  await claim.save();
  await writeAuditLog({ actor: req.user, action: 'INSURANCE_CLAIM_APPROVED', targetType: 'InsuranceClaim', targetId: claim._id, before, after: serializeClaim(claim), req });
  await notifyCustomer(claim.customer, 'Insurance Claim Approved', `Your claim ${claim.claimNumber} has been approved for ${decimalToString(approvedAmount)} INR.`, 'success');
  return new ApiResponse(200, 'Claim approved', { claim: serializeClaim(claim) }).send(res);
});

const rejectClaim = asyncHandler(async (req, res) => {
  const claim = await InsuranceClaim.findById(req.params.id);
  if (!claim) throw new ApiError(404, 'Insurance claim not found');
  if (!['under_review', 'manager_review'].includes(claim.status)) throw new ApiError(400, `Cannot reject a claim while it is ${claim.status}`);

  const before = serializeClaim(claim);
  claim.status = 'rejected';
  claim.remarks.push({ text: `Rejected: ${req.body.reason}`, by: req.user._id, at: new Date() });
  await claim.save();
  await writeAuditLog({ actor: req.user, action: 'INSURANCE_CLAIM_REJECTED', targetType: 'InsuranceClaim', targetId: claim._id, before, after: serializeClaim(claim), req });
  await notifyCustomer(claim.customer, 'Insurance Claim Rejected', `Your claim ${claim.claimNumber} was rejected. Reason: ${req.body.reason}`, 'error');
  return new ApiResponse(200, 'Claim rejected', { claim: serializeClaim(claim) }).send(res);
});

const settleClaim = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let result;
    let notificationPayload;
    await session.withTransaction(async () => {
      const claim = await InsuranceClaim.findById(req.params.id).session(session);
      if (!claim) throw new ApiError(404, 'Insurance claim not found');
      if (claim.status !== 'approved') throw new ApiError(400, `Only approved claims can be settled; current status is ${claim.status}`);

      const policy = await InsurancePolicy.findById(claim.policy).session(session);
      const account = await Account.findById(policy.account).session(session);
      if (!account || account.status !== 'active') throw new ApiError(400, 'Claim settlement account is not active');

      const before = { status: claim.status, accountBalance: decimalToString(account.balance) };
      account.balance = require('../utils/money').addMoney(account.balance, claim.approvedAmount);
      await account.save({ session });

      const crypto = require('crypto');
      const Transaction = require('../models/Transaction');
      const [transaction] = await Transaction.create([{
        operationId: crypto.randomUUID(),
        account: account._id,
        type: 'deposit',
        amount: claim.approvedAmount,
        balanceAfter: account.balance,
        currency: account.currency,
        description: `Insurance claim settlement ${claim.claimNumber}`,
        status: 'success',
        performedBy: req.user._id
      }], { session });

      claim.status = 'settled';
      claim.settledAt = new Date();
      await claim.save({ session });

      await writeAuditLog({
        actor: req.user, action: 'INSURANCE_CLAIM_SETTLED', targetType: 'InsuranceClaim', targetId: claim._id,
        before, after: { status: claim.status, transactionId: transaction._id, accountBalance: decimalToString(account.balance) }, req, session
      });

      result = claim;
      notificationPayload = { user: claim.customer, claimNumber: claim.claimNumber, amount: decimalToString(claim.approvedAmount), accountNumber: account.accountNumber };
    });

    await notifyCustomer(notificationPayload.user, 'Insurance Claim Settled', `${notificationPayload.amount} INR has been settled for claim ${notificationPayload.claimNumber} to account ${notificationPayload.accountNumber}.`, 'success');
    return new ApiResponse(200, 'Claim settled successfully', { claim: serializeClaim(result) }).send(res);
  } finally {
    await session.endSession();
  }
});

module.exports = {
  createProduct, listProducts, updateProductStatus,
  applyForPolicy, getMyPolicies, getPolicyById, listPolicies,
  startPolicyReview, requestPolicyDocuments, addPolicyRemark, forwardPolicyToManager, managerReviewPolicy, approvePolicy, rejectPolicy,
  uploadPolicyDocument, downloadPolicyDocument, verifyPolicyDocument,
  fileClaim, getMyClaims, listClaims, getClaimById, startClaimReview, forwardClaimToManager, managerReviewClaim, approveClaim, rejectClaim, settleClaim
};
