import React, { useRef, useState } from 'react';
import {
  AppCategoryType,
  BuiltInGameId,
  FeaturedContentItem,
  HomeSectionKey,
  MobileManagerTab,
  MySpaceAppItem,
  MySpaceColorPalette,
  MySpaceTVConfig,
  SelfTestResult,
  SyncAckPayload,
  WallpaperFitMode,
  WallpaperLayoutPreset,
  WallpaperPosition,
} from '../shared/types';
import { COLOR_PALETTE_PRESETS, VIETNAM_WEATHER_CITIES } from '../shared/defaultConfig';
import {
  isValidHexColor,
  moveAppItemOrder,
  moveFeaturedItemOrder,
  validateSafeAppUrl,
} from '../shared/validation';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Film,
  Globe,
  Image as ImageIcon,
  Layout,
  Palette,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldCheck,
  Smartphone,
  Star,
  Trash2,
  Tv,
  Upload,
  Wifi,
} from 'lucide-react';

interface MySpaceMobileManagerProps {
  config: MySpaceTVConfig;
  tvClientCount: number;
  mobileClientCount: number;
  wsConnected: boolean;
  lastAck: SyncAckPayload | null;
  pairingPin: string;
  onChangePairingPin: (pin: string) => void;
  onPushConfig: (
    nextConfig: Partial<MySpaceTVConfig>,
    actionDescription: string,
    newPin?: string
  ) => Promise<boolean>;
  onUploadWallpaper: (payload: {
    name: string;
    dataUrl: string;
    mimeType: string;
    sizeBytes: number;
    width: number;
    height: number;
    fitMode: WallpaperFitMode;
    position: WallpaperPosition;
    layoutPreset: WallpaperLayoutPreset;
  }) => Promise<boolean>;
  onSendRemoteKey: (key: string, gameId?: BuiltInGameId) => Promise<void>;
  onResetDefault: () => Promise<void>;
  onImportJsonConfig: (rawConfig: unknown) => Promise<boolean>;
  onSwitchToTvView: () => void;
}

/**
 * Nén ảnh trên trình duyệt điện thoại về chuẩn 1280x720 JPEG (chất lượng 0.82)
 * Bảo vệ bộ nhớ RAM của TV Samsung UA40K5300 (TVHTML5 7.20261021.13.00).
 */
