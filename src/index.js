const express = require('express');
const cors = require('cors');
const http = require('http');
const { startSimulation } = require('./simulator');
const { startOrchestrator } = require('./agents/orchestrator');
const dashboardRoutes = require('./routes/dashboard');
const towerRoutes = require('./routes/towers');
const chatRoute = require('./routes/chat');
const { initDataStore } = require('./db');
const { initWebSocket, startBroadcasting } = require('./websocket');

const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/dashboard', towerRoutes);
app.use('/api/chat', chatRoute);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

async function startServer() {
  initDataStore();
  startSimulation();
  startOrchestrator();

  const server = http.createServer(app);
  initWebSocket(server);
  startBroadcasting();

  server.listen(PORT, () => {
    console.log(`Mock Autonomes Brig API running on http://localhost:${PORT}`);
    console.log(`WebSocket: ws://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
  });
}

startServer();
