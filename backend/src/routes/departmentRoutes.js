const express = require('express');

const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const Department = require('../models/Department');

const router = express.Router();

router.use(authenticate);

/*
 * Department listing is intentionally permission-based.
 * The existing RBAC middleware remains the source of truth.
 */
router.get('/', authorize('admin'), async (_req, res, next) => {
  try {
    const departments = await Department.find({ status: 'active' })
      .populate('head', 'fullName email')
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      departments
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
