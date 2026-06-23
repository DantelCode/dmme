const Message = require('../models/Message');
const User = require('../models/User');
const crypto = require('crypto');

const PROFANITY = ['damn', 'shit', 'fuck', 'bastard'];

function filterProfanity(text) {
  const pattern = new RegExp(PROFANITY.join('|'), 'gi');
  return text.replace(pattern, '****');
}

module.exports = {
  sendMessage: async (req, res) => {
    try {
      const { username } = req.params;
      const { text } = req.body;
      if (!text || text.trim().length === 0) return res.status(400).json({ error: 'Message cannot be empty' });
      if (text.length > 1000) return res.status(400).json({ error: 'Message too long' });
      const user = await User.findOne({ username });
      if (!user) return res.status(404).json({ error: 'Recipient not found' });
      if (user.paused && (!user.pauseUntil || user.pauseUntil > Date.now())) return res.status(403).json({ error: 'User is not accepting messages right now.' });
      // Hash IP
      const ip = req.ip || req.connection.remoteAddress || '';
      const hash = crypto.createHmac('sha256', process.env.IP_SALT || 'npl_salt').update(ip).digest('hex');
      // Basic duplicate & spam check: same hash within 30 seconds and identical text
      const recent = await Message.findOne({ recipient: user._id, senderIpHash: hash, text });
      if (recent && (Date.now() - new Date(recent.createdAt).getTime()) < 30 * 1000) return res.status(429).json({ error: 'Duplicate message detected' });
      const safeText = filterProfanity(text);
      const message = new Message({ recipient: user._id, text: safeText, senderIpHash: hash });
      await message.save();
      // notify user in real-time via Socket.IO (if available)
      try {
        const io = req.app && req.app.get('io');
        if (io) {
          io.to(`user:${user._id}`).emit('new_message', {
            messageId: message._id,
            text: message.text,
            createdAt: message.createdAt
          });
        }
      } catch (e) {
        console.error('notify error', e);
      }
      res.json({ success: true, message: 'Message sent' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  },

  listInbox: async (req, res) => {
    try {
      const user = req.user;
      const page = parseInt(req.query.page) || 1;
      const limit = 15;
      const total = await Message.countDocuments({ recipient: user._id });
      const messages = await Message.find({ recipient: user._id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
      res.render('dashboard/inbox', { messages, page, total, limit });
    } catch (err) {
      console.error(err);
      res.status(500).render('errors/500', { error: err });
    }
  },

  viewMessage: async (req, res) => {
    try {
      const { id } = req.params;
      const message = await Message.findById(id);
      if (!message) return res.status(404).render('errors/404');
      if (!message.read) {
        message.read = true;
        await message.save();
      }
      res.render('dashboard/message', { message });
    } catch (err) {
      console.error(err);
      res.status(500).render('errors/500', { error: err });
    }
  },

  deleteMessage: async (req, res) => {
    try {
      const { id } = req.params;
      await Message.deleteOne({ _id: id });
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
  ,
  unreadCount: async (req, res) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Not authenticated' });
      const count = await Message.countDocuments({ recipient: user._id, read: false });
      res.json({ success: true, unread: count });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
};
