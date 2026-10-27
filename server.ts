import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import {
  LiveWeatherData,
  MySpaceTVConfig,
  SyncAckPayload,
  WallpaperItem,
} from './src/shared/types.ts';
import { DEFAULT_MYSPACE_CONFIG } from './src/shared/defaultConfig.ts';
import {
  normalizeAppOrder,
  normalizeFeaturedOrder,
  runMySpaceAutomatedTests,
  validateImportedConfig,
  validateWallpaperUpload,
} from './src/shared/validation.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'myspace-state.json');

let SERVER_PAIRING_PIN = process.env.MYSPACE_PIN || '2026';

function mapWmoWeatherCodeVi(code: number): string {
  if (code === 0) return 'Trời quang đãng';
  if (code === 1 || code === 2) return 'Có mây rải rác';
  if (code === 3) return 'Nhiều mây';
  if (code === 45 || code === 48) return 'Sương mù nhẹ';
  if (code >= 51 && code <= 67) return 'Mưa nhỏ rải rác';
  if (code >= 80 && code <= 82) return 'Mưa rào';
  if (code >= 95) return 'Mưa dông';
  return 'Thời tiết ổn định';
}

function loadPersistedConfig(): MySpaceTVConfig {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as MySpaceTVConfig;
      if (
        parsed &&
        typeof parsed.revision === 'number' &&
        parsed.colors &&
        typeof parsed.colors.bgPrimary === 'string' &&
        typeof parsed.colors.cardSurface === 'string' &&
        Array.isArray(parsed.featuredItems) &&
        Array.isArray(parsed.apps) &&
        parsed.weather &&
        typeof parsed.weather.cityName === 'string'
      ) {
        parsed.apps = parsed.apps.filter(
          (a) => !/vtv\s*go/i.test(`${a.id} ${a.name} ${a.url || ''}`)
        );
        if (parsed.apps.length === 0) {
          parsed.apps = structuredClone(DEFAULT_MYSPACE_CONFIG.apps);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not load persisted MySpace TV state, using defaults:', err);
  }
  const fresh = structuredClone(DEFAULT_MYSPACE_CONFIG);
  savePersistedConfig(fresh);
  return fresh;
}

function savePersistedConfig(cfg: MySpaceTVConfig) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist MySpace TV state:', err);
  }
}

let myspaceConfig: MySpaceTVConfig = loadPersistedConfig();

let weatherCache: { key: string; data: LiveWeatherData; timestamp: number } | null = null;

interface ConnectedDevice {
  ws: WebSocket;
  role: 'tv' | 'mobile';
  userAgent: string;
  lastAckRevision: number;
}

const clients = new Map<WebSocket, ConnectedDevice>();

function getDeviceCounts() {
  let tvClientCount = 0;
  let mobileClientCount = 0;
  for (const c of clients.values()) {
    if (c.ws.readyState === WebSocket.OPEN) {
      if (c.role === 'tv') tvClientCount++;
      else mobileClientCount++;
    }
  }
  return { tvClientCount, mobileClientCount };
}

