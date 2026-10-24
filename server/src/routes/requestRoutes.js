const express = require('express');
const router = express.Router();
const RequestService = require('../services/requestService');
const MatchingService = require('../services/matchingService');
const FraudService = require('../services/fraudService');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/audit');

// List Requests (Authorized / Public Aggregated)
router.get('/', (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      blood_group: req.query.blood_group,
      urgency_level: req.query.urgency_level,
      organization_id: req.query.organization_id,
      limit: req.query.limit || 50
    };
    const requests = RequestService.listRequests(filters);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_REQUESTS_FAILED', message: err.message });
  }
});

// Configurable Operational SLA Targets (STATIC ROUTE BEFORE /:id)
router.get('/sla/targets', (req, res) => {
  try {
    const targets = RequestService.getSlaTargets();
    res.json(targets);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_SLA_TARGETS_FAILED', message: err.message });
  }
});

// Phase 5: Fetch Donor's Matched Outreach Requests (STATIC ROUTE BEFORE /:id)
router.get('/donor/my-matches', authenticateToken, requireRole('DONOR', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const matches = RequestService.getDonorMatches(req.user.id);
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_DONOR_MATCHES_FAILED', message: err.message });
  }
});

router.put('/sla/targets/:stageKey', authenticateToken, requireRole('HOSPITAL_ADMIN', 'EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const { target_seconds } = req.body;
    if (!target_seconds || isNaN(target_seconds)) {
      return res.status(400).json({ error: 'INVALID_TARGET', message: 'target_seconds must be a valid positive integer.' });
    }
    const updated = RequestService.updateSlaTarget(req.params.stageKey, target_seconds, req.user);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: 'UPDATE_SLA_TARGET_FAILED', message: err.message });
  }
});

// Create Emergency Request (Hospitals / Coordinators)
router.post('/', authenticateToken, requireRole('HOSPITAL_REQUESTER', 'HOSPITAL_ADMIN', 'EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN'), rateLimiter(20, 60000), (req, res) => {
  try {
    // Check duplicate fraud signal (FR-FRD-001)
    if (req.body.patient_reference) {
      FraudService.checkDuplicateRequest(req.body.patient_reference, req.user.organization_id);
    }

    const created = RequestService.createRequest(req.body, req.user);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: 'REQUEST_CREATION_FAILED', message: err.message });
  }
});

// Public Emergency Request Creation (No Login Required - Section 1)
router.post('/public', rateLimiter(15, 60000), (req, res) => {
  try {
    const result = RequestService.createPublicRequest(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: 'PUBLIC_REQUEST_FAILED', message: err.message });
  }
});

// Public Request Tracking (Reference ID + Access PIN/Phone - Section 1)
router.post('/track', rateLimiter(30, 60000), (req, res) => {
  try {
    const { reference_id, access_pin, phone } = req.body;
    const result = RequestService.trackPublicRequest(reference_id, access_pin || phone);
    if (!result.found) {
      const statusCode = result.error === 'AUTH_FAILED' ? 403 : 404;
      return res.status(statusCode).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: 'TRACKING_FAILED', message: err.message });
  }
});

router.get('/track/:id', rateLimiter(30, 60000), (req, res) => {
  try {
    const pinOrPhone = req.query.pin || req.query.phone;
    const result = RequestService.trackPublicRequest(req.params.id, pinOrPhone);
    if (!result.found) {
      const statusCode = result.error === 'AUTH_FAILED' ? 403 : 404;
      return res.status(statusCode).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: 'TRACKING_FAILED', message: err.message });
  }
});

// Get Request Detail
router.get('/:id', (req, res) => {
  try {
    const request = RequestService.getRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Request not found.' });
    }
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_REQUEST_FAILED', message: err.message });
  }
});

// Request Lifecycle Event Timeline & Acceptance-Time Metrics (Phase 5.E, FR-REQ-007, SRS Section 2)
router.get('/:id/timeline', (req, res) => {
  try {
    const data = RequestService.getRequestTimeline(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Request not found.' });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_TIMELINE_FAILED', message: err.message });
  }
});

