function requireFields(fields) {
  return function validate(req, res, next) {
    const missing = fields.filter((field) => req.body[field] === undefined || req.body[field] === null || req.body[field] === '');
    if (missing.length) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }
    return next();
  };
}

module.exports = {
  requireFields
};
