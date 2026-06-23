const mongoose = require('mongoose');

module.exports = {
  connect: async () => {
    try {
      const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/npl_anonymous';
      await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
      console.log('MongoDB connected');
    } catch (err) {
      console.error('MongoDB connection error', err);
      process.exit(1);
    }
  }
};
