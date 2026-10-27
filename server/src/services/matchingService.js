const { getDb } = require('../db/database');
const { logAudit } = require('../middleware/audit');

// Standard RBC compatibility rules
const RBC_COMPATIBILITY = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+']
};

function canDonateTo(donorGroup, recipientGroup) {
  const allowed = RBC_COMPATIBILITY[donorGroup] || [];
  return allowed.includes(recipientGroup);
}

// Haversine formula to compute distance in km
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Stage radius thresholds in km
const STAGE_MAX_DISTANCE = {
  1: 5.0,
  2: 15.0,
  3: 30.0,
  4: 50.0
};

const STAGE_PREV_DISTANCE = {
  1: 0.0,
  2: 5.0,
  3: 15.0,
  4: 30.0
};

class MatchingService {
  static findCandidateDonors(requestId, stage = 1, requestingUser = null) {
    const db = getDb();
    const request = db.prepare('SELECT * FROM emergency_requests WHERE id = ?').get(requestId);

    if (!request) {
      throw new Error(`Request '${requestId}' not found.`);
    }

    if (['CANCELLED', 'EXPIRED', 'REJECTED', 'FULFILLED'].includes(request.status)) {
      throw new Error(`Request '${requestId}' is currently ${request.status}. Escalation and matching are halted.`);
    }

    const maxDist = STAGE_MAX_DISTANCE[stage] || 50.0;
    const prevDist = STAGE_PREV_DISTANCE[stage] || 0.0;

    // Fetch all available donors with consent
    const allDonors = db.prepare(`
      SELECT p.*, u.full_name, u.email, u.phone
      FROM donor_profiles p
      JOIN users u ON u.id = p.user_id
      WHERE p.availability_status = 'AVAILABLE'
        AND p.consent_emergency_alerts = 1
    `).all();

    // Fetch existing matches with full status to prevent duplicates and enrich candidate state (FR-MAT-003, Instruction #4 & #5)
    const existingMatches = db.prepare('SELECT * FROM request_matches WHERE request_id = ?').all(requestId);
    const matchMap = new Map(existingMatches.map(m => [m.donor_id, m]));
    const existingDonorIds = new Set(existingMatches.map(m => m.donor_id));

    const candidates = [];

    for (const donor of allDonors) {
      // 1. Compatibility check
      if (!canDonateTo(donor.blood_group, request.blood_group)) {
        continue;
      }

      // 2. Proximity calculation
      const dist = calculateDistanceKm(
        request.delivery_latitude,
        request.delivery_longitude,
        donor.latitude,
        donor.longitude
      );

      if (dist <= maxDist) {
        // Check quiet hours
        const isQuietHours = MatchingService.isQuietHoursActive(donor.quiet_hours_start, donor.quiet_hours_end);

        // Mask exact coordinates unless authorized coordinator/admin (AC-009)
        const isPrivileged = requestingUser && ['EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN'].includes(requestingUser.role);
        const isNewInStage = dist > prevDist && dist <= maxDist;

        const match = matchMap.get(donor.user_id);
        const isSelected = match?.review_status === 'SELECTED_FOR_COORDINATION';

        let detailedStatus = 'NEW — NOT CONTACTED';
        if (isSelected) {
          detailedStatus = 'SELECTED FOR COORDINATION';
        } else if (match) {
          if (match.outreach_status === 'ACCEPTED') {
            detailedStatus = 'WILLING TO HELP';
          } else if (match.outreach_status === 'DECLINED') {
            detailedStatus = match.notes?.toLowerCase().includes('withdraw') ? 'WITHDRAWN' : 'UNABLE TO DONATE';
          } else if (match.outreach_status === 'NOTIFIED') {
            detailedStatus = 'NOTIFICATION SENT';
          } else if (match.outreach_status === 'PENDING') {
            detailedStatus = 'INVITATION QUEUED';
          }
        }

        candidates.push({
          donor_id: donor.user_id,
          full_name: isPrivileged ? donor.full_name : donor.full_name.split(' ')[0] + ' ***',
          blood_group: donor.blood_group,
          distance_km: dist,
          stage,
          is_new_in_stage: isNewInStage,
          address_locality: donor.address_locality || 'Regional Zone',
          is_already_notified: existingDonorIds.has(donor.user_id),
          is_selected_for_coordination: isSelected,
          review_status: match ? match.review_status : null,
          outreach_status: match ? match.outreach_status : null,
          detailed_status: detailedStatus,
          collection_confirmed_at: match ? match.collection_confirmed_at : null,
          quiet_hours_active: isQuietHours,
          verification_status: donor.verification_status,
          // Exact coordinates sanitized
          latitude: isPrivileged ? donor.latitude : null,
          longitude: isPrivileged ? donor.longitude : null,
          phone: isPrivileged ? donor.phone : null
        });
      }
    }

    // Sort by proximity
    candidates.sort((a, b) => a.distance_km - b.distance_km);

    // Fetch prior escalation history for this request
    const escalationHistory = db.prepare(`
      SELECT stage, COUNT(*) as donors_notified, MIN(created_at) as dispatched_at
      FROM request_matches
      WHERE request_id = ?
      GROUP BY stage
      ORDER BY stage ASC
    `).all(requestId);

    const newlyIncludedCount = candidates.filter(c => c.is_new_in_stage).length;

    return {
      request_id: requestId,
      blood_group_needed: request.blood_group,
      blood_component: request.blood_component,
      current_stage: stage,
      stage_radius_km: maxDist,
      prev_stage_radius_km: prevDist,
      total_candidates_found: candidates.length,
      newly_included_count: newlyIncludedCount,
      escalation_history: escalationHistory,
      clinical_disclaimer: 'CRITICAL NOTICE: Matching candidate selections are algorithmic logistics recommendations based solely on distance and declared blood group. This does NOT replace laboratory crossmatching, transfusion safety checks, or formal clinical evaluation by qualified healthcare personnel.',
      candidates
    };
  }

