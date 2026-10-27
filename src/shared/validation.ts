import {
  FeaturedContentItem,
  MySpaceAppItem,
  MySpaceTVConfig,
  SelfTestResult,
  WallpaperItem,
} from './types';
import { DEFAULT_MYSPACE_APPS, DEFAULT_MYSPACE_CONFIG } from './defaultConfig';

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
export const MAX_WALLPAPER_BYTES = 2.5 * 1024 * 1024; // 2.5MB sau khi nén tối ưu cho TV UA40K5300

/**
 * Kiểm tra tính hợp lệ và an toàn của địa chỉ URL lối tắt (Mục 10 & Mục 13 Bảo mật)
 * Tuyệt đối chặn javascript:, data:, vbscript:, file: hoặc truy cập trái phép trang quản trị.
 */
export function validateSafeAppUrl(rawUrl: string): {
  valid: boolean;
  normalizedUrl?: string;
  error?: string;
} {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Địa chỉ URL không được để trống.' };
  }

  // Chặn các giao thức thực thi mã độc (XSS)
  if (/^(javascript|data|vbscript|file|about|blob):/i.test(trimmed)) {
    return {
      valid: false,
      error: 'Từ chối bảo mật: Không cho phép giao thức thực thi mã (javascript:, data:, file:).',
    };
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        valid: false,
        error: 'Chỉ chấp nhận địa chỉ web bắt đầu bằng http:// hoặc https://.',
      };
    }
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return {
        valid: false,
        error: 'Tên miền không hợp lệ (ví dụ hợp lệ: https://www.youtube.com).',
      };
    }
    // Không cho phép tạo lối tắt trỏ ngược vào API quản trị nội bộ
    if (parsed.pathname.startsWith('/api/')) {
      return {
        valid: false,
        error: 'Bảo mật: Không cho phép tạo lối tắt trỏ trực tiếp vào đường dẫn quản trị hệ thống (/api/*).',
      };
    }
    return { valid: true, normalizedUrl: parsed.toString() };
  } catch {
    return { valid: false, error: 'Định dạng địa chỉ URL không hợp lệ.' };
  }
}

/**
 * Kiểm tra tính hợp lệ của màu HEX (#RRGGBB)
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test((color || '').trim());
}

/**
 * Kiểm tra tệp hình nền tải lên từ điện thoại (Mục 9 & Mục 13)
 */
export function validateWallpaperUpload(input: {
  name?: string;
  dataUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
}): { valid: boolean; error?: string } {
  if (!input.name || !input.name.trim()) {
    return { valid: false, error: 'Tên hình nền không được để trống.' };
  }
  if (!input.dataUrl || typeof input.dataUrl !== 'string') {
    return { valid: false, error: 'Dữ liệu hình ảnh không hợp lệ.' };
  }
  const mime = (input.mimeType || '').toLowerCase();
  if (!ALLOWED_IMAGE_MIMES.includes(mime)) {
    return {
      valid: false,
      error: `Định dạng ảnh "${mime || 'không rõ'}" không được hỗ trợ. Chỉ chấp nhận JPG, PNG, WebP hoặc SVG.`,
    };
  }
  if (!input.dataUrl.startsWith('data:image/')) {
    return {
      valid: false,
      error: 'Chuỗi dữ liệu ảnh phải là data:image/* hợp lệ (không chấp nhận script hay URL ngoài chưa kiểm chứng).',
    };
  }
  const estimatedBytes =
    typeof input.sizeBytes === 'number' && input.sizeBytes > 0
      ? input.sizeBytes
      : Math.ceil((input.dataUrl.length * 3) / 4);

  if (estimatedBytes > MAX_WALLPAPER_BYTES) {
    return {
      valid: false,
      error: `Dung lượng ảnh (${(estimatedBytes / (1024 * 1024)).toFixed(2)} MB) vượt quá giới hạn an toàn 2.5 MB cho bộ nhớ RAM của TV Samsung UA40K5300.`,
    };
  }

  return { valid: true };
}

/**
 * Chuẩn hóa thứ tự sắp xếp ứng dụng liên tục (1, 2, 3...)
 */
