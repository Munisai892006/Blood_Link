const { getDb } = require('../db/database');

function logAudit({
  actorId = null,
  actorRole = 'ANONYMOUS',
  action,
  entityType,
  entityId = null,
  details = {},
  ipAddress = '127.0.0.1'
}) {
  try {
    const db = getDb();
    
    // Sanitize details: strictly remove sensitive fields (FR-PRV-004)
    const sanitizedDetails = { ...details };
    delete sanitizedDetails.password;
    delete sanitizedDetails.password_hash;
    delete sanitizedDetails.token;
    delete sanitizedDetails.refreshToken;
    delete sanitizedDetails.secret;

    const auditId = 'AUD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      auditId,
      actorId,
      actorRole,
      action,
      entityType,
      entityId,
      JSON.stringify(sanitizedDetails),
      ipAddress
    );
  } catch (err) {
    console.error('[AuditLog] Error writing audit log:', err.message);
  }
}

// Simple in-memory rate limiter for login/registration/requests (FR-AUTH-008)
const rateLimitMap = new Map();

function rateLimiter(limit = 60, windowMs = 60000) {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress || 'global';
    const now = Date.now();
    const entry = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > entry.resetAt) {
      entry.count = 1;
      entry.resetAt = now + windowMs;
    } else {
      entry.count++;
    }

    rateLimitMap.set(key, entry);

    if (entry.count > limit) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again after a brief cooldown.',
        retryAfterMs: entry.resetAt - now
      });
    }

    next();
  };
}

module.exports = {
  logAudit,
  rateLimiter
};
