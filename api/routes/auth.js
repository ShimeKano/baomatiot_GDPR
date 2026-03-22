const express = require('express');
const { requireFields } = require('../middleware/validation');
const { authMiddleware } = require('../middleware/auth');
const { authRateLimit } = require('../middleware/rateLimit');
const { validateEmail, findOrCreateUser, toPublicUser } = require('../services/userService');
const { signToken } = require('../services/authService');

const router = express.Router();

router.post('/login', authRateLimit, requireFields(['email', 'password']), (req, res) => {
  const { email, password } = req.body;

  if (!validateEmail(email) || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Invalid email or password format' });
  }

  const user = findOrCreateUser(email, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken(user);
  return res.json({ token, user: toPublicUser(user) });
});

router.get('/me', authRateLimit, authMiddleware, (req, res) => {
  return res.json({ user: toPublicUser(req.user) });
});

module.exports = router;
