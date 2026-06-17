const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const telemetryDir = path.resolve(
  process.cwd(),
  process.env.TELEMETRY_DIR || path.join('data', 'telemetry')
);

const writeQueues = {};

const DEFAULT_DEVICE_ID = 'wokwi';

function ensureDir() {
  if (!fs.existsSync(telemetryDir)) {
    fs.mkdirSync(telemetryDir, { recursive: true });
  }
}

function safeUserId(userId) {
  return userId.replace(/[^a-zA-Z0-9-]/g, '');
}

function userFile(userId) {
  return path.join(
    telemetryDir,
    `${safeUserId(userId)}.json`
  );
}

function readUserTelemetry(userId) {
  ensureDir();

  const file = userFile(userId);

  if (!fs.existsSync(file)) {
    return [];
  }

  try {
    const content =
      fs.readFileSync(file, 'utf8');

    const parsed =
      JSON.parse(content);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function writeTelemetryAtomic(
  userId,
  records
) {
  ensureDir();

  const file = userFile(userId);
  const tmp = `${file}.tmp`;

  fs.writeFileSync(
    tmp,
    JSON.stringify(records, null, 2)
  );

  fs.renameSync(tmp, file);
}

function enqueueWrite(userId, fn) {
  const safe = safeUserId(userId);

  if (!writeQueues[safe]) {
    writeQueues[safe] = Promise.resolve();
  }

  writeQueues[safe] =
    writeQueues[safe]
      .then(fn)
      .catch((err) => {
        console.error(
          'Telemetry write error',
          err
        );
      });

  return writeQueues[safe];
}

function safeIsoTimestamp(value) {

  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return new Date().toISOString();
  }

  if (
    typeof value === 'number' ||
    (
      typeof value === 'string' &&
      /^[0-9]+$/.test(value)
    )
  ) {

    const n = Number(value);

    if (Number.isFinite(n)) {

      const ms =
        n < 1e12
          ? n * 1000
          : n;

      const d = new Date(ms);

      if (
        Number.isFinite(
          d.getTime()
        )
      ) {
        return d.toISOString();
      }
    }
  }

  const d = new Date(value);

  if (
    !Number.isFinite(
      d.getTime()
    )
  ) {
    return new Date().toISOString();
  }

  return d.toISOString();
}

function safeNumber(value) {

  const num = Number(value);

  return Number.isFinite(num)
    ? num
    : null;
}

function ingestTelemetry(
  userId,
  payload
) {

  const record = {

    id: crypto.randomUUID(),

    userId,

    deviceId:
      typeof payload.deviceId === 'string'
        ? payload.deviceId.trim()
        : DEFAULT_DEVICE_ID,

    // DHT22
    temperature:
      safeNumber(
        payload.temperature
      ),

    humidity:
      safeNumber(
        payload.humidity
      ),

    // PIR
    motion:
      safeNumber(
        payload.motion
      ),

    // HC-SR04
    distance:
      safeNumber(
        payload.distance
      ),

    // LDR
    light:
      safeNumber(
        payload.light
      ),

    // giữ tương thích hệ cũ
    heartRate:
      safeNumber(
        payload.heartRate
      ),

    spo2:
      safeNumber(
        payload.spo2
      ),

    timestamp:
      safeIsoTimestamp(
        payload.timestamp
      ),

    createdAt:
      new Date().toISOString()
  };

  enqueueWrite(
    userId,
    () => {

      const records =
        readUserTelemetry(
          userId
        );

      records.push(record);

      // Giới hạn tối đa
      if (
        records.length > 5000
      ) {
        records.splice(
          0,
          records.length - 5000
        );
      }

      writeTelemetryAtomic(
        userId,
        records
      );
    }
  );

  return { record };
}

function getTelemetry(
  userId,
  limit = 50
) {

  const records =
    readUserTelemetry(
      userId
    );

  return records
    .slice(-limit)
    .reverse();
}

module.exports = {
  ingestTelemetry,
  getTelemetry,
  telemetryDir
};
