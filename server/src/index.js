const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { getDb } = require('./db/database');
const { seedDatabase } = require('./db/seed');

// Import routes
const authRoutes = require('./routes/authRoutes');
const requestRoutes = require('./routes/requestRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const simulationRoutes = require('./routes/simulationRoutes');
const assistantRoutes = require('./routes/assistantRoutes');
const mapRoutes = require('./routes/mapRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const donorRoutes = require('./routes/donorRoutes');
const transferRoutes = require('./routes/transferRoutes');
const privacyRoutes = require('./routes/privacyRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security and utility middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Health and Readiness Check (NFR-REL-004)
app.get('/api/health', (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('SELECT 1 as healthy').get();
    res.json({
      status: 'UP',
      service: 'BloodLink 3.0 Core API',
      version: '1.0.0',
      database: result && result.healthy === 1 ? 'CONNECTED' : 'DEGRADED',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'DOWN',
      error: err.message
    });
  }
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/simulations', simulationRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/privacy', privacyRoutes);

// Serve frontend static build if available
const distPath = path.join(__dirname, '../../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('[GlobalError]', err.stack);
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected error occurred.'
  });
});

if (require.main === module) {
  // Ensure DB is initialized and seeded if empty
  const db = getDb();
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    seedDatabase();
  }

  app.listen(PORT, () => {
    console.log(`[BloodLink 3.0] Backend server running on port ${PORT}`);
    console.log(`[BloodLink 3.0] Health check available at http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;
