import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipForward,
  SkipBack,
  Heart,
  Sparkles,
  Radio,
} from 'lucide-react';
import { MediaChannelItem, TVSharedState } from '../types/tv';
import { HDV_CHANNELS } from '../data/tvCatalog';
import { tvAudio } from '../utils/tvAudio';

interface HDVMediaPlayerViewProps {
  tvState: TVSharedState;
  onSelectChannel: (channelId: string, autoPlay?: boolean) => void;
  onTogglePlay: (playing: boolean) => void;
  onToggleFavorite: (channelId: string) => void;
  onAdjustVolume: (delta: number) => void;
  onToggleMute: () => void;
}

export const HDVMediaPlayerView: React.FC<HDVMediaPlayerViewProps> = ({
  tvState,
  onSelectChannel,
  onTogglePlay,
  onToggleFavorite,
  onAdjustVolume,
  onToggleMute,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  const currentChannel: MediaChannelItem =
    HDV_CHANNELS.find((c) => c.id === tvState.currentChannelId) || HDV_CHANNELS[0];
  const isFav = tvState.favorites.includes(currentChannel.id);

  // Synchronize Web Audio API playback with tvState.isPlaying, volume, and mute
  useEffect(() => {
    tvAudio.setVolumeAndMute(tvState.volume, tvState.muted);
    if (tvState.isPlaying && tvState.powerState === 'ON') {
      tvAudio.startChannelPlayback(currentChannel.audioFreqBase);
    } else {
      tvAudio.stopChannelPlayback();
    }
    return () => {
      tvAudio.stopChannelPlayback();
    };
  }, [tvState.isPlaying, tvState.volume, tvState.muted, tvState.powerState, currentChannel.audioFreqBase]);

  // Elapsed timer when playing
  useEffect(() => {
    if (!tvState.isPlaying) return;
    const timer = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [tvState.isPlaying]);

  // 60fps HTML5 Canvas Broadcast Visualization (Optimized for Samsung UA40K5300)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let phase = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Deep broadcast background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, '#070b16');
      bgGrad.addColorStop(0.55, '#111b33');
      bgGrad.addColorStop(1, '#091020');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Concentric Dong Son Bronze Drum & Heritage Rings
      const cx = w * 0.72;
      const cy = h * 0.5;
      const maxR = Math.min(w, h) * 0.38;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(phase * 0.15);

      for (let r = 1; r <= 4; r++) {
        ctx.beginPath();
        ctx.arc(0, 0, (maxR / 4) * r, 0, Math.PI * 2);
        ctx.strokeStyle = `${currentChannel.accentColor}${r === 4 ? '44' : '26'}`;
        ctx.lineWidth = r === 4 ? 2 : 1;
        ctx.stroke();
      }

      // 12-point Dong Son Sun Rays
      const rays = 12;
      for (let i = 0; i < rays; i++) {
        const angle = (i * Math.PI * 2) / rays;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * (maxR * 0.42), Math.sin(angle) * (maxR * 0.42));
        ctx.strokeStyle = `${currentChannel.accentColor}55`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();

      // Equalizer / Soundwave bars across bottom when playing
      const barCount = 32;
      const barWidth = (w * 0.55) / barCount;
      for (let i = 0; i < barCount; i++) {
        const amp = tvState.isPlaying && !tvState.muted
          ? (Math.sin(phase * 3 + i * 0.45) * 0.5 + 0.5) * (tvState.volume / 100) * 58 + 8
          : 6;
        const x = 36 + i * barWidth;
        const y = h - 32 - amp;
        ctx.fillStyle = i % 2 === 0 ? currentChannel.accentColor : '#637dff';
        ctx.fillRect(x, y, barWidth - 4, amp);
      }

      if (tvState.isPlaying) {
        phase += 0.03;
      }
      animId = window.requestAnimationFrame(render);
    };

    render();
    return () => window.cancelAnimationFrame(animId);
  }, [currentChannel.accentColor, tvState.isPlaying, tvState.muted, tvState.volume]);

  const speakChannelIntro = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(currentChannel.narratorScript);
      utter.lang = 'vi-VN';
      utter.volume = tvState.muted ? 0 : Math.min(1, tvState.volume / 100);
      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const stepChannel = (dir: 1 | -1) => {
    const idx = HDV_CHANNELS.findIndex((c) => c.id === currentChannel.id);
    const next = (idx + dir + HDV_CHANNELS.length) % HDV_CHANNELS.length;
    setElapsedSec(0);
    onSelectChannel(HDV_CHANNELS[next].id, true);
  };

  return (
    <div className="space-y-6">
      {/* Main 16:9 Broadcast Screen */}
      <div className="relative rounded-3xl overflow-hidden border border-white/15 bg-[#090e1c] shadow-2xl">
        <canvas
          ref={canvasRef}
          width={960}
          height={420}
          className="w-full h-[340px] sm:h-[390px] object-cover block"
        />

        {/* Overlay Info & Controls */}
        <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-between bg-gradient-to-r from-[#070b14]/90 via-[#070b14]/65 to-transparent">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs font-semibold text-[#7ce7f5]">
              <span className="flex items-center gap-1.5 font-mono">
                <Radio className="w-4 h-4" />
                KÊNH {currentChannel.number}
              </span>
              <span>•</span>
              <span>{currentChannel.category}</span>
              <span>•</span>
              <span className="text-[#aebbd3]">{currentChannel.resolution}</span>
            </div>

            <div className="text-xs font-mono tabular-nums text-white bg-black/50 px-3 py-1.5 rounded-xl border border-white/10">
              {tvState.isPlaying ? 'ĐANG PHÁT TRỰC TIẾP' : 'ĐANG TẠM DỪNG'} • {formatTime(elapsedSec)} / {currentChannel.duration}
            </div>
          </div>

          <div className="max-w-xl space-y-2.5 my-auto">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              {currentChannel.title}
            </h2>
            <p className="text-xs sm:text-sm text-[#7ce7f5] font-medium">
              {currentChannel.subtitle}
            </p>
            <p className="text-xs sm:text-sm text-[#c3d0e8] leading-relaxed">
              {currentChannel.description}
            </p>
          </div>

          {/* Player Control Bar (Remote Navigable) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => onTogglePlay(!tvState.isPlaying)}
                className="focusable min-h-[46px] px-5 rounded-xl bg-gradient-to-r from-[#7ce7f5] to-[#637dff] text-[#07111e] font-bold text-xs flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
              >
                {tvState.isPlaying ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Tạm dừng (OK)</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Phát ngay (OK)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => stepChannel(-1)}
                className="focusable min-h-[46px] px-3.5 rounded-xl bg-[#151f33] hover:bg-[#1f2e4a] border border-white/15 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <SkipBack className="w-4 h-4 text-[#7ce7f5]" />
                <span>CH -</span>
              </button>

              <button
                type="button"
                onClick={() => stepChannel(1)}
                className="focusable min-h-[46px] px-3.5 rounded-xl bg-[#151f33] hover:bg-[#1f2e4a] border border-white/15 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>CH +</span>
                <SkipForward className="w-4 h-4 text-[#7ce7f5]" />
              </button>

              <button
                type="button"
                onClick={() => onToggleFavorite(currentChannel.id)}
                className={`focusable min-h-[46px] px-4 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  isFav
                    ? 'bg-rose-500/20 border-rose-400/50 text-rose-200'
                    : 'bg-[#151f33] border-white/15 text-[#c3d0e8]'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-400 text-rose-400' : ''}`} />
                <span>{isFav ? 'Đã yêu thích' : 'Yêu thích'}</span>
              </button>

              <button
                type="button"
                onClick={speakChannelIntro}
                className="focusable min-h-[46px] px-3.5 rounded-xl bg-[#151f33] hover:bg-[#1f2e4a] border border-white/15 text-[#7ce7f5] text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>Thuyết minh Tiếng Việt</span>
              </button>
            </div>

            {/* Volume & Mute indicator */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onAdjustVolume(-5)}
                className="focusable min-h-[42px] px-3 rounded-xl bg-[#151f33] border border-white/15 text-xs font-bold text-white cursor-pointer"
              >
                VOL -
              </button>
              <button
                type="button"
                onClick={onToggleMute}
                className="focusable min-h-[42px] px-3.5 rounded-xl bg-[#151f33] border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer tabular-nums"
              >
                {tvState.muted ? (
                  <>
                    <VolumeX className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-300">MUTE</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-[#7ce7f5]" />
                    <span>{tvState.volume}%</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => onAdjustVolume(5)}
                className="focusable min-h-[42px] px-3 rounded-xl bg-[#151f33] border border-white/15 text-xs font-bold text-white cursor-pointer"
              >
                VOL +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Channel List Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white">
            Danh mục Kênh & Chương trình Hồn Đất Việt (6 Kênh Full HD)
          </h3>
          <span className="text-xs text-[#8f9db6]">
            Dùng phím mũi tên hoặc bấm CH+/CH- trên HĐV Remote để chuyển kênh
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {HDV_CHANNELS.map((ch) => {
            const active = ch.id === currentChannel.id;
            const fav = tvState.favorites.includes(ch.id);
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => {
                  setElapsedSec(0);
                  onSelectChannel(ch.id, true);
                }}
                className={`focusable text-left p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  active
                    ? 'bg-[#1a2744] border-[#7ce7f5] shadow-lg'
                    : 'bg-[#111827] hover:bg-[#172136] border-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-[#8f9db6] mb-1.5">
                    <span className="font-mono font-bold text-[#7ce7f5]">
                      KÊNH {ch.number} • {ch.category}
                    </span>
                    <span className="font-mono tabular-nums">
                      {fav ? '♥ Đã lưu' : ch.duration}
                    </span>
                  </div>
                  <div className="text-base font-bold text-white leading-snug">
                    {ch.title}
                  </div>
                  <p className="text-xs text-[#9ba9c5] mt-1.5 line-clamp-2 leading-relaxed">
                    {ch.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px]">
                  <span className="text-[#7ce7f5] font-semibold">
                    {active && tvState.isPlaying ? '▶ Đang phát' : 'Nhấn OK để phát'}
                  </span>
                  <span className="text-[#8f9db6]">{ch.resolution}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
