const User = require('../models/User');
const Message = require('../models/Message');
const Payment = require('../models/Payment');

module.exports = {
  updateProfile: async (req, res) => {
    try {
      const user = req.user;
      const { username, email, notificationsEnabled } = req.body;
      if (username && username !== user.username) {
        if (user.editsLeft <= 0) return res.render('dashboard/settings', { error: 'No edits left', user });
        const exists = await User.findOne({ username });
        if (exists) return res.render('dashboard/settings', { error: 'Username taken', user });
        user.username = username;
        user.profileLink = `@${username}`;
        user.editsLeft = Math.max(0, user.editsLeft - 1);
      }
      if (email && email !== user.email) user.email = email;
      user.notificationsEnabled = notificationsEnabled === 'on';
      if (req.file) {
        user.profilePhoto = `/uploads/${req.file.filename}`;
      }
      await user.save();
      res.redirect('/dashboard/settings');
    } catch (err) {
      console.error(err);
      res.status(500).render('errors/500', { error: err });
    }
  },

  updateTheme: async (req, res) => {
    try {
      const { theme } = req.body;
      const user = req.user;
      if (['light', 'dark'].includes(theme)) {
        user.theme = theme;
        await user.save();
      }
      res.json({ success: true, theme: user.theme });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  },

  pauseLink: async (req, res) => {
    try {
      const { type } = req.body; // forever, 1h,6h,24h
      const user = req.user;
      if (type === 'forever') {
        user.paused = true;
        user.pauseUntil = null;
      } else if (type === '1h') {
        user.paused = true;
        user.pauseUntil = Date.now() + 1000 * 60 * 60;
      } else if (type === '6h') {
        user.paused = true;
        user.pauseUntil = Date.now() + 1000 * 60 * 60 * 6;
      } else if (type === '24h') {
        user.paused = true;
        user.pauseUntil = Date.now() + 1000 * 60 * 60 * 24;
      } else if (type === 'resume') {
        user.paused = false;
        user.pauseUntil = null;
      }
      await user.save();
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
,
  updateMode: async (req, res) => {
    try {
      const { mode, text, tagClass } = req.body;
      const user = req.user;
      const allowed = ['default','confessions','3words'];
      if (!allowed.includes(mode)) return res.status(400).json({ error: 'Invalid mode' });
      user.selectedMode = mode;
      user.selectedModeText = (typeof text === 'string') ? text : '';
      user.selectedTagClass = (typeof tagClass === 'string') ? tagClass : '';
      await user.save();
      res.json({ success: true, mode: user.selectedMode });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  , toggleNotifications: async (req, res) => {
    try {
      const { enabled } = req.body; // 'true' or 'false'
      const user = req.user;
      user.notificationsEnabled = (enabled === 'true' || enabled === true);
      await user.save();
      res.json({ success: true, notificationsEnabled: user.notificationsEnabled });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  },

  deleteAccount: async (req, res) => {
    try {
      const user = req.user;
      // remove related data
      await Message.deleteMany({ recipient: user._id });
      await Payment.deleteMany({ user: user._id });
      await User.deleteOne({ _id: user._id });
      // logout and destroy session
      req.logout(() => {
        req.session.destroy(() => res.clearCookie('connect.sid').redirect('/'));
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
};
