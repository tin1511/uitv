import { useEffect, useState } from 'react';

export interface DeviceInspectionReport {
  userAgent: string;
  isSamsungTizen: boolean;
  detectedModelHint: string;
  screenResolution: string;
  viewportSize: string;
  devicePixelRatio: number;
  isSecureContext: boolean;
  supportsWebSpeechRecognition: boolean;
  supportsMediaRecorder: boolean;
  supportsServiceWorker: boolean;
  isStandalonePWA: boolean;
  platformCategory: 'Samsung Smart TV (Tizen)' | 'Android Mobile' | 'iPhone / iPad (iOS)' | 'Windows / Desktop Browser';
}

export function inspectCurrentDevice(): DeviceInspectionReport {
  if (typeof window === 'undefined') {
    return {
      userAgent: 'Server',
      isSamsungTizen: false,
      detectedModelHint: 'Chưa xác định',
      screenResolution: '1920x1080',
      viewportSize: '1920x1080',
      devicePixelRatio: 1,
      isSecureContext: true,
      supportsWebSpeechRecognition: false,
      supportsMediaRecorder: false,
      supportsServiceWorker: false,
      isStandalonePWA: false,
      platformCategory: 'Windows / Desktop Browser',
    };
  }

  const ua = window.navigator.userAgent || '';
  const uaLower = ua.toLowerCase();
  const isSamsungTizen = /tizen|smart-tv|smarttv|samsungbrowser.*tv|maple/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(uaLower);
  const isAndroid = /android/i.test(uaLower) && !isSamsungTizen;

  let detectedModelHint = 'Trình duyệt Máy tính / Điện thoại (Chế độ Kiểm thử & Điều khiển)';
  if (isSamsungTizen) {
    const match = ua.match(/(UA\d{2}[A-Z]\d{4}|UN\d{2}[A-Z]\d{4}|UE\d{2}[A-Z]\d{4}|Tizen\s+[\d.]+)/i);
    detectedModelHint = match ? `Phát hiện trực tiếp: ${match[1]}` : 'Samsung Smart TV (Nền tảng Tizen OS)';
  } else if (isIOS) {
    detectedModelHint = 'Apple iPhone / iPad (WebKit Safari)';
  } else if (isAndroid) {
    detectedModelHint = 'Điện thoại Android (Chromium)';
  }

  const SpeechRec =
    (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
      .SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  let platformCategory: DeviceInspectionReport['platformCategory'] = 'Windows / Desktop Browser';
  if (isSamsungTizen) platformCategory = 'Samsung Smart TV (Tizen)';
  else if (isIOS) platformCategory = 'iPhone / iPad (iOS)';
  else if (isAndroid) platformCategory = 'Android Mobile';

  return {
    userAgent: ua,
    isSamsungTizen,
    detectedModelHint,
    screenResolution: `${window.screen?.width || 1920} × ${window.screen?.height || 1080}`,
    viewportSize: `${window.innerWidth} × ${window.innerHeight}`,
    devicePixelRatio: window.devicePixelRatio || 1,
    isSecureContext: Boolean(window.isSecureContext),
    supportsWebSpeechRecognition: Boolean(SpeechRec),
    supportsMediaRecorder: typeof window.MediaRecorder !== 'undefined',
    supportsServiceWorker: 'serviceWorker' in window.navigator,
    isStandalonePWA: isStandalone,
    platformCategory,
  };
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}
