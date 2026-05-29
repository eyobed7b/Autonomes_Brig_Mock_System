const WebSocket = require('ws');
const { getTowers, getDashboardOverview, getBanks } = require('./db');

let wss;
const clients = new Set();

function initWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    clients.add(ws);

    // Send initial data to new client
    const initialData = {
      type: 'init',
      overview: getDashboardOverview(),
      towers: getTowers(),
      banks: getBanks()
    };
    ws.send(JSON.stringify(initialData));

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket client error:', error.message);
    });
  });
}

function broadcastUpdate() {
  const message = {
    type: 'update',
    overview: getDashboardOverview(),
    towers: getTowers(),
    banks: getBanks()
  };

  const payload = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function startBroadcasting() {
  setInterval(() => {
    broadcastUpdate();
  }, 5000);
}

module.exports = {
  initWebSocket,
  startBroadcasting,
  broadcastUpdate
};
