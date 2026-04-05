const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { sensitiveRateLimit } = require('../middleware/rateLimit');
const { createOrRotateDeviceToken, getDeviceTokenByUserId } = require('../services/deviceTokenService');
const { getTelemetry } = require('../services/telemetryService');

const router = express.Router();

function mqttTopic() {
  return process.env.MQTT_TELEMETRY_TOPIC || 'iot/gdpr/telemetry';
}

// POST /api/telemetry/token — create or rotate device token for authenticated user
router.post('/token', sensitiveRateLimit, authMiddleware, (req, res) => {
  try {
    const result = createOrRotateDeviceToken(req.user.id);
    return res.json({
      deviceToken: result.token,
      mqttBroker: process.env.MQTT_BROKER_URL || 'mqtt://test.mosquitto.org',
      mqttTopic: mqttTopic(),
      createdAt: result.createdAt
    });
  } catch (err) {
    console.error('Create device token error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/telemetry/token — retrieve current device token for authenticated user
router.get('/token', sensitiveRateLimit, authMiddleware, (req, res) => {
  try {
    const result = getDeviceTokenByUserId(req.user.id);
    if (!result) {
      return res.json({
        deviceToken: null,
        mqttBroker: process.env.MQTT_BROKER_URL || 'mqtt://test.mosquitto.org',
        mqttTopic: mqttTopic()
      });
    }
    return res.json({
      deviceToken: result.token,
      mqttBroker: process.env.MQTT_BROKER_URL || 'mqtt://test.mosquitto.org',
      mqttTopic: mqttTopic(),
      createdAt: result.createdAt
    });
  } catch (err) {
    console.error('Get device token error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/telemetry — retrieve telemetry records for authenticated user
router.get('/', sensitiveRateLimit, authMiddleware, (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 500);
    const records = getTelemetry(req.user.id, limit);
    return res.json({ records, userId: req.user.id });
  } catch (err) {
    console.error('Get telemetry error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
