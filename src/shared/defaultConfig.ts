import {
  FeaturedContentItem,
  MySpaceAppItem,
  MySpaceColorPalette,
  MySpaceTVConfig,
  WallpaperItem,
} from './types';

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export const COLOR_PALETTE_PRESETS: Record<
  'myspace_blue' | 'deep_ocean' | 'midnight_contrast',
  { label: string; palette: MySpaceColorPalette }
> = {
  myspace_blue: {
    label: 'Xanh Dương MySpace (Mặc định chuẩn thiết kế)',
    palette: {
      presetId: 'myspace_blue',
      bgPrimary: '#0b2545',
      bgSecondary: '#133c6e',
      cardSurface: '#1d4e89',
      textColor: '#ffffff',
      accentColor: '#60a5fa',
    },
  },
  deep_ocean: {
    label: 'Xanh Đại Dương Sâu',
    palette: {
      presetId: 'deep_ocean',
      bgPrimary: '#071a33',
      bgSecondary: '#0f315c',
      cardSurface: '#174278',
      textColor: '#f8fafc',
      accentColor: '#38bdf8',
    },
  },
  midnight_contrast: {
    label: 'Xanh Đêm Tương Phản Cao (Dễ nhìn từ xa)',
    palette: {
      presetId: 'midnight_contrast',
      bgPrimary: '#051020',
      bgSecondary: '#0a1f3d',
      cardSurface: '#14325c',
      textColor: '#ffffff',
      accentColor: '#facc15',
    },
  },
};

