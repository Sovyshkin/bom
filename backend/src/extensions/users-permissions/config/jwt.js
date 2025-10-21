module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret',
  jwtExpiry: '7d'
};