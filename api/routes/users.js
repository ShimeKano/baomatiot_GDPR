const express = require('express');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { getAllUsers, promoteUser } = require('../services/userService');

const router = express.Router();

router.get('/', authMiddleware, requireRole('admin'), (_req, res) => {
  return res.json({ users: getAllUsers() });
});

router.post('/:id/promote', authMiddleware, requireRole('admin'), (req, res) => {
  const promoted = promoteUser(req.params.id);
  if (!promoted) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json({ user: promoted });
});

module.exports = router;
