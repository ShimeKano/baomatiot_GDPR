const rateLimit = require('express-rate-limit');

function clientIp(req) {
  const xfwd = req.headers['x-forwarded-for'];
  const raw =
    (typeof xfwd === 'string' && xfwd.split(',')[0].trim()) ||
    req.ip ||
    (req.connection && req.connection.remoteAddress) ||
    '';

  // normalize IPv4-mapped IPv6 and strip ":port" suffix
  return raw.replace(/^::ffff:/, '').replace(/:\d+$/, '');
}

const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => clientIp(req),
  message: { error: 'Too many requests' }
});

const sensitiveRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => clientIp(req),
  message: { error: 'Too many requests' }
});

const staticRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => clientIp(req),
  message: { error: 'Too many requests' }
});

module.exports = {
  authRateLimit,
  sensitiveRateLimit,
  staticRateLimit
};
