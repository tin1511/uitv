import { MediaChannelItem, RemoteKeySpec, TVAppItem, RemoteKeyCode, TVSectionId } from '../types/tv';

export const SAMSUNG_K5300_KEY_SPECS: Record<RemoteKeyCode, RemoteKeySpec> = {
  KEY_UP: {
    code: 'KEY_UP',
    label: 'Điều hướng Lên',
    shortLabel: 'Lên',
    category: 'navigation',
    supportLevel: 'full_sync',
    samsungTizenKey: 'KEY_UP',
    description: 'Di chuyển tiêu điểm (focus) lên mục phía trên trong giao diện HĐV TV hoặc menu Tizen.',
  },
  KEY_DOWN: {
    code: 'KEY_DOWN',
    label: 'Điều hướng Xuống',
    shortLabel: 'Xuống',
    category: 'navigation',
    supportLevel: 'full_sync',
    samsungTizenKey: 'KEY_DOWN',
    description: 'Di chuyển tiêu điểm (focus) xuống mục phía dưới trên màn hình TV.',
  },
  KEY_LEFT: {
    code: 'KEY_LEFT',
    label: 'Điều hướng Trái',
    shortLabel: 'Trái',
    category: 'navigation',
    supportLevel: 'full_sync',
    samsungTizenKey: 'KEY_LEFT',
    description: 'Di chuyển tiêu điểm sang trái hoặc chuyển thẻ trước đó.',
  },
  KEY_RIGHT: {
    code: 'KEY_RIGHT',
    label: 'Điều hướng Phải',
    shortLabel: 'Phải',
    category: 'navigation',
    supportLevel: 'full_sync',
    samsungTizenKey: 'KEY_RIGHT',
    description: 'Di chuyển tiêu điểm sang phải hoặc chuyển thẻ tiếp theo.',
  },
  KEY_ENTER: {
    code: 'KEY_ENTER',
    label: 'OK / Xác nhận',
    shortLabel: 'OK',
    category: 'navigation',
    supportLevel: 'full_sync',
    samsungTizenKey: 'KEY_ENTER',
    description: 'Kích hoạt nút, mở ứng dụng, hoặc phát/tạm dừng nội dung đang được chọn trên HĐV TV.',
  },
  KEY_RETURN: {
    code: 'KEY_RETURN',
    label: 'Back / Quay lại',
    shortLabel: 'Back',
    category: 'system',
    supportLevel: 'full_sync',
    samsungTizenKey: 'KEY_RETURN',
    description: 'Đóng hộp thoại đang mở hoặc quay về trang chủ HĐV TV.',
  },
  KEY_HOME: {
    code: 'KEY_HOME',
    label: 'Trang chủ HĐV',
    shortLabel: 'Home',
    category: 'system',
    supportLevel: 'full_sync',
    samsungTizenKey: 'KEY_HOME',
    description: 'Đưa HĐV TV về ngay khu vực Trang chủ chính (01/04). Lưu ý: Smart Hub gốc của Samsung chặn gọi KEY_HOME từ web thường trừ khi gửi qua cổng LAN :8001.',
  },
  KEY_MENU: {
    code: 'KEY_MENU',
    label: 'Menu Cài đặt nhanh',
    shortLabel: 'Menu',
    category: 'system',
    supportLevel: 'full_sync',
    samsungTizenKey: 'KEY_MENU',
    description: 'Mở bảng Cài đặt giao diện và cấu hình kỹ thuật của HĐV TV.',
  },
  KEY_VOLUP: {
    code: 'KEY_VOLUP',
    label: 'Tăng âm lượng (+)',
    shortLabel: 'VOL +',
    category: 'audio',
    supportLevel: 'full_sync',
    samsungTizenKey: 'KEY_VOLUP',
    description: 'Tăng 5% âm lượng trình phát HĐV TV thời gian thực và gửi mã KEY_VOLUP qua cổng LAN :8001 nếu Bridge kết nối.',
  },
  KEY_VOLDOWN: {
    code: 'KEY_VOLDOWN',
    label: 'Giảm âm lượng (-)',
    shortLabel: 'VOL -',
    category: 'audio',
    supportLevel: 'full_sync',
    samsungTizenKey: 'KEY_VOLDOWN',
    description: 'Giảm 5% âm lượng trình phát HĐV TV thời gian thực và gửi mã KEY_VOLDOWN qua cổng LAN :8001.',
  },
  KEY_MUTE: {
    code: 'KEY_MUTE',
    label: 'Tắt / Mở tiếng',
    shortLabel: 'Mute',
    category: 'audio',
    supportLevel: 'full_sync',
    samsungTizenKey: 'KEY_MUTE',
    description: 'Chuyển đổi trạng thái Tắt tiếng (Mute) ngay lập tức trên trình phát HĐV TV.',
  },
  KEY_CHUP: {
    code: 'KEY_CHUP',
    label: 'Kênh tiếp theo (CH+)',
    shortLabel: 'CH +',
    category: 'channel',
    supportLevel: 'full_sync',
    samsungTizenKey: 'KEY_CHUP',
    description: 'Chuyển sang kênh nội dung tiếp theo trong danh mục Hồn Đất Việt.',
  },
  KEY_CHDOWN: {
    code: 'KEY_CHDOWN',
    label: 'Kênh trước đó (CH-)',
    shortLabel: 'CH -',
    category: 'channel',
    supportLevel: 'full_sync',
    samsungTizenKey: 'KEY_CHDOWN',
    description: 'Lùi về kênh nội dung trước đó trong danh mục Hồn Đất Việt.',
  },
  KEY_SOURCE: {
    code: 'KEY_SOURCE',
    label: 'Chuyển nguồn đầu vào (Source)',
    shortLabel: 'Source',
    category: 'system',
    supportLevel: 'lan_bridge_required',
    samsungTizenKey: 'KEY_SOURCE',
    description: 'Chuyển nguồn hiển thị trong HĐV TV. Để đổi cổng vật lý HDMI 1 / HDMI 2 của Samsung UA40K5300, trình duyệt web bị sandbox chặn quyền phần cứng và bắt buộc phải gửi lệnh KEY_SOURCE qua HĐV Bridge LAN (:8001).',
    limitationNote: 'Trình duyệt Tizen 2.4 không cấp API đổi HDMI trực tiếp cho trang web vì lý do bảo mật; cần chạy HĐV Bridge trong mạng LAN (:8001) hoặc dùng phím Source trên remote vật lý.',
  },
  KEY_POWER: {
    code: 'KEY_POWER',
    label: 'Nguồn (Standby / Power)',
    shortLabel: 'Nguồn',
    category: 'power',
    supportLevel: 'hardware_limited',
    samsungTizenKey: 'KEY_POWEROFF',
    description: 'Chuyển giao diện HĐV TV sang chế độ Nghỉ màn hình (Ambient Standby). Với phần cứng UA40K5300, lệnh mạng chỉ có thể TẮT TV (KEY_POWEROFF qua LAN :8001), KHÔNG thể BẬT TV từ trạng thái tắt hẳn qua Wi-Fi vì card mạng bị ngắt nguồn.',
    limitationNote: 'Giới hạn phần cứng Samsung UA40K5300 (2016): Khi TV đã tắt nguồn hoàn toàn, cổng WebSocket :8001 ngừng hoạt động. Để bật lại TV từ trạng thái tắt hẳn, bắt buộc dùng điều khiển hồng ngoại (IR) vật lý.',
  },
};

