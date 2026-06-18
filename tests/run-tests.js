const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = process.cwd();
const tempDataFile = path.join(root, 'data', 'test-store.json');
const tempTelemetryDir = path.join(root, 'data', 'test-telemetry');

// Set env vars BEFORE requiring any services
process.env.DATA_FILE = tempDataFile;
process.env.JWT_SECRET = 'test-secret';
process.env.DEFAULT_ADMIN_EMAIL = '22004249@st.vlute.edu.vn';
process.env.TZ = 'Asia/Ho_Chi_Minh';
process.env.TELEMETRY_DIR = path.relative(root, tempTelemetryDir);

if (fs.existsSync(tempDataFile)) {
  fs.unlinkSync(tempDataFile);
}
if (fs.existsSync(tempTelemetryDir)) {
  fs.rmSync(tempTelemetryDir, { recursive: true, force: true });
}

const userService = require('../api/services/userService');
const authService = require('../api/services/authService');
const sensorService = require('../api/services/sensorService');
const emailService = require('../api/services/emailService');
const deviceTokenService = require('../api/services/deviceTokenService');
const telemetryService = require('../api/services/telemetryService');

(async function run() {
  userService.ensureSeededAdmin();
  const admin = userService.findOrCreateUser('22004249@st.vlute.edu.vn', 'admin123');
  assert(admin && admin.role === 'admin', 'Default admin should be admin');

  const user = userService.findOrCreateUser('user@example.com', 'user123');
  assert(user && user.role === 'user', 'Non-admin email should default to user');

  const token = authService.signToken(user);
  const decoded = authService.verifyToken(token);
  assert(decoded.sub === user.id, 'Token should encode user id');

  let ingest = sensorService.ingestSensorRecord({ userId: user.id, deviceId: 'dev-1', temperature: 36.6, heartRate: 76, spo2: 98, timestamp: new Date().toISOString() });
  assert(!ingest.error, `Ingestion should succeed: ${ingest.error || ''}`);

  ingest = sensorService.ingestSensorRecord({ userId: user.id, deviceId: 'dev-1', temperature: 37.0, heartRate: 80, spo2: 97, timestamp: new Date().toISOString() });
  assert(!ingest.error, `Second ingestion should succeed: ${ingest.error || ''}`);

  const day = sensorService.dateKeyInTimeZone(new Date(), 'Asia/Ho_Chi_Minh');
  const summary = sensorService.summarizeDailyByUser(user.id, day, 'Asia/Ho_Chi_Minh');
  assert(summary.count >= 2, 'Daily summary should include ingested records');
  assert(summary.averages.temperature !== null, 'Temperature average should be computed');

  const send1 = await emailService.sendDailySummaryEmails({ now: new Date(), timeZone: 'Asia/Ho_Chi_Minh' });
  assert(send1.results.length >= 2, 'Should process users for daily email');

  const send2 = await emailService.sendDailySummaryEmails({ now: new Date(), timeZone: 'Asia/Ho_Chi_Minh' });
  const skipped = send2.results.filter((r) => r.status === 'skipped_already_sent');
  assert(skipped.length >= 2, 'Second run same day should be idempotent and skip');

  // ── Device token service tests ──────────────────────────────
  const dt1 = deviceTokenService.createOrRotateDeviceToken(user.id);
  assert(typeof dt1.token === 'string' && dt1.token.length === 64, 'Device token should be 64-char hex');

  const found = deviceTokenService.getDeviceTokenByUserId(user.id);
  assert(found && found.token === dt1.token, 'Should retrieve the same token by userId');

  const resolvedUserId = deviceTokenService.getUserIdByToken(dt1.token);
  assert(resolvedUserId === user.id, 'Should resolve userId from token');

  // Rotate — old token should be gone
  const dt2 = deviceTokenService.createOrRotateDeviceToken(user.id);
  assert(dt2.token !== dt1.token, 'Rotated token should differ');
  assert(deviceTokenService.getUserIdByToken(dt1.token) === null, 'Old token should be invalidated after rotation');

  // Unknown token returns null
  assert(deviceTokenService.getUserIdByToken('not-a-real-token') === null, 'Unknown token should return null');

  // ── Telemetry service tests ─────────────────────────────────
  const tResult = telemetryService.ingestTelemetry(user.id, {
    deviceId: 'wokwi-test',
    temperature: 25.5,
    humidity: 60,
    heartRate: 72,
    spo2: 99
  });
  assert(tResult.record && tResult.record.userId === user.id, 'Telemetry record should reference userId');
  assert(tResult.record.temperature === 25.5, 'Telemetry temperature should be stored');

  // Wait for async write queue to flush
  await new Promise((resolve) => setTimeout(resolve, 200));

  const records = telemetryService.getTelemetry(user.id, 10);
  assert(records.length >= 1, 'Should retrieve ingested telemetry record');
  assert(records[0].userId === user.id, 'Retrieved record should belong to user');

  // Cleanup
  if (fs.existsSync(tempDataFile)) {
    fs.unlinkSync(tempDataFile);
  }
  if (fs.existsSync(tempTelemetryDir)) {
    fs.rmSync(tempTelemetryDir, { recursive: true, force: true });
  }

  console.log('All tests passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
