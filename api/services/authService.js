const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET;
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';

function signToken(user) {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required');
  }
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, jwtSecret, {
    expiresIn: jwtExpiresIn
  });
}

function verifyToken(token) {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required');
  }
  return jwt.verify(token, jwtSecret);
}

module.exports = {
  signToken,
  verifyToken
};
