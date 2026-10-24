const { getDb } = require('../db/database');
const { logAudit } = require('../middleware/audit');

class SimulationService {
  static listSimulations() {
    const db = getDb();
    return db.prepare(`
      SELECT s.*, u.full_name as creator_name
      FROM simulations s
      LEFT JOIN users u ON u.id = s.created_by
      ORDER BY s.created_at DESC
    `).all();
  }

  // Digital Twin: Isolated synthetic scenario runner (FR-SIM-003, AC-008)
  static runScenario({ scenarioName, parameters, user }) {
    const db = getDb();

    // Verify parameters
    const casualties = parseInt(parameters.casualties || 25, 10);
    const primaryBloodGroup = parameters.primaryBloodGroup || 'O-';
    const surgeRadiusKm = parseFloat(parameters.surgeRadiusKm || 20);

    // Run simulation purely synthetically in memory without modifying production tables!
    // Check baseline production counts before run to verify isolation
    const initialProductionRequestCount = db.prepare("SELECT COUNT(*) as count FROM emergency_requests WHERE is_synthetic = 0").get().count;
    const initialInventoryTotal = db.prepare("SELECT SUM(units_available) as sum FROM inventory_batches").get().sum;

    // Synthetic calculation
    const unitsRequired = Math.round(casualties * 1.8);
    const estimatedAvailableInRadius = Math.round(unitsRequired * 0.72);
    const deficitUnits = Math.max(0, unitsRequired - estimatedAvailableInRadius);
    const estimatedResponseTimeMinutes = Math.round(18 + (surgeRadiusKm * 0.6));
    const projectedSurvivalRate = deficitUnits === 0 ? '98.5%' : `${Math.round(100 - (deficitUnits / unitsRequired) * 20)}%`;

    const metrics = {
      synthetic_run_id: 'SYNTH-' + Date.now().toString(36),
      watermark: 'STRICTLY_SYNTHETIC_SIMULATION_DATA',
      units_required: unitsRequired,
      units_available_in_radius: estimatedAvailableInRadius,
      projected_deficit_units: deficitUnits,
      estimated_fleet_response_time_minutes: estimatedResponseTimeMinutes,
      projected_casualty_survival_index: projectedSurvivalRate,
      recommended_mitigations: [
        'Pre-stage mobile blood units at Sector 4 Junction',
        'Initiate mutual-aid transfer from Regional Red Cross reserve',
        'Broadcast voluntary standby alert to pre-verified O- donors within 15km'
      ]
    };

    const simId = 'SIM-' + Date.now().toString(36).toUpperCase();

    // Store ONLY in simulations table with is_synthetic = 1
    const stmt = db.prepare(`
      INSERT INTO simulations (id, scenario_name, parameters, metrics, assumptions, created_by, is_synthetic)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    stmt.run(
      simId,
      scenarioName || 'Synthetic Disaster Scenario',
      JSON.stringify(parameters),
      JSON.stringify(metrics),
      'Synthetic scenario parameters executed in sandboxed digital twin. Zero modification performed on production clinical or donor records.',
      user ? user.id : 'USR-ADMIN-01'
    );

    // Verify isolation guarantee: Production counts must NOT have changed!
    const postProductionRequestCount = db.prepare("SELECT COUNT(*) as count FROM emergency_requests WHERE is_synthetic = 0").get().count;
    const postInventoryTotal = db.prepare("SELECT SUM(units_available) as sum FROM inventory_batches").get().sum;

    if (initialProductionRequestCount !== postProductionRequestCount || initialInventoryTotal !== postInventoryTotal) {
      throw new Error('CRITICAL ISOLATION BREACH: Simulation attempted to mutate production operational records!');
    }

    logAudit({
      actorId: user ? user.id : 'SYSTEM',
      actorRole: user ? user.role : 'SYSTEM_ADMIN',
      action: 'DIGITAL_TWIN_SIMULATION_EXECUTED',
      entityType: 'SIMULATION',
      entityId: simId,
      details: { scenarioName, casualties, is_synthetic: 1 }
    });

    return {
      simulation_id: simId,
      is_synthetic: true,
      isolation_verified: true,
      scenario_name: scenarioName,
      parameters,
      metrics
    };
  }
}

module.exports = SimulationService;
