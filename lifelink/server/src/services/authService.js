const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { generateToken } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

class AuthService {
  static registerUser({ 
    email, 
    password, 
    full_name, 
    phone, 
    role = 'DONOR', 
    organization_id = null,
    blood_group = 'O+',
    address_locality = 'Hyderabad Central',
    latitude = 17.4065,
    longitude = 78.4772,
    organization_name = null,
    organization_type = null,
    license_number = null,
    organization_address = null,
    consent_emergency_alerts = 1,
    consent_data_sharing = 1,
    availability = 'Weekdays & Weekends',
    transport_mode = 'Two-Wheeler'
  }) {
    const db = getDb();

    // Enforce privileged role protection (Phase 2.B)
    const publicAllowedRoles = ['DONOR', 'VOLUNTEER', 'HOSPITAL_REQUESTER', 'HOSPITAL_ADMIN', 'BLOOD_BANK_OPERATOR', 'PUBLIC_VISITOR'];
    if (!publicAllowedRoles.includes(role)) {
      throw new Error(`Privileged role '${role}' cannot be registered publicly. Must be provisioned by System Administrator.`);
    }

    if (!email || !password || !full_name) {
      throw new Error('Full name, email, and password are required fields.');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    // Check if email already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    // If Hospital or Blood Bank registration with new facility details
    let finalOrgId = organization_id;
    if (!finalOrgId && organization_name) {
      finalOrgId = 'ORG-' + Date.now().toString(36).toUpperCase();
      const orgType = (organization_type || (role === 'BLOOD_BANK_OPERATOR' ? 'BLOOD_BANK' : 'HOSPITAL')).toUpperCase();
      db.prepare(`
        INSERT INTO organizations (
          id, name, type, license_number, address, latitude, longitude, contact_email, contact_phone, verification_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `).run(
        finalOrgId,
        organization_name,
        orgType,
        license_number || 'PENDING-VERIFICATION',
        organization_address || 'Hyderabad Medical Corridor',
        latitude || 17.4065,
        longitude || 78.4772,
        email.toLowerCase().trim(),
        phone || '+91-0000000000'
      );
    }

    const userId = 'USR-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    const passwordHash = bcrypt.hashSync(password, 10);

    const stmt = db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, phone, role, organization_id, is_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      userId,
      email.toLowerCase().trim(),
      passwordHash,
      full_name,
      phone,
      role,
      finalOrgId,
      role === 'PUBLIC_VISITOR' ? 1 : 0
    );

    // If Donor, create associated profile
    if (role === 'DONOR') {
      const profileId = 'PRF-' + Date.now().toString(36).toUpperCase();
      const memberId = 'BL-MEM-' + Math.floor(10000 + Math.random() * 90000);
      const qrCode = 'BL-VHASH-' + Buffer.from(userId).toString('hex') + '-' + Math.floor(1000 + Math.random() * 9000);

      db.prepare(`
        INSERT INTO donor_profiles (
          id, user_id, blood_group, latitude, longitude, address_locality,
          availability_status, quiet_hours_start, quiet_hours_end,
          preferred_language, consent_emergency_alerts, consent_data_sharing,
          verification_status, member_id, qr_verification_code
        ) VALUES (?, ?, ?, ?, ?, ?, 'AVAILABLE', '22:00', '07:00', 'en', ?, ?, 'SELF_DECLARED', ?, ?)
      `).run(
        profileId,
        userId,
        blood_group || 'O+',
        latitude || 17.4065,
        longitude || 78.4772,
        address_locality || 'Hyderabad Central',
        consent_emergency_alerts ? 1 : 0,
        consent_data_sharing ? 1 : 0,
        memberId,
        qrCode
      );
    }

    logAudit({
      actorId: userId,
      actorRole: role,
      action: 'USER_REGISTERED',
      entityType: 'USER',
      entityId: userId,
      details: { email: email.toLowerCase().trim(), role, organization_id: finalOrgId }
    });

    const user = db.prepare('SELECT id, email, full_name, phone, role, organization_id, is_verified FROM users WHERE id = ?').get(userId);
    const token = generateToken(user);
    return { user, token };
  }