function broadcastToAll(payload: unknown) {
  const raw = JSON.stringify(payload);
  for (const c of clients.values()) {
    if (c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(raw);
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const httpServer = http.createServer(app);

  app.use(express.json({ limit: '8mb' }));

  // 1. Health & Platform Info
  app.get('/api/health', (_req, res) => {
    const counts = getDeviceCounts();
    res.json({
      status: 'ok',
      product: 'MySpace TV Sync Server',
      targetDevice: 'Samsung UA40K5300 (TVHTML5 7.20261021.13.00)',
      revision: myspaceConfig.revision,
      ...counts,
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Get Current MySpace TV Configuration
  app.get('/api/myspace/config', (_req, res) => {
    const counts = getDeviceCounts();
    res.json({
      ok: true,
      config: myspaceConfig,
      ...counts,
      serverTime: new Date().toISOString(),
    });
  });

  // 3. Live Weather Endpoint (Real Open-Meteo data or honest fallback — never fake live weather)
  app.get('/api/myspace/weather', async (_req, res) => {
    const wCfg = myspaceConfig.weather;
    if (!wCfg || !wCfg.enabled) {
      const unconfigured: LiveWeatherData = {
        status: 'unconfigured',
        cityName: wCfg?.cityName || 'Chưa cấu hình',
        conditionText: 'Chưa cấu hình thời tiết (Đã tắt trong cài đặt)',
        updatedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        sourceName: 'Chế độ trung thực',
      };
      res.json(unconfigured);
      return;
    }

    const cacheKey = `${wCfg.latitude.toFixed(2)},${wCfg.longitude.toFixed(2)},${wCfg.cityName}`;
    if (
      weatherCache &&
      weatherCache.key === cacheKey &&
      Date.now() - weatherCache.timestamp < 5 * 60 * 1000
    ) {
      res.json(weatherCache.data);
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(
        wCfg.latitude
      )}&longitude=${encodeURIComponent(
        wCfg.longitude
      )}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FHo_Chi_Minh`;

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = (await response.json()) as {
        current?: {
          temperature_2m?: number;
          relative_humidity_2m?: number;
          weather_code?: number;
          wind_speed_10m?: number;
        };
      };

      if (!json.current || typeof json.current.temperature_2m !== 'number') {
        throw new Error('Missing current weather payload');
      }

      const conditionText = mapWmoWeatherCodeVi(json.current.weather_code ?? 1);
      const liveData: LiveWeatherData = {
        status: 'live_verified',
        cityName: wCfg.cityName,
        temperatureC: Math.round(json.current.temperature_2m),
        humidityPercent:
          typeof json.current.relative_humidity_2m === 'number'
            ? Math.round(json.current.relative_humidity_2m)
            : undefined,
        windKmh:
          typeof json.current.wind_speed_10m === 'number'
            ? Math.round(json.current.wind_speed_10m)
            : undefined,
        conditionText,
        updatedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        sourceName: 'Open-Meteo API',
      };

      weatherCache = { key: cacheKey, data: liveData, timestamp: Date.now() };
      res.json(liveData);
    } catch {
      const offlineData: LiveWeatherData = {
        status: 'offline_error',
        cityName: wCfg.cityName,
        conditionText: 'Không có kết nối thời tiết trực tuyến',
        updatedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        sourceName: 'Chế độ trung thực (Offline)',
        errorMessage: 'Không kết nối được dịch vụ thời tiết, không hiển thị số liệu giả.',
      };
      res.json(offlineData);
    }
  });

  // 4. Update MySpace TV Configuration from Mobile Manager
  app.post('/api/myspace/config', (req, res) => {
    const { config: incomingConfig, pin, actionDescription, newPin } = req.body || {};

    if (String(pin || '2026') !== SERVER_PAIRING_PIN) {
      res.status(403).json({
        ok: false,
        error: 'Sai mã ghép nối PIN bảo mật! Thiết bị chưa được phép thay đổi cấu hình TV.',
      });
      return;
    }

    if (typeof newPin === 'string' && newPin.trim().length >= 4) {
      SERVER_PAIRING_PIN = newPin.trim();
    }

    if (!incomingConfig || typeof incomingConfig !== 'object') {
      res.status(400).json({ ok: false, error: 'Dữ liệu cấu hình gửi lên không hợp lệ.' });
      return;
    }

    const nextRevision = myspaceConfig.revision + 1;
    const nowIso = new Date().toISOString();

    const sanitizedApps = Array.isArray(incomingConfig.apps)
      ? normalizeAppOrder(
          incomingConfig.apps.filter(
            (a: { id?: string; name?: string; url?: string }) =>
              !/vtv\s*go/i.test(`${a.id || ''} ${a.name || ''} ${a.url || ''}`)
          )
        )
      : myspaceConfig.apps;

    const sanitizedFeatured = Array.isArray(incomingConfig.featuredItems)
      ? normalizeFeaturedOrder(incomingConfig.featuredItems)
      : myspaceConfig.featuredItems;

    myspaceConfig = {
      ...myspaceConfig,
      ...incomingConfig,
      apps: sanitizedApps,
      featuredItems: sanitizedFeatured,
      revision: nextRevision,
      updatedAt: nowIso,
      updatedBy: String(actionDescription || 'MySpace Mobile'),
    };

    savePersistedConfig(myspaceConfig);

    const counts = getDeviceCounts();
    const ack: SyncAckPayload = {
      revision: myspaceConfig.revision,
      appliedWallpaperId: myspaceConfig.activeWallpaperId,
      tvClientCount: counts.tvClientCount,
      confirmedByTvClient: counts.tvClientCount > 0,
      confirmedAt: nowIso,
    };

    broadcastToAll({
      type: 'MYSPACE_CONFIG_UPDATED',
      config: myspaceConfig,
      ack,
      actionDescription: myspaceConfig.updatedBy,
    });

    res.json({
      ok: true,
      config: myspaceConfig,
      ack,
    });
  });

  // 5. Upload & Apply Wallpaper from Mobile Manager (Section 9)
  app.post('/api/myspace/wallpaper', (req, res) => {
    const {
      pin,
      name,
      dataUrl,
      mimeType,
      sizeBytes,
      width,
      height,
      fitMode,
      position,
      layoutPreset,
    } = req.body || {};

    if (String(pin || '2026') !== SERVER_PAIRING_PIN) {
      res.status(403).json({
        ok: false,
        error: 'Sai mã ghép nối PIN bảo mật! Không thể gửi hình nền lên TV.',
      });
      return;
    }

    const validation = validateWallpaperUpload({
      name,
      dataUrl,
      mimeType,
      sizeBytes,
    });

    if (!validation.valid) {
      res.status(400).json({
        ok: false,
        error: validation.error,
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const newWp: WallpaperItem = {
      id: `wp-user-${Date.now()}`,
      name: String(name).trim().slice(0, 50),
      isBuiltIn: false,
      dataUrl: String(dataUrl),
      mimeType: String(mimeType || 'image/jpeg'),
      sizeBytes: Number(sizeBytes) || Math.ceil((String(dataUrl).length * 3) / 4),
      width: Number(width) || 1280,
      height: Number(height) || 720,
      fitMode: fitMode === 'contain' || fitMode === 'center' ? fitMode : 'cover',
      position: position === 'top' || position === 'bottom' ? position : 'center',
      layoutPreset:
        layoutPreset === 'darkened_for_text' ||
        layoutPreset === 'color_overlay' ||
        layoutPreset === 'framed_content'
          ? layoutPreset
          : 'fullscreen',
      createdAt: nowIso,
    };

    let nextOverlayOpacity = myspaceConfig.layout.wallpaperOverlayOpacity;
    if (newWp.layoutPreset === 'darkened_for_text') nextOverlayOpacity = 0.55;
    else if (newWp.layoutPreset === 'color_overlay') nextOverlayOpacity = 0.38;
    else if (newWp.layoutPreset === 'fullscreen') nextOverlayOpacity = 0.2;

    const nextRevision = myspaceConfig.revision + 1;
    const builtIns = myspaceConfig.wallpapers.filter((w) => w.isBuiltIn);
    const customList = myspaceConfig.wallpapers.filter((w) => !w.isBuiltIn).slice(0, 7);

    myspaceConfig = {
      ...myspaceConfig,
      revision: nextRevision,
      updatedAt: nowIso,
      updatedBy: `Tải lên hình nền mới: "${newWp.name}"`,
      previousWallpaperId: myspaceConfig.activeWallpaperId,
      activeWallpaperId: newWp.id,
      layout: {
        ...myspaceConfig.layout,
        wallpaperOverlayOpacity: nextOverlayOpacity,
      },
      wallpapers: [...builtIns, newWp, ...customList],
    };

    savePersistedConfig(myspaceConfig);

    const counts = getDeviceCounts();
    const ack: SyncAckPayload = {
      revision: myspaceConfig.revision,
      appliedWallpaperId: myspaceConfig.activeWallpaperId,
      tvClientCount: counts.tvClientCount,
      confirmedByTvClient: counts.tvClientCount > 0,
      confirmedAt: nowIso,
    };

    broadcastToAll({
      type: 'MYSPACE_CONFIG_UPDATED',
      config: myspaceConfig,
      ack,
      actionDescription: myspaceConfig.updatedBy,
    });

    res.json({
      ok: true,
      wallpaper: newWp,
      config: myspaceConfig,
      ack,
    });
  });

  // 6. Import JSON Configuration Backup
  app.post('/api/myspace/import', (req, res) => {
    const { pin, rawConfig } = req.body || {};
    if (String(pin || '2026') !== SERVER_PAIRING_PIN) {
      res.status(403).json({ ok: false, error: 'Sai mã PIN bảo mật.' });
      return;
    }

    const check = validateImportedConfig(rawConfig);
    if (!check.valid || !check.config) {
      res.status(400).json({ ok: false, error: check.error || 'Cấu hình JSON không hợp lệ.' });
      return;
    }

    const nowIso = new Date().toISOString();
    myspaceConfig = {
      ...check.config,
      apps: normalizeAppOrder(
        check.config.apps.filter(
          (a) => !/vtv\s*go/i.test(`${a.id} ${a.name} ${a.url || ''}`)
        )
      ),
      featuredItems: normalizeFeaturedOrder(check.config.featuredItems),
      revision: myspaceConfig.revision + 1,
      updatedAt: nowIso,
      updatedBy: 'Nhập cấu hình từ tệp JSON sao lưu',
    };

    savePersistedConfig(myspaceConfig);

    const counts = getDeviceCounts();
    const ack: SyncAckPayload = {
      revision: myspaceConfig.revision,
      appliedWallpaperId: myspaceConfig.activeWallpaperId,
      tvClientCount: counts.tvClientCount,
      confirmedByTvClient: counts.tvClientCount > 0,
      confirmedAt: nowIso,
    };

    broadcastToAll({
      type: 'MYSPACE_CONFIG_UPDATED',
      config: myspaceConfig,
      ack,
      actionDescription: myspaceConfig.updatedBy,
    });

    res.json({ ok: true, config: myspaceConfig, ack });
  });

  // 7. Remote Key / Game Launch Forwarder from Mobile to TV
  app.post('/api/myspace/remote-key', (req, res) => {
    const { key, gameId } = req.body || {};
    broadcastToAll({
      type: 'MYSPACE_REMOTE_KEY',
      key: String(key || ''),
      gameId: gameId ? String(gameId) : undefined,
      sentAt: new Date().toISOString(),
    });
    res.json({ ok: true });
  });

  // 8. Reset Configuration to Default
  app.post('/api/myspace/reset', (req, res) => {
    const { pin } = req.body || {};
    if (String(pin || '2026') !== SERVER_PAIRING_PIN) {
      res.status(403).json({ ok: false, error: 'Sai mã PIN bảo mật.' });
      return;
    }

    const nowIso = new Date().toISOString();
    myspaceConfig = {
      ...structuredClone(DEFAULT_MYSPACE_CONFIG),
      revision: myspaceConfig.revision + 1,
      updatedAt: nowIso,
      updatedBy: 'Khôi phục cấu hình mặc định gốc (Chỉ YouTube & YouTube Kids)',
    };
    savePersistedConfig(myspaceConfig);

    const counts = getDeviceCounts();
    broadcastToAll({
      type: 'MYSPACE_CONFIG_UPDATED',
      config: myspaceConfig,
      ack: {
        revision: myspaceConfig.revision,
        appliedWallpaperId: myspaceConfig.activeWallpaperId,
        tvClientCount: counts.tvClientCount,
        confirmedByTvClient: counts.tvClientCount > 0,
        confirmedAt: nowIso,
      },
      actionDescription: myspaceConfig.updatedBy,
    });

    res.json({ ok: true, config: myspaceConfig });
  });

  // 9. Automated Self-Test Endpoint (Section 15 & 17)
  app.get('/api/myspace/self-test', (_req, res) => {
    const report = runMySpaceAutomatedTests(myspaceConfig);
    res.json(report);
  });

  // WebSocket Server (/ws)
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
      .pathname;
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const roleParam = url.searchParams.get('role');
    const role: 'tv' | 'mobile' = roleParam === 'mobile' ? 'mobile' : 'tv';

    clients.set(ws, {
      ws,
      role,
      userAgent: req.headers['user-agent'] || 'Unknown',
      lastAckRevision: myspaceConfig.revision,
    });

    const counts = getDeviceCounts();
    ws.send(
      JSON.stringify({
        type: 'MYSPACE_INIT',
        config: myspaceConfig,
        ...counts,
      })
    );

    broadcastToAll({
      type: 'MYSPACE_PRESENCE',
      ...counts,
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'TV_APPLIED_REVISION' && typeof msg.revision === 'number') {
          const client = clients.get(ws);
          if (client) client.lastAckRevision = msg.revision;
          const latestCounts = getDeviceCounts();
          broadcastToAll({
            type: 'MYSPACE_TV_ACK',
            revision: msg.revision,
            appliedWallpaperId: msg.appliedWallpaperId || myspaceConfig.activeWallpaperId,
            tvClientCount: latestCounts.tvClientCount,
            confirmedAt: new Date().toISOString(),
          });
        }
      } catch {
        // Ignore malformed message
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      const latestCounts = getDeviceCounts();
      broadcastToAll({
        type: 'MYSPACE_PRESENCE',
        ...latestCounts,
      });
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`MySpace TV Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
