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

  settings: async (req, res) => {
    res.render('dashboard/settings', { user: req.user });
  }
};
