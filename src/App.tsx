import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BuiltInGameId,
  FeaturedContentItem,
  LiveWeatherData,
  MySpaceAppItem,
  MySpaceTVConfig,
  SyncAckPayload,
  WallpaperFitMode,
  WallpaperLayoutPreset,
  WallpaperPosition,
} from './shared/types';
import { DEFAULT_MYSPACE_CONFIG } from './shared/defaultConfig';
import { MySpaceMobileManager } from './components/MySpaceMobileManager';
import { MySpaceTVGames } from './components/MySpaceTVGames';
import {
  Cloud,
  CloudSun,
  ExternalLink,
  Gamepad2,
  QrCode,
  Smartphone,
  Sparkles,
  Tv,
  Wifi,
  X,
} from 'lucide-react';

const STORAGE_KEY_V2 = 'myspace_tv_local_cache_v2';
const LEGACY_STORAGE_KEY_V1 = 'myspace_tv_local_cache_v1';

function loadCachedConfig(): MySpaceTVConfig {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY_V1);
    const raw = localStorage.getItem(STORAGE_KEY_V2);
    if (raw) {
      const parsed = JSON.parse(raw) as MySpaceTVConfig;
      if (
        parsed &&
        typeof parsed.revision === 'number' &&
        parsed.colors &&
        typeof parsed.colors.bgPrimary === 'string' &&
        typeof parsed.colors.cardSurface === 'string' &&
        Array.isArray(parsed.featuredItems) &&
        Array.isArray(parsed.apps)
      ) {
        parsed.apps = parsed.apps.filter(
          (a) => !/vtv\s*go/i.test(`${a.id} ${a.name} ${a.url || ''}`)
        );
        if (parsed.apps.length > 0) {
          return parsed;
        }
      }
    }
  } catch {
    // Ignore storage errors on restricted TV browsers
  }
  return structuredClone(DEFAULT_MYSPACE_CONFIG);
}

