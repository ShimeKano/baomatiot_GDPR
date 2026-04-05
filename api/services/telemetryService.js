const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const telemetryDir = path.resolve(
  process.cwd(),
  process.env.TELEMETRY_DIR || path.join('data', 'telemetry')
);

// Write-queue per userId to prevent interleaved atomic writes
const writeQueues = {};

const DEFAULT_DEVICE_ID = 'wokwi';

function ensureDir() {
  if (!fs.existsSync(telemetryDir)) {
    fs.mkdirSync(telemetryDir, { recursive: true });
  }
}

function safeUserId(userId) {
  // Allow only UUID-safe characters to prevent path traversal
  return userId.replace(/[^a-zA-Z0-9-]/g, '');
}

function userFile(userId) {
  return path.join(telemetryDir, `${safeUserId(userId)}.json`);
}

function readUserTelemetry(userId) {
  ensureDir();
  const file = userFile(userId);
  if (!fs.existsSync(file)) return [];
  try {
    const content = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTelemetryAtomic(userId, records) {
  ensureDir();
  const file = userFile(userId);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(records, null, 2));
  fs.renameSync(tmp, file);
}

function enqueueWrite(userId, fn) {
  const safe = safeUserId(userId);
  if (!writeQueues[safe]) {
    writeQueues[safe] = Promise.resolve();
  }
  writeQueues[safe] = writeQueues[safe].then(fn).catch((err) => {
    console.error('Telemetry write error', err);
  });
  return writeQueues[safe];
}

function ingestTelemetry(userId, payload) {
  const record = {
    id: crypto.randomUUID(),
    userId,
    deviceId: typeof payload.deviceId === 'string' ? payload.deviceId.trim() : DEFAULT_DEVICE_ID,
    temperature: Number.isFinite(Number(payload.temperature)) ? Number(payload.temperature) : null,
    humidity: Number.isFinite(Number(payload.humidity)) ? Number(payload.humidity) : null,
    heartRate: Number.isFinite(Number(payload.heartRate)) ? Number(payload.heartRate) : null,
    spo2: Number.isFinite(Number(payload.spo2)) ? Number(payload.spo2) : null,
    timestamp: payload.timestamp ? new Date(payload.timestamp).toISOString() : new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  enqueueWrite(userId, () => {
    const records = readUserTelemetry(userId);
    records.push(record);
    writeTelemetryAtomic(userId, records);
  });

  return { record };
}

function getTelemetry(userId, limit = 50) {
  const records = readUserTelemetry(userId);
  // Return most recent first
  return records.slice(-limit).reverse();
}

module.exports = {
  ingestTelemetry,
  getTelemetry,
  telemetryDir
};