export const HDV_CHANNELS: MediaChannelItem[] = [
  {
    id: 'hdv-ch-01',
    number: '01',
    title: 'Hào Khí Đông A — Lịch Sử Đại Việt',
    subtitle: 'Phim tài liệu lịch sử Việt Nam • Thuyết minh chuẩn HD',
    category: 'Lịch sử Việt Nam',
    duration: '45:00',
    resolution: '1080p Full HD',
    description: 'Hành trình dựng nước và giữ nước từ thời Văn Lang - Âu Lạc đến ba lần chiến thắng quân Nguyên Mông trên dòng sông Bạch Đằng lịch sử.',
    tags: ['lịch sử', 'lịch sử việt nam', 'đại việt', 'bạch đằng', 'trần hưng đạo', 'tài liệu', 'video lịch sử'],
    accentColor: '#7ce7f5',
    secondaryColor: '#3b82f6',
    audioFreqBase: 220,
    narratorScript: 'Kênh 01 Hồn Đất Việt: Hào Khí Đông A — Tái hiện lịch sử hào hùng dân tộc Việt Nam trên màn hình lớn 1080p.',
    featuredSlideIndex: 0,
  },
  {
    id: 'hdv-ch-02',
    number: '02',
    title: 'Giai Điệu Quê Hương — Nhạc Dân Tộc & Giao Hưởng',
    subtitle: 'Không gian âm nhạc Việt Nam • Đàn bầu, Tranh, Sáo trúc',
    category: 'Âm nhạc Việt Nam',
    duration: '60:00',
    resolution: '1080p Full HD',
    description: 'Hòa tấu nhạc cụ dân tộc Việt Nam kết hợp dàn nhạc giao hưởng đương đại: Trống Cơm, Lưu Thủy Kim Tiền, Bèo Dạt Mây Trôi.',
    tags: ['nhạc', 'nhạc việt nam', 'âm nhạc', 'dân ca', 'đàn bầu', 'giao hưởng', 'ca nhạc'],
    accentColor: '#a78bfa',
    secondaryColor: '#6366f1',
    audioFreqBase: 293.66,
    narratorScript: 'Kênh 02 Âm nhạc Việt Nam: Hòa tấu đàn bầu và dàn nhạc dân tộc Hồn Đất Việt.',
    featuredSlideIndex: 1,
  },
  {
    id: 'hdv-ch-03',
    number: '03',
    title: 'Cậu Bé Làng Gióng — Phim Hoạt Hình Cổ Tích',
    subtitle: 'Hoạt hình Việt Nam • Phù hợp gia đình & thiếu nhi',
    category: 'Hoạt hình & Thiếu nhi',
    duration: '28:30',
    resolution: '1080p Full HD',
    description: 'Bộ phim hoạt hình 2D/3D nghệ thuật kể về truyền thuyết Thánh Gióng, Sơn Tinh Thủy Tinh và Sự tích Hồ Gươm dành cho thiếu nhi.',
    tags: ['hoạt hình', 'phim hoạt hình', 'thiếu nhi', 'cổ tích', 'thánh gióng', 'sự tích'],
    accentColor: '#34d399',
    secondaryColor: '#059669',
    audioFreqBase: 329.63,
    narratorScript: 'Kênh 03 Hoạt hình Việt Nam: Tuyển tập phim hoạt hình cổ tích dân gian đặc sắc.',
    featuredSlideIndex: 2,
  },
  {
    id: 'hdv-ch-04',
    number: '04',
    title: 'Di Sản Cố Đô & Vịnh Hạ Long Kỳ Quan',
    subtitle: 'Khám phá Văn hóa & Địa lý Việt Nam • Tối ưu tấm nền 40"',
    category: 'Văn hóa & Di sản',
    duration: '52:15',
    resolution: '1080p Full HD',
    description: 'Khám phá kiến trúc Hoàng thành Huế, Phố cổ Hội An, Thánh địa Mỹ Sơn và kỳ quan thiên nhiên thế giới Vịnh Hạ Long.',
    tags: ['di sản', 'văn hóa', 'du lịch', 'hạ long', 'huế', 'hội an', 'khám phá'],
    accentColor: '#fbbf24',
    secondaryColor: '#d97706',
    audioFreqBase: 261.63,
    narratorScript: 'Kênh 04 Di sản Việt Nam: Hành trình xuyên Việt qua các di sản văn hóa thế giới.',
    featuredSlideIndex: 3,
  },
  {
    id: 'hdv-ch-05',
    number: '05',
    title: 'Trống Đồng Đông Sơn & Văn Minh Lúa Nước',
    subtitle: 'Khảo cổ & Lịch sử Cổ đại Việt Nam',
    category: 'Lịch sử Việt Nam',
    duration: '38:40',
    resolution: '1080p Full HD',
    description: 'Giải mã hoa văn mặt trời, chim Lạc và kỹ thuật đúc đồng đỉnh cao của người Việt cổ cách đây hơn 2.500 năm.',
    tags: ['trống đồng', 'đông sơn', 'lịch sử', 'lịch sử việt nam', 'văn lang', 'khảo cổ'],
    accentColor: '#38bdf8',
    secondaryColor: '#0284c7',
    audioFreqBase: 196.0,
    narratorScript: 'Kênh 05 Khảo cổ Lịch sử: Giải mã bí ẩn Trống đồng Đông Sơn và văn minh sông Hồng.',
  },
  {
    id: 'hdv-ch-06',
    number: '06',
    title: 'Đờn Ca Tài Tử Nam Bộ & Quan Họ Bắc Ninh',
    subtitle: 'Di sản Âm nhạc Phi vật thể UNESCO',
    category: 'Âm nhạc Việt Nam',
    duration: '48:10',
    resolution: '1080p Full HD',
    description: 'Thưởng thức những làn điệu Quan họ mượt mà vùng Kinh Bắc và nghệ thuật Đờn ca tài tử phóng khoáng miền sông nước Phương Nam.',
    tags: ['nhạc', 'nhạc việt nam', 'quan họ', 'đờn ca tài tử', 'dân ca', 'âm nhạc'],
    accentColor: '#f472b6',
    secondaryColor: '#db2777',
    audioFreqBase: 349.23,
    narratorScript: 'Kênh 06 Di sản Âm nhạc: Làn điệu Quan họ Bắc Ninh và Đờn ca tài tử Nam Bộ.',
  },
];

