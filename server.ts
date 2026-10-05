import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetPort = parseInt(process.env.PORT || '8080', 10);
const HOST = '0.0.0.0';
const distDir = path.resolve(__dirname, 'dist');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function serveFile(res: http.ServerResponse, filePath: string, statusCode = 200) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      return;
    }
    res.writeHead(statusCode, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    res.end(data);
  });
}

const serverHandler: http.RequestListener = (req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  // Health checks
  if (['/healthz', '/_health', '/api/health', '/health'].includes(urlPath)) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), port: targetPort }));
    return;
  }

  if (!fs.existsSync(distDir)) {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('ROCAM Mecanização — Sistema Operacional');
    return;
  }

  // Safe file path resolution inside dist
  const normalized = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(distDir, normalized);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveFile(res, filePath);
  } else {
    // SPA fallback
    const indexPath = path.join(distDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      serveFile(res, indexPath);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  }
};

function startServer(portToTry: number) {
  const srv = http.createServer(serverHandler);

  srv.listen(portToTry, HOST, () => {
    console.log(`[ROCAM] Servidor operacional em http://${HOST}:${portToTry}`);
  });

  srv.on('error', (err: any) => {
    console.error(`[ROCAM] Erro na porta ${portToTry}:`, err);
    if (err.code === 'EADDRINUSE' && portToTry !== 3000) {
      console.log('[ROCAM] Porta em uso pelo proxy Nginx. Tentando fallback para porta 3000...');
      startServer(3000);
    }
  });

  return srv;
}

startServer(targetPort);
