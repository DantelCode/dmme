const sanitizeHtml = require('sanitize-html');

module.exports = {
  sanitizeBody: (fields = []) => (req, res, next) => {
    for (const key of fields) {
      if (req.body && req.body[key]) {
        req.body[key] = sanitizeHtml(req.body[key], {
          allowedTags: [],
          allowedAttributes: {}
        }).trim();
      }
    }
    next();
  }
};