export const HDV_APPS: TVAppItem[] = [
  {
    id: 'app-hdv-cinema',
    name: 'HĐV Rạp Phim & Lịch Sử',
    category: 'Giải trí Nội bộ',
    status: 'native_hdv',
    description: 'Trình phát video và âm nhạc tích hợp sẵn trong HĐV TV, hoạt động 100% trên trình duyệt Samsung K5300.',
    targetSection: 'media',
    compatibilityNote: 'Hoạt động trực tiếp trong trình duyệt Tizen 2.4 không cần cài đặt thêm.',
    accentHex: '#7ce7f5',
  },
  {
    id: 'app-hdv-voice-search',
    name: 'Tìm Kiếm Giọng Nói Tiếng Việt',
    category: 'Trí tuệ Nhân tạo',
    status: 'native_hdv',
    description: 'Nhận lệnh tìm kiếm từ HĐV Remote PWA và lọc tức thì kho nội dung Hồn Đất Việt.',
    targetSection: 'search',
    compatibilityNote: 'Nhận dữ liệu thời gian thực qua WebSocket từ điện thoại Android/iPhone.',
    accentHex: '#34d399',
  },
  {
    id: 'app-hdv-ai-scholar',
    name: 'Trợ Lý AI Hồn Đất Việt',
    category: 'Trợ lý Thông minh',
    status: 'native_hdv',
    description: 'Hỏi đáp kiến thức lịch sử, văn hóa Việt Nam và tra cứu kỹ thuật TV bằng trí tuệ nhân tạo Gemini.',
    targetSection: 'assistant',
    compatibilityNote: 'Xử lý phía máy chủ (Server-Side AI), không gây nặng CPU/RAM của TV đời 2016.',
    accentHex: '#a78bfa',
  },
  {
    id: 'app-youtube-tv',
    name: 'YouTube trên Trình duyệt TV',
    category: 'Dịch vụ Bên ngoài',
    status: 'web_deep_link',
    description: 'Mở trang YouTube Web. Lưu ý: Để mở ứng dụng YouTube Tizen gốc, cần gọi Tizen Application API từ gói .wgt đã ký hoặc dùng nút Smart Hub.',
    externalUrl: 'https://www.youtube.com/results?search_query=lich+su+viet+nam',
    compatibilityNote: 'Web thông thường không được phép tự ý khởi chạy ứng dụng .wgt khác do cơ chế Tizen Sandbox.',
    accentHex: '#f87171',
  },
  {
    id: 'app-tizen-settings',
    name: 'Chẩn Đoán Phần Cứng K5300',
    category: 'Hệ thống & Mạng LAN',
    status: 'native_hdv',
    description: 'Kiểm tra độ phân giải, User-Agent thực tế của TV, độ trễ WebSocket và quét cổng LAN :8001.',
    targetSection: 'device',
    compatibilityNote: 'Cung cấp thông số trung thực 100% từ trình duyệt đang chạy.',
    accentHex: '#60a5fa',
  },
];

