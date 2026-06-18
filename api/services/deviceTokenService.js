const crypto = require('crypto');
const { readData, writeData } = require('./store');

function createOrRotateDeviceToken(userId) {
  const data = readData();

  if (!Array.isArray(data.deviceTokens)) {
    data.deviceTokens = [];
  }

  // Remove any existing token for this user
  data.deviceTokens = data.deviceTokens.filter((t) => t.userId !== userId);

  const token = crypto.randomBytes(32).toString('hex');
  const entry = {
    id: crypto.randomUUID(),
    userId,
    token,
    createdAt: new Date().toISOString()
  };

  data.deviceTokens.push(entry);
  writeData(data);

  return { token, createdAt: entry.createdAt };
}

function getDeviceTokenByUserId(userId) {
  const data = readData();
  if (!Array.isArray(data.deviceTokens)) return null;
  const entry = data.deviceTokens.find((t) => t.userId === userId);
  return entry ? { token: entry.token, createdAt: entry.createdAt } : null;
}

function getUserIdByToken(token) {
  if (typeof token !== 'string' || !token) return null;
  const data = readData();
  if (!Array.isArray(data.deviceTokens)) return null;
  const entry = data.deviceTokens.find((t) => t.token === token);
  return entry ? entry.userId : null;
}

module.exports = {
  createOrRotateDeviceToken,
  getDeviceTokenByUserId,
  getUserIdByToken
};
