require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');

const db = require('./db');
const { initWebSocket, broadcast } = require('./ws');

const sessionRoutes = require('./routes/session');
const setupRoutes = require('./routes/setups');
const statsRoutes = require('./routes/stats');
const patternRoutes = require('./routes/patterns');
const webhookRoutes = require('./routes/webhook');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/session', sessionRoutes);
app.use('/api', setupRoutes);
app.use('/api', statsRoutes);
app.use('/api', patternRoutes);
app.use('/api/webhook', webhookRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all: serve index.html for any unmatched route (SPA behavior)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Initialize WebSocket server
initWebSocket(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Trading Trainer running on http://localhost:${PORT}`);
});
