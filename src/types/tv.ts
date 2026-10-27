export type TVSectionId =
  | 'home'
  | 'apps'
  | 'media'
  | 'favorites'
  | 'search'
  | 'assistant'
  | 'settings'
  | 'device';

export type RemoteKeyCode =
  | 'KEY_UP'
  | 'KEY_DOWN'
  | 'KEY_LEFT'
  | 'KEY_RIGHT'
  | 'KEY_ENTER'
  | 'KEY_RETURN'
  | 'KEY_HOME'
  | 'KEY_MENU'
  | 'KEY_VOLUP'
  | 'KEY_VOLDOWN'
  | 'KEY_MUTE'
  | 'KEY_CHUP'
  | 'KEY_CHDOWN'
  | 'KEY_SOURCE'
  | 'KEY_POWER';

export type ProtocolSupportLevel = 'full_sync' | 'lan_bridge_required' | 'hardware_limited';

export interface RemoteKeySpec {
  code: RemoteKeyCode;
  label: string;
  shortLabel: string;
  category: 'navigation' | 'system' | 'audio' | 'channel' | 'power';
  supportLevel: ProtocolSupportLevel;
  samsungTizenKey: string;
  description: string;
  limitationNote?: string;
}

export interface MediaChannelItem {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  category: 'Lịch sử Việt Nam' | 'Văn hóa & Di sản' | 'Âm nhạc Việt Nam' | 'Hoạt hình & Thiếu nhi' | 'Tài liệu Khoa học';
  duration: string;
  resolution: '1080p Full HD' | '720p HD';
  description: string;
  tags: string[];
  accentColor: string;
  secondaryColor: string;
  audioFreqBase: number;
  narratorScript: string;
  featuredSlideIndex?: number;
}

export interface TVAppItem {
  id: string;
  name: string;
  category: string;
  status: 'native_hdv' | 'web_deep_link' | 'tizen_os_managed';
  description: string;
  targetSection?: TVSectionId;
  externalUrl?: string;
  compatibilityNote: string;
  accentHex: string;
}

export type CommandLifecycleStage =
  | 'VOICE_RECOGNIZED'
  | 'COMMAND_SENT'
  | 'TV_ACK_CONFIRMED'
  | 'PARTIAL_LAN_LIMITATION'
  | 'FAILED';

export interface CommandLogEntry {
  id: string;
  timestamp: string;
  source: 'remote_button' | 'voice_vi' | 'tv_keyboard' | 'ai_assistant';
  rawInput: string;
  intentType: 'CONTROL_COMMAND' | 'SEARCH_QUERY' | 'OPEN_SECTION' | 'AI_QUESTION';
  keyCode?: RemoteKeyCode;
  targetSection?: TVSectionId;
  searchQuery?: string;
  stage1SpeechRecognized: {
    done: boolean;
    transcript?: string;
    confidence?: number;
    engine?: string;
    at: string;
  };
  stage2SentToBridge: {
    done: boolean;
    transport: 'websocket_room' | 'http_api' | 'samsung_lan_8001';
    at: string;
  };
  stage3TargetConfirmed: {
    done: boolean;
    status: 'confirmed_by_tv' | 'executed_in_session' | 'unsupported_by_hardware' | 'waiting_tv_ack';
    detail: string;
    latencyMs?: number;
    at?: string;
  };
}

export interface TVSharedState {
  activeSection: TVSectionId;
  featuredIndex: number;
  currentChannelId: string;
  isPlaying: boolean;
  volume: number;
  muted: boolean;
  inputSource: 'HĐV Smart Hub' | 'HDMI 1 (Set-Top Box)' | 'HDMI 2 (PC / Console)' | 'TV DTV Anten';
  powerState: 'ON' | 'STANDBY_SIMULATED';
  searchQuery: string;
  favorites: string[];
  settings: {
    k5300PerformanceMode: boolean;
    highContrast: boolean;
    largeTextMode: boolean;
    soundEffects: boolean;
    tvLanIp: string;
    tvModelVerified: string;
    bridgeMode: 'hdv_websocket_sync' | 'samsung_lan_8001';
  };
  connectedClients: {
    tvCount: number;
    remoteCount: number;
  };
  lastCommand?: CommandLogEntry;
}

export interface LanProbeResult {
  ip: string;
  checkedAt: string;
  isPrivateLanIp: boolean;
  serverEnvironment: 'cloud_sandbox' | 'local_lan';
  ports: {
    port8001: { open: boolean; latencyMs: number; error?: string; service: string };
    port8002: { open: boolean; latencyMs: number; error?: string; service: string };
    port55000: { open: boolean; latencyMs: number; error?: string; service: string };
    port7676: { open: boolean; latencyMs: number; error?: string; service: string };
  };
  deviceMetadata?: Record<string, unknown> | null;
  summaryMessage: string;
  recommendation: string;
}
