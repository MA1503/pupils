const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const PORT = 9000;
const LOCK = '/tmp/backup-running.lock';
const LOG  = '/tmp/backup-last.log';
const COUCHDB_VERIFY_URL = 'http://127.0.0.1:5984/pupils/';

if (fs.existsSync(LOCK)) {
  const pid = Number(fs.readFileSync(LOCK, 'utf8'));
  try { process.kill(pid, 0); } catch { fs.unlinkSync(LOCK); }
}

async function verifyAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Basic ')) return false;
  try {
    const res = await fetch(COUCHDB_VERIFY_URL, { headers: { Authorization: authHeader } });
    return res.status === 200;
  } catch { return false; }
}

function runBackup() {
  return new Promise((resolve) => {
    const out = fs.openSync(LOG, 'w');
    const proc = spawn('/bin/bash', ['/app/backup.sh'], { stdio: ['ignore', out, out] });
    proc.on('exit', (code) => {
      fs.closeSync(out);
      resolve(code ?? 1);
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/backup') {
    res.writeHead(404); return res.end();
  }
  if (!(await verifyAuth(req.headers.authorization))) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic' }); return res.end('unauthorized');
  }
  if (fs.existsSync(LOCK)) {
    res.writeHead(409, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Backup läuft bereits.');
  }
  fs.writeFileSync(LOCK, String(process.pid));
  try {
    const code = await runBackup();
    const log = fs.readFileSync(LOG, 'utf8');
    res.writeHead(code === 0 ? 200 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(log);
  } finally {
    try { fs.unlinkSync(LOCK); } catch {}
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`[api] listening on 127.0.0.1:${PORT}`));
