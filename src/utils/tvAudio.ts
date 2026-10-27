// Real-time Web Audio API Engine for HĐV TV UI feedback & Pentatonic Vietnamese Cultural Channel Audio
class TVAudioEngine {
  private ctx: AudioContext | null = null;
  private ambientTimer: number | null = null;
  private isPlayingChannel = false;
  private currentBaseFreq = 220;
  private volume = 0.65;
  private muted = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setVolumeAndMute(volPercent: number, muted: boolean) {
    this.volume = Math.max(0, Math.min(1, volPercent / 100));
    this.muted = muted;
  }

  public playNavigationTick(enabled = true) {
    if (!enabled || this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(680, ctx.currentTime + 0.045);

      const effectiveGain = Math.max(0.02, this.volume * 0.12);
      gain.gain.setValueAtTime(effectiveGain, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.055);
    } catch {
      // Ignore audio context autoplay restrictions
    }
  }

  public playConfirmChime(enabled = true) {
    if (!enabled || this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + idx * 0.055);

        const effectiveGain = Math.max(0.02, this.volume * 0.14);
        gain.gain.setValueAtTime(effectiveGain, now + idx * 0.055);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.055);
        osc.stop(now + idx * 0.055 + 0.19);
      });
    } catch {
      // Ignore
    }
  }

  public startChannelPlayback(baseFreq: number) {
    this.currentBaseFreq = baseFreq || 220;
    if (this.isPlayingChannel) return;
    this.isPlayingChannel = true;

    // Ngũ cung Việt Nam (Hò - Xự - Xang - Xê - Cống): ratios 1, 9/8, 5/4, 3/2, 5/3, 2
    const pentatonicRatios = [1, 1.125, 1.25, 1.5, 1.667, 2];
    let step = 0;

    const playNote = () => {
      if (!this.isPlayingChannel) return;
      if (!this.muted && this.volume > 0) {
        const ctx = this.ensureContext();
        if (ctx) {
          try {
            const now = ctx.currentTime;
            const ratio = pentatonicRatios[step % pentatonicRatios.length];
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(this.currentBaseFreq * ratio, now);

            const noteGain = Math.max(0.005, this.volume * 0.15);
            gain.gain.setValueAtTime(0.002, now);
            gain.gain.linearRampToValueAtTime(noteGain, now + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 1.0);
          } catch {
            // Ignore
          }
        }
      }
      step++;
    };

    playNote();
    this.ambientTimer = window.setInterval(playNote, 1100);
  }

  public stopChannelPlayback() {
    this.isPlayingChannel = false;
    if (this.ambientTimer !== null) {
      clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
  }
}

export const tvAudio = new TVAudioEngine();
