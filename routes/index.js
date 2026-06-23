const express = require('express');
const router = express.Router();
const User = require('../models/User');

const path = require('path');

// Home: if authenticated redirect to dashboard, else show landing
router.get('/', (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  return res.render('public/landing');
});

// Terms & Privacy
router.get('/terms_privacy', (req, res) => res.render('public/terms_policy'));

// Public profile
router.get('/@:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).render('errors/404');
    if (user.paused && (!user.pauseUntil || user.pauseUntil > Date.now())) {
      return res.render('public/paused', { user });
    }
    res.render('public/profile', { user });
  } catch (err) {
    console.error(err);
    res.status(500).render('errors/500', { error: err });
  }
});

module.exports = router;