  static login({ email, password, ipAddress = '127.0.0.1' }) {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());

    if (!user) {
      logAudit({
        actorRole: 'ANONYMOUS',
        action: 'LOGIN_FAILED_UNKNOWN_EMAIL',
        entityType: 'USER',
        details: { email },
        ipAddress
      });
      throw new Error('Invalid email or password.');
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      logAudit({
        actorId: user.id,
        actorRole: user.role,
        action: 'LOGIN_FAILED_BAD_PASSWORD',
        entityType: 'USER',
        entityId: user.id,
        details: { email },
        ipAddress
      });
      throw new Error('Invalid email or password.');
    }

    logAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'LOGIN_SUCCESS',
      entityType: 'USER',
      entityId: user.id,
      details: { email },
      ipAddress
    });

    // Check if user has donor profile
    const profile = db.prepare('SELECT * FROM donor_profiles WHERE user_id = ?').get(user.id);

    const sanitizedUser = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      role: user.role,
      organization_id: user.organization_id,
      is_verified: user.is_verified,
      mfa_enabled: user.mfa_enabled,
      donor_profile: profile || null
    };

    const token = generateToken(user);
    return { user: sanitizedUser, token };
  }

  static getDonorProfile(userId, requestingUser) {
    const db = getDb();
    const profile = db.prepare(`
      SELECT p.*, u.full_name, u.email, u.phone
      FROM donor_profiles p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = ?
    `).get(userId);

    if (!profile) return null;

    // AC-009 / FR-DON-007 / FR-MAT-007: Mask coordinates and phone if not self or not privileged coordinator/reviewer
    const isSelf = requestingUser && requestingUser.id === userId;
    const isPrivileged = requestingUser && ['SYSTEM_ADMIN', 'VERIFICATION_REVIEWER', 'EMERGENCY_COORDINATOR'].includes(requestingUser.role);

    if (!isSelf && !isPrivileged) {
      return {
        id: profile.id,
        user_id: profile.user_id,
        blood_group: profile.blood_group,
        availability_status: profile.availability_status,
        address_locality: profile.address_locality,
        verification_status: profile.verification_status,
        // Exact location and contact hidden
        latitude: null,
        longitude: null,
        phone: null,
        email: null
      };
    }

    return profile;
  }

  static updateDonorProfile(userId, data) {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM donor_profiles WHERE user_id = ?').get(userId);

    // Validation (Phase 3)
    const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    if (data.blood_group && !validBloodGroups.includes(data.blood_group)) {
      throw new Error(`Invalid blood group: ${data.blood_group}. Must be one of: ${validBloodGroups.join(', ')}.`);
    }

    const validStatuses = ['AVAILABLE', 'UNAVAILABLE', 'PAUSED', 'BUSY'];
    if (data.availability_status && !validStatuses.includes(data.availability_status)) {
      throw new Error(`Invalid availability status: ${data.availability_status}. Must be AVAILABLE, UNAVAILABLE, PAUSED, or BUSY.`);
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (data.quiet_hours_start && !timeRegex.test(data.quiet_hours_start)) {
      throw new Error('Invalid Quiet Hours Start format. Expected HH:MM in 24-hour format.');
    }
    if (data.quiet_hours_end && !timeRegex.test(data.quiet_hours_end)) {
      throw new Error('Invalid Quiet Hours End format. Expected HH:MM in 24-hour format.');
    }

    const validLanguages = ['en', 'te', 'hi'];
    if (data.preferred_language && !validLanguages.includes(data.preferred_language)) {
      throw new Error('Invalid preferred language. Supported options are: en (English), te (Telugu), hi (Hindi).');
    }

    // Security: never allow donor to mark verification_status as VERIFIED directly
    delete data.verification_status;
    delete data.verified_by;
    delete data.verified_at;

    const consentTimestamp = new Date().toISOString();
    const prevStatus = existing ? existing.availability_status : null;

    if (existing) {
      const stmt = db.prepare(`
        UPDATE donor_profiles SET
          blood_group = COALESCE(@blood_group, blood_group),
          date_of_birth = COALESCE(@date_of_birth, date_of_birth),
          gender = COALESCE(@gender, gender),
          latitude = COALESCE(@latitude, latitude),
          longitude = COALESCE(@longitude, longitude),
          address_locality = COALESCE(@address_locality, address_locality),
          availability_status = COALESCE(@availability_status, availability_status),
          quiet_hours_start = COALESCE(@quiet_hours_start, quiet_hours_start),
          quiet_hours_end = COALESCE(@quiet_hours_end, quiet_hours_end),
          preferred_language = COALESCE(@preferred_language, preferred_language),
          consent_emergency_alerts = COALESCE(@consent_emergency_alerts, consent_emergency_alerts),
          consent_data_sharing = COALESCE(@consent_data_sharing, consent_data_sharing),
          consent_policy_version = 'v1.0',
          consent_timestamp = @consent_timestamp,
          last_donation_date = COALESCE(@last_donation_date, last_donation_date),
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = @user_id
      `);
      const dbAvailabilityStatus = (data.availability_status === 'UNAVAILABLE') ? 'PAUSED' : data.availability_status;
      const params = {
        blood_group: null,
        date_of_birth: null,
        gender: null,
        latitude: null,
        longitude: null,
        address_locality: null,
        availability_status: null,
        quiet_hours_start: null,
        quiet_hours_end: null,
        preferred_language: null,
        consent_emergency_alerts: null,
        consent_data_sharing: null,
        last_donation_date: null,
        ...data,
        availability_status: dbAvailabilityStatus !== undefined ? dbAvailabilityStatus : null,
        consent_timestamp: consentTimestamp,
        user_id: userId
      };
      stmt.run(params);
    } else {
      const profileId = 'PRF-' + Date.now().toString(36).toUpperCase();
      const insertStatus = (data.availability_status === 'UNAVAILABLE') ? 'PAUSED' : (data.availability_status || 'AVAILABLE');
      const stmt = db.prepare(`
        INSERT INTO donor_profiles (
          id, user_id, blood_group, date_of_birth, gender, latitude, longitude,
          address_locality, availability_status, quiet_hours_start, quiet_hours_end,
          preferred_language, consent_emergency_alerts, consent_data_sharing,
          consent_policy_version, consent_timestamp,
          last_donation_date, verification_status
        ) VALUES (
          @id, @user_id, @blood_group, @date_of_birth, @gender, @latitude, @longitude,
          @address_locality, @availability_status, @quiet_hours_start, @quiet_hours_end,
          @preferred_language, @consent_emergency_alerts, @consent_data_sharing,
          'v1.0', @consent_timestamp,
          @last_donation_date, 'SELF_DECLARED'
        )
      `);
      stmt.run({
        id: profileId,
        user_id: userId,
        blood_group: data.blood_group || 'O+',
        date_of_birth: data.date_of_birth || null,
        gender: data.gender || null,
        latitude: data.latitude || 17.4065,
        longitude: data.longitude || 78.4772,
        address_locality: data.address_locality || 'Hyderabad Central',
        availability_status: insertStatus,
        quiet_hours_start: data.quiet_hours_start || '22:00',
        quiet_hours_end: data.quiet_hours_end || '07:00',
        preferred_language: data.preferred_language || 'en',
        consent_emergency_alerts: data.consent_emergency_alerts ?? 1,
        consent_data_sharing: data.consent_data_sharing ?? 1,
        consent_timestamp: consentTimestamp,
        last_donation_date: data.last_donation_date || null
      });
    }

    logAudit({
      actorId: userId,
      action: 'DONOR_PROFILE_UPDATED',
      entityType: 'DONOR_PROFILE',
      entityId: userId,
      details: { updated_fields: Object.keys(data), availability_status: data.availability_status }
    });

    // Targeted notification when status changes to AVAILABLE (Phase 3 & Phase 7)
    if (data.availability_status === 'AVAILABLE' && prevStatus !== 'AVAILABLE') {
      try {
        const NotificationService = require('./notificationService');
        const MatchingService = require('./matchingService');
        const coordinators = db.prepare("SELECT id FROM users WHERE role = 'EMERGENCY_COORDINATOR'").all();
        const activeGroup = data.blood_group || (existing ? existing.blood_group : 'Declared Group');
        const activeLocality = data.address_locality || (existing ? existing.address_locality : 'Regional Network');
        const donorLat = data.latitude || (existing ? existing.latitude : 17.4065);
        const donorLng = data.longitude || (existing ? existing.longitude : 78.4772);

        // General alert to emergency coordinators (zero PII)
        for (const coord of coordinators) {
          NotificationService.sendNotification({
            recipientId: coord.id,
            channel: 'IN_APP',
            title: `🟢 Donor Availability Status: AVAILABLE`,
            body: `A voluntary donor (${activeGroup}) is now AVAILABLE for emergency triage outreach in ${activeLocality}. Quiet hours and matching rules apply.`,
            metadata: { event: 'DONOR_AVAILABLE', bloodGroup: activeGroup, locality: activeLocality }
          });
        }

        // Active request matching check (Phase 7 automated availability alert)
        const activeRequests = db.prepare(`
          SELECT r.id, r.blood_group, r.requester_id, r.status, o.name as facility_name, o.latitude as fac_lat, o.longitude as fac_lng
          FROM emergency_requests r
          JOIN organizations o ON o.id = r.organization_id
          WHERE r.status IN ('VERIFIED', 'MATCHING')
        `).all();

        const matchingRequests = [];
        for (const req of activeRequests) {
          if (MatchingService.canDonateTo(activeGroup, req.blood_group)) {
            const dist = MatchingService.calculateDistanceKm(donorLat, donorLng, req.fac_lat, req.fac_lng);
            if (dist <= 50.0) {
              matchingRequests.push({ ...req, distance_km: dist });
            }
          }
        }

        // Alert requesters of matching open requests
        for (const match of matchingRequests) {
          if (match.requester_id) {
            NotificationService.sendNotification({
              recipientId: match.requester_id,
              channel: 'IN_APP',
              title: `🟢 Candidate Donor Available for ${match.id}`,
              body: `A compatible voluntary donor (${activeGroup}) is now AVAILABLE within ${match.distance_km} km. Review candidate pool in Hospital Triage.`,
              metadata: { event: 'MATCH_AVAILABLE', requestId: match.id, bloodGroup: activeGroup, distanceKm: match.distance_km }
            });
          }
        }

        // Alert the donor if matching emergency requests exist
        if (matchingRequests.length > 0) {
          NotificationService.sendNotification({
            recipientId: userId,
            channel: 'IN_APP',
            title: `🩸 ${matchingRequests.length} Emergency Request(s) Need Your Blood Group!`,
            body: `There are active emergency requests near you that match your blood type (${activeGroup}). Visit your Donor Portal to review and accept.`,
            metadata: { event: 'MATCHES_WAITING', matchCount: matchingRequests.length }
          });
        }
      } catch (notifErr) {
        console.error('[NotificationError]', notifErr.message);
      }
    }

    return AuthService.getDonorProfile(userId, { id: userId, role: 'DONOR' });
  }

  static changePassword(userId, { currentPassword, newPassword }) {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) throw new Error('User not found.');

    const bcrypt = require('bcryptjs');
    const valid = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!valid) {
      throw new Error('Incorrect current password.');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long.');
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, userId);

    logAudit({
      actorId: userId,
      actorRole: user.role,
      action: 'PASSWORD_CHANGED',
      entityType: 'USER',
      entityId: userId,
      details: { outcome: 'SUCCESS' }
    });

    return { success: true, message: 'Password changed successfully.' };
  }

  static verifyDonor(donorUserId, reviewerId, status = 'VERIFIED') {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE donor_profiles
      SET verification_status = ?, verified_by = ?, verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? OR id = ?
    `);
    const result = stmt.run(status, reviewerId, donorUserId, donorUserId);

    if (result.changes > 0) {
      db.prepare(`
        UPDATE users 
        SET is_verified = ? 
        WHERE id = ? OR id = (SELECT user_id FROM donor_profiles WHERE id = ?)
      `).run(status === 'VERIFIED' ? 1 : 0, donorUserId, donorUserId);

      logAudit({
        actorId: reviewerId,
        action: 'DONOR_VERIFICATION_PROCESSED',
        entityType: 'DONOR_PROFILE',
        entityId: donorUserId,
        details: { status }
      });

      // Notify donor
      try {
        const NotificationService = require('./notificationService');
        // Find user_id
        const profile = db.prepare('SELECT user_id FROM donor_profiles WHERE user_id = ? OR id = ?').get(donorUserId, donorUserId);
        const targetUserId = profile ? profile.user_id : donorUserId;

        NotificationService.sendNotification({
          recipientId: targetUserId,
          channel: 'IN_APP',
          title: `🛡️ Donor Profile ${status === 'VERIFIED' ? 'Verified' : 'Review Updated'}`,
          body: status === 'VERIFIED'
            ? `Your medical identity evidence has been verified by the Clinical Review Team. You are now cleared for priority emergency matching!`
            : `Your donor verification status has been marked as ${status}. Please review your documentation.`,
          metadata: { status }
        });
      } catch (e) {}
    }

    return { success: result.changes > 0, status };
  }

  // Controlled Password Reset Request (FR-AUTH-003)
  static requestPasswordReset(email) {
    const db = getDb();
    const user = db.prepare('SELECT id, email, full_name, phone FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) throw new Error('No user account found matching this email address.');

    const resetId = 'RST-' + Date.now().toString(36).toUpperCase();
    const token = 'TOK-' + Math.random().toString(36).substr(2) + '-' + Date.now().toString(36);
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO password_resets (id, user_id, token, otp_code, expires_at, is_used)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(resetId, user.id, token, otpCode, expiresAt);

    logAudit({
      actorId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'USER',
      entityId: user.id,
      details: { email: user.email }
    });

    try {
      const NotificationService = require('./notificationService');
      NotificationService.sendNotification({
        recipientId: user.id,
        channel: 'IN_APP',
        title: `🔑 Security: Password Reset OTP`,
        body: `Your one-time security code is ${otpCode}. Valid for 15 minutes. Do not disclose this code.`,
        metadata: { resetId, expiresAt }
      });
    } catch (e) {}

    return {
      success: true,
      message: 'Password reset OTP generated and dispatched to registered contact.',
      reset_token: token,
      simulated_otp: otpCode
    };
  }

  // Reset Password Execution (FR-AUTH-003)
  static resetPassword({ reset_token, otp_code, new_password }) {
    const db = getDb();
    const reset = db.prepare(`
      SELECT * FROM password_resets
      WHERE token = ? AND otp_code = ? AND is_used = 0
    `).get(reset_token, otp_code);

    if (!reset) {
      throw new Error('Invalid or expired reset token or OTP code.');
    }

    if (new Date(reset.expires_at) < new Date()) {
      throw new Error('Password reset token has expired. Please initiate a new request.');
    }

    if (!new_password || new_password.length < 8) {
      throw new Error('New password must contain at least 8 characters.');
    }

    const newHash = bcrypt.hashSync(new_password, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, reset.user_id);
    db.prepare('UPDATE password_resets SET is_used = 1 WHERE id = ?').run(reset.id);

    logAudit({
      actorId: reset.user_id,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'USER',
      entityId: reset.user_id,
      details: { reset_id: reset.id }
    });

    return {
      success: true,
      message: 'Password has been successfully updated. You may now log in with your new credentials.'
    };
  }

  // Toggle MFA (FR-AUTH-007)
  static toggleMfa(userId, enabled) {
    const db = getDb();
    db.prepare('UPDATE users SET mfa_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(enabled ? 1 : 0, userId);

    logAudit({
      actorId: userId,
      action: enabled ? 'MFA_ENABLED' : 'MFA_DISABLED',
      entityType: 'USER',
      entityId: userId,
      details: { mfa_enabled: enabled }
    });

    return { success: true, mfa_enabled: enabled ? 1 : 0 };
  }

  // List Unverified Donors for Clinical Review
  static listPendingDonors() {
    const db = getDb();
    return db.prepare(`
      SELECT p.*, u.full_name, u.email, u.phone, u.created_at as registered_at
      FROM donor_profiles p
      JOIN users u ON u.id = p.user_id
      WHERE p.verification_status IN ('PENDING', 'SELF_DECLARED')
      ORDER BY p.created_at ASC
    `).all();
  }

  // Public Credential Verification (Part 5 & 6, zero PII leakage)
  static verifyCredential(code) {
    if (!code || typeof code !== 'string') {
      return { valid: false, error: 'INVALID_CODE', message: 'Verification code must be provided.' };
    }
    const cleanCode = code.trim();
    const db = getDb();

    // 1. Check donor digital credentials
    const donor = db.prepare(`
      SELECT p.*, u.full_name, u.role, u.is_verified, u.created_at as member_since
      FROM donor_profiles p
      JOIN users u ON u.id = p.user_id
      WHERE p.qr_verification_code = ? OR p.member_id = ? OR p.user_id = ?
    `).get(cleanCode, cleanCode, cleanCode);

    if (donor) {
      const donationCount = db.prepare('SELECT COUNT(*) as c FROM donation_history WHERE donor_id = ?').get(donor.user_id).c;
      let badge = 'Bronze Contributor';
      if (donationCount >= 10) badge = 'Diamond Lifetime Lifesaver';
      else if (donationCount >= 5) badge = 'Gold Hero Donor';
      else if (donationCount >= 3) badge = 'Silver Community Guardian';

      // Mask name for DPDP compliance (e.g. Vikram Sharma -> Vikram S.)
      const parts = donor.full_name.trim().split(/\s+/);
      const displayName = parts.length > 1
        ? `${parts[0]} ${parts[parts.length - 1][0]}.`
        : donor.full_name;

      return {
        valid: true,
        credential_type: 'DIGITAL_DONOR_ID',
        member_id: donor.member_id || `BL-MEM-${donor.user_id.replace(/^USR-/, '')}`,
        display_name: displayName,
        account_type: 'VERIFIED_VOLUNTARY_DONOR',
        verified_blood_group: donor.blood_group,
        verification_status: donor.verification_status,
        credential_validity: donor.verification_status === 'VERIFIED' ? 'ACTIVE_VALID' : 'PROVISIONAL_SELF_DECLARED',
        availability_status: donor.availability_status,
        locality: donor.address_locality || 'Hyderabad Region',
        lifetime_donations: donationCount,
        milestone_badge: badge,
        verified_at: new Date().toISOString(),
        issuing_authority: 'BloodLink 3.0 Clinical Authority'
      };
    }

    // 2. Check donation certificate hash
    const cert = db.prepare(`
      SELECT d.id, d.donation_date, d.blood_component, d.units_donated, d.hemoglobin_g_dl,
             d.certificate_hash, d.created_at, o.name as facility_name, o.address as facility_city,
             u.full_name as donor_full_name
      FROM donation_history d
      JOIN organizations o ON o.id = d.organization_id
      JOIN users u ON u.id = d.donor_id
      WHERE d.certificate_hash = ?
    `).get(cleanCode);

    if (cert) {
      const parts = cert.donor_full_name.trim().split(/\s+/);
      const displayName = parts.map(p => p[0].toUpperCase() + '.').join(' ');

      return {
        valid: true,
        credential_type: 'DONATION_CERTIFICATE',
        certificate_hash: cert.certificate_hash,
        display_name: displayName,
        facility_name: cert.facility_name,
        facility_city: cert.facility_city,
        donation_date: cert.donation_date,
        blood_component: cert.blood_component,
        units_donated: cert.units_donated,
        hemoglobin_g_dl: cert.hemoglobin_g_dl,
        credential_validity: 'ACTIVE_VALID',
        verified_at: new Date().toISOString(),
        issuing_authority: 'BloodLink 3.0 Clinical Authority & Telangana Emergency Network'
      };
    }

    return {
      valid: false,
      error: 'CREDENTIAL_NOT_FOUND',
      message: 'No official BloodLink digital credential or certificate found matching this verification code.'
    };
  }
}

module.exports = AuthService;