export function normalizeAppOrder(apps: MySpaceAppItem[]): MySpaceAppItem[] {
  return [...apps]
    .sort((a, b) => a.order - b.order)
    .map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));
}

/**
 * Hoán đổi vị trí ứng dụng (Lên / Xuống)
 */
export function moveAppItemOrder(
  apps: MySpaceAppItem[],
  appId: string,
  direction: 'up' | 'down'
): MySpaceAppItem[] {
  const sorted = normalizeAppOrder(apps);
  const index = sorted.findIndex((a) => a.id === appId);
  if (index < 0) return sorted;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= sorted.length) return sorted;

  const temp = sorted[index];
  sorted[index] = sorted[targetIndex];
  sorted[targetIndex] = temp;

  return sorted.map((item, idx) => ({ ...item, order: idx + 1 }));
}

/**
 * Chuẩn hóa thứ tự các ô nội dung nổi bật (1, 2, 3...)
 */
export function normalizeFeaturedOrder(items: FeaturedContentItem[]): FeaturedContentItem[] {
  return [...items]
    .sort((a, b) => a.order - b.order)
    .map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));
}

/**
 * Hoán đổi vị trí ô nội dung nổi bật (Lên / Xuống)
 */
export function moveFeaturedItemOrder(
  items: FeaturedContentItem[],
  itemId: string,
  direction: 'up' | 'down'
): FeaturedContentItem[] {
  const sorted = normalizeFeaturedOrder(items);
  const index = sorted.findIndex((item) => item.id === itemId);
  if (index < 0) return sorted;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= sorted.length) return sorted;

  const temp = sorted[index];
  sorted[index] = sorted[targetIndex];
  sorted[targetIndex] = temp;

  return sorted.map((item, idx) => ({ ...item, order: idx + 1 }));
}

/**
 * Kiểm tra cấu hình JSON nhập vào từ tệp sao lưu
 */
