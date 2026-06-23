const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

module.exports = {
  getLogin: (req, res) => res.render('auth/login', { title: 'Login' }),
  getSignup: (req, res) => res.render('auth/login', { title: 'Sign Up' }),

  postSignup: async (req, res) => {
    try {
      const { username, email, password, confirmPassword } = req.body;
      if (!username || !email || !password) return res.status(400).render('auth/signup', { error: 'Missing fields' });
      if (password !== confirmPassword) return res.status(400).render('auth/signup', { error: 'Passwords do not match' });
      let user = await User.findOne({ $or: [{ email }, { username }] });
      if (user) return res.status(400).render('auth/signup', { error: 'User already exists' });
      user = new User({ username, email, password, editsLeft: 1 });
      await user.save();
      // issue JWT
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'jwt_secret', { expiresIn: '7d' });
      res.cookie('npl_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
      // send verification email
      const verifyUrl = `${req.protocol}://${req.get('host')}/verify/${user.verificationToken}`;
      await transporter.sendMail({ from: process.env.SMTP_FROM, to: user.email, subject: 'Verify your NPL account', text: `Verify: ${verifyUrl}` });
      req.login(user, (err) => {
        if (err) console.error(err);
        res.redirect('/dashboard');
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('auth/signup', { error: 'Server error' });
    }
  },

  postLogin: async (req, res, next) => {
    // passport local strategy would normally handle this; simplified for now
    const { identifier, password } = req.body; // identifier can be email or username
    try {
      const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
      if (!user) return res.status(400).render('auth/login', { error: 'Invalid credentials' });
      const valid = await user.comparePassword(password);
      if (!valid) return res.status(400).render('auth/login', { error: 'Invalid credentials' });
      req.login(user, (err) => {
        if (err) return next(err);
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'jwt_secret', { expiresIn: '7d' });
        res.cookie('npl_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        res.redirect('/dashboard');
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('auth/login', { error: 'Server error' });
    }
  },

  logout: (req, res) => {
    req.logout(() => {
      req.session.destroy(() => res.clearCookie('connect.sid').redirect('/'));
    });
  },

  verifyEmail: async (req, res) => {
    try {
      const user = await User.findOne({ verificationToken: req.params.token });
      if (!user) return res.status(400).render('errors/400', { error: 'Invalid token' });
      user.isVerified = true;
      user.verificationToken = null;
      await user.save();
      res.render('auth/verified', { title: 'Verified' });
    } catch (err) {
      console.error(err);
      res.status(500).render('errors/500', { error: err });
    }
  },

  getForgot: (req, res) => res.render('auth/forgot', { title: 'Forgot Password' }),

  postForgot: async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.render('auth/forgot', { message: 'If that email exists, a reset link was sent.' });
      const token = crypto.randomBytes(20).toString('hex');
      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      await user.save();
      const resetUrl = `${req.protocol}://${req.get('host')}/reset/${token}`;
      await transporter.sendMail({ from: process.env.SMTP_FROM, to: user.email, subject: 'Reset your password', text: `Reset: ${resetUrl}` });
      res.render('auth/forgot', { message: 'If that email exists, a reset link was sent.' });
    } catch (err) {
      console.error(err);
      res.status(500).render('auth/forgot', { error: 'Server error' });
    }
  },

  getReset: async (req, res) => {
    const user = await User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } });
    if (!user) return res.render('auth/forgot', { error: 'Invalid or expired token' });
    res.render('auth/reset', { token: req.params.token });
  },

  postReset: async (req, res) => {
    try {
      const { token } = req.params;
      const { password, confirmPassword } = req.body;
      if (password !== confirmPassword) return res.render('auth/reset', { error: 'Passwords do not match', token });
      const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
      if (!user) return res.render('auth/forgot', { error: 'Invalid or expired token' });
      user.password = password;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();
      res.render('auth/reset-success');
    } catch (err) {
      console.error(err);
      res.status(500).render('errors/500', { error: err });
    }
  }
};
