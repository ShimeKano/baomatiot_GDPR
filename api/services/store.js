const fs = require('fs');
const path = require('path');

const dataFile = process.env.DATA_FILE || './data/store.json';
const resolvedFile = path.resolve(process.cwd(), dataFile);

const initialData = {
  users: [],
  sensorRecords: [],
  dailyEmailLogs: [],
  deviceTokens: []
};

function ensureFile() {
  const dir = path.dirname(resolvedFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(resolvedFile)) {
    fs.writeFileSync(resolvedFile, JSON.stringify(initialData, null, 2));
  }
}

function readData() {
  ensureFile();
  const content = fs.readFileSync(resolvedFile, 'utf8');
  try {
    const parsed = JSON.parse(content || '{}');
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sensorRecords: Array.isArray(parsed.sensorRecords) ? parsed.sensorRecords : [],
      dailyEmailLogs: Array.isArray(parsed.dailyEmailLogs) ? parsed.dailyEmailLogs : [],
      deviceTokens: Array.isArray(parsed.deviceTokens) ? parsed.deviceTokens : []
    };
  } catch (error) {
    return { ...initialData };
  }
}

function writeData(data) {
  ensureFile();
  const payload = {
    users: Array.isArray(data.users) ? data.users : [],
    sensorRecords: Array.isArray(data.sensorRecords) ? data.sensorRecords : [],
    dailyEmailLogs: Array.isArray(data.dailyEmailLogs) ? data.dailyEmailLogs : [],
    deviceTokens: Array.isArray(data.deviceTokens) ? data.deviceTokens : []
  };
  fs.writeFileSync(resolvedFile, JSON.stringify(payload, null, 2));
}

module.exports = {
  readData,
  writeData,
  resolvedFile
};