export const BUILTIN_WALLPAPERS: WallpaperItem[] = [
  {
    id: 'wp-myspace-blue-horizon',
    name: 'Xanh Dương MySpace Hiện Đại (Mặc định)',
    isBuiltIn: true,
    fitMode: 'cover',
    position: 'center',
    layoutPreset: 'color_overlay',
    mimeType: 'image/svg+xml',
    sizeBytes: 1540,
    width: 1920,
    height: 1080,
    createdAt: '2026-10-26T00:00:00.000Z',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0b2545"/>
            <stop offset="52%" stop-color="#133c6e"/>
            <stop offset="100%" stop-color="#081c36"/>
          </linearGradient>
          <radialGradient id="glowTop" cx="80%" cy="18%" r="48%">
            <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="glowBottom" cx="20%" cy="85%" r="50%">
            <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#bg)"/>
        <rect width="1920" height="1080" fill="url(#glowTop)"/>
        <rect width="1920" height="1080" fill="url(#glowBottom)"/>
        <path d="M0,840 Q520,740 1040,830 T1920,780 L1920,1080 L0,1080 Z" fill="#091f3c" opacity="0.55"/>
      </svg>
    `),
  },
  {
    id: 'wp-ocean-waves',
    name: 'Sóng Biển Xanh Thanh Lịch',
    isBuiltIn: true,
    fitMode: 'cover',
    position: 'center',
    layoutPreset: 'darkened_for_text',
    mimeType: 'image/svg+xml',
    sizeBytes: 1620,
    width: 1920,
    height: 1080,
    createdAt: '2026-10-26T00:00:00.000Z',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
        <defs>
          <linearGradient id="sea" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#08203e"/>
            <stop offset="60%" stop-color="#113a6b"/>
            <stop offset="100%" stop-color="#071930"/>
          </linearGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#sea)"/>
        <circle cx="1520" cy="240" r="180" fill="#38bdf8" opacity="0.16"/>
        <path d="M0,740 Q480,650 960,740 T1920,700 L1920,1080 L0,1080 Z" fill="#0d2d54" opacity="0.7"/>
        <path d="M0,850 Q480,790 960,860 T1920,820 L1920,1080 L0,1080 Z" fill="#071930" opacity="0.9"/>
      </svg>
    `),
  },
  {
    id: 'wp-starlight-blue',
    name: 'Bầu Trời Đêm Xanh Thẫm',
    isBuiltIn: true,
    fitMode: 'cover',
    position: 'center',
    layoutPreset: 'fullscreen',
    mimeType: 'image/svg+xml',
    sizeBytes: 1490,
    width: 1920,
    height: 1080,
    createdAt: '2026-10-26T00:00:00.000Z',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
        <defs>
          <linearGradient id="night" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#051329"/>
            <stop offset="100%" stop-color="#0f2c54"/>
          </linearGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#night)"/>
        <circle cx="320" cy="220" r="3" fill="#ffffff" opacity="0.5"/>
        <circle cx="880" cy="160" r="2.5" fill="#ffffff" opacity="0.4"/>
        <circle cx="1440" cy="280" r="3.5" fill="#93c5fd" opacity="0.5"/>
        <circle cx="1680" cy="140" r="2" fill="#ffffff" opacity="0.4"/>
      </svg>
    `),
  },
];

function createCardPreviewSvg(
  bgStart: string,
  bgEnd: string,
  accent: string,
  label: string,
  motif: 'planet' | 'mountain' | 'waves' | 'music' | 'gamepad' | 'forest' | 'stars' | 'camera'
): string {
  let shape = '';
  switch (motif) {
    case 'planet':
      shape = `<circle cx="320" cy="160" r="68" fill="${accent}" opacity="0.85"/><ellipse cx="320" cy="160" rx="115" ry="28" fill="none" stroke="#ffffff" stroke-width="5" opacity="0.65" transform="rotate(-18 320 160)"/>`;
      break;
    case 'mountain':
      shape = `<circle cx="420" cy="100" r="42" fill="${accent}" opacity="0.8"/><polygon points="80,290 250,110 410,290" fill="#1e40af" opacity="0.9"/><polygon points="240,290 390,135 550,290" fill="${accent}" opacity="0.65"/>`;
      break;
    case 'waves':
      shape = `<path d="M0,200 Q160,140 320,200 T640,190 L640,360 L0,360 Z" fill="${accent}" opacity="0.55"/><path d="M0,250 Q160,210 320,250 T640,240 L640,360 L0,360 Z" fill="#ffffff" opacity="0.22"/>`;
      break;
    case 'music':
      shape = `<circle cx="240" cy="210" r="34" fill="${accent}"/><circle cx="390" cy="190" r="34" fill="${accent}"/><path d="M268,210 L268,95 L418,75 L418,190" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`;
      break;
    case 'gamepad':
      shape = `<rect x="170" y="105" width="300" height="140" rx="55" fill="${accent}" opacity="0.85"/><path d="M245,150 L245,200 M220,175 L270,175" stroke="#0b2545" stroke-width="12" stroke-linecap="round"/><circle cx="385" cy="160" r="12" fill="#0b2545"/><circle cx="415" cy="190" r="12" fill="#0b2545"/>`;
      break;
    case 'forest':
      shape = `<polygon points="200,270 260,120 320,270" fill="${accent}" opacity="0.85"/><polygon points="290,270 360,95 430,270" fill="#ffffff" opacity="0.7"/><polygon points="380,270 435,140 490,270" fill="${accent}" opacity="0.65"/>`;
      break;
    case 'stars':
      shape = `<circle cx="320" cy="165" r="58" fill="none" stroke="${accent}" stroke-width="8"/><circle cx="320" cy="165" r="24" fill="#ffffff" opacity="0.9"/><line x1="320" y1="75" x2="320" y2="255" stroke="#ffffff" stroke-width="4" opacity="0.5"/><line x1="230" y1="165" x2="410" y2="165" stroke="#ffffff" stroke-width="4" opacity="0.5"/>`;
      break;
    default:
      shape = `<rect x="190" y="105" width="260" height="150" rx="26" fill="none" stroke="#ffffff" stroke-width="10" opacity="0.85"/><circle cx="320" cy="180" r="42" fill="${accent}"/>`;
      break;
  }

  return svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${bgStart}"/>
          <stop offset="100%" stop-color="${bgEnd}"/>
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill="url(#g)"/>
      ${shape}
      <text x="32" y="46" fill="#ffffff" opacity="0.65" font-family="sans-serif" font-size="18" font-weight="700">${label}</text>
    </svg>
  `);
}

