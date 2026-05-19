const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied. No authorization header provided.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token found in authorization header.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_mario_secret_campus_sync_key');
    req.user = decoded; // Contains id, email, university_name, etc.
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = authMiddleware;
