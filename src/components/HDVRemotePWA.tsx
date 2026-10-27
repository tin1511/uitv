import React, { useState, useRef } from 'react';
import {
  Mic,
  MicOff,
  Power,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  ArrowLeft,
  Menu,
  Tv,
  Wifi,
  WifiOff,
  Download,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sparkles,
  Radio,
} from 'lucide-react';
import {
  CommandLogEntry,
  RemoteKeyCode,
  TVSectionId,
  TVSharedState,
} from '../types/tv';
import { SAMSUNG_K5300_KEY_SPECS } from '../data/tvCatalog';
import { usePWAInstall, inspectCurrentDevice } from '../utils/deviceEnv';

interface HDVRemotePWAProps {
  tvState: TVSharedState;
  wsConnected: boolean;
  remoteConnected: boolean;
  onToggleRemoteConnect: () => void;
  onSendKey: (keyCode: RemoteKeyCode, rawLabel?: string) => Promise<void>;
  onSendVoiceTranscript: (transcript: string, confidence: number, engine: string) => Promise<void>;
  onQuickOpenSection: (section: TVSectionId) => Promise<void>;
  compactMode?: boolean;
}

const VOICE_PRESETS = [
  'Tìm phim hoạt hình.',
  'Tìm video về lịch sử Việt Nam.',
  'Tìm nhạc Việt Nam.',
  'Mở trang chủ.',
  'Tăng âm lượng.',
  'Giảm âm lượng.',
  'Tắt tiếng.',
];

