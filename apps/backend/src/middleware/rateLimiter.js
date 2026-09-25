const buckets = new Map();

const rateLimit = ({ windowMs, max, keyPrefix }) => (req, res, next) => {
  const key = `${keyPrefix}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
  const now = Date.now();
  const entry = buckets.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }

  entry.count += 1;
  buckets.set(key, entry);

  if (entry.count > max) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
    });
  }

  return next();
};

module.exports = { rateLimit };