/**
 * 8 Ô Nội dung nổi bật mặc định (2 hàng × 4 ô) — Ghi rõ là dữ liệu minh họa bố cục (Mục 4B)
 */
export const DEFAULT_FEATURED_ITEMS: FeaturedContentItem[] = [
  {
    id: 'feat-1',
    title: 'Khám Phá Vũ Trụ & Thiên Hà',
    subtitle: 'Tài liệu Khoa học • Minh họa bố cục',
    imageUrl: createCardPreviewSvg('#0f294a', '#1e4e8c', '#38bdf8', 'KHÁM PHÁ 01', 'planet'),
    order: 1,
    visible: true,
    isSampleData: true,
    linkedUrl: 'https://www.youtube.com/results?search_query=kham+pha+vu+tru+4k',
  },
  {
    id: 'feat-2',
    title: 'Thiên Nhiên Hùng Vĩ Bốn Mùa',
    subtitle: 'Phong cảnh • Minh họa bố cục',
    imageUrl: createCardPreviewSvg('#0d3b4c', '#1b5e7a', '#34d399', 'THIÊN NHIÊN 02', 'mountain'),
    order: 2,
    visible: true,
    isSampleData: true,
    linkedUrl: 'https://www.youtube.com/results?search_query=thien+nhien+hung+vi',
  },
  {
    id: 'feat-3',
    title: 'Thế Giới Đại Dương Sâu Thẳm',
    subtitle: 'Khám phá Biển • Minh họa bố cục',
    imageUrl: createCardPreviewSvg('#0a2e5c', '#155293', '#60a5fa', 'ĐẠI DƯƠNG 03', 'waves'),
    order: 3,
    visible: true,
    isSampleData: true,
    linkedUrl: 'https://www.youtube.com/results?search_query=the+gioi+dai+duong',
  },
  {
    id: 'feat-4',
    title: 'Hòa Tấu Âm Nhạc Thư Giãn',
    subtitle: 'Âm nhạc Gia đình • Minh họa bố cục',
    imageUrl: createCardPreviewSvg('#1e295b', '#31448f', '#a78bfa', 'ÂM NHẠC 04', 'music'),
    order: 4,
    visible: true,
    isSampleData: true,
    linkedUrl: 'https://www.youtube.com/results?search_query=nhac+khong+loi+thu+gian',
  },
  {
    id: 'feat-5',
    title: 'Hoạt Hình Vui Nhộn Gia Đình',
    subtitle: 'Thiếu nhi • Minh họa bố cục',
    imageUrl: createCardPreviewSvg('#153e5c', '#23648e', '#fbbf24', 'THIẾU NHI 05', 'stars'),
    order: 5,
    visible: true,
    isSampleData: true,
    linkedUrl: 'https://www.youtubekids.com',
  },
  {
    id: 'feat-6',
    title: 'Hành Trình Rừng Nhiệt Đới',
    subtitle: 'Sinh thái • Minh họa bố cục',
    imageUrl: createCardPreviewSvg('#0f393b', '#1b6366', '#4ade80', 'RỪNG XANH 06', 'forest'),
    order: 6,
    visible: true,
    isSampleData: true,
    linkedUrl: 'https://www.youtube.com/results?search_query=rung+nhiet+doi+thien+nhien',
  },
  {
    id: 'feat-7',
    title: 'Cờ Caro TV (Chơi Bằng Remote)',
    subtitle: 'Game Trình duyệt • Tương thích K5300',
    imageUrl: createCardPreviewSvg('#17355b', '#24558f', '#38bdf8', 'TRÒ CHƠI 07', 'gamepad'),
    order: 7,
    visible: true,
    isSampleData: true,
    builtInGameId: 'gomoku_tv',
  },
  {
    id: 'feat-8',
    title: 'Nghệ Thuật Nhiếp Ảnh & Kiến Trúc',
    subtitle: 'Văn hóa & Đời sống • Minh họa bố cục',
    imageUrl: createCardPreviewSvg('#1b2e52', '#2b4c82', '#f472b6', 'KIẾN TRÚC 08', 'camera'),
    order: 8,
    visible: true,
    isSampleData: true,
    linkedUrl: 'https://www.youtube.com/results?search_query=kien+truc+the+gioi',
  },
];