async function compressImageForTV(
  file: File,
  maxWidth = 1280,
  maxHeight = 720
): Promise<{
  dataUrl: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh từ điện thoại.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Tệp được chọn không phải là hình ảnh hợp lệ.'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Trình duyệt không hỗ trợ xử lý ảnh Canvas.'));
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        const approxBytes = Math.ceil((compressedDataUrl.length * 3) / 4);

        resolve({
          dataUrl: compressedDataUrl,
          mimeType: 'image/jpeg',
          sizeBytes: approxBytes,
          width: targetW,
          height: targetH,
        });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const MySpaceMobileManager: React.FC<MySpaceMobileManagerProps> = ({
  config,
  tvClientCount,
  wsConnected,
  lastAck,
  pairingPin,
  onChangePairingPin,
  onPushConfig,
  onUploadWallpaper,
  onSendRemoteKey,
  onResetDefault,
  onImportJsonConfig,
  onSwitchToTvView,
}) => {
  const [activeTab, setActiveTab] = useState<MobileManagerTab>('overview');
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // Tab 1: Overview - Profile Name
  const [profileNameInput, setProfileNameInput] = useState(config.profileName);

  // Tab 2: Wallpaper Upload State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [wpPreview, setWpPreview] = useState<{
    name: string;
    dataUrl: string;
    mimeType: string;
    sizeBytes: number;
    width: number;
    height: number;
  } | null>(null);
  const [wpFitMode, setWpFitMode] = useState<WallpaperFitMode>('cover');
  const [wpPosition, setWpPosition] = useState<WallpaperPosition>('center');
  const [wpLayoutPreset, setWpLayoutPreset] = useState<WallpaperLayoutPreset>('color_overlay');

  // Tab 3: Colors Draft Preview before applying
  const [draftColors, setDraftColors] = useState<MySpaceColorPalette>(config.colors);
  const [draftOverlayOpacity, setDraftOverlayOpacity] = useState<number>(
    config.layout.wallpaperOverlayOpacity
  );

  // Tab 5: New App Form State
  const [newAppName, setNewAppName] = useState('');
  const [newAppType, setNewAppType] = useState<AppCategoryType>('website_shortcut');
  const [newAppUrl, setNewAppUrl] = useState('');
  const [newAppGameId, setNewAppGameId] = useState<BuiltInGameId>('gomoku_tv');
  const [newAppIconKey, setNewAppIconKey] = useState('WEB');
  const [newAppColor, setNewAppColor] = useState('#2563eb');

  // Tab 6: Featured Content Form & Editing State
  const featuredFileInputRef = useRef<HTMLInputElement | null>(null);
  const [editingFeaturedId, setEditingFeaturedId] = useState<string | null>(null);
  const [featTitle, setFeatTitle] = useState('');
  const [featSubtitle, setFeatSubtitle] = useState('');
  const [featImageUrl, setFeatImageUrl] = useState('');
  const [featActionType, setFeatActionType] = useState<'url' | 'game'>('url');
  const [featLinkedUrl, setFeatLinkedUrl] = useState('https://www.youtube.com');
  const [featGameId, setFeatGameId] = useState<BuiltInGameId>('gomoku_tv');

  // Tab 8: Settings & Self-test State
  const importJsonInputRef = useRef<HTMLInputElement | null>(null);
  const [newServerPinInput, setNewServerPinInput] = useState('');
  const [selfTestReport, setSelfTestReport] = useState<{
    passedAll: boolean;
    total: number;
    passedCount: number;
    results: SelfTestResult[];
  } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setStatusBanner({ type, text });
    window.setTimeout(() => {
      setStatusBanner((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // --- Handlers for Tab 2: Wallpapers ---
  const handleSelectPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsBusy(true);
    try {
      const compressed = await compressImageForTV(file, 1280, 720);
      const cleanName = file.name.replace(/\.[^/.]+$/, '').slice(0, 40) || 'Ảnh nền từ điện thoại';
      setWpPreview({
        name: cleanName,
        ...compressed,
      });
      showToast(
        'info',
        `Đã tối ưu ảnh "${cleanName}" (${Math.round(compressed.sizeBytes / 1024)} KB, ${compressed.width}×${compressed.height}) sẵn sàng gửi lên TV.`
      );
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi khi xử lý ảnh.');
    } finally {
      setIsBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApplyWallpaperUpload = async () => {
    if (!wpPreview) return;
    setIsBusy(true);
    const ok = await onUploadWallpaper({
      ...wpPreview,
      fitMode: wpFitMode,
      position: wpPosition,
      layoutPreset: wpLayoutPreset,
    });
    setIsBusy(false);
    if (ok) {
      showToast('success', `Đã áp dụng hình nền "${wpPreview.name}" lên TV!`);
      setWpPreview(null);
    }
  };

  const handleActivateExistingWallpaper = async (wpId: string, wpName: string) => {
    setIsBusy(true);
    const ok = await onPushConfig(
      {
        previousWallpaperId: config.activeWallpaperId,
        activeWallpaperId: wpId,
      },
      `Đổi hình nền sang "${wpName}"`
    );
    setIsBusy(false);
    if (ok) showToast('success', `TV đã chuyển sang hình nền "${wpName}".`);
  };

  const handleRevertPreviousWallpaper = async () => {
    if (!config.previousWallpaperId) {
      showToast('info', 'Chưa có hình nền trước đó để quay lại.');
      return;
    }
    const target = config.wallpapers.find((w) => w.id === config.previousWallpaperId);
    if (!target) {
      showToast('error', 'Hình nền trước đó không còn tồn tại.');
      return;
    }
    await handleActivateExistingWallpaper(target.id, target.name);
  };

  // --- Handlers for Tab 3: Colors ---
  const handleApplyDraftColors = async () => {
    if (
      !isValidHexColor(draftColors.bgPrimary) ||
      !isValidHexColor(draftColors.bgSecondary) ||
      !isValidHexColor(draftColors.cardSurface) ||
      !isValidHexColor(draftColors.textColor) ||
      !isValidHexColor(draftColors.accentColor)
    ) {
      showToast('error', 'Vui lòng nhập đúng mã màu HEX 6 ký tự (ví dụ: #0b2545).');
      return;
    }
    setIsBusy(true);
    const ok = await onPushConfig(
      {
        colors: draftColors,
        layout: {
          ...config.layout,
          wallpaperOverlayOpacity: draftOverlayOpacity,
        },
      },
      'Cập nhật bảng màu giao diện TV'
    );
    setIsBusy(false);
    if (ok) showToast('success', 'Đã áp dụng bảng màu mới lên màn hình TV!');
  };

  const handleResetDefaultBlueColors = async () => {
    const defaultPalette = COLOR_PALETTE_PRESETS.myspace_blue.palette;
    setDraftColors(defaultPalette);
    setDraftOverlayOpacity(0.35);
    setIsBusy(true);
    const ok = await onPushConfig(
      {
        colors: defaultPalette,
        layout: {
          ...config.layout,
          wallpaperOverlayOpacity: 0.35,
        },
      },
      'Khôi phục bảng màu xanh dương mặc định'
    );
    setIsBusy(false);
    if (ok) showToast('success', 'Đã khôi phục bảng màu xanh dương mặc định.');
  };

  // --- Handlers for Tab 5: Apps ---
  const handleAddApp = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newAppName.trim();
    if (!trimmedName) {
      showToast('error', 'Vui lòng nhập tên ứng dụng.');
      return;
    }
    if (/vtv\s*go/i.test(`${trimmedName} ${newAppUrl}`)) {
      showToast('error', 'Theo yêu cầu sản phẩm: Không thêm VTV Go vào giao diện MySpace TV.');
      return;
    }

    let finalUrl: string | undefined;
    if (newAppType === 'website_shortcut' || newAppType === 'tv_installed_app') {
      const check = validateSafeAppUrl(newAppUrl);
      if (!check.valid) {
        showToast('error', check.error || 'Địa chỉ URL không hợp lệ.');
        return;
      }
      finalUrl = check.normalizedUrl;
    }

    const colorHex = isValidHexColor(newAppColor) ? newAppColor : '#2563eb';
    const newItem: MySpaceAppItem = {
      id: `app-custom-${Date.now()}`,
      name: trimmedName.slice(0, 36),
      iconKey: (newAppIconKey.trim() || trimmedName.slice(0, 3)).toUpperCase().slice(0, 5),
      type: newAppType,
      url: finalUrl,
      builtInGameId: newAppType === 'browser_game' ? newAppGameId : undefined,
      accentColor: colorHex,
      order: config.apps.length + 1,
      isFavorite: false,
      enabled: true,
      compatibilityStatus:
        newAppType === 'browser_game' || newAppType === 'website_shortcut'
          ? 'verified_compatible'
          : 'requires_verification',
      compatibilityNote:
        newAppType === 'tv_installed_app'
          ? 'Trình duyệt TVHTML5 trên Samsung UA40K5300 bị chặn gọi trực tiếp ứng dụng gốc; hệ thống sẽ mở bản Web tương ứng hoặc hướng dẫn mở bằng phím Smart Hub.'
          : newAppType === 'browser_game'
          ? 'Tương thích 100% với phím mũi tên, OK và Return trên remote Samsung UA40K5300.'
          : newAppType === 'packaged_tv_app'
          ? 'Yêu cầu đóng gói và cài đặt tệp .wgt qua Tizen Studio Developer Mode.'
          : 'Mở trực tiếp bằng trình duyệt TVHTML5.',
      launchConfigNote:
        newAppType === 'browser_game'
          ? `Khởi chạy trò chơi tích hợp: ${newAppGameId}`
          : `Mở địa chỉ: ${finalUrl || 'Đóng gói .wgt'}`,
    };

    const nextApps = [...config.apps, newItem];
    setIsBusy(true);
    const ok = await onPushConfig({ apps: nextApps }, `Thêm ứng dụng mới: "${newItem.name}"`);
    setIsBusy(false);

    if (ok) {
      setNewAppName('');
      setNewAppUrl('');
      showToast('success', `Đã thêm "${newItem.name}" vào hàng ứng dụng phía dưới TV!`);
    }
  };

  const handleMoveApp = async (appId: string, dir: 'up' | 'down') => {
    const updated = moveAppItemOrder(config.apps, appId, dir);
    await onPushConfig({ apps: updated }, 'Sắp xếp thứ tự hàng ứng dụng');
  };

  const handleToggleAppField = async (appId: string, field: 'enabled' | 'isFavorite') => {
    const updated = config.apps.map((a) => (a.id === appId ? { ...a, [field]: !a[field] } : a));
    await onPushConfig(
      { apps: updated },
      field === 'enabled' ? 'Thay đổi ẩn/hiện ứng dụng' : 'Cập nhật đánh dấu yêu thích'
    );
  };

  const handleDeleteApp = async (appId: string, appName: string) => {
    const remaining = config.apps.filter((a) => a.id !== appId);
    if (remaining.length === 0) {
      showToast('error', 'Cần giữ lại ít nhất 1 ứng dụng trên màn hình chính.');
      return;
    }
    const ok = await onPushConfig({ apps: remaining }, `Xóa ứng dụng "${appName}"`);
    if (ok) showToast('info', `Đã xóa "${appName}" khỏi TV.`);
  };

  // --- Handlers for Tab 6: Featured Content ---
  const handleStartEditFeatured = (item: FeaturedContentItem) => {
    setEditingFeaturedId(item.id);
    setFeatTitle(item.title);
    setFeatSubtitle(item.subtitle);
    setFeatImageUrl(item.imageUrl);
    if (item.builtInGameId) {
      setFeatActionType('game');
      setFeatGameId(item.builtInGameId);
    } else {
      setFeatActionType('url');
      setFeatLinkedUrl(item.linkedUrl || 'https://www.youtube.com');
    }
  };

  const handleUploadFeaturedThumbnail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsBusy(true);
    try {
      const compressed = await compressImageForTV(file, 640, 360);
      setFeatImageUrl(compressed.dataUrl);
      showToast(
        'info',
        `Đã nén ảnh thu nhỏ (${Math.round(compressed.sizeBytes / 1024)} KB) cho ô nội dung.`
      );
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi xử lý ảnh.');
    } finally {
      setIsBusy(false);
      if (featuredFileInputRef.current) featuredFileInputRef.current.value = '';
    }
  };

  const handleSaveFeaturedItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featTitle.trim()) {
      showToast('error', 'Tiêu đề nội dung nổi bật không được để trống.');
      return;
    }

    let validatedUrl = featLinkedUrl;
    if (featActionType === 'url') {
      const check = validateSafeAppUrl(featLinkedUrl);
      if (!check.valid) {
        showToast('error', check.error || 'URL đích không hợp lệ.');
        return;
      }
      validatedUrl = check.normalizedUrl || featLinkedUrl;
    }

    const defaultThumb = config.featuredItems[0]?.imageUrl || '';

    if (editingFeaturedId) {
      const nextFeatured = config.featuredItems.map((item) =>
        item.id === editingFeaturedId
          ? {
              ...item,
              title: featTitle.trim().slice(0, 48),
              subtitle: featSubtitle.trim().slice(0, 70),
              imageUrl: featImageUrl || item.imageUrl,
              linkedUrl: featActionType === 'url' ? validatedUrl : undefined,
              builtInGameId: featActionType === 'game' ? featGameId : undefined,
              isSampleData: false,
            }
          : item
      );
      const ok = await onPushConfig(
        { featuredItems: nextFeatured },
        `Cập nhật ô nội dung nổi bật: "${featTitle.trim()}"`
      );
      if (ok) {
        setEditingFeaturedId(null);
        setFeatTitle('');
        setFeatSubtitle('');
        showToast('success', 'Đã cập nhật ô nội dung nổi bật trên TV!');
      }
    } else {
      const newFeat: FeaturedContentItem = {
        id: `feat-custom-${Date.now()}`,
        title: featTitle.trim().slice(0, 48),
        subtitle: featSubtitle.trim().slice(0, 70) || 'Nội dung tùy chỉnh từ điện thoại',
        imageUrl: featImageUrl || defaultThumb,
        linkedUrl: featActionType === 'url' ? validatedUrl : undefined,
        builtInGameId: featActionType === 'game' ? featGameId : undefined,
        order: config.featuredItems.length + 1,
        visible: true,
        isSampleData: false,
      };
      const ok = await onPushConfig(
        { featuredItems: [...config.featuredItems, newFeat] },
        `Thêm ô nội dung nổi bật: "${newFeat.title}"`
      );
      if (ok) {
        setFeatTitle('');
        setFeatSubtitle('');
        showToast('success', `Đã thêm "${newFeat.title}" vào khu vực Nội dung nổi bật!`);
      }
    }
  };

  const handleMoveFeatured = async (itemId: string, dir: 'up' | 'down') => {
    const updated = moveFeaturedItemOrder(config.featuredItems, itemId, dir);
    await onPushConfig({ featuredItems: updated }, 'Sắp xếp thứ tự ô nội dung nổi bật');
  };

  const handleToggleFeaturedVisible = async (itemId: string) => {
    const updated = config.featuredItems.map((item) =>
      item.id === itemId ? { ...item, visible: !item.visible } : item
    );
    await onPushConfig({ featuredItems: updated }, 'Ẩn/hiện ô nội dung nổi bật');
  };

  const handleDeleteFeatured = async (itemId: string, title: string) => {
    const remaining = config.featuredItems.filter((item) => item.id !== itemId);
    const ok = await onPushConfig(
      { featuredItems: remaining },
      `Xóa ô nội dung nổi bật "${title}"`
    );
    if (ok) showToast('info', `Đã xóa "${title}".`);
  };

  // --- Handlers for Tab 8: Settings, Export/Import & Self-test ---
  const handleExportConfigJson = () => {
    const jsonString = JSON.stringify(config, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myspace-tv-config-r${config.revision}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('success', 'Đã xuất tệp cấu hình JSON về điện thoại/máy tính.');
  };

  const handleImportConfigFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const ok = await onImportJsonConfig(parsed);
      if (ok) {
        showToast('success', 'Đã nhập và đồng bộ tệp cấu hình JSON lên TV thành công!');
      } else {
        showToast('error', 'Không thể nhập tệp cấu hình JSON. Kiểm tra mã PIN hoặc định dạng tệp.');
      }
    } catch {
      showToast('error', 'Tệp được chọn không phải là tệp JSON hợp lệ.');
    } finally {
      if (importJsonInputRef.current) importJsonInputRef.current.value = '';
    }
  };

  const handleRunSelfTests = async () => {
    try {
      const res = await fetch('/api/myspace/self-test');
      const data = await res.json();
      setSelfTestReport(data);
      showToast(
        data.passedAll ? 'success' : 'error',
        `Kiểm thử tự động: Đạt ${data.passedCount}/${data.total} bài kiểm tra.`
      );
    } catch {
      showToast('error', 'Không thể gọi API kiểm thử tự động.');
    }
  };

  const activeWp =
    config.wallpapers.find((w) => w.id === config.activeWallpaperId) || config.wallpapers[0];

  const TABS: { id: MobileManagerTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: '1. Tổng quan', icon: <Smartphone className="w-4 h-4" /> },
    { id: 'wallpapers', label: '2. Hình nền', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'colors', label: '3. Màu sắc', icon: <Palette className="w-4 h-4" /> },
    { id: 'layout', label: '4. Bố cục', icon: <Layout className="w-4 h-4" /> },
    { id: 'apps', label: '5. Ứng dụng', icon: <Globe className="w-4 h-4" /> },
    { id: 'featured', label: '6. Nội dung nổi bật', icon: <Film className="w-4 h-4" /> },
    { id: 'connection', label: '7. Kết nối TV', icon: <Wifi className="w-4 h-4" /> },
    { id: 'settings', label: '8. Cài đặt', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#071930] text-slate-100 pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#0b2545]/95 backdrop-blur-md border-b border-sky-400/20 px-4 py-3">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center font-black text-slate-950 text-lg shadow-md">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base tracking-tight text-white">MySpace Mobile</h1>
                <span className="text-[11px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30 font-medium">
                  Rev #{config.revision}
                </span>
              </div>
              <p className="text-xs text-sky-200/75">
                Quản lý giao diện TV Samsung UA40K5300 từ điện thoại
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border ${
                wsConnected
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              {tvClientCount > 0 ? `TV đang mở (${tvClientCount})` : 'Chế độ chờ TV'}
            </span>

            <button
              type="button"
              onClick={onSwitchToTvView}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 transition"
            >
              <Tv className="w-3.5 h-3.5" />
              Xem màn hình TV
            </button>
          </div>
        </div>

        {/* 8-Tab Navigation Bar */}
        <nav className="max-w-3xl mx-auto mt-3 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  active
                    ? 'bg-sky-400 text-slate-950 shadow-sm'
                    : 'bg-[#133c6e]/70 text-sky-100/80 hover:bg-[#1d4e89] hover:text-white'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Content Container */}
      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-5">
        {statusBanner && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 ${
              statusBanner.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : statusBanner.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                : 'bg-sky-950/90 border-sky-500/40 text-sky-200'
            }`}
          >
            <span>{statusBanner.text}</span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-[11px] underline opacity-75 hover:opacity-100"
            >
              Đóng
            </button>
          </div>
        )}

        {/* TAB 1: TỔNG QUAN */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <section className="bg-[#0b2545] border border-sky-400/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Trạng thái đồng bộ MySpace TV
                </h2>
                <span className="text-xs text-sky-200/70">
                  Cập nhật lúc {new Date(config.updatedAt).toLocaleTimeString('vi-VN')}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-[#133c6e]/60 rounded-xl p-3 border border-sky-400/15">
                  <div className="text-sky-200/70">Thiết bị mục tiêu</div>
                  <div className="font-bold text-white mt-0.5">Samsung UA40K5300</div>
                  <div className="text-[11px] text-sky-300 mt-0.5">TVHTML5 7.20261021.13.00</div>
                </div>
                <div className="bg-[#133c6e]/60 rounded-xl p-3 border border-sky-400/15">
                  <div className="text-sky-200/70">Hình nền đang bật</div>
                  <div className="font-bold text-white mt-0.5 truncate">{activeWp?.name}</div>
                  <div className="text-[11px] text-emerald-300 mt-0.5">
                    {lastAck?.confirmedByTvClient
                      ? `TV đã xác nhận (Rev #${lastAck.revision})`
                      : 'Đã lưu trên máy chủ'}
                  </div>
                </div>
                <div className="bg-[#133c6e]/60 rounded-xl p-3 border border-sky-400/15">
                  <div className="text-sky-200/70">Nội dung nổi bật</div>
                  <div className="font-bold text-white mt-0.5">
                    {config.featuredItems.filter((i) => i.visible).length} /{' '}
                    {config.featuredItems.length} ô
                  </div>
                  <div className="text-[11px] text-sky-200/70 mt-0.5">Lưới 2 hàng × 4 cột</div>
                </div>
                <div className="bg-[#133c6e]/60 rounded-xl p-3 border border-sky-400/15">
                  <div className="text-sky-200/70">Hàng ứng dụng dưới</div>
                  <div className="font-bold text-white mt-0.5">
                    {config.apps.filter((a) => a.enabled).length} ứng dụng
                  </div>
                  <div className="text-[11px] text-emerald-300 mt-0.5">
                    Mặc định: YouTube &amp; Kids
                  </div>
                </div>
              </div>
            </section>

            {/* Greeting & Weather Quick Config */}
            <section className="bg-[#0b2545] border border-sky-400/20 rounded-2xl p-4 space-y-4">
              <h3 className="text-sm font-bold text-white">
                Cá nhân hóa Lời chào &amp; Thời tiết trên thanh trên cùng
              </h3>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-sky-200 mb-1">
                    Tên hiển thị trong lời chào (Ví dụ: MySpace, Gia đình...)
                  </label>
                  <input
                    type="text"
                    value={profileNameInput}
                    onChange={(e) => setProfileNameInput(e.target.value)}
                    placeholder="MySpace"
                    className="w-full bg-[#133c6e] border border-sky-400/30 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-sky-200 mb-1">
                    Tỉnh / Thành phố thời tiết thực tế (Open-Meteo API)
                  </label>
                  <select
                    value={config.weather.cityName}
                    onChange={(e) => {
                      const found = VIETNAM_WEATHER_CITIES.find((c) => c.name === e.target.value);
                      if (found) {
                        onPushConfig(
                          {
                            weather: {
                              ...config.weather,
                              enabled: true,
                              cityName: found.name,
                              latitude: found.latitude,
                              longitude: found.longitude,
                            },
                          },
                          `Đổi vị trí thời tiết sang ${found.name}`
                        );
                      }
                    }}
                    className="w-full bg-[#133c6e] border border-sky-400/30 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {VIETNAM_WEATHER_CITIES.map((city) => (
                      <option key={city.name} value={city.name}>
                        {city.name} ({city.latitude}, {city.longitude})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-sky-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.weather.enabled}
                    onChange={(e) =>
                      onPushConfig(
                        {
                          weather: {
                            ...config.weather,
                            enabled: e.target.checked,
                          },
                        },
                        e.target.checked ? 'Bật hiển thị thời tiết' : 'Tắt hiển thị thời tiết'
                      )
                    }
                    className="w-4 h-4 accent-sky-400"
                  />
                  <span>Bật cập nhật thời tiết thực tế trên TV</span>
                </label>

                <button
                  type="button"
                  onClick={async () => {
                    const ok = await onPushConfig(
                      {
                        profileName: profileNameInput.trim() || 'MySpace',
                      },
                      'Cập nhật tên lời chào cá nhân hóa'
                    );
                    if (ok) showToast('success', 'Đã cập nhật tên lời chào trên TV!');
                  }}
                  className="py-2 px-4 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs transition"
                >
                  Lưu Tên Lời chào lên TV
                </button>
              </div>
            </section>

            {/* Remote Navigation Pad for Phone Testing */}
            <section className="bg-[#0b2545] border border-sky-400/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  Điều khiển từ xa qua mạng nội bộ (Giả lập phím Remote Samsung)
                </h3>
                <span className="text-[11px] text-sky-300">Phản hồi tức thì qua WebSocket</span>
              </div>

              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto pt-1">
                <div />
                <button
                  type="button"
                  onClick={() => onSendRemoteKey('ArrowUp')}
                  className="py-3 rounded-xl bg-[#1d4e89] hover:bg-sky-500 hover:text-slate-950 font-bold text-xs border border-sky-300/30 transition"
                >
                  ▲ LÊN
                </button>
                <div />
                <button
                  type="button"
                  onClick={() => onSendRemoteKey('ArrowLeft')}
                  className="py-3 rounded-xl bg-[#1d4e89] hover:bg-sky-500 hover:text-slate-950 font-bold text-xs border border-sky-300/30 transition"
                >
                  ◀ TRÁI
                </button>
                <button
                  type="button"
                  onClick={() => onSendRemoteKey('Enter')}
                  className="py-3 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs shadow"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => onSendRemoteKey('ArrowRight')}
                  className="py-3 rounded-xl bg-[#1d4e89] hover:bg-sky-500 hover:text-slate-950 font-bold text-xs border border-sky-300/30 transition"
                >
                  PHẢI ▶
                </button>
                <button
                  type="button"
                  onClick={() => onSendRemoteKey('Return')}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-200 font-semibold text-xs border border-sky-400/20"
                >
                  ↩ RETURN
                </button>
                <button
                  type="button"
                  onClick={() => onSendRemoteKey('ArrowDown')}
                  className="py-3 rounded-xl bg-[#1d4e89] hover:bg-sky-500 hover:text-slate-950 font-bold text-xs border border-sky-300/30 transition"
                >
                  ▼ XUỐNG
                </button>
                <button
                  type="button"
                  onClick={() => onSendRemoteKey('Home')}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-200 font-semibold text-xs border border-sky-400/20"
                >
                  ⌂ HOME
                </button>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: HÌNH NỀN (MỤC 9) */}
        {activeTab === 'wallpapers' && (
          <div className="space-y-4">
            <section className="bg-[#0b2545] border border-sky-400/20 rounded-2xl p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Tải ảnh từ thư viện điện thoại lên làm hình nền TV
                  </h2>
                  <p className="text-xs text-sky-200/75">
                    Hỗ trợ JPG, PNG, WebP. Tự động nén chuẩn HD 1280×720 bảo vệ RAM TV Samsung UA40K5300.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRevertPreviousWallpaper}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#133c6e] hover:bg-[#1d4e89] text-xs font-semibold text-sky-200 border border-sky-400/25"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Quay lại ảnh trước
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleActivateExistingWallpaper(
                        'wp-myspace-blue-horizon',
                        'Xanh Dương MySpace Hiện Đại (Mặc định)'
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#133c6e] hover:bg-[#1d4e89] text-xs font-semibold text-sky-200 border border-sky-400/25"
                  >
                    Khôi phục mặc định
                  </button>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleSelectPhotoFile}
                className="hidden"
              />

              <button
                type="button"
                disabled={isBusy}
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-6 border-2 border-dashed border-sky-400/40 hover:border-sky-300 rounded-2xl bg-[#133c6e]/40 hover:bg-[#133c6e]/70 transition flex flex-col items-center justify-center gap-2"
              >
                <Upload className="w-7 h-7 text-sky-300" />
                <span className="text-xs font-bold text-white">
                  Chạm để chọn ảnh từ điện thoại hoặc chụp ảnh mới
                </span>
                <span className="text-[11px] text-sky-200/70">
                  Ảnh sẽ được hiển thị bản xem trước khung 16:9 trước khi áp dụng lên TV
                </span>
              </button>

              {/* 16:9 Preview & Layout Options before applying */}
              {wpPreview && (
                <div className="p-4 rounded-2xl bg-[#133c6e]/80 border border-sky-300/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-200">
                      Xem trước theo tỷ lệ màn hình TV 16:9 ({wpPreview.width}×{wpPreview.height} •{' '}
                      {Math.round(wpPreview.sizeBytes / 1024)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => setWpPreview(null)}
                      className="text-xs text-rose-300 hover:underline"
                    >
                      Hủy chọn
                    </button>
                  </div>

                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/20 bg-slate-950">
                    <img
                      src={wpPreview.dataUrl}
                      alt={wpPreview.name}
                      className="w-full h-full"
                      style={{
                        objectFit: wpFitMode === 'center' ? 'none' : wpFitMode,
                        objectPosition: wpPosition,
                      }}
                    />
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundColor: `rgba(8, 25, 48, ${
                          wpLayoutPreset === 'darkened_for_text'
                            ? 0.55
                            : wpLayoutPreset === 'color_overlay'
                            ? 0.38
                            : wpLayoutPreset === 'fullscreen'
                            ? 0.2
                            : config.layout.wallpaperOverlayOpacity
                        })`,
                      }}
                    />
                    <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-white/90 font-semibold bg-slate-950/60 px-2.5 py-1 rounded-lg">
                      <span>Mô phỏng chữ trắng trên nền TV</span>
                      <span>MySpace TV 16:9</span>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <label className="block text-sky-200 mb-1">Chế độ hiển thị ảnh</label>
                      <select
                        value={wpFitMode}
                        onChange={(e) => setWpFitMode(e.target.value as WallpaperFitMode)}
                        className="w-full bg-[#0b2545] border border-sky-400/30 rounded-xl px-2.5 py-2 text-white"
                      >
                        <option value="cover">Phủ kín màn hình (Cover)</option>
                        <option value="contain">Vừa khung hình (Contain)</option>
                        <option value="center">Căn giữa nguyên bản</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sky-200 mb-1">Vị trí trọng tâm ảnh</label>
                      <select
                        value={wpPosition}
                        onChange={(e) => setWpPosition(e.target.value as WallpaperPosition)}
                        className="w-full bg-[#0b2545] border border-sky-400/30 rounded-xl px-2.5 py-2 text-white"
                      >
                        <option value="center">Căn giữa (Center)</option>
                        <option value="top">Căn trên (Ưu tiên khuôn mặt)</option>
                        <option value="bottom">Căn dưới (Bottom)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sky-200 mb-1">Bố cục hình nền (Mục 9)</label>
                      <select
                        value={wpLayoutPreset}
                        onChange={(e) =>
                          setWpLayoutPreset(e.target.value as WallpaperLayoutPreset)
                        }
                        className="w-full bg-[#0b2545] border border-sky-400/30 rounded-xl px-2.5 py-2 text-white"
                      >
                        <option value="fullscreen">Toàn màn hình (Sáng rõ)</option>
                        <option value="darkened_for_text">Hình nền tối để chữ dễ đọc</option>
                        <option value="color_overlay">Phủ lớp màu xanh MySpace</option>
                        <option value="framed_content">Khung nội dung tách biệt</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handleApplyWallpaperUpload}
                    className="w-full py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs shadow transition"
                  >
                    Áp dụng ngay làm hình nền TV
                  </button>
                </div>
              )}
            </section>

            {/* Gallery of Saved Wallpapers */}
            <section className="bg-[#0b2545] border border-sky-400/20 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-white">
                Kho hình nền đã lưu ({config.wallpapers.length} hình nền)
              </h3>
              <div className="grid sm:grid-cols-3 gap-3">
                {config.wallpapers.map((wp) => {
                  const isActive = wp.id === config.activeWallpaperId;
                  return (
                    <div
                      key={wp.id}
                      className={`rounded-xl overflow-hidden border transition ${
                        isActive
                          ? 'border-sky-300 ring-2 ring-sky-400/40 bg-[#1d4e89]/60'
                          : 'border-sky-400/20 bg-[#133c6e]/40'
                      }`}
                    >
                      <div className="aspect-video bg-slate-950 relative">
                        <img
                          src={wp.dataUrl}
                          alt={wp.name}
                          className="w-full h-full object-cover"
                        />
                        {isActive && (
                          <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-emerald-400 text-slate-950 font-bold text-[10px]">
                            ĐANG DÙNG TRÊN TV
                          </span>
                        )}
                      </div>
                      <div className="p-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{wp.name}</div>
                          <div className="text-[10px] text-sky-200/70">
                            {wp.isBuiltIn ? 'Mặc định hệ thống' : 'Tải lên từ điện thoại'}
                          </div>
                        </div>
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => handleActivateExistingWallpaper(wp.id, wp.name)}
                            className="px-2.5 py-1 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs shrink-0"
                          >
                            Áp dụng
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* TAB 3: MÀU SẮC (MỤC 8C) */}
        {activeTab === 'colors' && (
          <div className="space-y-4">
            <section className="bg-[#0b2545] border border-sky-400/20 rounded-2xl p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Tùy chỉnh bảng màu giao diện MySpace TV
                  </h2>
                  <p className="text-xs text-sky-200/75">
                    Xem trước sự thay đổi màu sắc ngay bên dưới trước khi bấm Áp dụng lên TV.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetDefaultBlueColors}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#133c6e] hover:bg-[#1d4e89] text-xs font-semibold text-sky-200 border border-sky-400/25"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Khôi phục màu xanh mặc định
                </button>
              </div>

              {/* Preset Color Themes */}
              <div className="grid sm:grid-cols-3 gap-2.5">
                {Object.entries(COLOR_PALETTE_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDraftColors(preset.palette)}
                    className="p-3 rounded-xl border border-sky-400/25 bg-[#133c6e]/50 hover:bg-[#1d4e89]/60 text-left flex items-center justify-between gap-2 transition"
                  >
                    <div className="text-xs font-bold text-white leading-snug">{preset.label}</div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className="w-4 h-4 rounded-full border border-white/30"
                        style={{ backgroundColor: preset.palette.bgPrimary }}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-white/30"
                        style={{ backgroundColor: preset.palette.cardSurface }}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-white/30"
                        style={{ backgroundColor: preset.palette.accentColor }}
                      />
                    </div>
                  </button>
                ))}
              </div>

              {/* Live Color Preview Card */}
              <div
                className="p-4 rounded-2xl border transition"
                style={{
                  background: `linear-gradient(135deg, ${draftColors.bgPrimary}, ${draftColors.bgSecondary})`,
                  color: draftColors.textColor,
                  borderColor: draftColors.accentColor,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-85">
                    Bản xem trước màu sắc trước khi áp dụng
                  </span>
                  <span
                    className="text-xs font-bold px-2.5 py-0.5 rounded-lg"
                    style={{
                      backgroundColor: draftColors.accentColor,
                      color: '#071930',
                    }}
                  >
                    Điểm nhấn &amp; Viền Focus
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="p-3 rounded-xl"
                    style={{
                      backgroundColor: draftColors.cardSurface,
                      outline: `3px solid ${draftColors.accentColor}`,
                    }}
                  >
                    <div className="text-xs font-bold">Ô đang được chọn (Focus Ring)</div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      Viền sáng rõ khi điều khiển bằng Remote
                    </div>
                  </div>
                  <div
                    className="p-3 rounded-xl border border-white/15"
                    style={{ backgroundColor: draftColors.cardSurface }}
                  >
                    <div className="text-xs font-bold">Thẻ nội dung thông thường</div>
                    <div className="text-[11px] opacity-80 mt-0.5">Chữ tương phản cao dễ đọc</div>
                  </div>
                </div>
              </div>

              {/* Individual Color Pickers */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-sky-200 mb-1">Màu nền chính (bgPrimary)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={draftColors.bgPrimary}
                      onChange={(e) =>
                        setDraftColors({
                          ...draftColors,
                          presetId: 'custom',
                          bgPrimary: e.target.value,
                        })
                      }
                      className="w-9 h-9 rounded cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={draftColors.bgPrimary}
                      onChange={(e) =>
                        setDraftColors({
                          ...draftColors,
                          presetId: 'custom',
                          bgPrimary: e.target.value,
                        })
                      }
                      className="w-full bg-[#133c6e] border border-sky-400/30 rounded-lg px-2 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sky-200 mb-1">Màu nền phụ (bgSecondary)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={draftColors.bgSecondary}
                      onChange={(e) =>
                        setDraftColors({
                          ...draftColors,
                          presetId: 'custom',
                          bgSecondary: e.target.value,
                        })
                      }
                      className="w-9 h-9 rounded cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={draftColors.bgSecondary}
                      onChange={(e) =>
                        setDraftColors({
                          ...draftColors,
                          presetId: 'custom',
                          bgSecondary: e.target.value,
                        })
                      }
                      className="w-full bg-[#133c6e] border border-sky-400/30 rounded-lg px-2 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sky-200 mb-1">Màu thẻ nội dung (cardSurface)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={draftColors.cardSurface}
                      onChange={(e) =>
                        setDraftColors({
                          ...draftColors,
                          presetId: 'custom',
                          cardSurface: e.target.value,
                        })
                      }
                      className="w-9 h-9 rounded cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={draftColors.cardSurface}
                      onChange={(e) =>
                        setDraftColors({
                          ...draftColors,
                          presetId: 'custom',
                          cardSurface: e.target.value,
                        })
                      }
                      className="w-full bg-[#133c6e] border border-sky-400/30 rounded-lg px-2 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sky-200 mb-1">Màu chữ (textColor)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={draftColors.textColor}
                      onChange={(e) =>
                        setDraftColors({
                          ...draftColors,
                          presetId: 'custom',
                          textColor: e.target.value,
                        })
                      }
                      className="w-9 h-9 rounded cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={draftColors.textColor}
                      onChange={(e) =>
                        setDraftColors({
                          ...draftColors,
                          presetId: 'custom',
                          textColor: e.target.value,
                        })
                      }
                      className="w-full bg-[#133c6e] border border-sky-400/30 rounded-lg px-2 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sky-200 mb-1">
                    Màu điểm nhấn &amp; Viền Focus (accentColor)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={draftColors.accentColor}
                      onChange={(e) =>
                        setDraftColors({
                          ...draftColors,
                          presetId: 'custom',
                          accentColor: e.target.value,
                        })
                      }
                      className="w-9 h-9 rounded cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={draftColors.accentColor}
                      onChange={(e) =>
                        setDraftColors({
                          ...draftColors,
                          presetId: 'custom',
                          accentColor: e.target.value,
                        })
                      }
                      className="w-full bg-[#133c6e] border border-sky-400/30 rounded-lg px-2 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs text-sky-200 mb-1">
                  Độ tối lớp phủ trên hình nền ({Math.round(draftOverlayOpacity * 100)}%)
                </label>
                <input
                  type="range"
                  min={0.1}
                  max={0.85}
                  step={0.05}
                  value={draftOverlayOpacity}
                  onChange={(e) => setDraftOverlayOpacity(Number(e.target.value))}
                  className="w-full accent-sky-400"
                />
              </div>

              <button
                type="button"
                disabled={isBusy}
                onClick={handleApplyDraftColors}
                className="w-full py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs shadow transition"
              >
                Áp dụng Bảng màu này lên TV
              </button>
            </section>
          </div>
        )}

        {/* TAB 4: BỐ CỤC (MỤC 8D) */}
        {activeTab === 'layout' && (
          <div className="space-y-4">
            <section className="bg-[#0b2545] border border-sky-400/20 rounded-2xl p-4 space-y-4">
              <h2 className="text-sm font-bold text-white">
                Tùy chỉnh Bố cục &amp; Kích thước hiển thị trên màn hình TV 40 inch
              </h2>

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-sky-200 mb-1">Số cột Nội dung nổi bật</label>
                  <select
                    value={config.layout.featuredColumns}
                    onChange={(e) =>
                      onPushConfig(
                        {
                          layout: {
                            ...config.layout,
                            featuredColumns: Number(e.target.value) as 3 | 4,
                          },
                        },
                        'Đổi số cột Nội dung nổi bật'
                      )
                    }
                    className="w-full bg-[#133c6e] border border-sky-400/30 rounded-xl px-3 py-2 text-white"
                  >
                    <option value={4}>4 cột × 2 hàng (Mặc định chuẩn mẫu)</option>
                    <option value={3}>3 cột lớn (Rộng rãi)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sky-200 mb-1">Số ô Nội dung nổi bật tối đa</label>
                  <select
                    value={config.layout.featuredMaxItems}
                    onChange={(e) =>
                      onPushConfig(
                        {
                          layout: {
                            ...config.layout,
                            featuredMaxItems: Number(e.target.value) as 4 | 6 | 8,
                          },
                        },
                        'Đổi số lượng ô Nội dung nổi bật'
                      )
                    }
                    className="w-full bg-[#133c6e] border border-sky-400/30 rounded-xl px-3 py-2 text-white"
                  >
                    <option value={8}>8 ô (2 hàng × 4 cột)</option>
                    <option value={6}>6 ô</option>
                    <option value={4}>4 ô (1 hàng gọn gàng)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sky-200 mb-1">Kiểu hiển thị hàng ứng dụng dưới</label>
                  <select
                    value={config.layout.appRowStyle}
                    onChange={(e) =>
                      onPushConfig(
                        {
                          layout: {
                            ...config.layout,
                            appRowStyle: e.target.value as
                              | 'prominent_cards'
                              | 'compact_pills'
                              | 'centered_dock',
                          },
                        },
                        'Đổi kiểu hàng ứng dụng'
                      )
                    }
                    className="w-full bg-[#133c6e] border border-sky-400/30 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="prominent_cards">Thẻ nổi bật chuẩn TV (Prominent Cards)</option>
                    <option value="compact_pills">Thanh gọn gàng (Compact)</option>
                    <option value="centered_dock">Căn giữa màn hình (Centered Dock)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sky-200 mb-1">
                    Thứ tự ưu tiên các khu vực trên Trang chủ
                  </label>
                  <select
                    value={config.layout.sectionOrder.join(',')}
                    onChange={(e) =>
                      onPushConfig(
                        {
                          layout: {
                            ...config.layout,
                            sectionOrder: e.target.value.split(',') as HomeSectionKey[],
                          },
                        },
                        'Đổi thứ tự khu vực trên Trang chủ'
                      )
                    }
                    className="w-full bg-[#133c6e] border border-sky-400/30 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="featured,apps">
                      Nội dung nổi bật ở giữa → Hàng ứng dụng ở dưới (Mặc định)
                    </option>
                    <option value="apps,featured">
                      Hàng ứng dụng ở trên → Nội dung nổi bật ở dưới
                    </option>
                  </select>
                </div>
              </div>

              <div className="pt-2 space-y-2 border-t border-sky-400/15 text-xs">
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#133c6e]/50 cursor-pointer">
                  <span>Tối ưu chuyển động nhẹ cho phần cứng Samsung UA40K5300</span>
                  <input
                    type="checkbox"
                    checked={config.layout.reduceMotionForK5300}
                    onChange={(e) =>
                      onPushConfig(
                        {
                          layout: {
                            ...config.layout,
                            reduceMotionForK5300: e.target.checked,
                          },
                        },
                        'Cập nhật chế độ tối ưu hiệu năng K5300'
                      )
                    }
                    className="w-4 h-4 accent-sky-400"
                  />
                </label>
              </div>
            </section>
          </div>
        )}

        {/* TAB 5: QUẢN LÝ ỨNG DỤNG (MỤC 6D & MỤC 10) */}
        {activeTab === 'apps' && (
          <div className="space-y-4">
            <section className="bg-[#0b2545] border border-sky-400/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Hàng ứng dụng phía dưới TV ({config.apps.length} ứng dụng)
                  </h2>
                  <p className="text-xs text-sky-200/75">
                    Mặc định chỉ hiển thị đúng 2 ứng dụng: 1. YouTube và 2. YouTube Kids.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {config.apps.map((app, index) => (
                  <div
                    key={app.id}
                    className="p-3 rounded-xl bg-[#133c6e]/70 border border-sky-400/20 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow text-white"
                        style={{
                          backgroundColor: app.accentColor,
                        }}
                      >
                        {app.iconKey === 'youtube'
                          ? 'YT'
                          : app.iconKey === 'youtube_kids'
                          ? 'KIDS'
                          : app.iconKey.slice(0, 4).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            #{index + 1}. {app.name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-sky-400/20 text-sky-200">
                            {app.type === 'website_shortcut'
                              ? 'Loại 1: Web Shortcut'
                              : app.type === 'tv_installed_app'
                              ? 'Loại 2: TV App'
                              : app.type === 'browser_game'
                              ? 'Loại 3: Trò chơi TV'
                              : 'Loại 4: Gói .wgt'}
                          </span>
                        </div>
                        <div className="text-[11px] text-sky-200/70 truncate">
                          {app.url || app.launchConfigNote}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleMoveApp(app.id, 'up')}
                        disabled={index === 0}
                        title="Đưa lên trước"
                        className="p-1.5 rounded-lg bg-[#0b2545] hover:bg-sky-500/30 disabled:opacity-30 text-sky-200"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveApp(app.id, 'down')}
                        disabled={index === config.apps.length - 1}
                        title="Đưa xuống sau"
                        className="p-1.5 rounded-lg bg-[#0b2545] hover:bg-sky-500/30 disabled:opacity-30 text-sky-200"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleAppField(app.id, 'isFavorite')}
                        title="Đánh dấu yêu thích"
                        className={`p-1.5 rounded-lg bg-[#0b2545] ${
                          app.isFavorite ? 'text-amber-400' : 'text-slate-400'
                        }`}
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleAppField(app.id, 'enabled')}
                        title={app.enabled ? 'Đang hiện trên TV' : 'Đang ẩn trên TV'}
                        className={`p-1.5 rounded-lg bg-[#0b2545] ${
                          app.enabled ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {app.enabled ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteApp(app.id, app.name)}
                        title="Xóa ứng dụng"
                        className="p-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-800 text-rose-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Form to Add New App */}
            <form
              onSubmit={handleAddApp}
              className="bg-[#0b2545] border border-sky-400/20 rounded-2xl p-4 space-y-3"
            >
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-sky-300" />
                Thêm ứng dụng hoặc trò chơi mới vào hàng dưới TV (Mục 10)
              </h3>

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-sky-200 mb-1">Tên ứng dụng hiển thị</label>
                  <input
                    type="text"
                    value={newAppName}
                    onChange={(e) => setNewAppName(e.target.value)}
                    placeholder="Ví dụ: VnExpress, Cờ Caro TV..."
                    className="w-full bg-[#133c6e] border border-sky-400/30 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sky-200 mb-1">Phân loại kỹ thuật (4 loại)</label>
                  <select
                    value={newAppType}
                    onChange={(e) => setNewAppType(e.target.value as AppCategoryType)}
                    className="w-full bg-[#133c6e] border border-sky-400/30 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="website_shortcut">Loại 1: Lối tắt trang web (URL)</option>
                    <option value="tv_installed_app">Loại 2: Ứng dụng có sẵn trên TV</option>
                    <option value="browser_game">Loại 3: Trò chơi tương thích Remote TV</option>
                    <option value="packaged_tv_app">Loại 4: Ứng dụng đóng gói riêng (.wgt)</option>
                  </select>
                </div>

                {(newAppType === 'website_shortcut' || newAppType === 'tv_installed_app') && (
                  <div className="sm:col-span-2">
                    <label className="block text-sky-200 mb-1">
                      Địa chỉ URL trang web (https://...)
                    </label>
                    <input
                      type="text"
                      value={newAppUrl}
                      onChange={(e) => setNewAppUrl(e.target.value)}
                      placeholder="https://vnexpress.net"
                      className="w-full bg-[#133c6e] border border-sky-400/30 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                )}

                {newAppType === 'browser_game' && (
                  <div className="sm:col-span-2">
                    <label className="block text-sky-200 mb-1">
                      Chọn trò chơi tương thích Remote Samsung UA40K5300
                    </label>
                    <select
                      value={newAppGameId}
                      onChange={(e) => setNewAppGameId(e.target.value as BuiltInGameId)}
                      className="w-full bg-[#133c6e] border border-sky-400/30 rounded-xl px-3 py-2 text-white"
                    >
                      <option value="gomoku_tv">Cờ Caro 9×9 (Gomoku TV)</option>
                      <option value="game_2048_tv">Giải đố 2048 TV</option>
                      <option value="memory_match_tv">Lật Hình Trí Nhớ (Memory Match TV)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sky-200 mb-1">
                    Chữ viết tắt trên Icon (Tối đa 5 ký tự)
                  </label>
                  <input
                    type="text"
                    value={newAppIconKey}
                    onChange={(e) => setNewAppIconKey(e.target.value)}
                    placeholder="WEB"
                    maxLength={5}
                    className="w-full bg-[#133c6e] border border-sky-400/30 rounded-xl px-3 py-2 text-white uppercase"
                  />
                </div>

                <div>
                  <label className="block text-sky-200 mb-1">Màu nền biểu tượng</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newAppColor}
                      onChange={(e) => setNewAppColor(e.target.value)}
                      className="w-9 h-9 rounded cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={newAppColor}
                      onChange={(e) => setNewAppColor(e.target.value)}
                      className="w-full bg-[#133c6e] border border-sky-400/30 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isBusy}
                className="w-full py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs shadow transition"
              >
                + Thêm vào hàng ứng dụng TV
              </button>
            </form>
          </div>
        )}

        {/* TAB 6: QUẢN LÝ NỘI DUNG NỔI BẬT (MỤC 6C & MỤC 8F) */}
        {activeTab === 'featured' && (
          <div className="space-y-4">
            <section className="bg-[#0b2545] border border-sky-400/20 rounded-2xl p-4 space-y-3">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Quản lý khu vực &ldquo;Phim và chương trình nổi bật&rdquo; (Lưới 2 hàng × 4 cột)
                </h2>
                <p className="text-xs text-sky-200/75">
                  Bạn có thể đổi tiêu đề, thay ảnh đại diện, đổi liên kết hoặc sắp xếp thứ tự 8 ô nội dung trên TV.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-2.5">
                {config.featuredItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-[#133c6e]/70 border border-sky-400/20 flex items-center gap-3"
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-20 h-12 rounded-lg object-cover shrink-0 border border-white/15"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">
                        #{idx + 1}. {item.title}
                      </div>
                      <div className="text-[10px] text-sky-200/75 truncate">{item.subtitle}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <button
                          type="button"
                          onClick={() => handleStartEditFeatured(item)}
                          className="px-2 py-0.5 rounded bg-sky-400/20 hover:bg-sky-400/30 text-sky-200 text-[10px] font-semibold"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveFeatured(item.id, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded bg-[#0b2545] disabled:opacity-30 text-sky-200"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveFeatured(item.id, 'down')}
                          disabled={idx === config.featuredItems.length - 1}
                          className="p-1 rounded bg-[#0b2545] disabled:opacity-30 text-sky-200"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleFeaturedVisible(item.id)}
                          className={`p-1 rounded bg-[#0b2545] ${
                            item.visible ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        >
                          {item.visible ? (
                            <Eye className="w-3 h-3" />
                          ) : (
                            <EyeOff className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFeatured(item.id, item.title)}
                          className="p-1 rounded bg-rose-950 text-rose-300"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Edit or Add Featured Card Form */}
            <form
              onSubmit={handleSaveFeaturedItem}
              className="bg-[#0b2545] border border-sky-400/20 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  {editingFeaturedId
                    ? 'Đang chỉnh sửa ô nội dung nổi bật'
                    : 'Thêm ô nội dung nổi bật mới'}
                </h3>
                {editingFeaturedId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFeaturedId(null);
                      setFeatTitle('');
                      setFeatSubtitle('');
                    }}
                    className="text-xs text-rose-300 underline"
                  >
                    Hủy chế độ sửa
                  </button>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-sky-200 mb-1">Tiêu đề ô nội dung</label>
                  <input
                    type="text"
                    value={featTitle}
                    onChange={(e) => setFeatTitle(e.target.value)}
                    placeholder="Ví dụ: Tuyển tập Nhạc Acoustic..."
                    className="w-full bg-[#133c6e] border border-sky-400/30 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sky-200 mb-1">Mô tả phụ (Subtitle)</label>
                  <input
                    type="text"
                    value={featSubtitle}
                    onChange={(e) => setFeatSubtitle(e.target.value)}
                    placeholder="Danh sách phát cá nhân hóa..."
                    className="w-full bg-[#133c6e] border border-sky-400/30 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sky-200 mb-1">Hành động khi bấm OK trên TV</label>
                  <select
                    value={featActionType}
                    onChange={(e) => setFeatActionType(e.target.value as 'url' | 'game')}
                    className="w-full bg-[#133c6e] border border-sky-400/30 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="url">Mở địa chỉ trang web / video (URL)</option>
                    <option value="game">Mở trò chơi tích hợp trên TV</option>
                  </select>
                </div>

                {featActionType === 'url' && (
                  <div>
                    <label className="block text-sky-200 mb-1">Địa chỉ URL khi mở</label>
                    <input
                      type="text"
                      value={featLinkedUrl}
                      onChange={(e) => setFeatLinkedUrl(e.target.value)}
                      placeholder="https://www.youtube.com/..."
                      className="w-full bg-[#133c6e] border border-sky-400/30 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                )}

                {featActionType === 'game' && (
                  <div>
                    <label className="block text-sky-200 mb-1">Chọn trò chơi tích hợp</label>
                    <select
                      value={featGameId}
                      onChange={(e) => setFeatGameId(e.target.value as BuiltInGameId)}
                      className="w-full bg-[#133c6e] border border-sky-400/30 rounded-xl px-3 py-2 text-white"
                    >
                      <option value="gomoku_tv">Cờ Caro 9×9 (Gomoku TV)</option>
                      <option value="game_2048_tv">Giải đố 2048 TV</option>
                      <option value="memory_match_tv">Lật Hình Trí Nhớ</option>
                    </select>
                  </div>
                )}

                <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                  <input
                    ref={featuredFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleUploadFeaturedThumbnail}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => featuredFileInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl bg-[#133c6e] hover:bg-[#1d4e89] border border-sky-400/30 text-sky-200 font-semibold"
                  >
                    + Tải ảnh thu nhỏ từ điện thoại
                  </button>
                  {featImageUrl && (
                    <span className="text-[11px] text-emerald-300">
                      Đã chọn ảnh đại diện cho ô nội dung.
                    </span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isBusy}
                className="w-full py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs shadow transition"
              >
                {editingFeaturedId ? 'Lưu cập nhật ô nội dung' : '+ Thêm ô nội dung nổi bật'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 7: KẾT NỐI TV & BÁO CÁO KỸ THUẬT SAMSUNG UA40K5300 (MỤC 4 & MỤC 12) */}
        {activeTab === 'connection' && (
          <div className="space-y-4">
            <section className="bg-[#0b2545] border border-sky-400/20 rounded-2xl p-4 space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-300" />
                Mã ghép nối PIN giữa Điện thoại &amp; TV (Mục 13 Bảo mật)
              </h2>
              <p className="text-xs text-sky-200/75">
                Nhập đúng mã PIN đang hiển thị trên TV để quyền thay đổi hình nền và ứng dụng được xác thực.
              </p>
              <div className="flex items-center gap-2 max-w-xs">
                <input
                  type="text"
                  value={pairingPin}
                  onChange={(e) => onChangePairingPin(e.target.value)}
                  maxLength={8}
                  className="w-full bg-[#133c6e] border border-sky-400/40 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white tracking-widest text-center"
                />
              </div>
            </section>

            <section className="bg-[#0b2545] border border-sky-400/20 rounded-2xl p-4 space-y-3 text-xs">
              <h3 className="text-sm font-bold text-white">
                Báo cáo Kỹ thuật Thực tế: Samsung UA40K5300 (TVHTML5 7.20261021.13.00)
              </h3>
              <div className="space-y-2 text-sky-100/90 leading-relaxed">
                <p>
                  <strong>1. Nền tảng phần cứng &amp; Trình duyệt:</strong> Samsung UA40K5300 thuộc dòng Smart TV Full HD (1920×1080) chạy nền tảng Tizen TV (nhánh Tizen 2.4 / TVHTML5). Phiên bản trình duyệt ghi nhận trên thiết bị là{' '}
                  <code className="text-sky-300">7.20261021.13.00</code>.
                </p>
                <p>
                  <strong>2. Khả năng hỗ trợ Web &amp; Lý do chọn giải pháp:</strong> Trình duyệt TVHTML5 hỗ trợ tốt HTML5, CSS3 Flexbox/Grid, Canvas 2D, LocalStorage và kết nối WebSocket/HTTP. Hệ thống tự động sử dụng{' '}
                  <strong>WebSocket thời gian thực kèm cơ chế dự phòng HTTP Polling (3.5 giây/lần)</strong> để đảm bảo điện thoại luôn đồng bộ được với TV ngay cả khi mạng nội bộ chặn gói tin nâng cấp WebSocket.
                </p>
                <p>
                  <strong>3. Giới hạn bảo mật Sandbox trên TV:</strong> Trình duyệt web thông thường trên Samsung UA40K5300 không có quyền gọi trực tiếp{' '}
                  <code className="text-sky-300">tizen.application.launch()</code> để bật các ứng dụng hệ thống khác. Do đó:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sky-200/85">
                  <li>
                    <strong>Phương án 1 (Khuyên dùng ngay):</strong> Mở MySpace TV bằng trình duyệt tích hợp của TV và ghim làm trang chủ/Bookmark. Các ứng dụng như YouTube và YouTube Kids sẽ mở trực tiếp qua liên kết chuẩn trên trình duyệt.
                  </li>
                  <li>
                    <strong>Phương án 2 (Đóng gói ứng dụng .wgt):</strong> Dùng Tizen Studio đóng gói thư mục <code className="text-sky-300">dist/</code> kèm tệp <code className="text-sky-300">config.xml</code> để cài qua Developer Mode của TV.
                  </li>
                </ul>
              </div>
            </section>
          </div>
        )}

        {/* TAB 8: CÀI ĐẶT, SAO LƯU JSON & KIỂM THỬ TỰ ĐỘNG (MỤC 8H & MỤC 15) */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <section className="bg-[#0b2545] border border-sky-400/20 rounded-2xl p-4 space-y-3 text-xs">
              <h2 className="text-sm font-bold text-white">Cài đặt Định dạng Ngày giờ &amp; Hệ thống</h2>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sky-200 mb-1">Định dạng đồng hồ góc phải</label>
                  <select
                    value={config.layout.timeFormat}
                    onChange={(e) =>
                      onPushConfig(
                        {
                          layout: {
                            ...config.layout,
                            timeFormat: e.target.value as '24h' | '12h',
                          },
                        },
                        'Đổi định dạng giờ 24h/12h'
                      )
                    }
                    className="w-full bg-[#133c6e] border border-sky-400/30 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="24h">24 giờ (Ví dụ: 20:45)</option>
                    <option value="12h">12 giờ SA/CH (Ví dụ: 08:45 CH)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sky-200 mb-1">Định dạng ngày tháng</label>
                  <select
                    value={config.layout.dateFormat}
                    onChange={(e) =>
                      onPushConfig(
                        {
                          layout: {
                            ...config.layout,
                            dateFormat: e.target.value as 'full_vi' | 'short_numeric',
                          },
                        },
                        'Đổi định dạng ngày tháng'
                      )
                    }
                    className="w-full bg-[#133c6e] border border-sky-400/30 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="full_vi">Đầy đủ (Thứ Hai, 26/10/2026)</option>
                    <option value="short_numeric">Rút gọn (26/10/2026)</option>
                  </select>
                </div>
              </div>

              {/* Change Server PIN */}
              <div className="pt-3 border-t border-sky-400/15 flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sky-200 mb-1">
                    Đổi mã PIN bảo mật mới cho máy chủ (Tối thiểu 4 ký tự)
                  </label>
                  <input
                    type="text"
                    value={newServerPinInput}
                    onChange={(e) => setNewServerPinInput(e.target.value)}
                    placeholder="Nhập mã PIN mới (Mặc định: 2026)"
                    className="w-full bg-[#133c6e] border border-sky-400/30 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (newServerPinInput.trim().length < 4) {
                      showToast('error', 'Mã PIN mới phải có ít nhất 4 ký tự.');
                      return;
                    }
                    const nextPin = newServerPinInput.trim();
                    const ok = await onPushConfig({}, 'Đổi mã PIN bảo mật máy chủ', nextPin);
                    if (ok) {
                      onChangePairingPin(nextPin);
                      setNewServerPinInput('');
                      showToast('success', `Đã đổi mã PIN máy chủ thành "${nextPin}".`);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold"
                >
                  Cập nhật PIN
                </button>
              </div>
            </section>

            {/* Export / Import JSON & Reset Default */}
            <section className="bg-[#0b2545] border border-sky-400/20 rounded-2xl p-4 space-y-3 text-xs">
              <h3 className="text-sm font-bold text-white">
                Sao lưu, Nhập cấu hình JSON &amp; Khôi phục mặc định
              </h3>

              <input
                ref={importJsonInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportConfigFile}
                className="hidden"
              />

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={handleExportConfigJson}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#133c6e] hover:bg-[#1d4e89] text-white font-semibold border border-sky-400/30"
                >
                  <Download className="w-4 h-4 text-sky-300" />
                  Xuất cấu hình JSON
                </button>

                <button
                  type="button"
                  onClick={() => importJsonInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#133c6e] hover:bg-[#1d4e89] text-white font-semibold border border-sky-400/30"
                >
                  <Upload className="w-4 h-4 text-emerald-300" />
                  Nhập cấu hình JSON
                </button>

                <button
                  type="button"
                  onClick={onResetDefault}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/90 hover:bg-rose-900 text-rose-200 font-semibold border border-rose-500/30"
                >
                  <RotateCcw className="w-4 h-4" />
                  Khôi phục toàn bộ mặc định gốc
                </button>
              </div>
            </section>

            {/* Automated Self-Test Runner */}
            <section className="bg-[#0b2545] border border-sky-400/20 rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Kiểm thử tự động Hệ thống (Mục 15 &amp; Mục 17)
                  </h3>
                  <p className="text-sky-200/75">
                    Kiểm tra bảo mật URL, giới hạn RAM hình nền, quy tắc đúng 2 ứng dụng mặc định (YouTube &amp; YouTube Kids) và lưới 8 ô nội dung.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunSelfTests}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Chạy kiểm thử
                </button>
              </div>

              {selfTestReport && (
                <div className="space-y-2 pt-2">
                  {selfTestReport.results.map((r, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-xl border flex items-start justify-between gap-2 ${
                        r.passed
                          ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-200'
                          : 'bg-rose-950/50 border-rose-500/30 text-rose-200'
                      }`}
                    >
                      <div>
                        <div className="font-bold">
                          {r.passed ? '✓ ĐẠT' : '✗ LỖI'}: {r.name}
                        </div>
                        <div className="text-[11px] opacity-80 mt-0.5">{r.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};
