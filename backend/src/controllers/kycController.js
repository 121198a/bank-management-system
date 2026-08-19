const mongoose = require('mongoose');
const KYCRequest = require('../models/KYCRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { writeAuditLog } = require('../middleware/auditLogger');
const { sendKycStatusEmail } = require('../services/emailService');
const { escapeRegex } = require('../utils/sanitize');

const submitKyc = asyncHandler(async (req, res) => {
  try {
    const kycRequest = await KYCRequest.create({
      user: req.user._id,
      documentType: req.body.documentType,
      documentNumber: req.body.documentNumber,
      documentUrl: req.body.documentUrl || ''
    });

    await Notification.create({ user: req.user._id, title: 'KYC Submitted', message: 'Your KYC documents have been submitted and are pending review. We will notify you once reviewed.', type: 'info' });
    await writeAuditLog({ actor: req.user, action: 'KYC_SUBMITTED', targetType: 'KYCRequest', targetId: kycRequest._id, after: kycRequest.toObject(), req });
    return new ApiResponse(201, 'KYC submitted successfully. Awaiting review.', { kycRequest }).send(res);
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'You already have a KYC request pending review');
    throw err;
  }
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
    const searchRegex = new RegExp(escapeRegex(req.query.search), 'i');
    const matchingUsers = await User.find({ $or: [{ fullName: searchRegex }, { email: searchRegex }] }).select('_id').limit(1000);
    filter.$or = [{ documentNumber: searchRegex }, { user: { $in: matchingUsers.map((u) => u._id) } }];
  }

  const [kycRequests, total] = await Promise.all([
    KYCRequest.find(filter).populate('user', 'fullName email kycStatus').populate('reviewedBy', 'fullName email').sort({ createdAt: -1 }).skip(skip).limit(limit),
    KYCRequest.countDocuments(filter)
  ]);
  return new ApiResponse(200, 'KYC requests fetched successfully', { kycRequests }, { page, limit, total, totalPages: Math.ceil(total / limit) }).send(res);
});

const reviewKycRequest = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  let emailPayload;
  let result;
  try {
    await session.withTransaction(async () => {
      const kycRequest = await KYCRequest.findById(req.params.id).populate('user', 'fullName email').session(session);
      if (!kycRequest) throw new ApiError(404, 'KYC request not found');
      if (kycRequest.status !== 'pending') throw new ApiError(400, `KYC request has already been ${kycRequest.status}`);

      const before = kycRequest.toObject();
      kycRequest.status = req.body.status;
      kycRequest.reviewedBy = req.user._id;
      kycRequest.remarks = req.body.remarks || '';
      await kycRequest.save({ session });

      const userKycStatus = req.body.status === 'approved' ? 'verified' : 'rejected';
      await User.findByIdAndUpdate(kycRequest.user._id, { kycStatus: userKycStatus }, { session });
      await Notification.create([{
        user: kycRequest.user._id,
        title: `KYC ${req.body.status === 'approved' ? 'Approved' : 'Rejected'}`,
        message: `Your KYC verification has been ${req.body.status}.${req.body.remarks ? ' Remarks: ' + req.body.remarks : ''}`,
        type: req.body.status === 'approved' ? 'success' : 'error'
      }], { session });
      await writeAuditLog({ actor: req.user, action: 'KYC_' + req.body.status.toUpperCase(), targetType: 'KYCRequest', targetId: kycRequest._id, before, after: kycRequest.toObject(), req, session });
      result = kycRequest;
      emailPayload = { user: kycRequest.user._id, email: kycRequest.user.email, fullName: kycRequest.user.fullName, status: req.body.status, remarks: req.body.remarks || '' };
    });
  } finally {
    await session.endSession();
  }

  try {
    await Notification.create({ user: result.user, title: `KYC ${emailPayload.status === 'approved' ? 'Approved' : 'Rejected'}`, message: `Your KYC verification has been ${emailPayload.status}.${emailPayload.remarks ? ' Remarks: ' + emailPayload.remarks : ''}`, type: emailPayload.status === 'approved' ? 'success' : 'error' });
  } catch (notificationError) { console.error(`KYC notification failed: ${notificationError.message}`); }
  try { await sendKycStatusEmail(emailPayload.email, emailPayload.fullName, emailPayload.status, emailPayload.remarks); } catch (emailError) { console.error(`KYC email failed: ${emailError.message}`); }
  return new ApiResponse(200, `KYC request ${req.body.status} successfully`, { kycRequest: result }).send(res);
});

module.exports = { submitKyc, getMyKyc, listKycRequests, reviewKycRequest };
