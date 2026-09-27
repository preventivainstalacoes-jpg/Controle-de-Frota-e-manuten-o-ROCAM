import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// In-memory data store with file persistence fallback
interface TeamStore {
  notices: any[];
  messages: any[];
  activities: any[];
}

const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'team-server-data.json');

let store: TeamStore = {
  notices: [],
  messages: [],
  activities: [],
};

// Load saved data if present
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    store = JSON.parse(raw);
  }
} catch (e) {
  console.warn('Could not read existing team server data', e);
}

const saveStore = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not persist team server data', e);
  }
};

// Connected SSE clients for real-time live push
const sseClients: Response[] = [];

const broadcastSSE = (eventType: string, data: any) => {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    try {
      client.write(payload);
    } catch {
      sseClients.splice(i, 1);
    }
  }
};

// API: Health
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// API: Team Sync
app.get('/api/team/sync', (req: Request, res: Response) => {
  res.json({
    notices: store.notices,
    messages: store.messages,
    activities: store.activities,
  });
});

// API: Add/Update Notice
app.post('/api/team/notice', (req: Request, res: Response) => {
  const notice = req.body;
  if (!notice || !notice.id) {
    return res.status(400).json({ error: 'Invalid notice' });
  }

  const existingIdx = store.notices.findIndex((n) => n.id === notice.id);
  if (existingIdx >= 0) {
    store.notices[existingIdx] = notice;
  } else {
    store.notices.unshift(notice);
  }
  saveStore();
  broadcastSSE('SYNC_NOTICES', store.notices);
  res.json({ success: true, notice });
});

// API: Add Message
app.post('/api/team/message', (req: Request, res: Response) => {
  const msg = req.body;
  if (!msg || !msg.texto) {
    return res.status(400).json({ error: 'Invalid message' });
  }

  store.messages.push(msg);
  if (store.messages.length > 500) {
    store.messages = store.messages.slice(-500);
  }
  saveStore();
  broadcastSSE('SYNC_MESSAGES', store.messages);
  res.json({ success: true, msg });
});

// API: Add Activity
app.post('/api/team/activity', (req: Request, res: Response) => {
  const act = req.body;
  if (!act || !act.titulo) {
    return res.status(400).json({ error: 'Invalid activity' });
  }

  store.activities.unshift(act);
  if (store.activities.length > 200) {
    store.activities = store.activities.slice(0, 200);
  }
  saveStore();
  broadcastSSE('SYNC_ACTIVITIES', store.activities);
  res.json({ success: true, act });
});

// API: SSE Stream for real-time collaboration
app.get('/api/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.push(res);

  // Send initial ping
  res.write(`event: CONNECTED\ndata: ${JSON.stringify({ connected: true })}\n\n`);

  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx >= 0) sseClients.splice(idx, 1);
  });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ROCAM Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
