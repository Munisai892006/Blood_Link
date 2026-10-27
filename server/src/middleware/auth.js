const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'bloodlink_jwt_secure_secret_2026_xyz';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      organization_id: user.organization_id,
      full_name: user.full_name
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'AUTHENTICATION_REQUIRED',
      message: 'Access denied. Bearer token missing.'
    });
  }

  // Seamless dev role-switch support for simulated active sessions
  if (token.startsWith('mock_token_for_')) {
    const role = token.replace('mock_token_for_', '');
    const db = getDb();
    const user = db.prepare('SELECT id, email, role, organization_id, full_name FROM users WHERE role = ?').get(role);
    if (user) {
      req.user = user;
      return next();
    }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      error: 'INVALID_TOKEN',
      message: 'Authentication token is invalid or expired.'
    });
  }
}

// Role-based access control middleware
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'AUTHENTICATION_REQUIRED' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'ACCESS_FORBIDDEN',
        message: `User role '${req.user.role}' is not authorized to perform this operation. Required: [${allowedRoles.join(', ')}]`
      });
    }

    next();
  };
}

// Facility / Organization data isolation check (FR-AUTH-005, FR-ORG-004)
function enforceOrgScope(req, res, next) {
  // System Admin, Emergency Coordinator, and Reviewers have cross-facility oversight
  if (['SYSTEM_ADMIN', 'EMERGENCY_COORDINATOR', 'VERIFICATION_REVIEWER'].includes(req.user.role)) {
    return next();
  }

  const requestedOrgId = req.params.orgId || req.body.organization_id || req.query.organization_id;
  if (requestedOrgId && requestedOrgId !== req.user.organization_id) {
    return res.status(403).json({
      error: 'ORG_DATA_ISOLATION_VIOLATION',
      message: 'You are not permitted to access records outside your assigned organization scope.'
    });
  }

  next();
}

module.exports = {
  JWT_SECRET,
  generateToken,
  authenticateToken,
  requireRole,
  enforceOrgScope
};
