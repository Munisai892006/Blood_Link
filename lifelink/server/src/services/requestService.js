const { getDb } = require('../db/database');
const { logAudit } = require('../middleware/audit');

const VALID_TRANSITIONS = {
  DRAFT: ['PENDING_REVIEW', 'CANCELLED'],
  PENDING_REVIEW: ['VERIFIED', 'REJECTED', 'CANCELLED'],
  VERIFIED: ['MATCHING', 'CANCELLED'],
  MATCHING: ['PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED', 'EXPIRED'],
  PARTIALLY_FULFILLED: ['FULFILLED', 'CANCELLED', 'EXPIRED'],
  FULFILLED: [],
  CANCELLED: [],
  EXPIRED: [],
  REJECTED: []
};

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return null;
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const remainingS = s % 60;
  const h = Math.floor(m / 60);
  const remainingM = m % 60;

  if (h > 0) return `${h}h ${remainingM}m ${remainingS}s`;
  if (m > 0) return `${m}m ${remainingS}s`;
  return `${s}s`;
}

function recordRequestEvent(db, requestId, eventType, title, description, actor = {}, metadata = {}) {
  const id = 'REQ-EVT-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
  try {
    db.prepare(`
      INSERT INTO request_events (id, request_id, event_type, title, description, actor_id, actor_name, actor_role, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      id,
      requestId,
      eventType,
      title,
      description,
      actor.id || 'SYSTEM',
      actor.full_name || actor.name || 'System Engine',
      actor.role || 'SYSTEM',
      JSON.stringify(metadata)
    );
  } catch (err) {
    console.error('[RecordRequestEventError]', err.message);
  }
  return id;
}

class RequestService {
  static recordEvent(requestId, eventType, title, description, actor = {}, metadata = {}) {
    const db = getDb();
    return recordRequestEvent(db, requestId, eventType, title, description, actor, metadata);
  }

  static createRequest(data, user) {
    const db = getDb();

    // Validation (FR-REQ-002)
    const deliveryAddress = data.delivery_address || data.hospital_department;
    const requiredBy = data.required_by || data.required_by_time;

    if (!data.blood_group || !data.blood_component || !data.units_requested || !deliveryAddress || !requiredBy) {
      throw new Error('Missing mandatory fields: blood_group, blood_component, units_requested, delivery_address, and required_by are required.');
    }

    if (data.units_requested <= 0) {
      throw new Error('Units requested must be a positive integer greater than zero.');
    }

    const orgId = user.organization_id || data.organization_id || 'ORG-HOSP-01';

    // Prevent rapid duplicate submission within 5 seconds (AC-011 Duplicate Block)
    const recentDuplicate = db.prepare(`
      SELECT * FROM emergency_requests
      WHERE requester_id = ?
        AND blood_group = ?
        AND blood_component = ?
        AND units_requested = ?
        AND (patient_reference = ? OR (patient_reference IS NULL AND ? IS NULL))
        AND created_at >= datetime('now', '-5 seconds')
      LIMIT 1
    `).get(
      user.id,
      data.blood_group,
      data.blood_component,
      parseInt(data.units_requested, 10),
      data.patient_reference || null,
      data.patient_reference || null
    );

    if (recentDuplicate) {
      throw new Error(`Duplicate submission detected: Identical emergency request ${recentDuplicate.id} was submitted less than 5 seconds ago.`);
    }

    const requestId = 'REQ-2026-' + Math.floor(1000 + Math.random() * 9000);

    const initialStatus = data.is_draft ? 'DRAFT' : 'PENDING_REVIEW';

    const stmt = db.prepare(`
      INSERT INTO emergency_requests (
        id, organization_id, requester_id, patient_reference, blood_component,
        blood_group, units_requested, units_fulfilled, urgency_level,
        clinical_justification, hospital_department, delivery_latitude,
        delivery_longitude, delivery_address, required_by, status, is_synthetic
      ) VALUES (
        @id, @organization_id, @requester_id, @patient_reference, @blood_component,
        @blood_group, @units_requested, 0, @urgency_level,
        @clinical_justification, @hospital_department, @delivery_latitude,
        @delivery_longitude, @delivery_address, @required_by, @status, 0
      )
    `);

    stmt.run({
      id: requestId,
      organization_id: orgId,
      requester_id: user.id,
      patient_reference: data.patient_reference || null,
      blood_component: data.blood_component,
      blood_group: data.blood_group,
      units_requested: parseInt(data.units_requested, 10),
      urgency_level: data.urgency_level === 'CRITICAL' ? 'CRITICAL_EMERGENCY' : (data.urgency_level || 'NORMAL'),
      clinical_justification: data.clinical_justification || null,
      hospital_department: data.hospital_department || 'Emergency Ward',
      delivery_latitude: data.delivery_latitude || 17.4156,
      delivery_longitude: data.delivery_longitude || 78.4750,
      delivery_address: data.delivery_address,
      required_by: data.required_by,
      status: initialStatus
    });

    // 1. Record Created Event
    recordRequestEvent(
      db,
      requestId,
      'REQUEST_CREATED',
      'Emergency Blood Request Created',
      `${data.units_requested} Units of ${data.blood_group} ${data.blood_component.replace(/_/g, ' ')} registered with urgency ${data.urgency_level || 'NORMAL'}.`,
      user,
      { units: data.units_requested, blood_group: data.blood_group, blood_component: data.blood_component, urgency: data.urgency_level }
    );

    // 2. If submitted directly for review, record submitted event
    if (!data.is_draft) {
      recordRequestEvent(
        db,
        requestId,
        'REQUEST_SUBMITTED',
        'Emergency Request Submitted to Clinical Triage',
        `Dispatched to verification reviewer queue for clinical validation and emergency allocation.`,
        user,
        { submitted_at: new Date().toISOString() }
      );
    }

    logAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'REQUEST_CREATED',
      entityType: 'EMERGENCY_REQUEST',
      entityId: requestId,
      details: {
        units: data.units_requested,
        blood_group: data.blood_group,
        blood_component: data.blood_component,
        urgency: data.urgency_level,
        status: initialStatus
      }
    });

    // Notify Emergency Roles & Trigger Automated Matching (Part 1, 2, 4)
    try {
      const NotificationService = require('./notificationService');
      const MatchingService = require('./matchingService');

      // 1. Broadcast to Admins, Reviewers, Coordinators & Requester
      NotificationService.notifyEmergencyRoles({
        request: {
          id: requestId,
          requester_id: user.id,
          blood_group: data.blood_group,
          units_requested: parseInt(data.units_requested, 10),
          hospital_name: data.delivery_address || 'Emergency Hospital',
          delivery_address: data.delivery_address,
          urgency_level: data.urgency_level
        },
        eventType: 'EMERGENCY_REQUEST_SUBMITTED',
        title: `🚨 Emergency Request: ${data.blood_group} Needed (${data.units_requested} units)`,
        body: `Emergency blood request ${requestId} logged at ${data.delivery_address} (${data.units_requested} units, ${data.urgency_level || 'NORMAL'}).`,
        metadata: { urgency: data.urgency_level }
      });

      // 2. Automated Donor Matching Engine (Immediate Trigger)
      const matchResult = MatchingService.findCandidateDonors(requestId, 1, user);
      if (matchResult.candidates && matchResult.candidates.length > 0) {
        MatchingService.dispatchEscalationStage(requestId, 1, user);
      } else {
        // Record truthful NO_MATCH_FOUND timeline event
        recordRequestEvent(
          db,
          requestId,
          'NO_MATCH_FOUND',
          'No Matching Donors in Primary Perimeter',
          'No eligible matching donors were found at this time. Your emergency request has been saved. The system is expanding the search and notifying the authorized emergency coordination team.',
          user,
          { stage: 1, radius_km: 5.0, automated: true }
        );

        // Notify Coordinators of required perimeter expansion
        const coords = db.prepare("SELECT id FROM users WHERE role = 'EMERGENCY_COORDINATOR'").all();
        for (const c of coords) {
          NotificationService.sendNotification({
            recipientId: c.id,
            channel: 'IN_APP',
            title: `⚠️ Search Expansion Needed: Request ${requestId} (${data.blood_group})`,
            body: `Zero matching donors found in primary radius (5 km). Immediate coordinator escalation required.`,
            metadata: { requestId, stage: 1, action: 'ESCALATION_REQUIRED' }
          });
        }
      }
    } catch (notifErr) {
      console.error('[Notification/MatchingError]', notifErr.message);
    }

    return RequestService.getRequestById(requestId);
  }

  // Public Emergency Request Creation (No Login Required - Section 1)
  static createPublicRequest(data) {
    const db = getDb();

    // 1. Validate mandatory fields
    const bloodGroup = (data.blood_group || '').trim().toUpperCase();
    const bloodComponent = (data.blood_component || 'RED_BLOOD_CELLS').trim().toUpperCase();
    const unitsRequested = parseInt(data.units_requested, 10);
    let urgencyLevel = (data.urgency_level || 'CRITICAL_EMERGENCY').trim().toUpperCase();
    if (urgencyLevel === 'CRITICAL') urgencyLevel = 'CRITICAL_EMERGENCY';
    const requesterName = (data.requester_name || data.patient_name || '').trim();
    const requesterPhone = (data.requester_phone || data.contact_phone || '').trim();
    const requesterRelationship = (data.requester_relationship || 'Relative/Family').trim();
    const hospitalName = (data.hospital_name || '').trim();
    const hospitalDept = (data.hospital_department || 'Emergency Room').trim();
    const deliveryAddress = (data.delivery_address || hospitalName || 'Emergency Trauma Center').trim();
    const deliveryLat = parseFloat(data.delivery_latitude) || 17.4065;
    const deliveryLng = parseFloat(data.delivery_longitude) || 78.4772;
    const requiredBy = data.required_by || data.required_by_time || new Date(Date.now() + 86400000).toISOString();
    const patientRef = data.patient_reference ? data.patient_reference.trim() : `PT-PUB-${Math.floor(1000 + Math.random() * 9000)}`;
    const clinicalJustification = (data.clinical_justification || 'Emergency Blood Request submitted via Public Portal').trim();

    if (!bloodGroup || !['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(bloodGroup)) {
      throw new Error('Valid blood group is required (A+, A-, B+, B-, AB+, AB-, O+, O-).');
    }

    if (!unitsRequested || isNaN(unitsRequested) || unitsRequested <= 0 || unitsRequested > 50) {
      throw new Error('Units requested must be a valid number between 1 and 50.');
    }

    if (!requesterName || requesterName.length < 2) {
      throw new Error('Requester full name is required.');
    }

    // Phone validation (minimum 10 digits)
    const cleanPhone = requesterPhone.replace(/[^0-9+]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      throw new Error('A valid contact telephone number with at least 10 digits is required for verification.');
    }

    if (!hospitalName && !data.organization_id) {
      throw new Error('Hospital or medical facility name is required.');
    }

    // Map organization_id if hospital exists in database or use default
    let orgId = data.organization_id;
    if (!orgId) {
      const matchedOrg = db.prepare(`
        SELECT id FROM organizations
        WHERE LOWER(name) LIKE ? OR LOWER(address) LIKE ?
        LIMIT 1
      `).get(`%${hospitalName.toLowerCase()}%`, `%${hospitalName.toLowerCase()}%`);
      orgId = matchedOrg ? matchedOrg.id : 'ORG-HOSP-01';
    }

    // Rapid duplicate prevention (within 60 seconds from same phone and patient reference)
    const recentDuplicate = db.prepare(`
      SELECT id, access_pin FROM emergency_requests
      WHERE requester_phone = ? AND patient_reference = ? AND created_at >= datetime('now', '-60 seconds')
      LIMIT 1
    `).get(cleanPhone, patientRef);

    if (recentDuplicate) {
      return {
        success: true,
        reference_id: recentDuplicate.id,
        access_pin: recentDuplicate.access_pin,
        status: 'SUBMITTED_PENDING_VERIFICATION',
        verification_status: 'SUBMITTED_PENDING_VERIFICATION',
        message: 'A duplicate request was recently received. Reusing your existing reference number.',
        is_duplicate_reuse: true
      };
    }

    // Generate unique reference: REQ-2026-XXXX
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const reqId = `REQ-2026-${randomSuffix}`;
    // 6-digit access PIN for secure status tracking
    const accessPin = String(Math.floor(100000 + Math.random() * 900000));

    // Save into emergency_requests
    db.prepare(`
      INSERT INTO emergency_requests (
        id, organization_id, requester_id, patient_reference, blood_component,
        blood_group, units_requested, units_fulfilled, urgency_level, clinical_justification,
        hospital_department, delivery_latitude, delivery_longitude, delivery_address,
        required_by, status, is_synthetic, requester_name, requester_phone,
        requester_relationship, access_pin, is_public_submission, verification_status, hospital_name
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, 0, ?, ?,
        ?, ?, ?, ?,
        ?, 'PENDING_REVIEW', 0, ?, ?,
        ?, ?, 1, 'SUBMITTED_PENDING_VERIFICATION', ?
      )
    `).run(
      reqId,
      orgId,
      'USR-PUB-01',
      patientRef,
      bloodComponent,
      bloodGroup,
      unitsRequested,
      urgencyLevel,
      clinicalJustification,
      hospitalDept,
      deliveryLat,
      deliveryLng,
      deliveryAddress,
      requiredBy,
      requesterName,
      cleanPhone,
      requesterRelationship,
      accessPin,
      hospitalName
    );

    // Record timeline event
    recordRequestEvent(
      db,
      reqId,
      'REQUEST_SUBMITTED_PUBLIC',
      'Emergency Request Submitted (Public Portal)',
      `Emergency request submitted by ${requesterName} (${requesterRelationship}) for ${unitsRequested} unit(s) of ${bloodGroup} at ${hospitalName || 'Regional Hospital'}. Status: SUBMITTED_PENDING_VERIFICATION.`,
      { id: 'USR-PUB-01', role: 'PUBLIC_VISITOR', full_name: requesterName },
      { requesterPhone: cleanPhone, hospitalName, accessPin }
    );

    // Multi-Role Broadcast Notification & Automated Matching (Part 1, 2, 4)
    try {
      const NotificationService = require('./notificationService');
      const MatchingService = require('./matchingService');

      // 1. Notify Emergency Roles (Admins, Reviewers, Coordinators) + Receipt to Public Requester
      NotificationService.notifyEmergencyRoles({
        request: {
          id: reqId,
          blood_group: bloodGroup,
          units_requested: unitsRequested,
          hospital_name: hospitalName,
          delivery_address: deliveryAddress,
          access_pin: accessPin,
          requester_id: 'USR-PUB-01',
          is_public_submission: 1,
          urgency_level: urgencyLevel
        },
        eventType: 'PUBLIC_EMERGENCY_REQUEST_SUBMITTED',
        title: `🚨 Public Emergency Request: ${reqId} (${bloodGroup})`,
        body: `Emergency request for ${unitsRequested} unit(s) of ${bloodGroup} at ${hospitalName} requires clinical verification. Requester: ${requesterName} (${cleanPhone}).`,
        metadata: {
          requestId: reqId,
          hospitalName,
          requesterPhone: cleanPhone,
          accessPin
        }
      });

      // 2. Automated Donor Matching Engine (Immediate Trigger)
      const publicActor = { id: 'USR-PUB-01', role: 'PUBLIC_VISITOR', full_name: requesterName };
      const matchResult = MatchingService.findCandidateDonors(reqId, 1, publicActor);
      if (matchResult.candidates && matchResult.candidates.length > 0) {
        MatchingService.dispatchEscalationStage(reqId, 1, publicActor);
      } else {
        // Record truthful NO_MATCH_FOUND timeline event (Section 7)
        recordRequestEvent(
          db,
          reqId,
          'NO_MATCH_FOUND',
          'No Matching Donors in Primary Perimeter',
          'No eligible matching donors were found at this time. Your emergency request has been saved. The system is expanding the search and notifying the authorized emergency coordination team.',
          publicActor,
          { stage: 1, radius_km: 5.0, automated: true }
        );

        // Notify Coordinators of required perimeter expansion
        const coordinators = db.prepare("SELECT id FROM users WHERE role = 'EMERGENCY_COORDINATOR'").all();
        for (const coord of coordinators) {
          NotificationService.sendNotification({
            recipientId: coord.id,
            channel: 'IN_APP',
            title: `⚠️ Search Expansion Needed: Public Request ${reqId} (${bloodGroup})`,
            body: `Zero matching donors found in primary radius (5 km) for ${hospitalName}. Immediate coordinator escalation required.`,
            metadata: { requestId: reqId, stage: 1, action: 'ESCALATION_REQUIRED' }
          });
        }
      }
    } catch (notifErr) {
      console.error('[PublicNotification/MatchingError]', notifErr.message);
    }

    return {
      success: true,
      reference_id: reqId,
      access_pin: accessPin,
      status: 'SUBMITTED_PENDING_VERIFICATION',
      verification_status: 'SUBMITTED_PENDING_VERIFICATION',
      hospital_name: hospitalName,
      blood_group: bloodGroup,
      units_requested: unitsRequested,
      message: 'Emergency request submitted successfully. Triage coordinators and hospital verification desk have been alerted.',
      tracking_url: `/#/track/${reqId}`
    };
  }

  // Public Request Tracking (Section 1 - Zero PII Exposure)
  static trackPublicRequest(referenceId, accessPinOrPhone = null) {
    const db = getDb();
    if (!referenceId) throw new Error('Emergency reference ID is required (e.g. REQ-2026-XXXX).');

    const cleanRef = referenceId.trim().toUpperCase();
    const cleanPin = (accessPinOrPhone || '').trim();

    const req = db.prepare(`
      SELECT r.id, r.blood_group, r.blood_component, r.units_requested, r.units_fulfilled,
             r.urgency_level, r.status, r.verification_status, r.hospital_name,
             r.hospital_department, r.delivery_address, r.required_by, r.created_at,
             r.access_pin, r.requester_phone, r.requester_name,
             o.name as facility_name
      FROM emergency_requests r
      LEFT JOIN organizations o ON o.id = r.organization_id
      WHERE UPPER(r.id) = ?
    `).get(cleanRef);

    if (!req) {
      return { found: false, error: 'NOT_FOUND', message: 'No emergency request found matching reference number.' };
    }

    // Check PIN or phone match if provided
    if (cleanPin) {
      const normPin = cleanPin.replace(/[^0-9]/g, '');
      const normPhone = (req.requester_phone || '').replace(/[^0-9]/g, '');
      const isPinMatch = cleanPin === req.access_pin || (normPin.length >= 6 && normPhone.includes(normPin)) || (req.requester_phone && req.requester_phone.includes(cleanPin));
      if (!isPinMatch) {
        return { found: false, error: 'AUTH_FAILED', message: 'The access PIN or phone number does not match this request.' };
      }
    }

    // Get timeline events
    const timeline = db.prepare(`
      SELECT event_type, title as event_title, description as event_description, created_at
      FROM request_events
      WHERE request_id = ?
      ORDER BY created_at ASC
    `).all(cleanRef);

    // Get anonymized match count (zero PII)
    const matchesCount = db.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN outreach_status = 'ACCEPTED' THEN 1 ELSE 0 END) as accepted
      FROM request_matches
      WHERE request_id = ?
    `).get(cleanRef);

    const totalMatches = matchesCount?.total || 0;
    const acceptedCount = matchesCount?.accepted || 0;

    let publicSummary = `Request status: ${req.status}`;
    if (totalMatches === 0) {
      publicSummary = 'No eligible matching donors were found at this time. Your emergency request has been saved. The system is expanding the search and notifying the authorized emergency coordination team.';
    } else if (req.status === 'MATCHING') {
      publicSummary = 'Invitations have been sent to eligible matching donors. Responses and hospital verification are pending.';
    } else if (req.verification_status === 'SUBMITTED_PENDING_VERIFICATION') {
      publicSummary = 'Your request has been received and is queued for verification by the hospital triage desk.';
    }

    return {
      found: true,
      reference_id: req.id,
      status: req.verification_status === 'SUBMITTED_PENDING_VERIFICATION' ? 'SUBMITTED_PENDING_VERIFICATION' : req.status,
      display_status: req.verification_status === 'SUBMITTED_PENDING_VERIFICATION' ? 'SUBMITTED_PENDING_VERIFICATION' : req.status,
      hospital_name: req.hospital_name || req.facility_name,
      department: req.hospital_department,
      blood_group: req.blood_group,
      blood_component: req.blood_component,
      units_requested: req.units_requested,
      units_fulfilled: req.units_fulfilled,
      urgency_level: req.urgency_level,
      required_by: req.required_by,
      created_at: req.created_at,
      matched_donors_contacted: totalMatches,
      donor_willingness_responses: acceptedCount,
      timeline,
      public_safe_summary: publicSummary
    };
  }

  static getRequestById(requestId) {
    const db = getDb();
    const request = db.prepare(`
      SELECT r.*,
             COALESCE(o.name, r.hospital_name, 'Regional Medical Facility') AS organization_name,
             COALESCE(u.full_name, r.requester_name, 'Emergency Requester') AS requester_name,
             COALESCE(u.email, 'triage@emergency.bloodlink.org') AS requester_email,
             COALESCE(u.phone, r.requester_phone) AS requester_phone_contact
      FROM emergency_requests r
      LEFT JOIN organizations o ON o.id = r.organization_id
      LEFT JOIN users u ON u.id = r.requester_id
      WHERE r.id = ?
    `).get(requestId);

    return request || null;
  }

  static listRequests(filters = {}) {
    const db = getDb();
    let query = `
      SELECT r.*,
             COALESCE(o.name, r.hospital_name, 'Regional Medical Facility') AS organization_name,
             COALESCE(u.full_name, r.requester_name, 'Emergency Requester') AS requester_name,
             COALESCE(u.phone, r.requester_phone) AS requester_phone_contact
      FROM emergency_requests r
      LEFT JOIN organizations o ON o.id = r.organization_id
      LEFT JOIN users u ON u.id = r.requester_id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      query += ' AND r.status = ?';
      params.push(filters.status);
    }
    if (filters.blood_group) {
      query += ' AND r.blood_group = ?';
      params.push(filters.blood_group);
    }
    if (filters.urgency_level) {
      query += ' AND r.urgency_level = ?';
      params.push(filters.urgency_level);
    }
    if (filters.organization_id) {
      query += ' AND r.organization_id = ?';
      params.push(filters.organization_id);
    }

    query += ' ORDER BY r.created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit, 10));
    }

    return db.prepare(query).all(...params);
  }

  static transitionState(requestId, targetState, user, meta = {}) {
    const db = getDb();
    const request = RequestService.getRequestById(requestId);

    if (!request) {
      throw new Error(`Request '${requestId}' not found.`);
    }

    const currentState = request.status;
    const allowedTargets = VALID_TRANSITIONS[currentState] || [];

    if (!allowedTargets.includes(targetState)) {
      throw new Error(`Invalid state transition: Cannot transition request from '${currentState}' to '${targetState}'. Allowed transitions: [${allowedTargets.join(', ')}]`);
    }

    // Run transition in transaction
    const update = db.transaction(() => {
      let extraSql = '';
      const params = [targetState];

      if (targetState === 'VERIFIED') {
        extraSql += ', verified_by = ?, verified_at = CURRENT_TIMESTAMP';
        params.push(user.id);
      } else if (targetState === 'CANCELLED') {
        extraSql += ', cancellation_reason = ?';
        params.push(meta.reason || 'Cancelled by authorized user');
      } else if (targetState === 'PARTIALLY_FULFILLED') {
        extraSql += ', units_fulfilled = units_fulfilled + ?';
        params.push(meta.fulfilledUnits || 1);
      } else if (targetState === 'FULFILLED') {
        extraSql += ', units_fulfilled = units_requested';
      }

      params.push(requestId);

      db.prepare(`
        UPDATE emergency_requests
        SET status = ?, updated_at = CURRENT_TIMESTAMP ${extraSql}
        WHERE id = ?
      `).run(...params);

      // Record first-class Request Event
      let eventType = `REQUEST_${targetState}`;
      let title = `Request Status: ${targetState.replace(/_/g, ' ')}`;
      let description = meta.notes || meta.reason || `Status progressed from ${currentState} to ${targetState}.`;

      if (targetState === 'VERIFIED') {
        eventType = meta.urgentReview ? 'FAST_TRACK_VERIFIED' : 'REQUEST_VERIFIED';
        title = meta.urgentReview ? '⚡ Fast-Track Emergency Triage Verified' : 'Clinical Verification Approved';
        description = meta.clinicalJustification
          ? `Fast-track review authorized: ${meta.clinicalJustification}`
          : 'Request verified by clinical review lead. Authorized for regional donor matching.';
      } else if (targetState === 'REJECTED') {
        eventType = 'REQUEST_REJECTED';
        title = 'Clinical Verification Rejected';
        description = meta.reason || 'Clinical justification did not meet verification criteria.';
      } else if (targetState === 'MATCHING') {
        eventType = 'DONOR_MATCHING_STARTED';
        title = 'Spatial Donor Matching Activated';
        description = 'Geographic candidate outreach search activated.';
      } else if (targetState === 'PARTIALLY_FULFILLED') {
        eventType = 'REQUEST_PARTIALLY_FULFILLED';
        title = `Bedside Transfusion Administered (${meta.fulfilledUnits || 1} Units)`;
        description = `Administered transfusion units recorded at bedside. Total fulfilled: ${(request.units_fulfilled || 0) + (meta.fulfilledUnits || 1)}/${request.units_requested}.`;
      } else if (targetState === 'FULFILLED') {
        eventType = 'REQUEST_FULFILLED';
        title = 'Emergency Blood Request Fulfilled';
        description = `All ${request.units_requested} requested units have been confirmed transfused or issued.`;
      } else if (targetState === 'CANCELLED') {
        eventType = 'REQUEST_CANCELLED';
        title = 'Request Cancelled';
        description = meta.reason || 'Cancelled by authorized requester or facility administration.';
      } else if (targetState === 'EXPIRED') {
        eventType = 'REQUEST_EXPIRED';
        title = 'Request Expired';
        description = 'Required-by clinical deadline has elapsed without full unit fulfilment.';
      }

      recordRequestEvent(db, requestId, eventType, title, description, user, meta);

      // FR-REQ-007 & AC-005: When request becomes closed, cancelled, rejected, or expired,
      // stop or suppress queued escalation actions
      if (['CANCELLED', 'EXPIRED', 'REJECTED', 'FULFILLED'].includes(targetState)) {
        db.prepare(`
          UPDATE request_matches
          SET outreach_status = 'EXPIRED'
          WHERE request_id = ? AND outreach_status IN ('PENDING', 'NOTIFIED')
        `).run(requestId);

        console.log(`[RequestService] Suppressed active escalation matches for closed request ${requestId}.`);
      }

      logAudit({
        actorId: user.id,
        actorRole: user.role,
        action: `REQUEST_STATE_${targetState}`,
        entityType: 'EMERGENCY_REQUEST',
        entityId: requestId,
        details: { fromState: currentState, toState: targetState, meta }
      });
    });

    update();

    // Targeted notifications to the correct stakeholders upon state transition
    try {
      const NotificationService = require('./notificationService');
      if (targetState === 'VERIFIED') {
        // Notify Requester
        NotificationService.sendNotification({
          recipientId: request.requester_id,
          channel: 'IN_APP',
          title: `✅ Emergency Request ${requestId} Verified`,
          body: `Your request for ${request.units_requested} units of ${request.blood_group} has been verified by clinical reviewer and is approved for matching.`,
          metadata: { requestId, status: 'VERIFIED' }
        });

        // Notify Coordinators
        const coords = db.prepare("SELECT id FROM users WHERE role = 'EMERGENCY_COORDINATOR'").all();
        for (const c of coords) {
          NotificationService.sendNotification({
            recipientId: c.id,
            channel: 'IN_APP',
            title: `Verified Request Ready for Matching: ${requestId}`,
            body: `Request ${requestId} (${request.blood_group} ${request.blood_component}) is verified and ready for regional escalation.`,
            metadata: { requestId }
          });
        }
      } else if (targetState === 'MATCHING') {
        NotificationService.sendNotification({
          recipientId: request.requester_id,
          channel: 'IN_APP',
          title: `🔍 Proximity Matching Activated: ${requestId}`,
          body: `Candidate outreach initiated for ${request.units_requested} units of ${request.blood_group}.`,
          metadata: { requestId, status: 'MATCHING' }
        });
      } else if (targetState === 'PARTIALLY_FULFILLED' || targetState === 'FULFILLED') {
        NotificationService.sendNotification({
          recipientId: request.requester_id,
          channel: 'IN_APP',
          title: `🩸 Transfusion Units Recorded: ${requestId}`,
          body: `Request ${requestId} status updated to ${targetState}. Units fulfilled: ${meta.fulfilledUnits || request.units_requested}.`,
          metadata: { requestId, status: targetState }
        });
      } else if (targetState === 'CANCELLED') {
        NotificationService.sendNotification({
          recipientId: request.requester_id,
          channel: 'IN_APP',
          title: `Request ${requestId} Cancelled`,
          body: `Request ${requestId} has been closed. Reason: ${meta.reason || 'User cancelled'}. Active outreach halted.`,
          metadata: { requestId, status: 'CANCELLED' }
        });
      }
    } catch (notifErr) {
      console.error('[NotificationError]', notifErr.message);
    }

    return RequestService.getRequestById(requestId);
  }

  // Fast-Track Emergency Triage (FR-REQ-009)
  static fastTrackRequest(requestId, user, clinicalJustification, secondaryApprover = null) {
    if (!clinicalJustification) {
      throw new Error('Urgent fast-track review requires documented clinical justification.');
    }
    RequestService.transitionState(requestId, 'VERIFIED', user, {
      urgentReview: true,
      clinicalJustification,
      secondaryApprover: secondaryApprover || user.full_name || user.name
    });

    const MatchingService = require('./matchingService');
    MatchingService.dispatchEscalationStage(requestId, 1, user);

    return RequestService.getRequestById(requestId);
  }

  // Record donor match response (Section 3 of User Prompt)
  static recordDonorResponse(requestId, donorId, responseData, user) {
    const db = getDb();
    const request = RequestService.getRequestById(requestId);
    if (!request) throw new Error('Emergency request not found.');

    if (['CANCELLED', 'EXPIRED', 'REJECTED', 'FULFILLED'].includes(request.status)) {
      throw new Error(`Cannot submit response: Request ${requestId} is already ${request.status}.`);
    }

    const { response = 'ACCEPTED', eta_minutes = 30, notes = '' } = responseData;

    // Check existing responses to determine if this is the FIRST or ADDITIONAL donor response
    const existingCount = db.prepare(`
      SELECT COUNT(*) as count FROM request_matches
      WHERE request_id = ? AND response_timestamp IS NOT NULL
    `).get(requestId).count;

    const eventType = existingCount === 0
      ? 'FIRST_DONOR_RESPONSE_RECEIVED'
      : 'ADDITIONAL_DONOR_RESPONSE_RECEIVED';

    const match = db.prepare('SELECT * FROM request_matches WHERE request_id = ? AND donor_id = ?').get(requestId, donorId);

    const updateTx = db.transaction(() => {
      if (match) {
        db.prepare(`
          UPDATE request_matches
          SET outreach_status = ?, response_timestamp = CURRENT_TIMESTAMP, notes = ?, review_status = 'PENDING_REVIEW'
          WHERE request_id = ? AND donor_id = ?
        `).run(response, `ETA: ${eta_minutes}m. ${notes}`, requestId, donorId);
      } else {
        const matchId = `MCH-${requestId}-${donorId}`;
        db.prepare(`
          INSERT INTO request_matches (id, request_id, donor_id, stage, distance_km, outreach_status, response_timestamp, notes, review_status)
          VALUES (?, ?, ?, 1, 3.8, ?, CURRENT_TIMESTAMP, ?, 'PENDING_REVIEW')
        `).run(matchId, requestId, donorId, response, `ETA: ${eta_minutes}m. ${notes}`);
      }

      // Record request event
      recordRequestEvent(
        db,
        requestId,
        eventType,
        existingCount === 0 ? 'First Candidate Donor Response Received' : 'Additional Candidate Donor Response Received',
        `${user.full_name || 'Donor'} (${response}): ETA ${eta_minutes} minutes. ${notes}`,
        user,
        { donor_id: donorId, response, eta_minutes, notes }
      );

      logAudit({
        actorId: donorId,
        actorRole: user.role,
        action: `DONOR_MATCH_RESPONSE_${response}`,
        entityType: 'EMERGENCY_REQUEST',
        entityId: requestId,
        details: { response, eta_minutes, notes, eventType }
      });
    });

    updateTx();

    // Targeted notifications
    try {
      const NotificationService = require('./notificationService');
      const statusEmoji = response === 'ACCEPTED' ? '🟢' : '⚪';

      // 1. Notify donor that response is logged
      NotificationService.sendNotification({
        recipientId: donorId,
        channel: 'IN_APP',
        title: `Response Received for Request ${requestId}`,
        body: response === 'ACCEPTED'
          ? `Your response has been logged. ER triage has been notified of your ${eta_minutes}m ETA. Please await coordination confirmation.`
          : `Your decline response has been registered. Thank you for notifying the emergency network promptly.`,
        metadata: { requestId, donorId, response, eta_minutes }
      });

      // 2. Notify Hospital Requester
      NotificationService.sendNotification({
        recipientId: request.requester_id,
        channel: 'IN_APP',
        title: `${statusEmoji} Candidate Donor Response: ${user.full_name || 'Donor'} (${response})`,
        body: response === 'ACCEPTED'
          ? `Donor ${user.full_name} has accepted emergency match for Request ${requestId}! Estimated arrival: ${eta_minutes} minutes. Review and accept for coordination.`
          : `Donor ${user.full_name} indicated unable to attend Request ${requestId}.`,
        metadata: { requestId, donorId, response, eta_minutes }
      });

      // 3. Notify Coordinators
      const coords = db.prepare("SELECT id FROM users WHERE role = 'EMERGENCY_COORDINATOR'").all();
      for (const c of coords) {
        NotificationService.sendNotification({
          recipientId: c.id,
          channel: 'IN_APP',
          title: `Donor Match Response: ${requestId} [${response}]`,
          body: `Donor ${user.full_name} responded: ${response}. ETA: ${eta_minutes} min.`,
          metadata: { requestId, donorId, response }
        });
      }
    } catch (notifErr) {
      console.error('[NotificationError]', notifErr.message);
    }

    return {
      success: true,
      request_id: requestId,
      response,
      eta_minutes,
      message: response === 'ACCEPTED'
        ? 'Thank you! Your availability has been reported to the triage team. Proceed to the designated emergency bay.'
        : 'Outreach response recorded as declined.'
    };
  }

  // Hospital or Coordinator reviews donor response (Section 3 of User Prompt)
  static reviewDonorResponse(requestId, donorId, user, decision, notes = '') {
    const db = getDb();
    const request = RequestService.getRequestById(requestId);
    if (!request) throw new Error('Emergency request not found.');

    const match = db.prepare('SELECT * FROM request_matches WHERE request_id = ? AND donor_id = ?').get(requestId, donorId);
    if (!match) throw new Error('Match record not found.');

    const donorUser = db.prepare('SELECT * FROM users WHERE id = ?').get(donorId);
    const donorName = donorUser ? donorUser.full_name : 'Candidate Donor';

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE request_matches
        SET review_status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, review_notes = ?
        WHERE request_id = ? AND donor_id = ?
      `).run(decision, user.id, notes, requestId, donorId);

      // Record first-class Request Event
      const isSelected = decision === 'SELECTED_FOR_COORDINATION';
      const eventType = isSelected ? 'DONOR_SELECTED_FOR_COORDINATION' : 'DONOR_RESPONSE_REVIEWED';
      const title = isSelected ? `Donor Selected for Coordination: ${donorName}` : `Donor Response Reviewed (${decision.replace(/_/g, ' ')})`;
      const desc = isSelected
        ? `Hospital triage confirmed ${donorName} for bedside coordination and collection. ${notes}`
        : `Hospital reviewer set status to ${decision}. ${notes}`;

      recordRequestEvent(db, requestId, eventType, title, desc, user, { donorId, decision, notes });

      logAudit({
        actorId: user.id,
        actorRole: user.role,
        action: `DONOR_REVIEW_${decision}`,
        entityType: 'EMERGENCY_REQUEST',
        entityId: requestId,
        details: { donorId, decision, notes }
      });
    });

    tx();

    // Notify Donor of Hospital Decision
    try {
      const NotificationService = require('./notificationService');
      if (decision === 'SELECTED_FOR_COORDINATION') {
        NotificationService.sendNotification({
          recipientId: donorId,
          channel: 'IN_APP',
          title: `🎉 Match Confirmed: Hospital Accepted Your Coordination Offer!`,
          body: `AIIMS Trauma Triage has selected you for emergency Request ${requestId}. Please proceed to the ER Blood Bay. ${notes}`,
          metadata: { requestId, donorId, status: 'SELECTED' }
        });
      } else if (decision === 'DECLINED_BY_HOSPITAL') {
        NotificationService.sendNotification({
          recipientId: donorId,
          channel: 'IN_APP',
          title: `Coordination Update: Request ${requestId}`,
          body: `Thank you for your willingness to assist. The ER currently has active units and does not require additional units at this moment.`,
          metadata: { requestId, donorId, status: 'DECLINED' }
        });
      }
    } catch (err) {
      console.error('[NotificationError]', err.message);
    }

    return {
      success: true,
      request_id: requestId,
      donor_id: donorId,
      review_status: decision,
      notes
    };
  }

  // Coordinator or Hospital selects an individual candidate donor for coordination (User Instruction #5)
  static selectDonorForCoordination(requestId, donorId, user, notes = '') {
    const db = getDb();
    const request = RequestService.getRequestById(requestId);
    if (!request) {
      throw new Error(`Request '${requestId}' not found.`);
    }

    if (['CANCELLED', 'EXPIRED', 'REJECTED', 'FULFILLED'].includes(request.status)) {
      throw new Error(`Request '${requestId}' is currently ${request.status}. Cannot select donors.`);
    }

    // Check donor exists and is available
    const donor = db.prepare(`
      SELECT p.*, u.full_name, u.email, u.phone
      FROM donor_profiles p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = ?
    `).get(donorId);

    if (!donor) {
      throw new Error(`Donor profile '${donorId}' not found.`);
    }

    if (donor.availability_status !== 'AVAILABLE') {
      throw new Error(`Donor '${donor.full_name}' is currently marked as ${donor.availability_status}.`);
    }

    // Check compatibility
    const MatchingService = require('./matchingService');
    if (!MatchingService.canDonateTo(donor.blood_group, request.blood_group)) {
      throw new Error(`Donor blood group ${donor.blood_group} is not compatible with recipient blood group ${request.blood_group}.`);
    }

    const dist = MatchingService.calculateDistanceKm(
      request.delivery_latitude,
      request.delivery_longitude,
      donor.latitude,
      donor.longitude
    );

    let stage = 1;
    if (dist > 30) stage = 4;
    else if (dist > 15) stage = 3;
    else if (dist > 5) stage = 2;

    const existingMatch = db.prepare('SELECT * FROM request_matches WHERE request_id = ? AND donor_id = ?').get(requestId, donorId);

    const tx = db.transaction(() => {
      if (existingMatch) {
        db.prepare(`
          UPDATE request_matches
          SET review_status = 'SELECTED_FOR_COORDINATION',
              reviewed_by = ?,
              reviewed_at = CURRENT_TIMESTAMP,
              review_notes = ?
          WHERE request_id = ? AND donor_id = ?
        `).run(user.id, notes, requestId, donorId);
      } else {
        const matchId = `MCH-${requestId}-${donorId}`;
        db.prepare(`
          INSERT INTO request_matches (
            id, request_id, donor_id, stage, distance_km, outreach_status, review_status, reviewed_by, reviewed_at, review_notes
          ) VALUES (?, ?, ?, ?, ?, 'NOTIFIED', 'SELECTED_FOR_COORDINATION', ?, CURRENT_TIMESTAMP, ?)
        `).run(matchId, requestId, donorId, stage, dist, user.id, notes);
      }

      // Record first-class Request Event
      recordRequestEvent(
        db,
        requestId,
        'DONOR_SELECTED_FOR_COORDINATION',
        `Donor Selected for Coordination: ${donor.full_name}`,
        `Hospital triage / coordinator (${user.full_name || user.role}) selected donor ${donor.full_name} (${donor.blood_group}, ${dist} km) for bedside coordination. ${notes}`,
        user,
        { donorId, bloodGroup: donor.blood_group, distanceKm: dist, notes }
      );

      logAudit({
        actorId: user.id,
        actorRole: user.role,
        action: 'DONOR_SELECTED_FOR_COORDINATION',
        entityType: 'EMERGENCY_REQUEST',
        entityId: requestId,
        details: { donorId, notes }
      });
    });

    tx();

    // Notify Donor
    try {
      const NotificationService = require('./notificationService');
      NotificationService.sendNotification({
        recipientId: donorId,
        channel: 'IN_APP',
        title: `🎉 Selected for Emergency Coordination: Request ${requestId}`,
        body: `Hospital triage has selected you for emergency coordination for Request ${requestId} (${request.organization_name || 'Hospital Triage'}). Please review request details and proceed to the designated emergency bay.`,
        metadata: { requestId, donorId, action: 'View Request', review_status: 'SELECTED_FOR_COORDINATION' }
      });

      // Also notify hospital triage / coordinators of selection
      const allStaff = db.prepare(`SELECT id, role FROM users WHERE role IN ('HOSPITAL_ADMIN', 'EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN')`).all();
      for (const staff of allStaff) {
        if (staff.id !== user.id) {
          NotificationService.sendNotification({
            recipientId: staff.id,
            channel: 'IN_APP',
            title: `Donor Coordination Update: ${requestId}`,
            body: `Donor ${donor.full_name} (${donor.blood_group}) was selected for coordination for Request ${requestId} by ${user.full_name || user.role}.`,
            metadata: { requestId, donorId, status: 'SELECTED_FOR_COORDINATION' }
          });
        }
      }
    } catch (err) {
      console.error('[NotificationError]', err.message);
    }

    return {
      success: true,
      request_id: requestId,
      donor_id: donorId,
      donor_name: donor.full_name,
      blood_group: donor.blood_group,
      review_status: 'SELECTED_FOR_COORDINATION',
      reviewed_by: user.id,
      notes,
      message: `Donor ${donor.full_name} has been selected for coordination and notified.`
    };
  }

  // Hospital confirms donor collection arrangements (Section 2 #12)
  static confirmCollectionArrangements(requestId, donorId, user, notes = '') {
    const db = getDb();
    const request = RequestService.getRequestById(requestId);
    if (!request) throw new Error('Emergency request not found.');

    const donorUser = db.prepare('SELECT * FROM users WHERE id = ?').get(donorId);
    const donorName = donorUser ? donorUser.full_name : 'Candidate Donor';

    db.prepare(`
      UPDATE request_matches
      SET collection_confirmed_at = CURRENT_TIMESTAMP
      WHERE request_id = ? AND donor_id = ?
    `).run(requestId, donorId);

    recordRequestEvent(
      db,
      requestId,
      'COLLECTION_ARRANGEMENTS_CONFIRMED',
      `Donor Arrival & Collection Arrangements Confirmed`,
      `Verified arrival of ${donorName} at hospital phlebotomy bay. Pre-donation screening and vitals underway. ${notes}`,
      user,
      { donorId, notes }
    );

    return {
      success: true,
      request_id: requestId,
      donor_id: donorId,
      message: 'Collection arrangements confirmed.'
    };
  }

  // Donor withdraws earlier response (Section 3)
  static withdrawDonorResponse(requestId, donorId, user, reason = '') {
    const db = getDb();
    const request = RequestService.getRequestById(requestId);
    if (!request) throw new Error('Emergency request not found.');

    db.prepare(`
      UPDATE request_matches
      SET outreach_status = 'DECLINED', notes = ?
      WHERE request_id = ? AND donor_id = ?
    `).run(`Withdrawn by donor: ${reason}`, requestId, donorId);

    recordRequestEvent(
      db,
      requestId,
      'DONOR_RESPONSE_WITHDRAWN',
      `Donor Match Response Withdrawn`,
      `${user.full_name || 'Donor'} withdrew availability for Request ${requestId}. Reason: ${reason || 'Personal circumstances changed'}.`,
      user,
      { donorId, reason }
    );

    // Notify requester
    try {
      const NotificationService = require('./notificationService');
      NotificationService.sendNotification({
        recipientId: request.requester_id,
        channel: 'IN_APP',
        title: `⚠️ Donor Response Withdrawn: ${requestId}`,
        body: `Donor ${user.full_name} has withdrawn their attendance for Request ${requestId}. Escalation continuing.`,
        metadata: { requestId, donorId }
      });
    } catch (_) {}

    return {
      success: true,
      request_id: requestId,
      message: 'Your response has been withdrawn. The triage team has been updated.'
    };
  }

  // Acceptance-Time Metrics Calculation (Section 2 of User Prompt)
  static calculateAcceptanceMetrics(requestId) {
    const db = getDb();
    const req = RequestService.getRequestById(requestId);
    if (!req) return null;

    const events = db.prepare(`
      SELECT * FROM request_events
      WHERE request_id = ?
      ORDER BY created_at ASC
    `).all(requestId);

    const now = Date.now();

    // Find key timestamps
    const submitEvt = events.find(e => e.event_type === 'REQUEST_SUBMITTED') || events.find(e => e.event_type === 'REQUEST_CREATED');
    const verifyEvt = events.find(e => e.event_type === 'REQUEST_VERIFIED');
    const matchEvt = events.find(e => e.event_type === 'DONOR_MATCHING_STARTED');
    const notifEvt = events.find(e => e.event_type === 'DONOR_NOTIFICATIONS_QUEUED') || events.find(e => e.event_type === 'NOTIFICATIONS_DELIVERY_CONFIRMED');
    const firstRespEvt = events.find(e => e.event_type === 'FIRST_DONOR_RESPONSE_RECEIVED');
    const hospitalAcceptEvt = events.find(e => e.event_type === 'DONOR_SELECTED_FOR_COORDINATION');
    const fulfillEvt = events.find(e => e.event_type === 'REQUEST_FULFILLED' || e.event_type === 'REQUEST_PARTIALLY_FULFILLED');

    const submitTime = submitEvt ? new Date(submitEvt.created_at).getTime() : new Date(req.created_at).getTime();
    const notifTime = notifEvt ? new Date(notifEvt.created_at).getTime() : null;
    const firstRespTime = firstRespEvt ? new Date(firstRespEvt.created_at).getTime() : null;
    const hospitalAcceptTime = hospitalAcceptEvt ? new Date(hospitalAcceptEvt.created_at).getTime() : null;
    const fulfillTime = fulfillEvt ? new Date(fulfillEvt.created_at).getTime() : null;

    // Durations
    const reqAgeSeconds = Math.max(0, Math.floor((now - submitTime) / 1000));
    const timeToFirstRespSeconds = firstRespTime ? Math.max(0, Math.floor((firstRespTime - submitTime) / 1000)) : null;
    const timeToFirstNotifSeconds = notifTime ? Math.max(0, Math.floor((notifTime - submitTime) / 1000)) : null;
    const timeToHospitalConfirmationSeconds = (hospitalAcceptTime && firstRespTime)
      ? Math.max(0, Math.floor((hospitalAcceptTime - firstRespTime) / 1000))
      : null;
    const timeToFulfillmentSeconds = fulfillTime ? Math.max(0, Math.floor((fulfillTime - submitTime) / 1000)) : null;

    const isClosed = ['FULFILLED', 'CANCELLED', 'EXPIRED', 'REJECTED'].includes(req.status);
    const currentWaitingTimeSeconds = isClosed ? 0 : reqAgeSeconds;

    let timeRemainingSeconds = null;
    let slaStatus = 'NOT_CONFIGURED';

    if (req.required_by) {
      const deadline = new Date(req.required_by).getTime();
      timeRemainingSeconds = Math.floor((deadline - now) / 1000);

      if (isClosed && req.status === 'FULFILLED') {
        slaStatus = 'FULFILLED_ON_TIME';
      } else if (now > deadline) {
        slaStatus = 'OVERDUE';
      } else if (timeRemainingSeconds < 1800) { // < 30 minutes
        slaStatus = 'APPROACHING_DEADLINE';
      } else {
        slaStatus = 'ON_TRACK';
      }
    }

    // Compare with configured SLA targets
    const targetConfigs = db.prepare('SELECT * FROM sla_target_configs').all();
    const stageTargetBreakdown = targetConfigs.map(cfg => {
      let actualSeconds = null;
      let status = 'PENDING';

      if (cfg.stage_key === 'request_validation' && verifyEvt) {
        actualSeconds = Math.floor((new Date(verifyEvt.created_at).getTime() - submitTime) / 1000);
        status = actualSeconds <= cfg.target_seconds ? 'MET' : 'EXCEEDED';
      } else if (cfg.stage_key === 'donor_matching' && matchEvt && verifyEvt) {
        actualSeconds = Math.floor((new Date(matchEvt.created_at).getTime() - new Date(verifyEvt.created_at).getTime()) / 1000);
        status = actualSeconds <= cfg.target_seconds ? 'MET' : 'EXCEEDED';
      } else if (cfg.stage_key === 'notification_dispatch' && notifEvt && matchEvt) {
        actualSeconds = Math.floor((new Date(notifEvt.created_at).getTime() - new Date(matchEvt.created_at).getTime()) / 1000);
        status = actualSeconds <= cfg.target_seconds ? 'MET' : 'EXCEEDED';
      } else if (cfg.stage_key === 'donor_response_review' && hospitalAcceptEvt && firstRespEvt) {
        actualSeconds = Math.floor((new Date(hospitalAcceptEvt.created_at).getTime() - new Date(firstRespEvt.created_at).getTime()) / 1000);
        status = actualSeconds <= cfg.target_seconds ? 'MET' : 'EXCEEDED';
      }

      return {
        stage_key: cfg.stage_key,
        stage_name: cfg.stage_name,
        target_seconds: cfg.target_seconds,
        target_formatted: formatDuration(cfg.target_seconds),
        actual_seconds: actualSeconds,
        actual_formatted: formatDuration(actualSeconds),
        status,
        description: cfg.description
      };
    });

    return {
      request_age: formatDuration(reqAgeSeconds),
      request_age_seconds: reqAgeSeconds,
      time_to_first_donor_response: formatDuration(timeToFirstRespSeconds),
      time_to_first_donor_response_seconds: timeToFirstRespSeconds,
      time_to_first_notification: formatDuration(timeToFirstNotifSeconds),
      time_to_first_notification_seconds: timeToFirstNotifSeconds,
      time_to_first_notification_definition: 'Time elapsed from request submission until multi-channel candidate outreach alert was queued by delivery service.',
      time_to_hospital_confirmation: formatDuration(timeToHospitalConfirmationSeconds),
      time_to_hospital_confirmation_seconds: timeToHospitalConfirmationSeconds,
      time_to_hospital_confirmation_definition: 'Time elapsed from first donor response until authorized hospital triage physician accepted donor for bedside coordination.',
      time_to_fulfillment: formatDuration(timeToFulfillmentSeconds),
      time_to_fulfillment_seconds: timeToFulfillmentSeconds,
      current_waiting_time: formatDuration(currentWaitingTimeSeconds),
      current_waiting_time_seconds: currentWaitingTimeSeconds,
      time_remaining: timeRemainingSeconds !== null ? formatDuration(timeRemainingSeconds) : null,
      time_remaining_seconds: timeRemainingSeconds,
      sla_status: slaStatus,
      required_by: req.required_by,
      is_closed: isClosed,
      stage_target_breakdown: stageTargetBreakdown
    };
  }

  // Get complete chronological timeline and acceptance metrics (FR-REQ-007, SRS Section 2)
  static getRequestTimeline(requestId) {
    const db = getDb();
    const req = RequestService.getRequestById(requestId);
    if (!req) return null;

    // Fetch all recorded request events
    const events = db.prepare(`
      SELECT * FROM request_events
      WHERE request_id = ?
      ORDER BY created_at ASC
    `).all(requestId);

    const timeline = events.map(ev => {
      let meta = {};
      try { meta = JSON.parse(ev.metadata); } catch {}

      let stage = 'UPDATE';
      if (ev.event_type === 'REQUEST_CREATED' || ev.event_type === 'REQUEST_SUBMITTED') stage = 'SUBMISSION';
      else if (ev.event_type === 'REQUEST_VERIFIED' || ev.event_type === 'REQUEST_REJECTED') stage = 'VERIFICATION';
      else if (ev.event_type === 'DONOR_MATCHING_STARTED' || ev.event_type === 'ESCALATION_STAGE_STARTED') stage = 'MATCHING';
      else if (ev.event_type.includes('NOTIF') || ev.event_type.includes('DONOR_RESPONSE')) stage = 'OUTREACH';
      else if (ev.event_type.includes('COORDINATION') || ev.event_type.includes('REVIEW')) stage = 'COORDINATION';
      else if (ev.event_type.includes('TRANSFUSION') || ev.event_type === 'REQUEST_PARTIALLY_FULFILLED') stage = 'TRANSFUSION';
      else if (ev.event_type === 'REQUEST_FULFILLED') stage = 'FULFILLMENT';
      else if (ev.event_type === 'REQUEST_CANCELLED') stage = 'CANCELLED';

      return {
        id: ev.id,
        timestamp: ev.created_at,
        event_type: ev.event_type,
        stage,
        title: ev.title,
        description: ev.description,
        actor: ev.actor_name,
        role: ev.actor_role,
        badge: meta.response || meta.status || meta.urgency || null,
        metadata: meta
      };
    });

    // If no events in request_events, fallback to audit_logs and initial submission
    if (timeline.length === 0) {
      timeline.push({
        id: `EVT-INIT-${req.id}`,
        timestamp: req.created_at,
        event_type: 'REQUEST_SUBMITTED',
        title: 'Emergency Request Submitted',
        description: `${req.units_requested} Units of ${req.blood_group} ${req.blood_component.replace(/_/g, ' ')} requested with urgency ${req.urgency_level.replace(/_/g, ' ')}.`,
        actor: req.requester_name || 'Hospital Staff',
        role: 'HOSPITAL_REQUESTER',
        badge: req.urgency_level
      });
    }

    const metrics = RequestService.calculateAcceptanceMetrics(requestId);

    return {
      request: req,
      events: timeline,
      metrics
    };
  }

  // List all donor responses for a request (Section 3 of User Prompt)
  static getDonorResponses(requestId, user) {
    const db = getDb();
    const request = RequestService.getRequestById(requestId);
    if (!request) throw new Error('Emergency request not found.');

    const isPrivileged = user && ['HOSPITAL_REQUESTER', 'HOSPITAL_ADMIN', 'EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN'].includes(user.role);

    const matches = db.prepare(`
      SELECT m.*, u.full_name as donor_name, u.email as donor_email, u.phone as donor_phone,
             p.blood_group as donor_blood_group, p.address_locality, p.verification_status as donor_verification_status,
             rev.full_name as reviewer_name
      FROM request_matches m
      JOIN users u ON u.id = m.donor_id
      LEFT JOIN donor_profiles p ON p.user_id = m.donor_id
      LEFT JOIN users rev ON rev.id = m.reviewed_by
      WHERE m.request_id = ? AND m.response_timestamp IS NOT NULL
      ORDER BY m.response_timestamp DESC
    `).all(requestId);

    return matches.map(m => ({
      id: m.id,
      request_id: m.request_id,
      donor_id: m.donor_id,
      donor_name: isPrivileged ? m.donor_name : m.donor_name.split(' ')[0] + ' ***',
      donor_blood_group: m.donor_blood_group || 'O-',
      donor_locality: m.address_locality || 'Regional Area',
      donor_verification_status: m.donor_verification_status || 'VERIFIED',
      distance_km: m.distance_km,
      response: m.outreach_status,
      response_timestamp: m.response_timestamp,
      notes: m.notes,
      review_status: m.review_status || 'PENDING_REVIEW',
      reviewed_by: m.reviewed_by,
      reviewer_name: m.reviewer_name,
      reviewed_at: m.reviewed_at,
      review_notes: m.review_notes,
      collection_confirmed_at: m.collection_confirmed_at
    }));
  }

  // Configurable SLA targets management
  static getSlaTargets() {
    const db = getDb();
    return db.prepare('SELECT * FROM sla_target_configs ORDER BY rowid ASC').all();
  }

  static updateSlaTarget(stageKey, targetSeconds, user) {
    const db = getDb();
    db.prepare(`
      UPDATE sla_target_configs
      SET target_seconds = ?, updated_at = CURRENT_TIMESTAMP
      WHERE stage_key = ?
    `).run(parseInt(targetSeconds, 10), stageKey);

    logAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'SLA_TARGET_CONFIG_UPDATED',
      entityType: 'SYSTEM_CONFIG',
      entityId: stageKey,
      details: { stageKey, targetSeconds }
    });

    return db.prepare('SELECT * FROM sla_target_configs WHERE stage_key = ?').get(stageKey);
  }

  // Phase 7: Bedside Crossmatch & Clinical Documentation
  static recordBedsideCrossmatch(requestId, user, data) {
    const db = getDb();
    const request = db.prepare('SELECT * FROM emergency_requests WHERE id = ?').get(requestId);
    if (!request) throw new Error('Request not found: ' + requestId);

    const isAuthorized = ['HOSPITAL_REQUESTER', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN'].includes(user.role);
    if (!isAuthorized) {
      throw new Error('Unauthorized: Only authorized hospital clinical staff may record bedside crossmatch verifications.');
    }

    const {
      unit_identifier,
      blood_component,
      blood_group,
      manifest_reference,
      arrival_timestamp,
      responsible_clinician_id,
      responsible_clinician_name,
      identity_check_passed,
      label_verification_passed,
      crossmatch_result,
      clinical_notes,
      exception_reason
    } = data;

    if (!unit_identifier) throw new Error('Unit identifier / bag bar-code is required.');
    if (!blood_group) throw new Error('Blood group verification is required.');
    if (!crossmatch_result) throw new Error('Crossmatch result determination is required.');
    if (!responsible_clinician_name) throw new Error('Responsible clinical staff name is required.');

    // Clinical safety rules: Positive two-identifier patient check and label check are mandatory
    if (!identity_check_passed || !label_verification_passed) {
      throw new Error('Mandatory Pre-Transfusion Safety Check: Positive patient two-identifier check and bag label verification must both be confirmed.');
    }

    if (crossmatch_result === 'EMERGENCY_UN_CROSSMATCHED_RELEASE' && (!exception_reason || !exception_reason.trim())) {
      throw new Error('Clinical safety requirement: Emergency uncrossmatched release requires explicit clinical justification / exception reason.');
    }

    if (crossmatch_result === 'INCOMPATIBLE') {
      if (!exception_reason || !exception_reason.trim()) {
        throw new Error('Clinical safety requirement: Incompatibility determination requires documented agglutination findings / exception reason.');
      }
      recordRequestEvent(
        db,
        requestId,
        'CROSSMATCH_INCOMPATIBLE_ALERT',
        '🚨 CLINICAL ALERT: Bedside Crossmatch Incompatible',
        `Unit ${unit_identifier} (${blood_group} ${blood_component || request.blood_component}) was determined INCOMPATIBLE at bedside by ${responsible_clinician_name}. Transfusion aborted. Reason: ${exception_reason}`,
        user,
        { unit_identifier, blood_group, crossmatch_result }
      );
      throw new Error('CLINICAL SAFETY BLOCK: Transfusion of serologically INCOMPATIBLE blood is strictly prohibited. Unit quarantined.');
    }

    const checkId = 'XMATCH-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
    const now = new Date().toISOString();

    let validClinicianId = responsible_clinician_id || user.id;
    const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(validClinicianId);
    if (!userExists) {
      validClinicianId = user.id;
    }

    db.prepare(`
      INSERT INTO bedside_crossmatch_checks (
        id, request_id, organization_id, unit_identifier, blood_component,
        blood_group, manifest_reference, arrival_timestamp, responsible_clinician_id,
        responsible_clinician_name, identity_check_passed, label_verification_passed,
        crossmatch_result, clinical_notes, exception_reason, created_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?
      )
    `).run(
      checkId,
      requestId,
      request.organization_id,
      unit_identifier,
      blood_component || request.blood_component,
      blood_group,
      manifest_reference || `MAN-${requestId}`,
      arrival_timestamp || now,
      validClinicianId,
      responsible_clinician_name,
      identity_check_passed ? 1 : 0,
      label_verification_passed ? 1 : 0,
      crossmatch_result,
      clinical_notes || '',
      exception_reason || null,
      now
    );

    const isEmergencyUncrossmatched = crossmatch_result === 'EMERGENCY_UN_CROSSMATCHED_RELEASE';
    recordRequestEvent(
      db,
      requestId,
      isEmergencyUncrossmatched ? 'EMERGENCY_UNCROSSMATCHED_RELEASE_AUDIT' : 'BEDSIDE_CROSSMATCH_VERIFIED',
      isEmergencyUncrossmatched ? '⚠️ Bedside Crossmatch: Emergency Uncrossmatched Release' : `Bedside Crossmatch Verified: ${crossmatch_result}`,
      `Unit ${unit_identifier} (${blood_group}) verified ${crossmatch_result} at bedside by ${responsible_clinician_name}. Two-identifier checks completed.${exception_reason ? ` Justification: ${exception_reason}` : ''}`,
      user,
      { checkId, unit_identifier, crossmatch_result, clinician: responsible_clinician_name, audit_flag: isEmergencyUncrossmatched ? 'EMERGENCY_UNCROSSMATCHED' : null }
    );

    logAudit({
      actorId: user.id,
      actorRole: user.role,
      action: isEmergencyUncrossmatched ? 'EMERGENCY_UNCROSSMATCHED_RELEASE' : 'BEDSIDE_CROSSMATCH_RECORDED',
      entityType: 'BEDSIDE_CHECK',
      entityId: checkId,
      details: { requestId, unit_identifier, crossmatch_result, exception_reason, audit_flag: isEmergencyUncrossmatched ? 'EMERGENCY_UNCROSSMATCHED' : 'STANDARD' }
    });

    return {
      success: true,
      check_id: checkId,
      crossmatch_result,
      message: `Bedside arrival & crossmatch check verified (${crossmatch_result}). Clinical documentation persisted.`
    };
  }

  static getBedsideChecks(requestId) {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM bedside_crossmatch_checks
      WHERE request_id = ?
      ORDER BY created_at DESC
    `).all(requestId);
  }

  // Phase 5: Donor's Matched Requests
  static getDonorMatches(donorId) {
    const db = getDb();
    return db.prepare(`
      SELECT rm.id as match_id, rm.request_id, rm.stage, rm.distance_km,
             rm.outreach_status, rm.response_timestamp, rm.notes,
             rm.review_status, rm.reviewed_at, rm.review_notes, rm.collection_confirmed_at,
             r.blood_group, r.blood_component, r.units_requested, r.units_fulfilled,
             r.urgency_level, r.clinical_justification, r.hospital_department,
             r.delivery_address, r.required_by, r.status as request_status,
             o.name as hospital_name, o.contact_phone as hospital_phone
      FROM request_matches rm
      JOIN emergency_requests r ON r.id = rm.request_id
      JOIN organizations o ON o.id = r.organization_id
      WHERE rm.donor_id = ?
      ORDER BY rm.created_at DESC
    `).all(donorId);
  }
}

module.exports = RequestService;
