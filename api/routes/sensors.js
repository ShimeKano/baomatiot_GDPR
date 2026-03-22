const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { requireFields } = require('../middleware/validation');
const { ingestSensorRecord, dateKeyInTimeZone, getDailySummaryForRequester } = require('../services/sensorService');

const router = express.Router();

router.post('/ingest', authMiddleware, requireFields(['userId', 'deviceId']), (req, res) => {
  const requester = req.user;
  const body = req.body || {};

  if (requester.role !== 'admin' && body.userId !== requester.id) {
    return res.status(403).json({ error: 'Cannot ingest for other users' });
  }

  const result = ingestSensorRecord(body, 'api');
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  return res.status(201).json({ record: result.record });
});

router.get('/daily-summary', authMiddleware, (req, res) => {
  const timeZone = process.env.TZ || 'Asia/Ho_Chi_Minh';
  const day = typeof req.query.day === 'string' ? req.query.day : dateKeyInTimeZone(new Date(), timeZone);
  const summaries = getDailySummaryForRequester(req.user, day, timeZone);
  return res.json({ day, summaries });
});

module.exports = router;
