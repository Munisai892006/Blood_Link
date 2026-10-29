const { getDb } = require('../db/database');
const { logAudit } = require('../middleware/audit');

class IncidentService {
  static listIncidents() {
    const db = getDb();
    return db.prepare(`
      SELECT i.*, u.full_name AS coordinator_name,
        (SELECT COUNT(*) FROM incident_tasks WHERE incident_id = i.id) as task_count,
        (SELECT COUNT(*) FROM incident_tasks WHERE incident_id = i.id AND status = 'COMPLETED') as completed_tasks
      FROM incidents i
      LEFT JOIN users u ON u.id = i.lead_coordinator_id
      ORDER BY i.created_at DESC
    `).all();
  }

  static getIncidentById(incidentId) {
    const db = getDb();
    const incident = db.prepare(`
      SELECT i.*, u.full_name AS coordinator_name
      FROM incidents i
      LEFT JOIN users u ON u.id = i.lead_coordinator_id
      WHERE i.id = ?
    `).get(incidentId);

    if (!incident) return null;

    const tasks = db.prepare(`
      SELECT t.*, u.full_name AS assignee_name
      FROM incident_tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      WHERE t.incident_id = ?
      ORDER BY t.created_at ASC
    `).all(incidentId);

    return {
      ...incident,
      disclaimer: 'CRITICAL NOTICE: Volunteers registered on BloodLink coordinate civilian logistics and community support. They do NOT function as emergency ambulance services or certified clinical transport unless verified under separate healthcare accreditation.',
      tasks
    };
  }

  static createIncident(data, user) {
    const db = getDb();
    const incidentId = 'INC-2026-' + Math.floor(100 + Math.random() * 900);

    const stmt = db.prepare(`
      INSERT INTO incidents (id, title, description, severity, status, lead_coordinator_id, region)
      VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)
    `);

    stmt.run(
      incidentId,
      data.title,
      data.description || '',
      data.severity || 'HIGH',
      user.id,
      data.region || 'Metropolitan Region'
    );

    logAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'INCIDENT_CREATED',
      entityType: 'INCIDENT',
      entityId: incidentId,
      details: { title: data.title, severity: data.severity }
    });

    return IncidentService.getIncidentById(incidentId);
  }

  static createTask(incidentId, data, user) {
    const db = getDb();
    const taskId = 'TSK-' + Math.floor(1000 + Math.random() * 9000);

    const stmt = db.prepare(`
      INSERT INTO incident_tasks (id, incident_id, title, description, assigned_to, status, priority)
      VALUES (?, ?, ?, ?, ?, 'PENDING', ?)
    `);

    stmt.run(
      taskId,
      incidentId,
      data.title,
      data.description || '',
      data.assigned_to || null,
      data.priority || 'NORMAL'
    );

    logAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'INCIDENT_TASK_CREATED',
      entityType: 'INCIDENT_TASK',
      entityId: taskId,
      details: { incidentId, title: data.title }
    });

    // Notify assigned volunteer
    if (data.assigned_to) {
      try {
        const NotificationService = require('./notificationService');
        NotificationService.sendNotification({
          recipientId: data.assigned_to,
          channel: 'IN_APP',
          title: `📋 New Incident Logistics Assignment: ${data.title}`,
          body: `Priority: ${data.priority || 'NORMAL'}. Incident: ${incidentId}. Click to view details and update task status.`,
          metadata: { incidentId, taskId, priority: data.priority }
        });
      } catch (notifErr) {
        console.error('[NotificationError]', notifErr.message);
      }
    }

    return db.prepare('SELECT * FROM incident_tasks WHERE id = ?').get(taskId);
  }

  static listVolunteers() {
    const db = getDb();
    return db.prepare(`
      SELECT id, full_name, email, role, phone
      FROM users
      WHERE role IN ('VOLUNTEER', 'EMERGENCY_COORDINATOR')
      ORDER BY role ASC, full_name ASC
    `).all();
  }

  static updateTask(taskId, updates, user) {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM incident_tasks WHERE id = ?').get(taskId);
    if (!existing) {
      throw new Error(`Task ${taskId} not found.`);
    }

    const priority = updates.priority || existing.priority;
    const status = updates.status || existing.status;
    const assigned_to = updates.assigned_to !== undefined ? updates.assigned_to : existing.assigned_to;
    const description = updates.description !== undefined ? updates.description : existing.description;

    db.prepare(`
      UPDATE incident_tasks
      SET priority = ?, status = ?, assigned_to = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(priority, status, assigned_to, description, taskId);

    logAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'INCIDENT_TASK_MODIFIED',
      entityType: 'INCIDENT_TASK',
      entityId: taskId,
      details: { priority, status, assigned_to }
    });

    return db.prepare(`
      SELECT t.*, u.full_name AS assignee_name
      FROM incident_tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      WHERE t.id = ?
    `).get(taskId);
  }

  static updateTaskStatus(taskId, status, user) {
    const db = getDb();
    db.prepare(`
      UPDATE incident_tasks
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, taskId);

    logAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'INCIDENT_TASK_UPDATED',
      entityType: 'INCIDENT_TASK',
      entityId: taskId,
      details: { status }
    });

    return db.prepare('SELECT * FROM incident_tasks WHERE id = ?').get(taskId);
  }

  static closeIncident(incidentId, outcomeSummary, user) {
    const db = getDb();
    db.prepare(`
      UPDATE incidents
      SET status = 'CLOSED', outcome_summary = ?, closed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(outcomeSummary, incidentId);

    logAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'INCIDENT_CLOSED',
      entityType: 'INCIDENT',
      entityId: incidentId,
      details: { outcomeSummary }
    });

    return IncidentService.getIncidentById(incidentId);
  }
}

module.exports = IncidentService;
