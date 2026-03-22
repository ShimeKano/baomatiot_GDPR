const crypto = require('crypto');
const { readData, writeData } = require('./store');

function normalizeNumber(value) {
  const num = Number(value);
  if (Number.isFinite(num)) {
    return num;
  }
  return null;
}

function ingestSensorRecord(payload, source = 'api') {
  const data = readData();

  const userId = typeof payload.userId === 'string' ? payload.userId.trim() : '';
  const deviceId = typeof payload.deviceId === 'string' ? payload.deviceId.trim() : '';
  const temperature = normalizeNumber(payload.temperature);
  const heartRate = normalizeNumber(payload.heartRate);
  const spo2 = normalizeNumber(payload.spo2);
  const timestamp = payload.timestamp ? new Date(payload.timestamp).toISOString() : new Date().toISOString();

  if (!userId || !deviceId || !timestamp) {
    return { error: 'Invalid sensor payload' };
  }

  if ([temperature, heartRate, spo2].every((metric) => metric === null)) {
    return { error: 'At least one metric is required' };
  }

  const user = data.users.find((u) => u.id === userId);
  if (!user) {
    return { error: 'User not found' };
  }

  const record = {
    id: crypto.randomUUID(),
    userId,
    deviceId,
    temperature,
    heartRate,
    spo2,
    source,
    timestamp,
    createdAt: new Date().toISOString()
  };

  data.sensorRecords.push(record);
  writeData(data);
  return { record };
}

function dateKeyInTimeZone(date, timeZone = 'Asia/Ho_Chi_Minh') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function summarizeDailyByUser(userId, dayKey, timeZone = 'Asia/Ho_Chi_Minh') {
  const data = readData();
  const records = data.sensorRecords.filter((record) => {
    if (record.userId !== userId) return false;
    const key = dateKeyInTimeZone(new Date(record.timestamp), timeZone);
    return key === dayKey;
  });

  if (!records.length) {
    return {
      dayKey,
      count: 0,
      averages: {
        temperature: null,
        heartRate: null,
        spo2: null
      }
    };
  }

  const calcAvg = (selector) => {
    const nums = records.map(selector).filter((value) => Number.isFinite(value));
    if (!nums.length) return null;
    const total = nums.reduce((sum, current) => sum + current, 0);
    return Number((total / nums.length).toFixed(2));
  };

  return {
    dayKey,
    count: records.length,
    averages: {
      temperature: calcAvg((r) => r.temperature),
      heartRate: calcAvg((r) => r.heartRate),
      spo2: calcAvg((r) => r.spo2)
    }
  };
}

function getDailySummaryForRequester(requester, dayKey, timeZone = 'Asia/Ho_Chi_Minh') {
  const data = readData();

  if (requester.role === 'admin') {
    return data.users.map((user) => ({
      user: { id: user.id, email: user.email, role: user.role },
      summary: summarizeDailyByUser(user.id, dayKey, timeZone)
    }));
  }

  return [{
    user: { id: requester.id, email: requester.email, role: requester.role },
    summary: summarizeDailyByUser(requester.id, dayKey, timeZone)
  }];
}

module.exports = {
  ingestSensorRecord,
  dateKeyInTimeZone,
  summarizeDailyByUser,
  getDailySummaryForRequester
};
