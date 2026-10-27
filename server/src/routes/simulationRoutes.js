const express = require('express');
const router = express.Router();
const SimulationService = require('../services/simulationService');
const { authenticateToken, requireRole } = require('../middleware/auth');

// List simulations
router.get('/', (req, res) => {
  try {
    const list = SimulationService.listSimulations();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_SIMULATIONS_FAILED', message: err.message });
  }
});

// Run isolated digital twin scenario (FR-SIM-001, FR-SIM-003, AC-008)
router.post('/run', authenticateToken, requireRole('EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const { scenarioName, parameters } = req.body;
    const result = SimulationService.runScenario({
      scenarioName,
      parameters: parameters || {},
      user: req.user
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: 'SIMULATION_FAILED', message: err.message });
  }
});

module.exports = router;