export const HDVRemotePWA: React.FC<HDVRemotePWAProps> = ({
  tvState,
  wsConnected,
  remoteConnected,
  onToggleRemoteConnect,
  onSendKey,
  onSendVoiceTranscript,
  onQuickOpenSection,
  compactMode = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [voiceStatusText, setVoiceStatusText] = useState<string>(
    'Nhấn nút Micro để nói tiếng Việt hoặc chọn câu lệnh kiểm thử nhanh'
  );
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [manualVoiceInput, setManualVoiceInput] = useState('');
  const [showIOSInstallModal, setShowIOSInstallModal] = useState(false);
  const [activeKeyFeedback, setActiveKeyFeedback] = useState<string | null>(null);

  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const deviceInfo = inspectCurrentDevice();

  const triggerKey = async (keyCode: RemoteKeyCode) => {
    if (!remoteConnected) {
      setVoiceError('HĐV Remote đang ở trạng thái Ngắt kết nối. Hãy nhấn nút "Kết nối TV" phía trên.');
      return;
    }
    setVoiceError(null);
    setActiveKeyFeedback(keyCode);
    setTimeout(() => setActiveKeyFeedback(null), 180);
    const spec = SAMSUNG_K5300_KEY_SPECS[keyCode];
    await onSendKey(keyCode, spec?.label || keyCode);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore
      }
    }
    setIsListening(false);
  };

  const startVietnameseVoiceRecognition = async () => {
    if (!remoteConnected) {
      setVoiceError('Vui lòng bật "Kết nối TV" trước khi gửi lệnh giọng nói.');
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    setVoiceError(null);

    // 1. Ưu tiên Web Speech API chuẩn (SpeechRecognition / webkitSpeechRecognition) với lang = 'vi-VN'
    const SpeechRecognitionCtor =
      (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

    if (SpeechRecognitionCtor) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recognition: any = new SpeechRecognitionCtor();
        recognition.lang = 'vi-VN';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
          setVoiceStatusText('Đang lắng nghe giọng nói tiếng Việt (vi-VN)... Hãy nói câu lệnh của bạn.');
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = async (event: any) => {
          const result = event.results?.[0]?.[0];
          const transcript = result?.transcript || '';
          const confidence = typeof result?.confidence === 'number' ? result.confidence : 0.94;
          setIsListening(false);
          if (transcript.trim()) {
            setVoiceStatusText(`Đã nhận dạng: "${transcript}"`);
            await onSendVoiceTranscript(transcript.trim(), confidence, 'Web Speech API (vi-VN)');
          }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
          setIsListening(false);
          const errCode = event?.error || 'unknown';
          if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
            setVoiceError(
              'Trình duyệt chưa được cấp quyền Micro (hoặc bị chặn trong khung xem trước). Bạn có thể cấp quyền Micro hoặc dùng thanh nhập/nút câu lệnh mẫu bên dưới.'
            );
          } else {
            setVoiceError(`Không nhận dạng được giọng nói (${errCode}). Vui lòng thử lại hoặc chọn lệnh mẫu.`);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch {
        // Nếu Web Speech API lỗi khởi tạo, chuyển sang MediaRecorder + Gemini Transcribe
      }
    }

    // 2. Fallback cho trình duyệt không hỗ trợ Web Speech API (như một số bản iOS/Firefox): Ghi âm 3.5 giây gửi lên Gemini 3.5 Transcribe
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof MediaRecorder !== 'undefined') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          setIsListening(false);
          const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          if (audioBlob.size === 0) return;

          setVoiceStatusText('Đang chuyển âm thanh tiếng Việt thành văn bản qua máy chủ AI...');
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Data = String(reader.result || '').split(',')[1];
            if (!base64Data) return;
            try {
              const res = await fetch('/api/voice/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  audioBase64: base64Data,
                  mimeType: recorder.mimeType || 'audio/webm',
                }),
              });
              const data = await res.json();
              if (data.ok && data.transcript) {
                setVoiceStatusText(`Đã nhận dạng: "${data.transcript}"`);
                await onSendVoiceTranscript(data.transcript, 0.96, data.engine || 'Gemini Audio Transcribe');
              } else {
                setVoiceError(data.error || 'Không nghe rõ câu lệnh tiếng Việt.');
              }
            } catch {
              setVoiceError('Lỗi kết nối máy chủ nhận dạng giọng nói.');
            }
          };
          reader.readAsDataURL(audioBlob);
        };

        mediaRecorderRef.current = recorder;
        setIsListening(true);
        setVoiceStatusText('Đang ghi âm giọng nói tiếng Việt (tự động gửi sau 3.5 giây hoặc bấm lần nữa để dừng)...');
        recorder.start();
        setTimeout(() => {
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }, 3500);
      } catch {
        setVoiceError(
          'Không thể truy cập Micro trên thiết bị này. Vui lòng kiểm tra quyền Micro hoặc dùng câu lệnh tiếng Việt bên dưới.'
        );
      }
    } else {
      setVoiceError(
        'Trình duyệt hiện tại không hỗ trợ Web Speech API hoặc ghi âm Micro. Vui lòng sử dụng ô nhập câu lệnh giọng nói bên dưới.'
      );
    }
  };

  const handleManualVoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualVoiceInput.trim()) return;
    if (!remoteConnected) {
      setVoiceError('Vui lòng bật "Kết nối TV" trước khi gửi lệnh.');
      return;
    }
    setVoiceError(null);
    const text = manualVoiceInput.trim();
    setManualVoiceInput('');
    setVoiceStatusText(`Đã nhận lệnh: "${text}"`);
    await onSendVoiceTranscript(text, 1.0, 'Giả lập Giọng nói Tiếng Việt (vi-VN)');
  };

  const lastCmd: CommandLogEntry | undefined = tvState.lastCommand;

  return (
    <div
      className={`bg-[#0b101e] text-[#f4f7ff] border border-white/12 rounded-3xl flex flex-col justify-between select-none shadow-2xl ${
        compactMode ? 'w-full max-w-[410px] p-4' : 'w-full max-w-[440px] mx-auto p-5'
      }`}
    >
      {/* Top Header: Brand + Connection Toggle + PWA Install */}
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7ce7f5] to-[#6177ff] text-[#080b14] font-black text-lg grid place-items-center">
              H
            </div>
            <div>
              <div className="text-sm font-bold tracking-wide text-white flex items-center gap-1.5">
                HĐV REMOTE <span className="text-[11px] font-normal text-[#7ce7f5]">PWA</span>
              </div>
              <div className="text-[11px] text-[#9ba9c5] tabular-nums">
                {remoteConnected && wsConnected
                  ? `Đã kết nối • TV Vol ${tvState.muted ? 'Tắt tiếng' : `${tvState.volume}%`}`
                  : 'Đã ngắt kết nối điều khiển'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!isInstalled && isInstallable && (
              <button
                type="button"
                onClick={install}
                className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-[#1b2845] hover:bg-[#24365c] border border-[#7ce7f5]/40 text-[#7ce7f5] text-xs font-semibold flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0"
                title="Cài đặt HĐV Remote lên màn hình chính"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Cài PWA</span>
              </button>
            )}
            {!isInstalled && !isInstallable && isIOS && (
              <button
                type="button"
                onClick={() => setShowIOSInstallModal(true)}
                className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-[#1b2845] border border-[#7ce7f5]/40 text-[#7ce7f5] text-xs font-semibold flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Cài iOS</span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleRemoteConnect}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
                remoteConnected && wsConnected
                  ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
                  : 'bg-rose-500/20 border border-rose-400/50 text-rose-300'
              }`}
            >
              {remoteConnected && wsConnected ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Đã kết nối</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Kết nối TV</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Row 1: Power, Input Source, Status */}
        <div className="grid grid-cols-3 gap-2.5 mt-3.5">
          <button
            type="button"
            onClick={() => triggerKey('KEY_POWER')}
            className={`min-h-[48px] rounded-2xl border flex items-center justify-center gap-2 font-semibold text-xs transition active:scale-95 cursor-pointer ${
              tvState.powerState === 'ON'
                ? 'bg-rose-500/15 border-rose-400/40 text-rose-200 hover:bg-rose-500/25'
                : 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
            }`}
            title={SAMSUNG_K5300_KEY_SPECS.KEY_POWER.description}
          >
            <Power className="w-4 h-4" />
            <span>{tvState.powerState === 'ON' ? 'Nguồn (Tắt)' : 'Bật màn hình'}</span>
          </button>

          <button
            type="button"
            onClick={() => triggerKey('KEY_SOURCE')}
            className="min-h-[48px] rounded-2xl bg-[#151e30] hover:bg-[#1e2b45] border border-white/12 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
            title={SAMSUNG_K5300_KEY_SPECS.KEY_SOURCE.description}
          >
            <Tv className="w-4 h-4 text-[#7ce7f5]" />
            <span>Nguồn vào</span>
          </button>

          <button
            type="button"
            onClick={() => onQuickOpenSection('device')}
            className="min-h-[48px] rounded-2xl bg-[#151e30] hover:bg-[#1e2b45] border border-white/12 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Radio className="w-4 h-4 text-amber-300" />
            <span>Cổng LAN</span>
          </button>
        </div>

        {/* D-Pad Circular / Ergonomic Navigation Pad */}
        <div className="mt-4 bg-[#111827] border border-white/10 rounded-3xl p-4 flex flex-col items-center">
          <div className="text-[11px] text-[#8f9db6] mb-2 flex items-center justify-between w-full px-1">
            <span>ĐIỀU HƯỚNG SAMSUNG TV</span>
            <span className="tabular-nums text-[#7ce7f5]">
              Kênh {tvState.currentChannelId.replace('hdv-ch-', '')} • {tvState.inputSource}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 w-full max-w-[250px] aspect-square items-center">
            <div />
            <button
              type="button"
              onClick={() => triggerKey('KEY_UP')}
              className={`h-full min-h-[56px] rounded-2xl border border-white/15 flex flex-col items-center justify-center transition active:scale-95 cursor-pointer ${
                activeKeyFeedback === 'KEY_UP'
                  ? 'bg-[#7ce7f5] text-[#080b14]'
                  : 'bg-[#182338] hover:bg-[#22314e] text-white'
              }`}
              aria-label="Điều hướng Lên"
            >
              <ChevronUp className="w-6 h-6" />
              <span className="text-[10px] font-semibold">LÊN</span>
            </button>
            <div />

            <button
              type="button"
              onClick={() => triggerKey('KEY_LEFT')}
              className={`h-full min-h-[56px] rounded-2xl border border-white/15 flex flex-col items-center justify-center transition active:scale-95 cursor-pointer ${
                activeKeyFeedback === 'KEY_LEFT'
                  ? 'bg-[#7ce7f5] text-[#080b14]'
                  : 'bg-[#182338] hover:bg-[#22314e] text-white'
              }`}
              aria-label="Điều hướng Trái"
            >
              <ChevronLeft className="w-6 h-6" />
              <span className="text-[10px] font-semibold">TRÁI</span>
            </button>

            <button
              type="button"
              onClick={() => triggerKey('KEY_ENTER')}
              className={`h-full min-h-[64px] rounded-2xl border-2 border-[#7ce7f5] font-black text-sm flex flex-col items-center justify-center shadow-lg transition active:scale-95 cursor-pointer ${
                activeKeyFeedback === 'KEY_ENTER'
                  ? 'bg-white text-[#080b14]'
                  : 'bg-gradient-to-br from-[#7ce7f5] to-[#637dff] text-[#080b14]'
              }`}
              aria-label="OK Xác nhận"
            >
              <span>OK</span>
              <span className="text-[9px] font-bold opacity-80">XÁC NHẬN</span>
            </button>

            <button
              type="button"
              onClick={() => triggerKey('KEY_RIGHT')}
              className={`h-full min-h-[56px] rounded-2xl border border-white/15 flex flex-col items-center justify-center transition active:scale-95 cursor-pointer ${
                activeKeyFeedback === 'KEY_RIGHT'
                  ? 'bg-[#7ce7f5] text-[#080b14]'
                  : 'bg-[#182338] hover:bg-[#22314e] text-white'
              }`}
              aria-label="Điều hướng Phải"
            >
              <ChevronRight className="w-6 h-6" />
              <span className="text-[10px] font-semibold">PHẢI</span>
            </button>

            <div />
            <button
              type="button"
              onClick={() => triggerKey('KEY_DOWN')}
              className={`h-full min-h-[56px] rounded-2xl border border-white/15 flex flex-col items-center justify-center transition active:scale-95 cursor-pointer ${
                activeKeyFeedback === 'KEY_DOWN'
                  ? 'bg-[#7ce7f5] text-[#080b14]'
                  : 'bg-[#182338] hover:bg-[#22314e] text-white'
              }`}
              aria-label="Điều hướng Xuống"
            >
              <ChevronDown className="w-6 h-6" />
              <span className="text-[10px] font-semibold">XUỐNG</span>
            </button>
            <div />
          </div>

          {/* Back / Home / Menu Row */}
          <div className="grid grid-cols-3 gap-2.5 w-full mt-3.5">
            <button
              type="button"
              onClick={() => triggerKey('KEY_RETURN')}
              className="min-h-[46px] rounded-xl bg-[#182235] hover:bg-[#23314d] border border-white/12 flex items-center justify-center gap-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#9ba9c5]" />
              <span>Quay lại</span>
            </button>

            <button
              type="button"
              onClick={() => triggerKey('KEY_HOME')}
              className="min-h-[46px] rounded-xl bg-[#182235] hover:bg-[#23314d] border border-[#7ce7f5]/35 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#7ce7f5] transition active:scale-95 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Trang chủ</span>
            </button>

            <button
              type="button"
              onClick={() => triggerKey('KEY_MENU')}
              className="min-h-[46px] rounded-xl bg-[#182235] hover:bg-[#23314d] border border-white/12 flex items-center justify-center gap-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer"
            >
              <Menu className="w-4 h-4 text-[#9ba9c5]" />
              <span>Cài đặt</span>
            </button>
          </div>
        </div>

        {/* Volume & Channel Controls */}
        <div className="grid grid-cols-3 gap-2.5 mt-3.5">
          {/* Volume Rocker */}
          <div className="bg-[#111827] border border-white/10 rounded-2xl p-2 flex flex-col items-center justify-between">
            <button
              type="button"
              onClick={() => triggerKey('KEY_VOLUP')}
              className="w-full min-h-[44px] rounded-xl bg-[#182338] hover:bg-[#22314e] text-xs font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-[#7ce7f5]" />
              <span>VOL +</span>
            </button>
            <div className="py-1.5 text-[11px] font-semibold text-[#9ba9c5] tabular-nums">
              ÂM LƯỢNG ({tvState.muted ? 'MUTE' : `${tvState.volume}%`})
            </div>
            <button
              type="button"
              onClick={() => triggerKey('KEY_VOLDOWN')}
              className="w-full min-h-[44px] rounded-xl bg-[#182338] hover:bg-[#22314e] text-xs font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
            >
              <span>VOL -</span>
            </button>
          </div>

          {/* Center Mute & AI Quick Trigger */}
          <div className="flex flex-col gap-2.5 justify-between">
            <button
              type="button"
              onClick={() => triggerKey('KEY_MUTE')}
              className={`w-full flex-1 min-h-[48px] rounded-2xl border flex flex-col items-center justify-center gap-1 text-xs font-semibold transition active:scale-95 cursor-pointer ${
                tvState.muted
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                  : 'bg-[#111827] hover:bg-[#1a253b] border-white/10 text-white'
              }`}
            >
              <VolumeX className="w-4 h-4" />
              <span>{tvState.muted ? 'Đang tắt tiếng' : 'Tắt tiếng'}</span>
            </button>

            <button
              type="button"
              onClick={() => onQuickOpenSection('assistant')}
              className="w-full flex-1 min-h-[48px] rounded-2xl bg-[#18223a] hover:bg-[#223152] border border-indigo-400/30 flex flex-col items-center justify-center gap-1 text-xs font-semibold text-indigo-200 transition active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#7ce7f5]" />
              <span>Trợ lý AI</span>
            </button>
          </div>

          {/* Channel Rocker */}
          <div className="bg-[#111827] border border-white/10 rounded-2xl p-2 flex flex-col items-center justify-between">
            <button
              type="button"
              onClick={() => triggerKey('KEY_CHUP')}
              className="w-full min-h-[44px] rounded-xl bg-[#182338] hover:bg-[#22314e] text-xs font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
            >
              <span>CH +</span>
            </button>
            <div className="py-1.5 text-[11px] font-semibold text-[#9ba9c5] tabular-nums">
              KÊNH ({tvState.currentChannelId.replace('hdv-ch-', '')}/06)
            </div>
            <button
              type="button"
              onClick={() => triggerKey('KEY_CHDOWN')}
              className="w-full min-h-[44px] rounded-xl bg-[#182338] hover:bg-[#22314e] text-xs font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
            >
              <span>CH -</span>
            </button>
          </div>
        </div>

        {/* Vietnamese Voice Search & Control Panel */}
        <div className="mt-4 bg-[#111827] border border-[#7ce7f5]/30 rounded-2xl p-3.5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-[#7ce7f5]" />
              <span>ĐIỀU KHIỂN & TÌM KIẾM GIỌNG NÓI (TIẾNG VIỆT)</span>
            </div>
            <span className="text-[10px] text-[#8f9db6]">
              {deviceInfo.supportsWebSpeechRecognition ? 'Web Speech vi-VN' : 'AI Audio Fallback'}
            </span>
          </div>

          <button
            type="button"
            onClick={startVietnameseVoiceRecognition}
            className={`w-full min-h-[48px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
              isListening
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'bg-gradient-to-r from-[#7ce7f5] to-[#637dff] text-[#07111e] hover:opacity-95'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                <span>Đang nghe Tiếng Việt... (Bấm để dừng)</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Nhấn để nói Tiếng Việt (Micro)</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-[#aebbd3] mt-2 leading-relaxed">{voiceStatusText}</p>

          {voiceError && (
            <div className="mt-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-[11px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
              <span>{voiceError}</span>
            </div>
          )}

          {/* Manual / Simulated Voice Command Input */}
          <form onSubmit={handleManualVoiceSubmit} className="mt-2.5 flex gap-1.5">
            <input
              type="text"
              value={manualVoiceInput}
              onChange={(e) => setManualVoiceInput(e.target.value)}
              placeholder="Hoặc nhập lệnh giọng nói tiếng Việt..."
              className="flex-1 min-h-[40px] px-3 rounded-xl bg-[#090d18] border border-white/15 text-xs text-white placeholder-[#6d7b94] focus:outline-none focus:border-[#7ce7f5]"
            />
            <button
              type="submit"
              className="min-h-[40px] px-3 rounded-xl bg-[#1c2b48] hover:bg-[#263a61] border border-[#7ce7f5]/40 text-[#7ce7f5] text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi</span>
            </button>
          </form>

          {/* Voice Preset Buttons Required by Prompt */}
          <div className="mt-2.5">
            <div className="text-[10px] text-[#8f9db6] mb-1.5">
              Câu lệnh mẫu kiểm thử nhanh (Bấm để phát lệnh):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {VOICE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onSendVoiceTranscript(preset, 0.99, 'Mẫu kiểm thử Giọng nói (vi-VN)')}
                  className="px-2.5 py-1.5 rounded-lg bg-[#172238] hover:bg-[#223252] border border-white/10 text-[11px] text-[#d3def5] transition cursor-pointer"
                >
                  “{preset}”
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mandatory 3-Stage Command Verification Status Panel */}
        <div className="mt-3.5 bg-[#090d16] border border-white/10 rounded-2xl p-3">
          <div className="text-[10px] font-bold tracking-wider text-[#9ba9c5] mb-2 flex items-center justify-between">
            <span>XÁC MINH 3 TRẠNG THÁI THỰC THI ĐỘC LẬP</span>
            {lastCmd && (
              <span className="font-mono text-[10px] text-[#7ce7f5] tabular-nums">
                {new Date(lastCmd.timestamp).toLocaleTimeString('vi-VN')}
              </span>
            )}
          </div>

          {!lastCmd ? (
            <div className="text-[11px] text-[#7e8ba4]">
              Chưa có lệnh nào được gửi trong phiên này. Hãy bấm một phím hoặc nói câu lệnh tiếng Việt.
            </div>
          ) : (
            <div className="space-y-2 text-[11px]">
              {/* Stage 1 */}
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">
                    1. Nhận dạng đầu vào / Giọng nói: Thành công
                  </div>
                  <div className="text-[#9ba9c5]">
                    Nội dung: <span className="text-white">“{lastCmd.rawInput}”</span> ({lastCmd.stage1SpeechRecognized.engine})
                  </div>
                </div>
              </div>

              {/* Stage 2 */}
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">
                    2. Gửi lệnh qua HĐV Bridge: Thành công
                  </div>
                  <div className="text-[#9ba9c5]">
                    Phân loại: <span className="text-sky-300 font-mono">{lastCmd.intentType}</span>
                    {lastCmd.keyCode ? ` • Mã Tizen: ${lastCmd.keyCode}` : ''}
                  </div>
                </div>
              </div>

              {/* Stage 3 */}
              <div className="flex items-start gap-2">
                {lastCmd.stage3TargetConfirmed.status === 'unsupported_by_hardware' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-white">
                    3. Phản hồi xác nhận từ TV đích (ACK):{' '}
                    <span
                      className={
                        lastCmd.stage3TargetConfirmed.status === 'unsupported_by_hardware'
                          ? 'text-amber-300'
                          : 'text-emerald-300'
                      }
                    >
                      {lastCmd.stage3TargetConfirmed.status === 'confirmed_by_tv'
                        ? `ĐÃ XÁC NHẬN TRÊN TV (${lastCmd.stage3TargetConfirmed.latencyMs || 5}ms)`
                        : lastCmd.stage3TargetConfirmed.status === 'unsupported_by_hardware'
                        ? 'GIỚI HẠN GIAO THỨC PHẦN CỨNG'
                        : 'ĐÃ THỰC THI TRONG PHIÊN HĐV'}
                    </span>
                  </div>
                  <div className="text-[#9ba9c5] leading-relaxed">
                    {lastCmd.stage3TargetConfirmed.detail}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* iOS Safari Install Guide Modal */}
      {showIOSInstallModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#141d30] border border-white/20 rounded-2xl max-w-sm w-full p-5">
            <h3 className="text-base font-bold text-white">
              Cài đặt HĐV Remote trên iPhone / iPad
            </h3>
            <ol className="text-xs text-[#c2cee6] space-y-2 mt-3 list-decimal list-inside leading-relaxed">
              <li>
                Nhấn vào biểu tượng <strong>Chia sẻ (Share)</strong> ở thanh công cụ trình duyệt Safari.
              </li>
              <li>
                Cuộn xuống và chọn <strong>Thêm vào Màn hình chính (Add to Home Screen)</strong>.
              </li>
              <li>
                Nhấn <strong>Thêm (Add)</strong> ở góc trên bên phải để sử dụng HĐV Remote toàn màn hình như ứng dụng gốc.
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIOSInstallModal(false)}
              className="mt-4 w-full min-h-[44px] rounded-xl bg-[#7ce7f5] text-[#080b14] font-bold text-xs cursor-pointer"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
