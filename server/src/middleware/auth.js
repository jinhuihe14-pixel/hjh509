const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'game-platform-secret-key-2024';

function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ success: false, message: '未登录' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: '登录已过期' });
  }
}

function generateToken(admin) {
  return jwt.sign(
    { id: admin.id, username: admin.username, role: admin.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = { auth, generateToken, JWT_SECRET };
