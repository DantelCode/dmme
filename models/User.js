const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String },
  profilePhoto: { type: String, default: '/images/default_avatar.png' },
  profileLink: { type: String, unique: true },
  editsLeft: { type: Number, default: 1 },
  paidEdits: { type: Number, default: 0 },
  theme: { type: String, enum: ['light', 'dark'], default: 'light' },
  selectedMode: { type: String, enum: ['default','confessions','3words'], default: 'default' },
  selectedModeText: { type: String, default: '' },
  selectedTagClass: { type: String, default: '' },
  notificationsEnabled: { type: Boolean, default: true },
  paused: { type: Boolean, default: false },
  pauseUntil: { type: Date, default: null },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String, default: function () { return uuidv4(); } },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  googleId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

UserSchema.pre('save', async function (next) {
  if (!this.profileLink) {
    this.profileLink = `@${this.username}`;
  }
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

UserSchema.methods.comparePassword = async function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', UserSchema);