function getVietnameseGreeting(hour: number): string {
  if (hour >= 5 && hour < 11) return 'Chào buổi sáng';
  if (hour >= 11 && hour < 14) return 'Chào buổi trưa';
  if (hour >= 14 && hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function formatClockTime(date: Date, format: '24h' | '12h'): string {
  const hours24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  if (format === '24h') {
    return `${String(hours24).padStart(2, '0')}:${minutes}`;
  }
  const period = hours24 >= 12 ? 'CH' : 'SA';
  const hours12 = hours24 % 12 || 12;
  return `${String(hours12).padStart(2, '0')}:${minutes} ${period}`;
}

function formatVietnameseDate(date: Date, format: 'full_vi' | 'short_numeric'): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  if (format === 'short_numeric') {
    return `${day}/${month}/${year}`;
  }
  const weekdays = [
    'Chủ Nhật',
    'Thứ Hai',
    'Thứ Ba',
    'Thứ Tư',
    'Thứ Năm',
    'Thứ Sáu',
    'Thứ Bảy',
  ];
  return `${weekdays[date.getDay()]}, ${day}/${month}/${year}`;
}

export function App() {
  const [viewMode, setViewMode] = useState<'tv' | 'mobile'>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'mobile') return 'mobile';
    if (params.get('mode') === 'tv') return 'tv';
    return window.innerWidth < 720 ? 'mobile' : 'tv';
  });

  const [config, setConfig] = useState<MySpaceTVConfig>(() => loadCachedConfig());
  const [tvClientCount, setTvClientCount] = useState<number>(1);
  const [mobileClientCount, setMobileClientCount] = useState<number>(0);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [lastAck, setLastAck] = useState<SyncAckPayload | null>(null);
  const [pairingPin, setPairingPin] = useState<string>('2026');
  const [now, setNow] = useState<Date>(() => new Date());

  const [weatherData, setWeatherData] = useState<LiveWeatherData>({
    status: 'offline_error',
    cityName: config.weather?.cityName || 'Hà Nội',
    conditionText: 'Đang kiểm tra kết nối thời tiết...',
    updatedAt: '--:--',
    sourceName: 'Open-Meteo API',
  });

  // Active Modals / Overlays on TV
  const [activeGame, setActiveGame] = useState<BuiltInGameId | null>(null);
  const [selectedDetailModal, setSelectedDetailModal] = useState<{
    title: string;
    subtitle: string;
    category: string;
    targetUrl?: string;
    compatibilityNote?: string;
  } | null>(null);
  const [showQrGuideModal, setShowQrGuideModal] = useState<boolean>(false);

  // Focus Management for Samsung TV Remote (2D spatial navigation + focus memory)
  const [focusedId, setFocusedId] = useState<string>('feat-0');
  const previousFocusedIdRef = useRef<string>('feat-0');
  const lastKeyTimeRef = useRef<number>(0);
  const wsRef = useRef<WebSocket | null>(null);

  // Register Samsung Tizen TV remote keys if running inside a packaged Tizen environment
  useEffect(() => {
    try {
      const tizenObj = (window as unknown as {
        tizen?: { tvinputdevice?: { registerKey: (k: string) => void } };
      }).tizen;
      if (tizenObj?.tvinputdevice) {
        ['Return', 'Exit', 'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue'].forEach(
          (k) => {
            try {
              tizenObj.tvinputdevice?.registerKey(k);
            } catch {
              // Ignore unsupported key
            }
          }
        );
      }
    } catch {
      // Standard web browser
    }
  }, []);

  // Clock ticker (every 10 seconds to keep CPU load minimal on Samsung UA40K5300)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 10000);
    return () => window.clearInterval(timer);
  }, []);

  // Persist config to localStorage cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(config));
    } catch {
      // Ignore storage quota issues
    }
  }, [config]);

  // Fetch real weather data when config.weather changes
  const fetchWeather = useCallback(async () => {
    try {
      const res = await fetch('/api/myspace/weather');
      if (res.ok) {
        const data = (await res.json()) as LiveWeatherData;
        setWeatherData(data);
      }
    } catch {
      setWeatherData((prev) => ({
        ...prev,
        status: 'offline_error',
        temperatureC: undefined,
        conditionText: 'Không có kết nối thời tiết',
      }));
    }
  }, []);

  useEffect(() => {
    fetchWeather();
    const interval = window.setInterval(fetchWeather, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [fetchWeather, config.weather?.cityName, config.weather?.enabled]);

  // Visible Featured Items & Visible Apps
  const visibleFeatured = useMemo(
    () =>
      [...config.featuredItems]
        .filter((item) => item.visible)
        .sort((a, b) => a.order - b.order)
        .slice(0, config.layout.featuredMaxItems || 8),
    [config.featuredItems, config.layout.featuredMaxItems]
  );

  const visibleApps = useMemo(
    () =>
      [...config.apps]
        .filter((app) => app.enabled && !/vtv\s*go/i.test(`${app.id} ${app.name}`))
        .sort((a, b) => a.order - b.order),
    [config.apps]
  );

  // Build ordered rows of focusable IDs for deterministic 2D arrow-key navigation on TV
  const navigationRows = useMemo(() => {
    const rows: string[][] = [];
    rows.push(['top-mobile-switch', 'top-qr-guide', 'top-games-quick']);

    const cols = config.layout.featuredColumns || 4;
    const featRows: string[][] = [];
    for (let i = 0; i < visibleFeatured.length; i += cols) {
      const slice = visibleFeatured.slice(i, i + cols).map((_, idx) => `feat-${i + idx}`);
      if (slice.length > 0) featRows.push(slice);
    }

    const appRow = visibleApps.map((_, idx) => `app-${idx}`);
    appRow.push('app-customize-mobile');

    if (config.layout.sectionOrder?.[0] === 'apps') {
      rows.push(appRow);
      featRows.forEach((r) => rows.push(r));
    } else {
      featRows.forEach((r) => rows.push(r));
      rows.push(appRow);
    }

    return rows;
  }, [
    config.layout.featuredColumns,
    config.layout.sectionOrder,
    visibleFeatured,
    visibleApps,
  ]);

  // Ensure focusedId is always valid
  useEffect(() => {
    const allIds = navigationRows.flat();
    if (allIds.length > 0 && !allIds.includes(focusedId)) {
      const defaultTarget = allIds.includes('feat-0') ? 'feat-0' : allIds[0];
      setFocusedId(defaultTarget);
    }
  }, [navigationRows, focusedId]);

  const openOverlayWithFocusMemory = useCallback(
    (action: () => void) => {
      previousFocusedIdRef.current = focusedId;
      action();
    },
    [focusedId]
  );

  const closeOverlayAndRestoreFocus = useCallback(() => {
    setActiveGame(null);
    setSelectedDetailModal(null);
    setShowQrGuideModal(false);
    setFocusedId(previousFocusedIdRef.current || 'feat-0');
  }, []);

  const handleActivateFocusedItem = useCallback(
    (targetFocusId: string) => {
      if (targetFocusId === 'top-mobile-switch' || targetFocusId === 'app-customize-mobile') {
        setViewMode('mobile');
        return;
      }
      if (targetFocusId === 'top-qr-guide') {
        openOverlayWithFocusMemory(() => setShowQrGuideModal(true));
        return;
      }
      if (targetFocusId === 'top-games-quick') {
        openOverlayWithFocusMemory(() => setActiveGame('gomoku_tv'));
        return;
      }

      if (targetFocusId.startsWith('feat-')) {
        const idx = Number(targetFocusId.replace('feat-', ''));
        const item: FeaturedContentItem | undefined = visibleFeatured[idx];
        if (!item) return;
        if (item.builtInGameId) {
          openOverlayWithFocusMemory(() => setActiveGame(item.builtInGameId!));
          return;
        }
        openOverlayWithFocusMemory(() =>
          setSelectedDetailModal({
            title: item.title,
            subtitle: item.subtitle,
            category: item.isSampleData ? 'Nội dung nổi bật (Minh họa)' : 'Nội dung cá nhân hóa',
            targetUrl: item.linkedUrl,
            compatibilityNote: item.isSampleData
              ? 'Ô nội dung nổi bật minh họa trên MySpace TV. Bạn có thể bấm Mở liên kết bên dưới hoặc tùy chỉnh tiêu đề/hình ảnh từ điện thoại.'
              : 'Nội dung tùy chỉnh được đồng bộ từ MySpace Mobile.',
          })
        );
        return;
      }

      if (targetFocusId.startsWith('app-')) {
        const idx = Number(targetFocusId.replace('app-', ''));
        const app: MySpaceAppItem | undefined = visibleApps[idx];
        if (!app) return;
        if (app.type === 'browser_game' && app.builtInGameId) {
          openOverlayWithFocusMemory(() => setActiveGame(app.builtInGameId!));
          return;
        }
        openOverlayWithFocusMemory(() =>
          setSelectedDetailModal({
            title: app.name,
            subtitle: app.launchConfigNote,
            category:
              app.type === 'website_shortcut'
                ? 'Lối tắt trang web'
                : app.type === 'tv_installed_app'
                ? 'Ứng dụng TV'
                : 'Ứng dụng MySpace',
            targetUrl: app.url,
            compatibilityNote: app.compatibilityNote,
          })
        );
      }
    },
    [visibleFeatured, visibleApps, openOverlayWithFocusMemory]
  );

  const processRemoteKeyCommand = useCallback(
    (keyName: string, gameId?: BuiltInGameId) => {
      if (gameId) {
        openOverlayWithFocusMemory(() => setActiveGame(gameId));
        return;
      }

      if (keyName === 'Home') {
        closeOverlayAndRestoreFocus();
        setFocusedId('feat-0');
        return;
      }

      if (keyName === 'Return' || keyName === 'Escape' || keyName === 'Backspace') {
        if (activeGame || selectedDetailModal || showQrGuideModal) {
          closeOverlayAndRestoreFocus();
        }
        return;
      }

      if (activeGame) return;

      if (selectedDetailModal) {
        if (keyName === 'Enter') {
          if (selectedDetailModal.targetUrl) {
            window.location.assign(selectedDetailModal.targetUrl);
          } else {
            closeOverlayAndRestoreFocus();
          }
        }
        return;
      }

      if (showQrGuideModal) {
        if (keyName === 'Enter') {
          closeOverlayAndRestoreFocus();
        }
        return;
      }

      if (keyName === 'Enter') {
        handleActivateFocusedItem(focusedId);
        return;
      }

      let currentRowIdx = 0;
      let currentColIdx = 0;
      navigationRows.forEach((row, rIdx) => {
        const cIdx = row.indexOf(focusedId);
        if (cIdx !== -1) {
          currentRowIdx = rIdx;
          currentColIdx = cIdx;
        }
      });

      const currentRow = navigationRows[currentRowIdx] || [];
      if (keyName === 'ArrowRight') {
        const nextCol = (currentColIdx + 1) % currentRow.length;
        setFocusedId(currentRow[nextCol]);
      } else if (keyName === 'ArrowLeft') {
        const prevCol = (currentColIdx - 1 + currentRow.length) % currentRow.length;
        setFocusedId(currentRow[prevCol]);
      } else if (keyName === 'ArrowDown') {
        const nextRowIdx = Math.min(navigationRows.length - 1, currentRowIdx + 1);
        const nextRow = navigationRows[nextRowIdx];
        const targetCol = Math.min(nextRow.length - 1, currentColIdx);
        setFocusedId(nextRow[targetCol]);
      } else if (keyName === 'ArrowUp') {
        const prevRowIdx = Math.max(0, currentRowIdx - 1);
        const prevRow = navigationRows[prevRowIdx];
        const targetCol = Math.min(prevRow.length - 1, currentColIdx);
        setFocusedId(prevRow[targetCol]);
      }
    },
    [
      activeGame,
      selectedDetailModal,
      showQrGuideModal,
      focusedId,
      navigationRows,
      openOverlayWithFocusMemory,
      closeOverlayAndRestoreFocus,
      handleActivateFocusedItem,
    ]
  );

  // Keyboard / Samsung TV Remote listener with <85ms debounce
  useEffect(() => {
    if (viewMode !== 'tv') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const nowTime = Date.now();
      if (nowTime - lastKeyTimeRef.current < 85) return;

      const keyCode = e.keyCode || e.which;
      const isReturnKey =
        keyCode === 10009 ||
        keyCode === 461 ||
        keyCode === 88 ||
        e.key === 'Escape' ||
        e.key === 'Backspace' ||
        e.key === 'XF86Back';

      if (isReturnKey) {
        e.preventDefault();
        lastKeyTimeRef.current = nowTime;
        processRemoteKeyCommand('Return');
        return;
      }

      if (activeGame) return;

      if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'Enter' ||
        keyCode === 38 ||
        keyCode === 40 ||
        keyCode === 37 ||
        keyCode === 39 ||
        keyCode === 13
      ) {
        e.preventDefault();
        lastKeyTimeRef.current = nowTime;
        const normalizedKey =
          keyCode === 38
            ? 'ArrowUp'
            : keyCode === 40
            ? 'ArrowDown'
            : keyCode === 37
            ? 'ArrowLeft'
            : keyCode === 39
            ? 'ArrowRight'
            : keyCode === 13
            ? 'Enter'
            : e.key;
        processRemoteKeyCommand(normalizedKey);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, activeGame, processRemoteKeyCommand]);

  // WebSocket + HTTP Polling Fallback Synchronization
  useEffect(() => {
    let isMounted = true;
    let reconnectTimer: number | undefined;

    const fetchInitialConfig = async () => {
      try {
        const res = await fetch('/api/myspace/config');
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data?.config) {
          setConfig(data.config);
          if (typeof data.tvClientCount === 'number') setTvClientCount(data.tvClientCount);
          if (typeof data.mobileClientCount === 'number')
            setMobileClientCount(data.mobileClientCount);
        }
      } catch {
        // Offline fallback uses cached config
      }
    };

    const connectWebSocket = () => {
      try {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${proto}//${window.location.host}/ws?role=${viewMode}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isMounted) setWsConnected(true);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'MYSPACE_INIT' || msg.type === 'MYSPACE_CONFIG_UPDATED') {
              if (msg.config) {
                setConfig(msg.config);
                if (viewMode === 'tv' && ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      type: 'TV_APPLIED_REVISION',
                      revision: msg.config.revision,
                      appliedWallpaperId: msg.config.activeWallpaperId,
                    })
                  );
                }
              }
              if (msg.ack) setLastAck(msg.ack);
              if (typeof msg.tvClientCount === 'number') setTvClientCount(msg.tvClientCount);
              if (typeof msg.mobileClientCount === 'number')
                setMobileClientCount(msg.mobileClientCount);
            } else if (msg.type === 'MYSPACE_TV_ACK') {
              setLastAck({
                revision: msg.revision,
                appliedWallpaperId: msg.appliedWallpaperId,
                tvClientCount: msg.tvClientCount ?? 1,
                confirmedByTvClient: true,
                confirmedAt: msg.confirmedAt,
              });
            } else if (msg.type === 'MYSPACE_PRESENCE') {
              if (typeof msg.tvClientCount === 'number') setTvClientCount(msg.tvClientCount);
              if (typeof msg.mobileClientCount === 'number')
                setMobileClientCount(msg.mobileClientCount);
            } else if (msg.type === 'MYSPACE_REMOTE_KEY' && viewMode === 'tv') {
              processRemoteKeyCommand(msg.key, msg.gameId);
            }
          } catch {
            // Ignore malformed WS message
          }
        };

        ws.onclose = () => {
          if (isMounted) {
            setWsConnected(false);
            reconnectTimer = window.setTimeout(connectWebSocket, 3000);
          }
        };
      } catch {
        if (isMounted) setWsConnected(false);
      }
    };

    fetchInitialConfig();
    connectWebSocket();

    const pollTimer = window.setInterval(async () => {
      try {
        const res = await fetch('/api/myspace/config');
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data?.config) {
          setConfig((prev) => (data.config.revision > prev.revision ? data.config : prev));
        }
      } catch {
        // Ignore polling error
      }
    }, 3500);

    return () => {
      isMounted = false;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      window.clearInterval(pollTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, [viewMode, processRemoteKeyCommand]);

  // --- API Callbacks for Mobile Manager ---
  const handlePushConfig = async (
    nextPartial: Partial<MySpaceTVConfig>,
    actionDescription: string,
    newPin?: string
  ): Promise<boolean> => {
    try {
      const merged = { ...config, ...nextPartial };
      const res = await fetch('/api/myspace/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: pairingPin,
          newPin,
          actionDescription,
          config: merged,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) return false;
      setConfig(data.config);
      if (data.ack) setLastAck(data.ack);
      return true;
    } catch {
      return false;
    }
  };

  const handleUploadWallpaper = async (payload: {
    name: string;
    dataUrl: string;
    mimeType: string;
    sizeBytes: number;
    width: number;
    height: number;
    fitMode: WallpaperFitMode;
    position: WallpaperPosition;
    layoutPreset: WallpaperLayoutPreset;
  }): Promise<boolean> => {
    try {
      const res = await fetch('/api/myspace/wallpaper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: pairingPin,
          ...payload,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) return false;
      setConfig(data.config);
      if (data.ack) setLastAck(data.ack);
      return true;
    } catch {
      return false;
    }
  };

  const handleSendRemoteKey = async (key: string, gameId?: BuiltInGameId) => {
    try {
      await fetch('/api/myspace/remote-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, gameId }),
      });
    } catch {
      // Ignore network error
    }
  };

  const handleResetDefault = async () => {
    try {
      const res = await fetch('/api/myspace/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pairingPin }),
      });
      const data = await res.json();
      if (res.ok && data.config) {
        setConfig(data.config);
      }
    } catch {
      // Ignore
    }
  };

  const handleImportJsonConfig = async (rawConfig: unknown): Promise<boolean> => {
    try {
      const res = await fetch('/api/myspace/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pairingPin, rawConfig }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) return false;
      setConfig(data.config);
      if (data.ack) setLastAck(data.ack);
      return true;
    } catch {
      return false;
    }
  };

  if (viewMode === 'mobile') {
    return (
      <MySpaceMobileManager
        config={config}
        tvClientCount={tvClientCount}
        mobileClientCount={mobileClientCount}
        wsConnected={wsConnected}
        lastAck={lastAck}
        pairingPin={pairingPin}
        onChangePairingPin={setPairingPin}
        onPushConfig={handlePushConfig}
        onUploadWallpaper={handleUploadWallpaper}
        onSendRemoteKey={handleSendRemoteKey}
        onResetDefault={handleResetDefault}
        onImportJsonConfig={handleImportJsonConfig}
        onSwitchToTvView={() => setViewMode('tv')}
      />
    );
  }

  // --- Render MySpace TV Home Screen (Reference Deep Blue Design) ---
  const activeWallpaper =
    config.wallpapers.find((w) => w.id === config.activeWallpaperId) || config.wallpapers[0];

  const { colors, layout } = config;
  const greetingText = getVietnameseGreeting(now.getHours());
  const mobileManagerUrl = `${window.location.origin}/?mode=mobile`;

  const getFocusStyle = (id: string): React.CSSProperties => {
    const isFocused = focusedId === id;
    return {
      backgroundColor: colors.cardSurface,
      color: colors.textColor,
      outline: isFocused ? `4px solid ${colors.accentColor}` : '1px solid rgba(255,255,255,0.14)',
      outlineOffset: isFocused ? '2px' : '0px',
      transform: isFocused && !layout.reduceMotionForK5300 ? 'scale(1.03)' : 'scale(1)',
      boxShadow: isFocused
        ? `0 14px 32px -6px rgba(0, 0, 0, 0.55), 0 0 22px ${colors.accentColor}55`
        : '0 6px 18px -4px rgba(0, 0, 0, 0.35)',
    };
  };

  const featuredSectionNode = (
    <main key="featured" className="relative z-10 flex-1 flex flex-col justify-center my-3 min-h-0">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5" style={{ color: colors.accentColor }} />
          <h2 className="text-lg lg:text-xl font-extrabold tracking-tight">
            Phim và chương trình nổi bật
          </h2>
          <span className="hidden sm:inline-block text-[11px] px-2.5 py-0.5 rounded-full bg-white/15 font-medium">
            Dữ liệu mẫu minh họa • Tùy chỉnh từ điện thoại
          </span>
        </div>
        <span className="text-xs opacity-80 font-medium">
          Dùng phím ◀ ▲ ▼ ▶ và nhấn OK để mở
        </span>
      </div>

      <div
        className={`grid gap-3 lg:gap-4 ${
          layout.featuredColumns === 3 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-4'
        }`}
      >
        {visibleFeatured.map((item, idx) => {
          const focusKey = `feat-${idx}`;
          const isFocused = focusedId === focusKey;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setFocusedId(focusKey);
                handleActivateFocusedItem(focusKey);
              }}
              onMouseEnter={() => setFocusedId(focusKey)}
              className="group text-left overflow-hidden rounded-2xl transition-all duration-150 flex flex-col"
              style={getFocusStyle(focusKey)}
            >
              <div className="relative w-full h-24 lg:h-32 bg-slate-900 overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                <span
                  className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider shadow"
                  style={{
                    backgroundColor: isFocused ? colors.accentColor : 'rgba(7, 25, 48, 0.85)',
                    color: isFocused ? '#061529' : '#ffffff',
                  }}
                >
                  {item.builtInGameId ? 'GAME TV' : 'HD'}
                </span>
              </div>

              <div className="p-2.5 lg:p-3 flex-1 flex flex-col justify-between">
                <div className="font-bold text-xs lg:text-sm leading-snug line-clamp-1">
                  {item.title}
                </div>
                <div className="text-[11px] opacity-80 line-clamp-1 mt-0.5">{item.subtitle}</div>
              </div>
            </button>
          );
        })}
      </div>
    </main>
  );

  const appsSectionNode = (
    <footer key="apps" className="relative z-10 pt-2 border-t border-white/15">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs lg:text-sm font-extrabold uppercase tracking-wider opacity-90">
            Ứng dụng của bạn ({visibleApps.length})
          </span>
        </div>
        <span className="text-[11px] opacity-75">{config.tvModelName}</span>
      </div>

      <div
        className={`flex items-center gap-3.5 overflow-x-auto py-1.5 px-1 no-scrollbar ${
          layout.appRowStyle === 'centered_dock' ? 'justify-center' : 'justify-start'
        }`}
      >
        {visibleApps.map((app, idx) => {
          const focusKey = `app-${idx}`;
          const iconLabel =
            app.iconKey === 'youtube'
              ? 'YT'
              : app.iconKey === 'youtube_kids'
              ? 'KIDS'
              : app.iconKey.slice(0, 4).toUpperCase();

          return (
            <button
              key={app.id}
              type="button"
              onClick={() => {
                setFocusedId(focusKey);
                handleActivateFocusedItem(focusKey);
              }}
              onMouseEnter={() => setFocusedId(focusKey)}
              className="px-4 py-2.5 rounded-2xl transition-all duration-150 flex items-center gap-3 shrink-0 min-w-[210px]"
              style={getFocusStyle(focusKey)}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-md shrink-0"
                style={{
                  backgroundColor: app.accentColor,
                }}
              >
                {iconLabel}
              </div>
              <div className="text-left min-w-0">
                <div className="font-extrabold text-sm lg:text-base leading-tight truncate">
                  {app.name}
                </div>
                <div className="text-[11px] opacity-80 truncate mt-0.5">
                  {app.type === 'website_shortcut'
                    ? 'Trình duyệt TV'
                    : app.type === 'tv_installed_app'
                    ? 'Ứng dụng TV'
                    : 'Trò chơi TV'}
                </div>
              </div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setViewMode('mobile')}
          onMouseEnter={() => setFocusedId('app-customize-mobile')}
          className="px-4 py-2.5 rounded-2xl transition-all duration-150 flex items-center gap-2.5 shrink-0"
          style={getFocusStyle('app-customize-mobile')}
        >
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center font-bold text-sky-200">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="font-bold text-xs lg:text-sm">+ Tùy chỉnh giao diện</div>
            <div className="text-[11px] opacity-75">Thêm ứng dụng, đổi hình nền</div>
          </div>
        </button>
      </div>
    </footer>
  );

  return (
    <div
      className="relative w-screen h-screen overflow-hidden select-none flex flex-col justify-between p-5 lg:p-8"
      style={{
        background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        color: colors.textColor,
      }}
    >
      {/* Background Wallpaper Layer */}
      {activeWallpaper && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <img
            src={activeWallpaper.dataUrl}
            alt={activeWallpaper.name}
            className="w-full h-full transition-opacity duration-500"
            style={{
              objectFit:
                activeWallpaper.fitMode === 'center' ? 'none' : activeWallpaper.fitMode || 'cover',
              objectPosition: activeWallpaper.position || 'center',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, rgba(8, 25, 48, ${Math.max(
                0.15,
                layout.wallpaperOverlayOpacity
              )}) 0%, rgba(11, 37, 69, ${Math.min(
                0.92,
                layout.wallpaperOverlayOpacity + 0.15
              )}) 100%)`,
            }}
          />
        </div>
      )}

      {/* 1. TOP BAR: 3-Column Reference Layout (Left Greeting | Center Weather | Right Clock & Date) */}
      <header className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-center gap-4">
        <div className="lg:col-span-5 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold tracking-wide shadow"
              style={{ backgroundColor: colors.accentColor, color: '#061529' }}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>MYSPACE TV</span>
            </div>

            <button
              type="button"
              onClick={() => setViewMode('mobile')}
              onMouseEnter={() => setFocusedId('top-mobile-switch')}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-1.5"
              style={getFocusStyle('top-mobile-switch')}
            >
              <Smartphone className="w-3.5 h-3.5 text-sky-300" />
              <span>Quản lý từ Điện thoại</span>
            </button>

            <button
              type="button"
              onClick={() => openOverlayWithFocusMemory(() => setShowQrGuideModal(true))}
              onMouseEnter={() => setFocusedId('top-qr-guide')}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-1.5"
              style={getFocusStyle('top-qr-guide')}
            >
              <QrCode className="w-3.5 h-3.5 text-sky-300" />
              <span>PIN: {pairingPin}</span>
            </button>

            <button
              type="button"
              onClick={() => openOverlayWithFocusMemory(() => setActiveGame('gomoku_tv'))}
              onMouseEnter={() => setFocusedId('top-games-quick')}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-1.5"
              style={getFocusStyle('top-games-quick')}
            >
              <Gamepad2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>Trò chơi TV</span>
            </button>
          </div>

          <div className="pt-0.5">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight leading-tight drop-shadow">
              {greetingText},{' '}
              <span style={{ color: colors.accentColor }}>{config.profileName}</span>!
            </h1>
            <p className="text-xs lg:text-sm opacity-85 font-medium">
              Không gian giải trí cá nhân • Điều khiển bằng phím mũi tên &amp; OK trên Remote
            </p>
          </div>
        </div>

        {/* Center Column: Weather Card */}
        <div className="lg:col-span-4 flex justify-start lg:justify-center">
          <div
            className="w-full max-w-sm px-4 py-3 rounded-2xl border border-white/15 backdrop-blur-md flex items-center justify-between gap-3 shadow-lg"
            style={{ backgroundColor: `${colors.cardSurface}dd` }}
          >
            <div className="flex items-center gap-3 min-w-0">
              {weatherData.status === 'live_verified' ? (
                <CloudSun className="w-7 h-7 text-sky-200 shrink-0" />
              ) : (
                <Cloud className="w-7 h-7 text-sky-200/70 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold truncate">{weatherData.cityName}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 font-semibold">
                    {weatherData.status === 'live_verified'
                      ? 'Trực tuyến'
                      : weatherData.status === 'unconfigured'
                      ? 'Đã tắt'
                      : 'Ngoại tuyến'}
                  </span>
                </div>
                <div className="text-xs opacity-90 truncate mt-0.5">
                  {weatherData.conditionText || 'Chưa cấu hình thời tiết'}
                </div>
                {weatherData.status === 'live_verified' &&
                  weatherData.humidityPercent !== undefined && (
                    <div className="text-[11px] opacity-75">
                      Độ ẩm {weatherData.humidityPercent}% • Gió {weatherData.windKmh ?? 0} km/h
                    </div>
                  )}
              </div>
            </div>

            <div className="text-right shrink-0">
              {weatherData.status === 'live_verified' &&
              weatherData.temperatureC !== undefined ? (
                <div className="text-2xl lg:text-3xl font-black tracking-tight">
                  {weatherData.temperatureC}°C
                </div>
              ) : (
                <div className="text-xs font-bold opacity-80 px-2 py-1 rounded bg-black/25">
                  --°C
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Large Clock & Date */}
        <div className="lg:col-span-3 flex flex-col items-start lg:items-end justify-center">
          <div className="text-3xl lg:text-4xl font-black tracking-tight leading-none drop-shadow">
            {formatClockTime(now, layout.timeFormat)}
          </div>
          <div className="text-xs lg:text-sm font-semibold opacity-90 mt-1">
            {formatVietnameseDate(now, layout.dateFormat)}
          </div>
          <div className="inline-flex items-center gap-1.5 text-[11px] opacity-80 mt-1">
            <Wifi className="w-3 h-3 text-emerald-300" />
            <span>
              {wsConnected ? 'Đồng bộ thời gian thực' : 'Đồng bộ chuẩn HTTP'} • Rev #
              {config.revision}
            </span>
          </div>
        </div>
      </header>

      {/* Render Sections according to layout.sectionOrder */}
      {layout.sectionOrder?.[0] === 'apps' ? (
        <>
          {appsSectionNode}
          {featuredSectionNode}
        </>
      ) : (
        <>
          {featuredSectionNode}
          {appsSectionNode}
        </>
      )}

      {/* OVERLAY 1: Built-in TV Games */}
      {activeGame && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6">
          <div className="max-w-3xl w-full space-y-3">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveGame('gomoku_tv')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                    activeGame === 'gomoku_tv'
                      ? 'bg-sky-400 text-slate-950'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  Cờ Caro 9×9
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGame('game_2048_tv')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                    activeGame === 'game_2048_tv'
                      ? 'bg-sky-400 text-slate-950'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  Giải đố 2048 TV
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGame('memory_match_tv')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                    activeGame === 'memory_match_tv'
                      ? 'bg-sky-400 text-slate-950'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  Lật Hình Trí Nhớ
                </button>
              </div>
              <button
                type="button"
                onClick={closeOverlayAndRestoreFocus}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-200 text-xs font-bold"
              >
                Đóng (Phím Return)
              </button>
            </div>
            <MySpaceTVGames
              gameId={activeGame}
              accentColor={colors.accentColor}
              onExitGame={closeOverlayAndRestoreFocus}
            />
          </div>
        </div>
      )}

      {/* OVERLAY 2: App / Featured Content Launch & Detail Modal */}
      {selectedDetailModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
          <div
            className="max-w-lg w-full rounded-3xl p-6 border-2 shadow-2xl space-y-4"
            style={{
              backgroundColor: colors.bgPrimary,
              borderColor: colors.accentColor,
              color: colors.textColor,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span
                  className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full"
                  style={{ backgroundColor: colors.accentColor, color: '#061529' }}
                >
                  {selectedDetailModal.category}
                </span>
                <h3 className="text-xl font-black mt-2">{selectedDetailModal.title}</h3>
                <p className="text-xs opacity-85 mt-1">{selectedDetailModal.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={closeOverlayAndRestoreFocus}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedDetailModal.compatibilityNote && (
              <div className="p-3.5 rounded-2xl bg-black/30 border border-white/15 text-xs leading-relaxed opacity-90">
                {selectedDetailModal.compatibilityNote}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeOverlayAndRestoreFocus}
                className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold"
              >
                Quay lại (Phím Return)
              </button>

              {selectedDetailModal.targetUrl && (
                <a
                  href={selectedDetailModal.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs shadow-lg"
                  style={{ backgroundColor: colors.accentColor, color: '#061529' }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Mở ngay (Nhấn OK)
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY 3: Mobile Pairing & Connection Guide Modal */}
      {showQrGuideModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
          <div
            className="max-w-lg w-full rounded-3xl p-6 border-2 shadow-2xl space-y-4"
            style={{
              backgroundColor: colors.bgPrimary,
              borderColor: colors.accentColor,
              color: colors.textColor,
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black">Kết nối Điện thoại với MySpace TV</h3>
              <button
                type="button"
                onClick={closeOverlayAndRestoreFocus}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-black/30 border border-white/15">
                <div className="opacity-75">Địa chỉ mở trên trình duyệt Điện thoại:</div>
                <div
                  className="font-mono font-bold text-sm mt-1 break-all"
                  style={{ color: colors.accentColor }}
                >
                  {mobileManagerUrl}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/30 border border-white/15 flex items-center justify-between">
                <span>Mã PIN xác thực ghép nối hiện tại:</span>
                <span className="font-mono font-black text-lg tracking-widest px-3 py-1 rounded-xl bg-white/15">
                  {pairingPin}
                </span>
              </div>

              <p className="opacity-85">
                Khi mở địa chỉ trên bằng điện thoại cùng mạng Wi-Fi/LAN, mọi thao tác đổi hình nền,
                chỉnh màu sắc, sắp xếp ứng dụng và sửa nội dung nổi bật sẽ cập nhật trực tiếp lên
                màn hình TV Samsung UA40K5300.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  closeOverlayAndRestoreFocus();
                  setViewMode('mobile');
                }}
                className="px-4 py-2 rounded-xl font-bold text-xs"
                style={{ backgroundColor: colors.accentColor, color: '#061529' }}
              >
                Mở thử giao diện Điện thoại ngay tại đây
              </button>
              <button
                type="button"
                onClick={closeOverlayAndRestoreFocus}
                className="px-4 py-2 rounded-xl bg-white/15 text-xs font-bold"
              >
                Đóng (Return)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
