const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 1000 },
  senderIpHash: { type: String },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

MessageSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Message', MessageSchema);
