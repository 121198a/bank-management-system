const { body, param } = require('express-validator');

// NOTE: We intentionally do NOT use express-validator's normalizeEmail().
// normalizeEmail() silently rewrites addresses (e.g. stripping dots/plus-tags
// on Gmail-style domains, lowercasing inconsistently with the Mongoose schema's
// `lowercase: true` option). That mismatch between what gets validated and what
// gets saved/queried is a common hidden cause of "correct credentials but login
// fails" bugs. Instead we do a simple, predictable lowercase+trim that exactly
// matches the User schema's own normalization, so the same string is always
// used for both storage and lookup.
const normalizeEmailSimple = (value) => value.trim().toLowerCase();

const registerValidator = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .customSanitizer(normalizeEmailSimple),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 12 }).withMessage('Password must be at least 12 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isMobilePhone('any').withMessage('Please provide a valid phone number'),
  body('address')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 250 }).withMessage('Address cannot exceed 250 characters')
];

const loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .customSanitizer(normalizeEmailSimple),
  body('password').notEmpty().withMessage('Password is required')
];

const forgotPasswordValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .customSanitizer(normalizeEmailSimple)
];

const resetPasswordValidator = [
  param('token').notEmpty().withMessage('Reset token is required'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 12 }).withMessage('Password must be at least 12 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
];

module.exports = {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator
};
