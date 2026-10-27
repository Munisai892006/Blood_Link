const express = require('express');
const router = express.Router();
const IncidentService = require('../services/incidentService');
const { authenticateToken, requireRole } = require('../middleware/auth');

// List Incidents
router.get('/', (req, res) => {
  try {
    const incidents = IncidentService.listIncidents();
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_INCIDENTS_FAILED', message: err.message });
  }
});

// List Eligible Personnel / Volunteers (FR-VOL-001) - Must be before /:id
router.get('/volunteers', authenticateToken, (req, res) => {
  try {
    const list = IncidentService.listVolunteers();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_VOLUNTEERS_FAILED', message: err.message });
  }
});

// Create Incident (Coordinators & Admins)
router.post('/', authenticateToken, requireRole('EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const incident = IncidentService.createIncident(req.body, req.user);
    res.status(201).json(incident);
  } catch (err) {
    res.status(400).json({ error: 'INCIDENT_CREATION_FAILED', message: err.message });
  }
});

// Get Incident Detail & Tasks
router.get('/:id', (req, res) => {
  try {
    const incident = IncidentService.getIncidentById(req.params.id);
    if (!incident) return res.status(404).json({ error: 'NOT_FOUND', message: 'Incident not found.' });
    res.json(incident);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_INCIDENT_FAILED', message: err.message });
  }
});

// Add Task to Incident
router.post('/:id/tasks', authenticateToken, requireRole('EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const task = IncidentService.createTask(req.params.id, req.body, req.user);
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: 'TASK_CREATION_FAILED', message: err.message });
  }
});

// Update Full Task Details (Priority, Status, Assignee, Notes)
router.patch('/tasks/:id', authenticateToken, (req, res) => {
  try {
    const task = IncidentService.updateTask(req.params.id, req.body, req.user);
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: 'TASK_MODIFICATION_FAILED', message: err.message });
  }
});

// Update Task Status (Volunteers / Coordinators)
router.patch('/tasks/:id/status', authenticateToken, (req, res) => {
  try {
    const { status } = req.body;
    const task = IncidentService.updateTaskStatus(req.params.id, status, req.user);
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: 'TASK_UPDATE_FAILED', message: err.message });
  }
});

// Close Incident
router.post('/:id/close', authenticateToken, requireRole('EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const { outcomeSummary } = req.body;
    const closed = IncidentService.closeIncident(req.params.id, outcomeSummary, req.user);
    res.json(closed);
  } catch (err) {
    res.status(400).json({ error: 'CLOSE_INCIDENT_FAILED', message: err.message });
  }
});

module.exports = router;
