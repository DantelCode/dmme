const Message = require('../models/Message');
const User = require('../models/User');

module.exports = {
  home: async (req, res) => {
    try {
      const user = req.user;
      const total = await Message.countDocuments({ recipient: user._id });
      const unread = await Message.countDocuments({ recipient: user._id, read: false });
      const messages = await Message.find({ recipient: user._id }).sort({ createdAt: -1 }).limit(3).lean();
      res.render('dashboard/home', { user, stats: { total, unread }, messages });
    } catch (err) {
      console.error(err);
      res.status(500).render('errors/500', { error: err });
    }
  },

  profile: async (req, res) => {
    let success = null;
    if (req.query.payment === 'success') {
      success = 'Payment successful! Your edits have been added.';
    } else if (req.query.saved === '1') {
      success = 'Profile updated successfully.';
    }
    const error = req.query.error ? decodeURIComponent(String(req.query.error).replace(/\+/g, ' ')) : null;
    res.render('dashboard/profile', { user: req.user, success, error });
  }
};
