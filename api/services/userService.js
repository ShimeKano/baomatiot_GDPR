const crypto = require('crypto');
const { readData, writeData } = require('./store');

const defaultAdminEmail = (process.env.DEFAULT_ADMIN_EMAIL || '22004249@st.vlute.edu.vn').toLowerCase();

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt
  };
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function seedAdminIfMissing(data) {
  const existing = data.users.find((u) => u.email.toLowerCase() === defaultAdminEmail);
  if (!existing) {
    data.users.push({
      id: crypto.randomUUID(),
      email: defaultAdminEmail,
      passwordHash: hashPassword('admin123'),
      role: 'admin',
      createdAt: new Date().toISOString()
    });
    writeData(data);
  }
}

function ensureSeededAdmin() {
  const data = readData();
  seedAdminIfMissing(data);
}

function validateEmail(email) {
  if (typeof email !== 'string') {
    return false;
  }
  const normalized = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

function findOrCreateUser(email, password) {
  const data = readData();
  seedAdminIfMissing(data);

  const normalizedEmail = email.trim().toLowerCase();
  let user = data.users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    user = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      role: normalizedEmail === defaultAdminEmail ? 'admin' : 'user',
      createdAt: new Date().toISOString()
    };
    data.users.push(user);
    writeData(data);
    return user;
  }

  const passwordHash = hashPassword(password);
  if (user.passwordHash !== passwordHash) {
    return null;
  }

  return user;
}

function getUserById(userId) {
  const data = readData();
  seedAdminIfMissing(data);
  return data.users.find((u) => u.id === userId) || null;
}

function getAllUsers() {
  const data = readData();
  seedAdminIfMissing(data);
  return data.users.map(toPublicUser);
}

function promoteUser(userId) {
  const data = readData();
  seedAdminIfMissing(data);

  const user = data.users.find((u) => u.id === userId);
  if (!user) {
    return null;
  }

  user.role = 'admin';
  writeData(data);
  return toPublicUser(user);
}

module.exports = {
  defaultAdminEmail,
  ensureSeededAdmin,
  validateEmail,
  findOrCreateUser,
  getUserById,
  getAllUsers,
  promoteUser,
  toPublicUser
};
