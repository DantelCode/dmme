require('dotenv').config();
const mongoose = require('mongoose');
const db = require('./config/db');
const User = require('./models/User');
const Message = require('./models/Message');

(async ()=>{
  await db.connect();
  await User.deleteMany({});
  await Message.deleteMany({});
  const user = new User({ username: 'john', email: 'john@example.com', password: 'password123', editsLeft: 1, profilePhoto: '/images/default_avatar.png' });
  await user.save();
  await Message.create({ recipient: user._id, text: 'Welcome to NPL!', senderIpHash: 'seed' });
  console.log('Seed complete.');
  process.exit(0);
})();
