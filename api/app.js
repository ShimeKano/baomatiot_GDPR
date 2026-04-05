const express = require('express');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const sensorRoutes = require('./routes/sensors');
const adminRoutes = require('./routes/admin');
const telemetryRoutes = require('./routes/telemetry');
const { staticRateLimit } = require('./middleware/rateLimit');
const { ensureSeededAdmin } = require('./services/userService');

const app = express();

ensureSeededAdmin();

app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/telemetry', telemetryRoutes);

app.use(staticRateLimit);
app.use(express.static(path.resolve(process.cwd())));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  return res.sendFile(path.resolve(process.cwd(), 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
