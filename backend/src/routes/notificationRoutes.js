const express = require('express');
const { getNotifications, markAsRead, markAllAsRead, deleteNotification } = require('../controllers/notificationController');
const authenticate = require('../middleware/auth');
const { param, query } = require('express-validator');
const validate = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

router.get('/', [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })], validate, getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', [param('id').isMongoId().withMessage('Invalid notification ID')], validate, markAsRead);
router.delete('/:id', [param('id').isMongoId().withMessage('Invalid notification ID')], validate, deleteNotification);

module.exports = router;
