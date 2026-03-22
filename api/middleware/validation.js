function requireFields(fields) {
  return function validate(req, res, next) {
    const missing = fields.filter((field) => {
      const value = req.body[field];
      if (value === undefined || value === null) return true;
      if (typeof value === 'string' && value.trim() === '') return true;
      return false;
    });
    if (missing.length) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }
    return next();
  };
}

module.exports = {
  requireFields
};