export interface ParsedVoiceIntent {
  intentType: 'CONTROL_COMMAND' | 'SEARCH_QUERY' | 'OPEN_SECTION' | 'AI_QUESTION';
  keyCode?: RemoteKeyCode;
  targetSection?: TVSectionId;
  searchQuery?: string;
  explanationVi: string;
}

/**
 * Bộ phân tích ngữ nghĩa Tiếng Việt tất định (Deterministic Vietnamese Voice Parser)
 * Đảm bảo độ trễ < 5ms cho các câu lệnh điều khiển & tìm kiếm phổ biến, trước khi bổ sung AI.
 */
export function parseVietnameseVoiceIntent(rawText: string): ParsedVoiceIntent {
  const normalized = rawText.trim().toLowerCase();

  // 1. Lệnh âm lượng & tắt tiếng
  if (/(tăng âm lượng|to lên|mở to|tăng tiếng|âm lượng lớn)/.test(normalized)) {
    return {
      intentType: 'CONTROL_COMMAND',
      keyCode: 'KEY_VOLUP',
      explanationVi: 'Nhận diện lệnh điều khiển: Tăng âm lượng TV (+5%).',
    };
  }
  if (/(giảm âm lượng|nhỏ xuống|nhỏ lại|giảm tiếng|bé xuống)/.test(normalized)) {
    return {
      intentType: 'CONTROL_COMMAND',
      keyCode: 'KEY_VOLDOWN',
      explanationVi: 'Nhận diện lệnh điều khiển: Giảm âm lượng TV (-5%).',
    };
  }
  if (/(tắt tiếng|câm tiếng|im lặng|mute|bật tiếng|mở tiếng)/.test(normalized)) {
    return {
      intentType: 'CONTROL_COMMAND',
      keyCode: 'KEY_MUTE',
      explanationVi: 'Nhận diện lệnh điều khiển: Chuyển đổi trạng thái Tắt/Mở tiếng (Mute).',
    };
  }

  // 2. Lệnh điều hướng trang / khu vực
  if (/(mở trang chủ|về trang chủ|trang chính|màn hình chính|home)/.test(normalized)) {
    return {
      intentType: 'OPEN_SECTION',
      targetSection: 'home',
      keyCode: 'KEY_HOME',
      explanationVi: 'Nhận diện lệnh điều hướng: Mở Trang chủ HĐV TV.',
    };
  }
  if (/(mở cài đặt|vào cài đặt|tùy chỉnh giao diện|cấu hình)/.test(normalized)) {
    return {
      intentType: 'OPEN_SECTION',
      targetSection: 'settings',
      keyCode: 'KEY_MENU',
      explanationVi: 'Nhận diện lệnh điều hướng: Mở trang Cài đặt HĐV TV.',
    };
  }
  if (/(mở ứng dụng|kho ứng dụng|danh sách ứng dụng)/.test(normalized)) {
    return {
      intentType: 'OPEN_SECTION',
      targetSection: 'apps',
      explanationVi: 'Nhận diện lệnh điều hướng: Mở khu vực Ứng dụng & Dịch vụ.',
    };
  }
  if (/(mở yêu thích|danh sách yêu thích|nội dung yêu thích)/.test(normalized)) {
    return {
      intentType: 'OPEN_SECTION',
      targetSection: 'favorites',
      explanationVi: 'Nhận diện lệnh điều hướng: Mở khu vực Nội dung yêu thích.',
    };
  }
  if (/(thông tin thiết bị|kiểm tra kết nối|trạng thái tv|kiểm tra phần cứng)/.test(normalized)) {
    return {
      intentType: 'OPEN_SECTION',
      targetSection: 'device',
      explanationVi: 'Nhận diện lệnh điều hướng: Mở trang Thông tin thiết bị & Kết nối LAN.',
    };
  }
  if (/(trợ lý ai|hỏi ai|trợ lý thông minh)/.test(normalized)) {
    return {
      intentType: 'OPEN_SECTION',
      targetSection: 'assistant',
      explanationVi: 'Nhận diện lệnh điều hướng: Mở khu vực Trợ lý AI Hồn Đất Việt.',
    };
  }

  // 3. Lệnh chuyển kênh / nguồn / điều hướng cơ bản
  if (/(kênh tiếp|kênh sau|chuyển kênh lên|kênh kế tiếp)/.test(normalized)) {
    return {
      intentType: 'CONTROL_COMMAND',
      keyCode: 'KEY_CHUP',
      explanationVi: 'Nhận diện lệnh điều khiển: Chuyển sang kênh tiếp theo (CH+).',
    };
  }
  if (/(kênh trước|lùi kênh|chuyển kênh xuống)/.test(normalized)) {
    return {
      intentType: 'CONTROL_COMMAND',
      keyCode: 'KEY_CHDOWN',
      explanationVi: 'Nhận diện lệnh điều khiển: Lùi về kênh trước đó (CH-).',
    };
  }
  if (/(quay lại|trở lại|đóng|thoát|back)/.test(normalized)) {
    return {
      intentType: 'CONTROL_COMMAND',
      keyCode: 'KEY_RETURN',
      explanationVi: 'Nhận diện lệnh điều khiển: Quay lại / Đóng hộp thoại (Back).',
    };
  }
  if (/(chuyển nguồn|đổi nguồn|hdmi|nguồn đầu vào)/.test(normalized)) {
    return {
      intentType: 'CONTROL_COMMAND',
      keyCode: 'KEY_SOURCE',
      explanationVi: 'Nhận diện lệnh điều khiển: Chuyển nguồn đầu vào (Source / HDMI).',
    };
  }
  if (/(tắt tv|tắt nguồn|chế độ nghỉ|standby)/.test(normalized)) {
    return {
      intentType: 'CONTROL_COMMAND',
      keyCode: 'KEY_POWER',
      explanationVi: 'Nhận diện lệnh điều khiển: Chuyển trạng thái Nguồn (Standby).',
    };
  }

  // 4. Lệnh tìm kiếm nội dung ("Tìm phim hoạt hình", "Tìm video về lịch sử Việt Nam", "Tìm nhạc Việt Nam"...)
  const searchMatch = normalized.match(/^(?:tìm kiếm|tìm|mở video|xem phim|xem video|nghe nhạc|phát)\s+(.+)$/i);
  if (searchMatch && searchMatch[1]) {
    const cleanedQuery = searchMatch[1]
      .replace(/^(về|các|những|bộ|video về|phim về)\s+/i, '')
      .trim();
    return {
      intentType: 'SEARCH_QUERY',
      targetSection: 'search',
      searchQuery: cleanedQuery || rawText.trim(),
      explanationVi: `Nhận diện yêu cầu tìm kiếm nội dung: "${cleanedQuery || rawText.trim()}".`,
    };
  }

  // Nếu có từ khóa nội dung trực tiếp
  if (/(hoạt hình|lịch sử|nhạc|cổ tích|di sản|đông sơn|hạ long|bạch đằng)/.test(normalized)) {
    return {
      intentType: 'SEARCH_QUERY',
      targetSection: 'search',
      searchQuery: rawText.trim(),
      explanationVi: `Nhận diện yêu cầu tìm kiếm theo chủ đề: "${rawText.trim()}".`,
    };
  }

  // Mặc định chuyển sang tìm kiếm kết hợp Trợ lý AI
  return {
    intentType: 'SEARCH_QUERY',
    targetSection: 'search',
    searchQuery: rawText.trim(),
    explanationVi: `Tìm kiếm nội dung khớp với từ khóa: "${rawText.trim()}".`,
  };
}
