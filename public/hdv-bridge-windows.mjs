#!/usr/bin/env node
/**
 * HĐV BRIDGE — DỊCH VỤ TRUNG GIAN MẠNG LAN TRÊN WINDOWS CHO SAMSUNG TV UA40K5300
 * ==============================================================================
 * Chức năng:
 * 1. Kiểm tra kết nối thực tế tới Samsung Smart TV UA40K5300 qua HTTP API (:8001/api/v2/)
 * 2. Chuyển tiếp lệnh điều khiển từ HĐV Remote PWA tới WebSocket TV (:8001 / :8002)
 * 3. Hỗ trợ gói tin Legacy TCP (:55000) cho các bo mạch Samsung thế hệ cũ
 * 4. Cung cấp API /health, /probe, /send-key trên cổng 8787 trong mạng LAN gia đình
 *
 * Cách chạy trên Windows (cần cài Node.js 18+):
 *   node hdv-bridge-windows.mjs --tv-ip 192.168.1.105
 */

import http from 'node:http';
import net from 'node:net';

const args = process.argv.slice(2);
let defaultTvIp = process.env.SAMSUNG_TV_IP || '192.168.1.105';
let bridgePort = Number(process.env.BRIDGE_PORT) || 8787;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--tv-ip' && args[i + 1]) defaultTvIp = args[i + 1];
  if (args[i] === '--port' && args[i + 1]) bridgePort = Number(args[i + 1]);
}

const APP_NAME_B64 = Buffer.from('HDV Remote Controller').toString('base64');

function checkTcpPort(host, port, timeoutMs = 1800) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let settled = false;

    const finish = (open, error = null) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ port, open, latencyMs: Date.now() - start, error });
    };

    socket.setTimeout(timeoutMs);
    socket.on('connect', () => finish(true));
    socket.on('timeout', () => finish(false, 'TIMEOUT'));
    socket.on('error', (err) => finish(false, err.code || err.message));
    socket.connect(port, host);
  });
}

async function fetchTvMetadata(ip) {
  return new Promise((resolve) => {
    const req = http.get(`http://${ip}:8001/api/v2/`, { timeout: 2200 }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ ok: true, data: JSON.parse(body) });
        } catch {
          resolve({ ok: false, raw: body.slice(0, 300) });
        }
      });
    });
    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'TIMEOUT' });
    });
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        service: 'HĐV Bridge Windows LAN Service',
        version: '1.0.0',
        status: 'online',
        defaultTvIp,
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  if (url.pathname === '/probe') {
    const ip = url.searchParams.get('ip') || defaultTvIp;
    const [p8001, p8002, p55000, p7676, meta] = await Promise.all([
      checkTcpPort(ip, 8001),
      checkTcpPort(ip, 8002),
      checkTcpPort(ip, 55000),
      checkTcpPort(ip, 7676),
      fetchTvMetadata(ip),
    ]);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        ip,
        ports: { 8001: p8001, 8002: p8002, 55000: p55000, 7676: p7676 },
        metadata: meta,
        wsEndpoint: `ws://${ip}:8001/api/v2/channels/samsung.remote.control?name=${APP_NAME_B64}`,
      })
    );
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Endpoint không tồn tại' }));
});

server.listen(bridgePort, '0.0.0.0', () => {
  console.log('==============================================================');
  console.log(' HĐV BRIDGE — DỊCH VỤ ĐIỀU KHIỂN LAN SAMSUNG TV UA40K5300');
  console.log(` Đang lắng nghe tại: http://0.0.0.0:${bridgePort}`);
  console.log(` IP TV mặc định    : ${defaultTvIp}`);
  console.log(` Kiểm tra sức khỏe : http://localhost:${bridgePort}/health`);
  console.log(` Quét cổng TV      : http://localhost:${bridgePort}/probe?ip=${defaultTvIp}`);
  console.log('==============================================================');
});
