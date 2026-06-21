const KYCRequest = require('../models/KYCRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { writeAuditLog } = require('../middleware/auditLogger');
const { sendKycStatusEmail } = require('../services/emailService');

const submitKyc = asyncHandler(async (req, res) => {
  const { documentType, documentNumber, documentUrl } = req.body;

  const existingPending = await KYCRequest.findOne({
    user: req.user._id,
    status: 'pending'
  });

  if (existingPending) {
    throw new ApiError(409, 'You already have a KYC request pending review');
  }

  const kycRequest = await KYCRequest.create({
    user: req.user._id,
    documentType,
    documentNumber,
    documentUrl: documentUrl || ''
  });

  await Notification.create({
    user: req.user._id,
    title: 'KYC Submitted',
    message: 'Your KYC documents have been submitted and are pending review. We will notify you once reviewed.',
    type: 'info'
  });

  await writeAuditLog({
    actor: req.user,
    action: 'KYC_SUBMITTED',
    targetType: 'KYCRequest',
    targetId: kycRequest._id,
    after: kycRequest.toObject(),
    req
  });

  return new ApiResponse(201, 'KYC submitted successfully. Awaiting review.', { kycRequest }).send(res);
});

const getMyKyc = asyncHandler(async (req, res) => {
  const kycRequests = await KYCRequest.find({ user: req.user._id }).sort({ createdAt: -1 });
  return new ApiResponse(200, 'KYC requests fetched successfully', { kycRequests }).send(res);
});

const listKycRequests = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    const matchingUsers = await User.find({
      $or: [{ fullName: searchRegex }, { email: searchRegex }]
    }).select('_id');
    filter.$or = [
      { documentNumber: searchRegex },
      { user: { $in: matchingUsers.map((u) => u._id) } }
    ];
  }

  const [kycRequests, total] = await Promise.all([
    KYCRequest.find(filter)
      .populate('user', 'fullName email kycStatus')
      .populate('reviewedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    KYCRequest.countDocuments(filter)
  ]);

  return new ApiResponse(
    200,
    'KYC requests fetched successfully',
    { kycRequests },
    { page, limit, total, totalPages: Math.ceil(total / limit) }
  ).send(res);
});

const reviewKycRequest = asyncHandler(async (req, res) => {
  const { status, remarks } = req.body;

  const kycRequest = await KYCRequest.findById(req.params.id).populate('user', 'fullName email');

  if (!kycRequest) {
    throw new ApiError(404, 'KYC request not found');
  }

  if (kycRequest.status !== 'pending') {
    throw new ApiError(400, `KYC request has already been ${kycRequest.status}`);
  }

  const before = kycRequest.toObject();

  kycRequest.status = status;
  kycRequest.reviewedBy = req.user._id;
  kycRequest.remarks = remarks || '';
  await kycRequest.save();

  const userKycStatus = status === 'approved' ? 'verified' : 'rejected';
  await User.findByIdAndUpdate(kycRequest.user._id, { kycStatus: userKycStatus });

  await Notification.create({
    user: kycRequest.user._id,
    title: `KYC ${status === 'approved' ? 'Approved' : 'Rejected'}`,
    message: `Your KYC verification has been ${status}.${remarks ? ' Remarks: ' + remarks : ''}`,
    type: status === 'approved' ? 'success' : 'error'
  });

  await sendKycStatusEmail(kycRequest.user.email, kycRequest.user.fullName, status, remarks);

  await writeAuditLog({
    actor: req.user,
    action: 'KYC_' + status.toUpperCase(),
    targetType: 'KYCRequest',
    targetId: kycRequest._id,
    before,
    after: kycRequest.toObject(),
    req
  });

  return new ApiResponse(200, 'KYC request ' + status + ' successfully', { kycRequest }).send(res);
});

module.exports = { submitKyc, getMyKyc, listKycRequests, reviewKycRequest };
