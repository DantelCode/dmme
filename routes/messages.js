const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { messageLimiter } = require('../middleware/rateLimiter');
const { sanitizeBody } = require('../middleware/sanitizer');
const { ensureAuthenticated } = require('../middleware/auth');

router.post('/send/:username', messageLimiter, sanitizeBody(['text']), messageController.sendMessage);

// return unread count for authenticated user
router.get('/unread', ensureAuthenticated, messageController.unreadCount);

module.exports = router;
