const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const config = require('../config');
const { createLogger } = require('../utils/logger');

const logger = createLogger('server');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

const PORT = Number(process.env.PORT || 8787);
const reportPath = config.outputFile;
const events = [];

app.use(cors());
app.use(express.json({ limit: '2mb' }));

function readReport() {
  try {
    const raw = fs.readFileSync(reportPath, 'utf-8');
    return JSON.parse(raw);
  } catch (_error) {
    return {
      generatedAt: null,
      target: null,
      summary: {
        endpointsDiscovered: 0,
        endpointsValidated: 0,
        vulnerabilities: 0,
        highestScore: 0
      },
      endpoints: [],
      findings: [],
      graph: { nodes: [], edges: [] }
    };
  }
}

function broadcast(event) {
  const message = JSON.stringify(event);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    now: new Date().toISOString()
  });
});

app.get('/api/results', (_req, res) => {
  res.json(readReport());
});

app.get('/api/events', (_req, res) => {
  res.json({ items: events.slice(-200) });
});

app.post('/api/events', (req, res) => {
  const event = {
    ...req.body,
    timestamp: req.body.timestamp || new Date().toISOString()
  };

  events.push(event);
  if (events.length > 500) {
    events.shift();
  }

  broadcast(event);
  res.status(202).json({ accepted: true });
});

app.post('/api/replay', (_req, res) => {
  const report = readReport();
  const replayPayload = {
    type: 'replay_snapshot',
    payload: {
      summary: report.summary,
      findings: report.findings
    },
    timestamp: new Date().toISOString()
  };

  broadcast(replayPayload);
  res.json({ ok: true, replayed: report.findings.length });
});

const dashboardDist = path.resolve(__dirname, '../web/dashboard/dist');
if (fs.existsSync(dashboardDist)) {
  app.use(express.static(dashboardDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }
    res.sendFile(path.join(dashboardDist, 'index.html'));
  });
}

if (!fs.existsSync(path.dirname(reportPath))) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
}

if (!fs.existsSync(reportPath)) {
  fs.writeFileSync(reportPath, JSON.stringify(readReport(), null, 2), 'utf-8');
}

fs.watchFile(reportPath, { interval: 1200 }, () => {
  const report = readReport();
  broadcast({
    type: 'results_updated',
    payload: report.summary,
    timestamp: new Date().toISOString()
  });
});

wss.on('connection', (socket) => {
  socket.send(
    JSON.stringify({
      type: 'connected',
      payload: {
        message: 'Realtime stream attached'
      },
      timestamp: new Date().toISOString()
    })
  );
});

server.listen(PORT, () => {
  logger.info(`Dashboard backend listening on http://localhost:${PORT}`);
});