// Direct Acceptance-Time Metrics Endpoint
router.get('/:id/metrics', (req, res) => {
  try {
    const metrics = RequestService.calculateAcceptanceMetrics(req.params.id);
    if (!metrics) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Request not found.' });
    }
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_METRICS_FAILED', message: err.message });
  }
});

// List Donor Responses for Request (SRS Section 3)
router.get('/:id/responses', authenticateToken, (req, res) => {
  try {
    const responses = RequestService.getDonorResponses(req.params.id, req.user);
    res.json(responses);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_RESPONSES_FAILED', message: err.message });
  }
});

// Individual Donor Selection for Coordination (User Instruction #5)
router.post('/:id/select-donor/:donorId', authenticateToken, requireRole('EMERGENCY_COORDINATOR', 'HOSPITAL_REQUESTER', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const { notes } = req.body || {};
    const result = RequestService.selectDonorForCoordination(req.params.id, req.params.donorId, req.user, notes || '');
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: 'SELECT_DONOR_FAILED', message: err.message });
  }
});

// Hospital Review of Donor Response (SRS Section 3)
router.post('/:id/responses/:donorId/review', authenticateToken, requireRole('HOSPITAL_REQUESTER', 'HOSPITAL_ADMIN', 'EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const { decision, notes } = req.body;
    if (!decision || !['SELECTED_FOR_COORDINATION', 'DECLINED_BY_HOSPITAL', 'FOLLOW_UP_REQUESTED'].includes(decision)) {
      return res.status(400).json({ error: 'INVALID_DECISION', message: 'Decision must be SELECTED_FOR_COORDINATION, DECLINED_BY_HOSPITAL, or FOLLOW_UP_REQUESTED.' });
    }

    const result = RequestService.reviewDonorResponse(req.params.id, req.params.donorId, req.user, decision, notes);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: 'REVIEW_RESPONSE_FAILED', message: err.message });
  }
});

// Hospital Confirms Donor Collection / Bedside Arrival (SRS Section 2 #12)
router.post('/:id/responses/:donorId/confirm-collection', authenticateToken, requireRole('HOSPITAL_REQUESTER', 'HOSPITAL_ADMIN', 'EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const { notes } = req.body;
    const result = RequestService.confirmCollectionArrangements(req.params.id, req.params.donorId, req.user, notes);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: 'CONFIRM_COLLECTION_FAILED', message: err.message });
  }
});

// Donor Withdraws Response (SRS Section 3)
router.post('/:id/withdraw-response', authenticateToken, requireRole('DONOR', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const { reason } = req.body;
    const result = RequestService.withdrawDonorResponse(req.params.id, req.user.id, req.user, reason);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: 'WITHDRAW_FAILED', message: err.message });
  }
});

// Controlled Urgent-Review & Fast-Track Workflow (FR-REQ-009)
router.post('/:id/fast-track', authenticateToken, requireRole('HOSPITAL_REQUESTER', 'HOSPITAL_ADMIN', 'EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const { clinicalJustification, secondaryApprover } = req.body;
    if (!clinicalJustification) {
      return res.status(400).json({ error: 'JUSTIFICATION_REQUIRED', message: 'Urgent fast-track review requires documented clinical justification.' });
    }

    const updated = RequestService.transitionState(req.params.id, 'VERIFIED', req.user, {
      urgentReview: true,
      clinicalJustification,
      secondaryApprover: secondaryApprover || req.user.full_name
    });

    // Automatically trigger Stage 1 Matching
    MatchingService.dispatchEscalationStage(req.params.id, 1, req.user);

    res.json({
      success: true,
      message: 'Urgent fast-track review completed. Request verified and Stage 1 matching outreach automatically triggered.',
      request: RequestService.getRequestById(req.params.id)
    });
  } catch (err) {
    res.status(400).json({ error: 'FAST_TRACK_FAILED', message: err.message });
  }
});

