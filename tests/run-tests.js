const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = process.cwd();
const tempDataFile = path.join(root, 'data', 'test-store.json');
process.env.DATA_FILE = tempDataFile;
process.env.JWT_SECRET = 'test-secret';
process.env.DEFAULT_ADMIN_EMAIL = '22004249@st.vlute.edu.vn';
process.env.TZ = 'Asia/Ho_Chi_Minh';

if (fs.existsSync(tempDataFile)) {
  fs.unlinkSync(tempDataFile);
}

const userService = require('../api/services/userService');
const authService = require('../api/services/authService');
const sensorService = require('../api/services/sensorService');
const emailService = require('../api/services/emailService');

(async function run() {
  userService.ensureSeededAdmin();
  const admin = userService.findOrCreateUser('22004249@st.vlute.edu.vn', 'admin123');
  assert(admin && admin.role === 'admin', 'Default admin should be admin');
  const adminWrongPassword = userService.findOrCreateUser('22004249@st.vlute.edu.vn', 'otherpass');
  assert(adminWrongPassword === null, 'Authentication with different password should fail after admin account is created');

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

  if (fs.existsSync(tempDataFile)) {
    fs.unlinkSync(tempDataFile);
  }

  console.log('All tests passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
