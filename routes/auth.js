const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/authController');
const { ensureGuest } = require('../middleware/auth');

router.get('/', (req, res) => {
  res.render('auth/authorize');
});

router.get('/login', ensureGuest, authController.getLogin);
router.get('/signup', ensureGuest, authController.getSignup);
router.post('/signup', authController.postSignup);
router.post('/login', authController.postLogin);
router.post('/logout', authController.logout);

// Google OAuth
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
  res.redirect('/dashboard');
});

// Email verification
router.get('/verify/:token', authController.verifyEmail);

// Forgot/reset
router.get('/forgot', authController.getForgot);
router.post('/forgot', authController.postForgot);
router.get('/reset/:token', authController.getReset);
router.post('/reset/:token', authController.postReset);

module.exports = router;
