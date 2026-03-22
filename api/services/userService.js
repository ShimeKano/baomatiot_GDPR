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
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  if (typeof storedHash !== 'string') {
    return false;
  }

  const parts = storedHash.split('$');
  if (parts.length === 3 && parts[0] === 'scrypt') {
    const [, salt, hash] = parts;
    const computed = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'));
  }

  // Backward-compatible fallback for legacy SHA-256 hashes.
  const legacy = crypto.createHash('sha256').update(password).digest('hex');
  return storedHash === legacy;
}

function ensureSeededAdmin() {
  // No-op: admin role is assigned by email at account creation/login.
  // Kept for compatibility with existing imports.
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

  if (!verifyPassword(password, user.passwordHash)) {
    return null;
  }

  return user;
}

function getUserById(userId) {
  const data = readData();
  return data.users.find((u) => u.id === userId) || null;
}

function getAllUsers() {
  const data = readData();
  return data.users.map(toPublicUser);
}

function promoteUser(userId) {
  const data = readData();

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