/**
 * DANH SÁCH ỨNG DỤNG MẶC ĐỊNH (Mục 3, 4C, 8, 16):
 * CHỈ HIỂN THỊ ĐÚNG 2 ỨNG DỤNG MẶC ĐỊNH: 1. YouTube, 2. YouTube Kids.
 * TUYỆT ĐỐI KHÔNG CÓ VTV GO.
 */
export const DEFAULT_MYSPACE_APPS: MySpaceAppItem[] = [
  {
    id: 'app-youtube',
    name: 'YouTube',
    iconKey: 'youtube',
    type: 'website_shortcut',
    url: 'https://www.youtube.com',
    accentColor: '#ef4444',
    order: 1,
    isFavorite: true,
    enabled: true,
    compatibilityStatus: 'verified_compatible',
    compatibilityNote:
      'Tương thích trình duyệt TVHTML5 7.20261021.13.00 trên Samsung UA40K5300 hoặc mở qua ứng dụng YouTube có sẵn trên TV.',
    launchConfigNote: 'Mở trực tiếp địa chỉ https://www.youtube.com trong trình duyệt TV.',
  },
  {
    id: 'app-youtube-kids',
    name: 'YouTube Kids',
    iconKey: 'youtube_kids',
    type: 'tv_installed_app',
    url: 'https://www.youtubekids.com',
    accentColor: '#f59e0b',
    order: 2,
    isFavorite: true,
    enabled: true,
    compatibilityStatus: 'requires_verification',
    compatibilityNote:
      'Samsung UA40K5300 không có ứng dụng YouTube Kids gốc riêng biệt; hệ thống truy cập qua giao diện web https://www.youtubekids.com trên trình duyệt TVHTML5.',
    launchConfigNote:
      'Mở qua trình duyệt web tại https://www.youtubekids.com (không tự động cài đặt gói ngoài).',
  },
];

export const DEFAULT_MYSPACE_CONFIG: MySpaceTVConfig = {
  revision: 1,
  updatedAt: '2026-10-26T19:15:00.000Z',
  updatedBy: 'Cấu hình mặc định MySpace TV',
  profileName: 'MySpace',
  tvModelName: 'Samsung UA40K5300 (TVHTML5 7.20261021.13.00)',
  activeWallpaperId: 'wp-myspace-blue-horizon',
  previousWallpaperId: null,
  wallpapers: [...BUILTIN_WALLPAPERS],
  colors: { ...COLOR_PALETTE_PRESETS.myspace_blue.palette },
  layout: {
    featuredColumns: 4,
    featuredMaxItems: 8,
    appRowStyle: 'prominent_cards',
    sectionOrder: ['featured', 'apps'],
    timeFormat: '24h',
    dateFormat: 'full_vi',
    overscanSafeMarginPercent: 2,
    wallpaperOverlayOpacity: 0.35,
    reduceMotionForK5300: true,
  },
  weather: {
    enabled: true,
    cityName: 'Hà Nội',
    latitude: 21.0285,
    longitude: 105.8542,
  },
  featuredItems: [...DEFAULT_FEATURED_ITEMS],
  apps: [...DEFAULT_MYSPACE_APPS],
};

export const VIETNAM_WEATHER_CITIES: {
  name: string;
  latitude: number;
  longitude: number;
}[] = [
  { name: 'Hà Nội', latitude: 21.0285, longitude: 105.8542 },
  { name: 'TP. Hồ Chí Minh', latitude: 10.8231, longitude: 106.6297 },
  { name: 'Đà Nẵng', latitude: 16.0544, longitude: 108.2022 },
  { name: 'Hải Phòng', latitude: 20.8449, longitude: 106.6881 },
  { name: 'Cần Thơ', latitude: 10.0452, longitude: 105.7469 },
  { name: 'Huế', latitude: 16.4637, longitude: 107.5909 },
  { name: 'Nha Trang', latitude: 12.2388, longitude: 109.1967 },
  { name: 'Đà Lạt', latitude: 11.9404, longitude: 108.4583 },
];
