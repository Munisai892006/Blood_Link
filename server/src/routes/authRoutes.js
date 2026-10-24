const express = require('express');
const router = express.Router();
const AuthService = require('../services/authService');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/audit');

// Register
router.post('/register', rateLimiter(30, 60000), (req, res) => {
  try {
    const result = AuthService.registerUser(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: 'REGISTRATION_FAILED', message: err.message });
  }
});

// Login
router.post('/login', rateLimiter(20, 60000), (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const result = AuthService.login({ email, password, ipAddress });
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: 'LOGIN_FAILED', message: err.message });
  }
});

// Current User Profile
router.get('/me', authenticateToken, (req, res) => {
  try {
    const profile = AuthService.getDonorProfile(req.user.id, req.user);
    res.json({
      user: req.user,
      donor_profile: profile
    });
  } catch (err) {
    res.status(500).json({ error: 'FETCH_ME_FAILED', message: err.message });
  }
});

// Update Donor Profile (Preferences, Availability, Quiet Hours, Consent)
router.put('/donor-profile', authenticateToken, (req, res) => {
  try {
    const updated = AuthService.updateDonorProfile(req.user.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: 'PROFILE_UPDATE_FAILED', message: err.message });
  }
});

// Verification Reviewer: Verify Donor (FR-DON-004)
router.post('/verify-donor/:donorId', authenticateToken, requireRole('VERIFICATION_REVIEWER', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const { status = 'VERIFIED' } = req.body;
    const result = AuthService.verifyDonor(req.params.donorId, req.user.id, status);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: 'VERIFICATION_FAILED', message: err.message });
  }
});

// Verification Reviewer: List Pending Unverified Donors (FR-DON-004)
router.get('/pending-donors', authenticateToken, requireRole('VERIFICATION_REVIEWER', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const list = AuthService.listPendingDonors();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_PENDING_DONORS_FAILED', message: err.message });
  }
});

// Request Password Reset OTP (FR-AUTH-003)
router.post('/forgot-password', rateLimiter(10, 60000), (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'EMAIL_REQUIRED', message: 'Email address is required.' });
    const result = AuthService.requestPasswordReset(email);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: 'RESET_REQUEST_FAILED', message: err.message });
  }
});

// Reset Password with Token & OTP (FR-AUTH-003)
router.post('/reset-password', rateLimiter(10, 60000), (req, res) => {
  try {
    const { reset_token, otp_code, new_password } = req.body;
    const result = AuthService.resetPassword({ reset_token, otp_code, new_password });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: 'RESET_FAILED', message: err.message });
  }
});

// Change Password (FR-AUTH-003, Phase 2.2)
router.post('/change-password', authenticateToken, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'CREDENTIALS_REQUIRED', message: 'Current password and new password are required.' });
    }
    const result = AuthService.changePassword(req.user.id, { currentPassword, newPassword });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: 'PASSWORD_CHANGE_FAILED', message: err.message });
  }
});

// Toggle MFA for Authenticated User (FR-AUTH-007)
router.post('/mfa/toggle', authenticateToken, (req, res) => {
  try {
    const { enabled } = req.body;
    const result = AuthService.toggleMfa(req.user.id, !!enabled);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: 'MFA_TOGGLE_FAILED', message: err.message });
  }
});

// Public Credential Verification (Part 5 & 6, AC-020)
router.get('/verify-credential/:code', (req, res) => {
  try {
    const result = AuthService.verifyCredential(req.params.code);
    if (!result.valid) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ valid: false, error: 'VERIFICATION_ERROR', message: err.message });
  }
});

router.post('/verify-credential', (req, res) => {
  try {
    const code = req.body.code || req.body.verification_code || req.body.hash;
    const result = AuthService.verifyCredential(code);
    if (!result.valid) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ valid: false, error: 'VERIFICATION_ERROR', message: err.message });
  }
});

module.exports = router;
