export type AppCategoryType =
  | 'website_shortcut'     // 1. Lối tắt website
  | 'tv_installed_app'     // 2. Ứng dụng đã được cài trên TV
  | 'browser_game'         // 3. Game chạy trong trình duyệt
  | 'packaged_tv_app';     // 4. Ứng dụng TV được đóng gói riêng

export type CompatibilityStatus =
  | 'verified_compatible'   // Đã kiểm thử & chạy trực tiếp trên TVHTML5
  | 'browser_web_fallback'  // Mở qua địa chỉ web tương thích trên trình duyệt TV
  | 'requires_verification' // Cần kiểm tra phương thức truy cập trên TV thật
  | 'unsupported_on_k5300'; // Không hỗ trợ ứng dụng gốc trên UA40K5300

export type BuiltInGameId = 'gomoku_tv' | 'game_2048_tv' | 'memory_match_tv';

export interface MySpaceAppItem {
  id: string;
  name: string;
  iconKey: string;
  type: AppCategoryType;
  url?: string;
  builtInGameId?: BuiltInGameId;
  accentColor: string;
  order: number;
  isFavorite: boolean;
  enabled: boolean;
  compatibilityStatus: CompatibilityStatus;
  compatibilityNote: string;
  launchConfigNote: string;
}

export interface FeaturedContentItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  order: number;
  visible: boolean;
  isSampleData: boolean;
  linkedUrl?: string;
  builtInGameId?: BuiltInGameId;
}

export type WallpaperLayoutPreset =
  | 'fullscreen'           // Toàn màn hình
  | 'darkened_for_text'    // Hình nền tối để chữ dễ đọc
  | 'color_overlay'        // Hình nền có lớp phủ màu xanh dương
  | 'framed_content';      // Hình nền với vùng nội dung riêng

export type WallpaperFitMode = 'cover' | 'contain' | 'center';
export type WallpaperPosition = 'center' | 'top' | 'bottom';

export interface WallpaperItem {
  id: string;
  name: string;
  isBuiltIn: boolean;
  dataUrl: string;
  fitMode: WallpaperFitMode;
  position: WallpaperPosition;
  layoutPreset: WallpaperLayoutPreset;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  createdAt: string;
}

export interface MySpaceColorPalette {
  presetId: 'myspace_blue' | 'deep_ocean' | 'midnight_contrast' | 'custom';
  bgPrimary: string;       // Nền xanh dương đậm
  bgSecondary: string;     // Nền gradient phụ
  cardSurface: string;     // Màu ô nội dung xanh sáng hơn nền
  textColor: string;       // Chữ trắng độ tương phản cao
  accentColor: string;     // Màu nhấn & viền focus
}

export type HomeSectionKey = 'featured' | 'apps';

export interface MySpaceLayoutSettings {
  featuredColumns: 3 | 4;
  featuredMaxItems: 4 | 6 | 8;
  appRowStyle: 'prominent_cards' | 'compact_pills' | 'centered_dock';
  sectionOrder: HomeSectionKey[]; // Cho phép sắp xếp khu vực Nội dung nổi bật & Hàng ứng dụng
  timeFormat: '24h' | '12h';
  dateFormat: 'full_vi' | 'short_numeric';
  overscanSafeMarginPercent: 0 | 2 | 4;
  wallpaperOverlayOpacity: number;
  reduceMotionForK5300: boolean;
}

export interface WeatherSettings {
  enabled: boolean;
  cityName: string;
  latitude: number;
  longitude: number;
}

export interface LiveWeatherData {
  status: 'live_verified' | 'unconfigured' | 'offline_error';
  cityName: string;
  temperatureC?: number;
  conditionText?: string;
  windKmh?: number;
  humidityPercent?: number;
  updatedAt?: string;
  sourceName?: string;
  errorMessage?: string;
}

export interface MySpaceTVConfig {
  revision: number;
  updatedAt: string;
  updatedBy: string;
  profileName: string; // Mặc định: "MySpace"
  tvModelName: string;
  activeWallpaperId: string;
  previousWallpaperId: string | null;
  wallpapers: WallpaperItem[];
  colors: MySpaceColorPalette;
  layout: MySpaceLayoutSettings;
  weather: WeatherSettings;
  featuredItems: FeaturedContentItem[];
  apps: MySpaceAppItem[];
}

export type TVNavigationTab = 'home' | 'apps' | 'games' | 'wallpapers' | 'settings';

export type MobileManagerTab =
  | 'overview'
  | 'wallpapers'
  | 'colors'
  | 'layout'
  | 'apps'
  | 'featured'
  | 'connection'
  | 'settings';

export interface SyncAckPayload {
  revision: number;
  appliedWallpaperId: string;
  tvClientCount: number;
  confirmedByTvClient: boolean;
  confirmedAt: string;
}

export interface SelfTestResult {
  name: string;
  passed: boolean;
  detail: string;
}
