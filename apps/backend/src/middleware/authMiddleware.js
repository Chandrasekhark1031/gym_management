const { verifyToken } = require('../utils/jwt');

const protect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = verifyToken(token);
    if (decoded.purpose === 'password_reset') {
      return res.status(401).json({ success: false, message: 'Not authorized, invalid token type' });
    }

    req.role = decoded.role || 'OWNER';
    req.ownerId = decoded.ownerId || null;
    req.customerId = decoded.customerId || null;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Not authorized, token expired' });
    }
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

const requireOwner = (req, res, next) => {
  if (req.role !== 'OWNER' || !req.ownerId) {
    return res.status(403).json({ success: false, message: 'Owner access required' });
  }
  return next();
};

const requireCustomer = (req, res, next) => {
  if (req.role !== 'CUSTOMER' || !req.customerId) {
    return res.status(403).json({ success: false, message: 'Customer access required' });
  }
  return next();
};

module.exports = { protect, requireOwner, requireCustomer };
