const rateLimit = require('express-rate-limit');

module.exports = {
  messageLimiter: rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { error: 'Too many messages sent. Please try again later.' }
  })
};