export function validateImportedConfig(raw: unknown): {
  valid: boolean;
  config?: MySpaceTVConfig;
  error?: string;
} {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Dữ liệu JSON không phải là một đối tượng hợp lệ.' };
  }
  const obj = raw as Record<string, unknown>;
  if (!obj.colors || typeof obj.colors !== 'object') {
    return { valid: false, error: 'Thiếu cấu hình bảng màu (colors).' };
  }
  if (!obj.layout || typeof obj.layout !== 'object') {
    return { valid: false, error: 'Thiếu cấu hình bố cục (layout).' };
  }
  if (!Array.isArray(obj.apps) || obj.apps.length === 0) {
    return { valid: false, error: 'Danh sách ứng dụng (apps) không hợp lệ hoặc trống.' };
  }
  if (!Array.isArray(obj.featuredItems)) {
    return { valid: false, error: 'Thiếu danh sách nội dung nổi bật (featuredItems).' };
  }
  if (!Array.isArray(obj.wallpapers) || obj.wallpapers.length === 0) {
    return { valid: false, error: 'Danh sách hình nền (wallpapers) không hợp lệ.' };
  }

  return {
    valid: true,
    config: {
      ...DEFAULT_MYSPACE_CONFIG,
      ...(obj as Partial<MySpaceTVConfig>),
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Bộ kiểm thử tự động các chức năng cốt lõi của MySpace TV (Mục 15 & Mục 17)
 */
export function runMySpaceAutomatedTests(currentConfig: MySpaceTVConfig): {
  passedAll: boolean;
  total: number;
  passedCount: number;
  results: SelfTestResult[];
} {
  const results: SelfTestResult[] = [];

  // Test 1: URL Validation - Valid HTTPS URL
  const t1 = validateSafeAppUrl('youtube.com');
  results.push({
    name: 'Kiểm tra chuẩn hóa URL hợp lệ (youtube.com -> https://youtube.com/)',
    passed: t1.valid === true && t1.normalizedUrl === 'https://youtube.com/',
    detail: t1.normalizedUrl || t1.error || '',
  });

  // Test 2: Security XSS Block on javascript: URL
  const t2 = validateSafeAppUrl('javascript:alert(1)');
  results.push({
    name: 'Bảo mật Mục 13: Chặn mã độc XSS qua giao thức javascript:',
    passed: t2.valid === false,
    detail: t2.error || 'Đã chặn thành công',
  });

  // Test 3: Security Block on internal /api/ admin path
  const t3 = validateSafeAppUrl('https://example.com/api/myspace/reset');
  results.push({
    name: 'Bảo mật Mục 13: Chặn lối tắt truy cập đường dẫn quản trị (/api/*)',
    passed: t3.valid === false,
    detail: t3.error || 'Đã chặn thành công',
  });

  // Test 4: Wallpaper Upload Validation (Format & RAM limit for UA40K5300)
  const validWp = validateWallpaperUpload({
    name: 'Ảnh Gia Đình',
    mimeType: 'image/jpeg',
    dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    sizeBytes: 120000,
  });
  const oversizedWp = validateWallpaperUpload({
    name: 'Ảnh Gốc 8K Quá Nặng',
    mimeType: 'image/png',
    dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
    sizeBytes: 6 * 1024 * 1024,
  });
  results.push({
    name: 'Kiểm tra tải hình nền & Giới hạn dung lượng bảo vệ RAM UA40K5300',
    passed: validWp.valid === true && oversizedWp.valid === false,
    detail: `Ảnh hợp lệ: ${validWp.valid}, Chặn ảnh >2.5MB: ${!oversizedWp.valid}`,
  });

  // Test 5: App Reordering Integrity
  const sampleApps = [...DEFAULT_MYSPACE_APPS];
  const firstId = sampleApps[0].id;
  const secondId = sampleApps[1].id;
  const reordered = moveAppItemOrder(sampleApps, secondId, 'up');
  results.push({
    name: 'Kiểm tra sắp xếp vị trí ứng dụng (Di chuyển Lên/Xuống)',
    passed: reordered[0].id === secondId && reordered[1].id === firstId,
    detail: `Vị trí số 1 sau khi đổi: ${reordered[0].name}`,
  });

  // Test 6: Active Wallpaper Existence & Fallback Integrity
  const hasActiveWp = currentConfig.wallpapers.some(
    (w: WallpaperItem) => w.id === currentConfig.activeWallpaperId
  );
  results.push({
    name: 'Kiểm tra tính toàn vẹn Hình nền đang áp dụng trên TV',
    passed: hasActiveWp,
    detail: `Active Wallpaper ID: ${currentConfig.activeWallpaperId} (${currentConfig.wallpapers.length} ảnh lưu trữ)`,
  });

  // Test 7: Strict Default Apps Rule (Only YouTube & YouTube Kids by default, NO VTV Go anywhere)
  const defaultAppNames = DEFAULT_MYSPACE_APPS.map((a) => a.name);
  const hasOnlyYoutubeAndKids =
    DEFAULT_MYSPACE_APPS.length === 2 &&
    defaultAppNames[0] === 'YouTube' &&
    defaultAppNames[1] === 'YouTube Kids';
  const hasForbiddenBroadcastApp = currentConfig.apps.some((a) =>
    /vtv\s*go/i.test(`${a.id} ${a.name} ${a.url || ''}`)
  );
  results.push({
    name: 'Tuân thủ Mục 6D: Mặc định đúng 2 ứng dụng (YouTube & YouTube Kids), không chứa ứng dụng cấm',
    passed: hasOnlyYoutubeAndKids && !hasForbiddenBroadcastApp,
    detail: `Mặc định: [${defaultAppNames.join(', ')}] • Không chứa ứng dụng bị cấm: ${!hasForbiddenBroadcastApp}`,
  });

  // Test 8: Featured Content Grid (8 items for 2x4 grid)
  const visibleFeatured = currentConfig.featuredItems.filter((item) => item.visible);
  results.push({
    name: 'Kiểm tra lưới Nội dung nổi bật (2 hàng × 4 cột = 8 ô nội dung có hình ảnh)',
    passed: currentConfig.featuredItems.length >= 8 && visibleFeatured.length > 0,
    detail: `Tổng số ô: ${currentConfig.featuredItems.length}, Đang hiển thị: ${visibleFeatured.length} ô`,
  });

  const passedCount = results.filter((r) => r.passed).length;
  return {
    passedAll: passedCount === results.length,
    total: results.length,
    passedCount,
    results,
  };
}
