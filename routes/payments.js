const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { ensureAuthenticated } = require('../middleware/auth');

router.post('/initiate', ensureAuthenticated, paymentController.initiate);
router.get('/verify', ensureAuthenticated, paymentController.verify);
router.post('/verify', ensureAuthenticated, paymentController.verify);

module.exports = router;
