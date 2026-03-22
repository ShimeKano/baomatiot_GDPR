const express = require('express');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { sensitiveRateLimit } = require('../middleware/rateLimit');
const { sendDailySummaryEmails } = require('../services/emailService');

const router = express.Router();

router.post('/send-daily-emails', sensitiveRateLimit, authMiddleware, requireRole('admin'), async (_req, res) => {
  try {
    const result = await sendDailySummaryEmails({ timeZone: process.env.TZ || 'Asia/Ho_Chi_Minh' });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to send daily emails', detail: error.message });
  }
});

module.exports = router;