// Record Units Delivered & Transfusion Status (Partial or Full Fulfillment)
router.post('/:id/record-transfusion', authenticateToken, requireRole('HOSPITAL_REQUESTER', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const { unitsDelivered = 1, batchId, notes = '' } = req.body;
    const request = RequestService.getRequestById(req.params.id);
    if (!request) return res.status(404).json({ error: 'NOT_FOUND' });

    const newFulfilled = (request.units_fulfilled || 0) + parseInt(unitsDelivered, 10);
    const isComplete = newFulfilled >= request.units_requested;
    const targetState = isComplete ? 'FULFILLED' : 'PARTIALLY_FULFILLED';

    const updated = RequestService.transitionState(req.params.id, targetState, req.user, {
      fulfilledUnits: parseInt(unitsDelivered, 10),
      batchId,
      notes
    });

    res.json({
      success: true,
      targetState,
      units_fulfilled: newFulfilled,
      units_requested: request.units_requested,
      request: updated
    });
  } catch (err) {
    res.status(400).json({ error: 'RECORD_TRANSFUSION_FAILED', message: err.message });
  }
});

// Phase 7: Record Bedside Arrival & Clinical Crossmatch Verification
router.post('/:id/bedside-crossmatch', authenticateToken, requireRole('HOSPITAL_REQUESTER', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const result = RequestService.recordBedsideCrossmatch(req.params.id, req.user, req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: 'CROSSMATCH_VERIFICATION_FAILED', message: err.message });
  }
});

// Phase 7: Fetch Bedside Crossmatch Verification History
router.get('/:id/bedside-checks', authenticateToken, (req, res) => {
  try {
    const checks = RequestService.getBedsideChecks(req.params.id);
    res.json(checks);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_CROSSMATCH_CHECKS_FAILED', message: err.message });
  }
});

// Cold-chain dispatch manifest
router.get('/:id/manifest', (req, res) => {
  try {
    const request = RequestService.getRequestById(req.params.id);
    if (!request) return res.status(404).json({ error: 'NOT_FOUND' });

    res.json({
      manifest_id: `MNF-${request.id}-${Date.now().toString(36).toUpperCase()}`,
      request_id: request.id,
      patient_reference: request.patient_reference || 'PT-EMERGENCY',
      blood_group: request.blood_group,
      blood_component: request.blood_component,
      units_demanded: request.units_requested,
      units_fulfilled: request.units_fulfilled,
      urgency: request.urgency_level,
      hospital: request.organization_name,
      delivery_address: request.delivery_address,
      required_by: request.required_by,
      temperature_requirements: request.blood_component === 'PLATELETS' ? '20°C - 24°C (Gentle Agitation)' : '2°C - 6°C (Cold-Chain Ice-Pack)',
      qr_verification_code: `BLOODLINK-MANIFEST-SECURE-${request.id}`,
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'MANIFEST_FAILED', message: err.message });
  }
});

// State Machine Transition (FR-REQ-004)
router.post('/:id/transition', authenticateToken, (req, res) => {
  try {
    const { targetState, reason, fulfilledUnits } = req.body;
    const updated = RequestService.transitionState(req.params.id, targetState, req.user, { reason, fulfilledUnits });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: 'TRANSITION_FAILED', message: err.message });
  }
});

// Find Candidate Donors (FR-MAT-001, FR-MAT-007, AC-003, AC-009, SRS Section 7)
router.get('/:id/candidates', authenticateToken, (req, res) => {
  try {
    const stage = parseInt(req.query.stage || 1, 10);
    const result = MatchingService.findCandidateDonors(req.params.id, stage, req.user);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: 'MATCHING_FAILED', message: err.message });
  }
});

// Dispatch Escalation Stage (FR-MAT-002, AC-004, SRS Section 7)
router.post('/:id/escalate', authenticateToken, requireRole('EMERGENCY_COORDINATOR', 'HOSPITAL_REQUESTER', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const stage = parseInt(req.body.stage || 1, 10);
    const result = MatchingService.dispatchEscalationStage(req.params.id, stage, req.user);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: 'ESCALATION_FAILED', message: err.message });
  }
});

// Donor Match Response (FR-DON-005, Core Workflow 2, SRS Section 3)
router.post('/:id/respond', authenticateToken, requireRole('DONOR', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const result = RequestService.recordDonorResponse(req.params.id, req.user.id, req.body, req.user);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: 'RESPONSE_FAILED', message: err.message });
  }
});

module.exports = router;