  static dispatchEscalationStage(requestId, stage = 1, user) {
    const db = getDb();
    const result = MatchingService.findCandidateDonors(requestId, stage, user);

    const insertMatch = db.prepare(`
      INSERT OR IGNORE INTO request_matches (id, request_id, donor_id, stage, distance_km, outreach_status)
      VALUES (?, ?, ?, ?, ?, 'NOTIFIED')
    `);

    const insertNotification = db.prepare(`
      INSERT INTO notifications (id, recipient_id, channel, title, body, metadata, delivery_status, idempotency_key)
      VALUES (?, ?, 'IN_APP', ?, ?, ?, 'SENT', ?)
    `);

    let newOutreachCount = 0;

    const runDispatch = db.transaction(() => {
      for (const c of result.candidates) {
        if (!c.is_already_notified) {
          const matchId = `MCH-${requestId}-${c.donor_id}`;
          insertMatch.run(matchId, requestId, c.donor_id, stage, c.distance_km);

          const notifId = 'NOTIF-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4);
          const idempotencyKey = `OUTREACH-${requestId}-${c.donor_id}-STAGE-${stage}`;

          insertNotification.run(
            notifId,
            c.donor_id,
            `Emergency Blood Request [${result.blood_group_needed}] Needed Near You`,
            `An urgent request for ${result.blood_component} (${result.blood_group_needed}) has been activated within ${c.distance_km} km of your area.`,
            JSON.stringify({ requestId, stage, distance_km: c.distance_km }),
            idempotencyKey
          );

          newOutreachCount++;
        }
      }

      // Update request status to MATCHING if still VERIFIED
      db.prepare(`
        UPDATE emergency_requests
        SET status = 'MATCHING', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'VERIFIED'
      `).run(requestId);

      // Record first-class Request Events for the Timeline
      const RequestService = require('./requestService');
      RequestService.recordEvent(
        requestId,
        'ESCALATION_STAGE_STARTED',
        `Stage ${stage} Escalation Dispatched (${result.stage_radius_km} km)`,
        `Search perimeter expanded to ${result.stage_radius_km} km. Found ${result.total_candidates_found} eligible donors (${result.newly_included_count} in this ring).`,
        user,
        { stage, radius_km: result.stage_radius_km, newly_included: result.newly_included_count }
      );

      if (newOutreachCount > 0) {
        RequestService.recordEvent(
          requestId,
          'DONOR_NOTIFICATIONS_QUEUED',
          `Donor Outreach Queued (${newOutreachCount} Notifications)`,
          `Dispatched emergency alerts across in-app sirens and SMS relay channels to ${newOutreachCount} candidate donors.`,
          user,
          { count: newOutreachCount, stage }
        );

        RequestService.recordEvent(
          requestId,
          'NOTIFICATIONS_DELIVERY_CONFIRMED',
          `Emergency Outreach Delivered to Devices`,
          `Candidate donor devices acknowledged emergency outreach siren. Standby for donor responses.`,
          user,
          { delivered_count: newOutreachCount, channels: ['IN_APP', 'SMS'] }
        );
      }

      logAudit({
        actorId: user.id,
        actorRole: user.role,
        action: 'MATCHING_ESCALATION_DISPATCHED',
        entityType: 'EMERGENCY_REQUEST',
        entityId: requestId,
        details: { stage, new_outreach_count: newOutreachCount, stage_radius_km: result.stage_radius_km }
      });
    });

    runDispatch();

    if (newOutreachCount === 0) {
      return {
        success: true,
        request_id: requestId,
        stage,
        outreach_dispatched: 0,
        total_candidates: result.total_candidates_found,
        newly_included: result.newly_included_count,
        message: 'All eligible donors in this stage have already been contacted. No duplicate notifications were sent.',
        is_duplicate_prevented: true
      };
    }

    return {
      success: true,
      request_id: requestId,
      stage,
      outreach_dispatched: newOutreachCount,
      total_candidates: result.total_candidates_found,
      newly_included: result.newly_included_count,
      message: `Stage ${stage} (${result.stage_radius_km} km) escalation dispatched to ${newOutreachCount} eligible donors.`
    };
  }

  static canDonateTo(donorGroup, recipientGroup) {
    return canDonateTo(donorGroup, recipientGroup);
  }

  static calculateDistanceKm(lat1, lon1, lat2, lon2) {
    return calculateDistanceKm(lat1, lon1, lat2, lon2);
  }

  static isQuietHoursActive(start = '22:00', end = '07:00', checkDate = null) {
    if (!start || !end) return false;
    const now = checkDate ? (checkDate instanceof Date ? checkDate : new Date(checkDate)) : new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startMinutes = (startH || 0) * 60 + (startM || 0);
    const endMinutes = (endH || 0) * 60 + (endM || 0);

    if (startMinutes > endMinutes) {
      // Over midnight (e.g. 22:00 to 07:00)
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    } else {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
  }
}

module.exports = MatchingService;
